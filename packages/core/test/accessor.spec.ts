import { describe, expect, it } from 'vitest';
import { CONTEXT_ACCESSOR, Context, contextAccessor } from '../src/index.js';

describe('contextAccessor', () => {
  it('reads through to the active context store', () => {
    Context.run({ traceId: 't1', tenantId: 'acme' }, () => {
      expect(contextAccessor.traceId()).toBe('t1');
      expect(contextAccessor.tenantId()).toBe('acme');
    });
  });

  it('get() with no argument returns the whole store (telescope/resilience contract)', () => {
    Context.run({ traceId: 't1', tenantId: 'acme' }, () => {
      expect(contextAccessor.get()).toMatchObject({ traceId: 't1', tenantId: 'acme' });
    });
  });

  it('get(key) returns a single field off the store (authz reads globalRoles this way)', () => {
    // authz calls accessor.get('globalRoles'); before the fix this returned the whole
    // store object, so its Array.isArray check failed and every permission was denied.
    Context.run({ traceId: 't1' }, () => {
      Context.set('globalRoles', ['COORDINATOR', 'ADMIN']);
      expect(contextAccessor.get('globalRoles')).toEqual(['COORDINATOR', 'ADMIN']);
    });
  });

  it('get(key) is undefined outside any active context', () => {
    expect(contextAccessor.get('globalRoles')).toBeUndefined();
  });

  it('publishes itself on the @agora/context:accessor global slot', () => {
    // Other Agora libs read this slot structurally (no import). Importing the
    // package must wire it.
    const fromGlobal = (globalThis as Record<symbol, unknown>)[CONTEXT_ACCESSOR];
    expect(fromGlobal).toBe(contextAccessor);
    expect(CONTEXT_ACCESSOR).toBe(Symbol.for('@agora/context:accessor'));
  });
});
