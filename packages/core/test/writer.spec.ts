import { describe, expect, it } from 'vitest';
import {
  CONTEXT_SCOPE,
  CONTEXT_SET,
  Context,
  contextAccessor,
  contextScope,
  contextWriter,
} from '../src/index.js';

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

describe('contextScope', () => {
  it('runs fn inside a store seeded from the full snapshot', () => {
    const result = contextScope(
      { traceId: 'scoped', tenantId: 'acme', userRef: { type: 'user', id: 7 } },
      () => {
        expect(contextAccessor.traceId()).toBe('scoped');
        expect(contextAccessor.tenantId()).toBe('acme');
        expect(contextAccessor.userRef()).toEqual({ type: 'user', id: 7 });
        return 'done';
      },
    );
    expect(result).toBe('done');
    // The scope is torn down when fn returns.
    expect(contextAccessor.get()).toBeUndefined();
  });

  it('preserves module-augmented keys not known to this package', () => {
    contextScope({ traceId: 'aug', locale: 'pt-BR', custom: { nested: true } }, () => {
      const store = contextAccessor.get() as Record<string, unknown>;
      expect(store.locale).toBe('pt-BR');
      expect(store.custom).toEqual({ nested: true });
    });
  });

  it('runs fn with no active store when snapshot is absent', () => {
    let ran = false;
    const result = contextScope(undefined, () => {
      ran = true;
      expect(contextAccessor.get()).toBeUndefined();
      return 42;
    });
    expect(ran).toBe(true);
    expect(result).toBe(42);
  });

  it('publishes itself on the @agora/context:scope global slot', () => {
    const fromGlobal = (globalThis as Record<symbol, unknown>)[CONTEXT_SCOPE];
    expect(fromGlobal).toBe(contextScope);
    expect(CONTEXT_SCOPE).toBe(Symbol.for('@agora/context:scope'));

    const scope = fromGlobal as typeof contextScope;
    const seen = scope({ traceId: 'via-slot', tenantId: 'globex' }, () =>
      contextAccessor.tenantId(),
    );
    expect(seen).toBe('globex');
  });
});
