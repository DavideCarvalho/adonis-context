import { Context, type ContextStore, type UserRef } from './context.js';

/**
 * The read-only view of the context that consumer libs read. Intentionally a
 * narrow surface (no `set`/`run`) — consumers read, they do not drive the
 * lifecycle.
 */
export interface ContextAccessor {
  traceId(): string | undefined;
  tenantId(): string | undefined;
  userRef(): UserRef | undefined;
  /**
   * With no argument, the whole active store (or `undefined` outside a context) —
   * what `@adonis-agora/telescope` and `@adonis-agora/resilience` read. With a key,
   * that single field off the store — what `@adonis-agora/authz` reads to pull
   * `globalRoles`. The two consumers disagreed on the shape of this slot; the
   * key-less form stays byte-identical so neither breaks.
   */
  get(): ContextStore | undefined;
  get(key: string): unknown;
}

/** Default accessor: a thin facade over the singleton {@link Context}. */
export const contextAccessor: ContextAccessor = {
  traceId: () => Context.traceId(),
  tenantId: () => Context.tenantId(),
  userRef: () => Context.userRef(),
  // Cast the single implementation onto the overloaded signature: TypeScript won't
  // infer a one-arg arrow as satisfying an overload set in an object literal.
  get: ((key?: string) => {
    const store = Context.get();
    return key === undefined ? store : store?.[key as keyof ContextStore];
  }) as ContextAccessor['get'],
};

/**
 * The cross-copy-stable global slot the ecosystem reads the accessor from. Other
 * Agora libs (e.g. `@adonis-agora/resilience` for per-tenant circuit keys) read
 * `globalThis[Symbol.for('@agora/context:accessor')]` STRUCTURALLY so they never
 * have to import `@adonis-agora/context` — they degrade to `undefined` when it is
 * absent. Published here at module load so merely importing `@adonis-agora/context`
 * (which every app that installs it does, via the provider) wires the contract.
 */
export const CONTEXT_ACCESSOR = Symbol.for('@agora/context:accessor');
(globalThis as Record<symbol, unknown>)[CONTEXT_ACCESSOR] = contextAccessor;
