import { describe, expect, it } from 'vitest';
import { CONTEXT_ACCESSOR, Context, contextAccessor } from '../src/index.js';

describe('contextAccessor', () => {
  it('reads through to the active context store', () => {
    Context.run({ traceId: 't1', tenantId: 'acme' }, () => {
      expect(contextAccessor.traceId()).toBe('t1');
      expect(contextAccessor.tenantId()).toBe('acme');
    });
  });

  it('publishes itself on the @agora/context:accessor global slot', () => {
    // Other Agora libs read this slot structurally (no import). Importing the
    // package must wire it.
    const fromGlobal = (globalThis as Record<symbol, unknown>)[CONTEXT_ACCESSOR];
    expect(fromGlobal).toBe(contextAccessor);
    expect(CONTEXT_ACCESSOR).toBe(Symbol.for('@agora/context:accessor'));
  });
});
