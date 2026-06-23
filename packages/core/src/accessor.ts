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
  get(): ContextStore | undefined;
}

/** Default accessor: a thin facade over the singleton {@link Context}. */
export const contextAccessor: ContextAccessor = {
  traceId: () => Context.traceId(),
  tenantId: () => Context.tenantId(),
  userRef: () => Context.userRef(),
  get: () => Context.get(),
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
