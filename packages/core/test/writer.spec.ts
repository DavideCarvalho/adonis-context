import { describe, expect, it } from 'vitest';
import { CONTEXT_SET, Context, contextAccessor, contextWriter } from '../src/index.js';

describe('contextWriter', () => {
  it('merges a patch into the active context store', () => {
    Context.run({ traceId: 't1' }, () => {
      contextWriter.set({ userRef: { type: 'user', id: 42 }, tenantId: 'acme' });
      // Assert through the read accessor — the read/write slots are symmetric.
      expect(contextAccessor.userRef()).toEqual({ type: 'user', id: 42 });
      expect(contextAccessor.tenantId()).toBe('acme');
    });
  });

  it('is a safe no-op with no active context', () => {
    Context.resetSetWarning();
    expect(() => contextWriter.set({ tenantId: 'acme' })).not.toThrow();
    expect(contextAccessor.get()).toBeUndefined();
  });

  it('publishes itself on the @agora/context:set global slot', () => {
    // Other Agora libs read this slot structurally (no import). Importing the
    // package must wire it, and the slot must be the callable writer.
    const fromGlobal = (globalThis as Record<symbol, unknown>)[CONTEXT_SET];
    expect(fromGlobal).toBe(contextWriter.set);
    expect(CONTEXT_SET).toBe(Symbol.for('@agora/context:set'));

    const write = fromGlobal as typeof contextWriter.set;
    Context.run({ traceId: 't2' }, () => {
      write({ tenantId: 'globex' });
      expect(contextAccessor.tenantId()).toBe('globex');
    });
  });
});
