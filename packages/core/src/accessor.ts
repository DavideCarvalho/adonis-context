import { Context, type ContextStore, type UserRef } from './context.js';

/**
 * The read-only view of the context that consumer libs inject via
 * {@link CONTEXT_ACCESSOR}. Intentionally a narrow surface (no `set`/`run`) —
 * consumers read, they do not drive the lifecycle.
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
