import type { ApplicationService } from '@adonisjs/core/types';
import { afterEach, describe, expect, it } from 'vitest';
import ContextProvider from '../providers/context_provider.js';
import {
  type ContextConfig,
  getContextHttpOptions,
  resetContextHttpOptions,
} from '../src/define_config.js';
import { Context } from '../src/index.js';

/** Minimal ApplicationService stand-in: the provider only reads app.config.get. */
function fakeApp(config: ContextConfig) {
  return {
    config: {
      get: (key: string, fallback?: unknown) => (key === 'context' ? config : fallback),
    },
  } as unknown as ApplicationService;
}

describe('ContextProvider', () => {
  afterEach(() => {
    Context.resetConfig();
    resetContextHttpOptions();
  });

  it('pushes the cross-boundary config onto the singleton', async () => {
    const config: ContextConfig = { carrier: ['traceId', 'tenantId'] };
    await new ContextProvider(fakeApp(config)).boot();

    Context.run({ traceId: 't1', tenantId: 'acme', userRef: { type: 'user', id: 7 } }, () => {
      // `userRef` excluded because the configured carrier omits it.
      expect(Context.serialize()).toEqual({ traceId: 't1', tenantId: 'acme' });
    });
  });

  it('hands the population hooks to the middleware holder', async () => {
    const config: ContextConfig = { traceHeader: 'x-trace' };
    await new ContextProvider(fakeApp(config)).boot();
    expect(getContextHttpOptions()).toBe(config);
  });

  it('does not throw when @agora/diagnostics is absent', async () => {
    await expect(new ContextProvider(fakeApp({})).boot()).resolves.toBeUndefined();
  });
});
