import type { HttpContext } from '@adonisjs/core/http';
import { afterEach, describe, expect, it } from 'vitest';
import ContextMiddleware from '../src/context_middleware.js';
import { resetContextHttpOptions, setContextHttpOptions } from '../src/define_config.js';
import { Context, type ContextStore } from '../src/index.js';

const VALID_TRACEPARENT = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

/** Minimal HttpContext stand-in: the middleware only touches request.headers()/id(). */
function fakeCtx(headers: Record<string, string | string[] | undefined> = {}, id?: string) {
  return {
    request: {
      headers: () => headers,
      id: () => id,
    },
  } as unknown as HttpContext;
}

/** Capture the active store from inside `next`, while the context is live. */
function capturingNext(): { next: () => Promise<void>; captured: () => ContextStore | undefined } {
  let store: ContextStore | undefined;
  return {
    next: async () => {
      store = Context.get();
    },
    captured: () => store,
  };
}

describe('ContextMiddleware', () => {
  afterEach(() => {
    resetContextHttpOptions();
    Context.resetSetWarning();
  });

  it('seeds a random trace id when no traceparent is present', async () => {
    const { next, captured } = capturingNext();
    await new ContextMiddleware().handle(fakeCtx(), next);
    expect(captured()?.traceId).toMatch(/^[0-9a-f]{32}$/);
  });

  it('seeds the trace id from the upstream traceparent header', async () => {
    const { next, captured } = capturingNext();
    await new ContextMiddleware().handle(fakeCtx({ traceparent: VALID_TRACEPARENT }), next);
    expect(captured()?.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    // Upstream parent-id/flags retained for faithful downstream propagation.
    expect(captured()?.traceparent?.parentId).toBe('00f067aa0ba902b7');
  });

  it('captures the AdonisJS request id when present', async () => {
    const { next, captured } = capturingNext();
    await new ContextMiddleware().handle(fakeCtx({}, 'req-123'), next);
    expect(captured()?.requestId).toBe('req-123');
  });

  it('lets the traceId hook win over the header', async () => {
    setContextHttpOptions({ traceId: () => 'custom-trace-id' });
    const { next, captured } = capturingNext();
    await new ContextMiddleware().handle(fakeCtx({ traceparent: VALID_TRACEPARENT }), next);
    expect(captured()?.traceId).toBe('custom-trace-id');
    // A re-rooted trace must not keep the upstream span-id.
    expect(captured()?.traceparent).toBeUndefined();
  });

  it('merges initialize() but never lets it clobber the resolved trace id', async () => {
    setContextHttpOptions({
      initialize: () => ({ tenantId: 'acme', traceId: 'evil-override' as string }),
    });
    const { next, captured } = capturingNext();
    await new ContextMiddleware().handle(fakeCtx({ traceparent: VALID_TRACEPARENT }), next);
    expect(captured()?.tenantId).toBe('acme');
    expect(captured()?.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
  });

  it('runs enrichers, isolating a throwing one', async () => {
    setContextHttpOptions({
      enrichers: [
        () => ({ tenantId: 'from-enricher' }),
        () => {
          throw new Error('boom');
        },
        (store) => {
          store.requestId = 'mutated';
        },
      ],
    });
    const { next, captured } = capturingNext();
    await new ContextMiddleware().handle(fakeCtx(), next);
    expect(captured()?.tenantId).toBe('from-enricher');
    expect(captured()?.requestId).toBe('mutated');
  });
});
