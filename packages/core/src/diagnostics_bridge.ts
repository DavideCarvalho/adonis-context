import { contextAccessor } from './accessor.js';

/**
 * The minimal surface of `@agora/diagnostics` this bridge touches. Declared
 * locally on purpose: there is NO static import of the package in either
 * direction, so the two stay fully decoupled and `@agora/diagnostics` remains an
 * entirely optional, unlisted peer.
 */
interface DiagnosticsLike {
  setContextAccessor: (accessor: {
    traceId(): string | undefined;
    get(): Record<string, unknown> | undefined;
  }) => void;
}

/**
 * Soft, one-way bridge into `@agora/diagnostics` (an OPTIONAL peer).
 *
 * When that package is installed, we register this package's
 * {@link contextAccessor} as its trace source, so `emit()` auto-fills the
 * `traceId` on every `aviary:*` diagnostic event — for authz, inertia, durable,
 * and any future emitter — with zero action from the app.
 *
 * The specifier is held in a variable so the import is treated as fully dynamic:
 * `@agora/diagnostics` never needs to resolve at type-check time, and if it is
 * not installed the import rejects and we no-op (events simply carry no
 * `traceId`).
 */
export async function wireContextIntoDiagnostics(): Promise<void> {
  try {
    const specifier = '@agora/diagnostics';
    const diagnostics = (await import(specifier)) as DiagnosticsLike;
    diagnostics.setContextAccessor(
      contextAccessor as unknown as Parameters<DiagnosticsLike['setContextAccessor']>[0],
    );
  } catch {
    // @agora/diagnostics is not installed — nothing to wire.
  }
}
