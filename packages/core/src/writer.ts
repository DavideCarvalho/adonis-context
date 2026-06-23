import { Context, type ContextStore, type UserRef } from './context.js';

/**
 * The patch a {@link ContextWriter} merges into the active store. The known
 * fields (`userRef`, `tenantId`) are typed; arbitrary keys are accepted too so a
 * sibling lib can populate fields it has module-augmented onto the
 * {@link ContextStore} without importing those types here.
 */
export interface ContextSetPatch {
  userRef?: UserRef;
  tenantId?: string;
  [k: string]: unknown;
}

/**
 * The structural WRITE counterpart of the read-only accessor: a tiny writer that
 * merges a patch into the CURRENTLY-ACTIVE context store. Intentionally narrow —
 * it populates, it does not drive the lifecycle (no `run`/`enterWith`).
 */
export interface ContextWriter {
  /**
   * Merge `patch` into the active store via {@link Context.set}. No-op (never
   * throws) when there is no active context — the value is simply dropped,
   * mirroring `Context.set`'s out-of-context behaviour.
   */
  set(patch: ContextSetPatch): void;
}

/** Default writer: a thin facade over the singleton {@link Context}. */
export const contextWriter: ContextWriter = {
  set(patch: ContextSetPatch): void {
    for (const key of Object.keys(patch)) {
      // Reuse Context.set so the active-store lookup + out-of-context no-op live
      // in one place. The cast bridges the open-ended patch to the keyed setter.
      Context.set(key as keyof ContextStore, patch[key] as ContextStore[keyof ContextStore]);
    }
  },
};

/**
 * The cross-copy-stable global slot the ecosystem POPULATES the context through.
 * Symmetric to {@link CONTEXT_ACCESSOR}: other Agora libs (e.g.
 * `@adonis-agora/authkit`) read `globalThis[Symbol.for('@agora/context:set')]`
 * STRUCTURALLY so they can write `userRef`/`tenantId` into the active context
 * without importing `@adonis-agora/context` — they degrade to `undefined` (no
 * write) when it is absent. Published here at module load so merely importing
 * `@adonis-agora/context` (which every app that installs it does, via the
 * provider) wires the contract.
 */
export const CONTEXT_SET = Symbol.for('@agora/context:set');
(globalThis as Record<symbol, unknown>)[CONTEXT_SET] = contextWriter.set;
