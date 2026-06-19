import { randomFillSync } from 'node:crypto';

/**
 * W3C Trace Context `traceparent` header:
 *   version "-" trace-id "-" parent-id "-" trace-flags
 *   e.g. 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
 *
 * Spec: https://www.w3.org/TR/trace-context/#traceparent-header
 */
const TRACEPARENT_RE = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

type Headers = Record<string, string | string[] | undefined>;

function firstHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Extract the trace-id (the 32-hex middle segment) from a `traceparent` header.
 * Returns `undefined` if the header is missing or malformed.
 *
 * @param headers request headers (keys are assumed lower-cased, as Node delivers).
 * @param headerName header to read; defaults to the W3C `traceparent`.
 */
export function extractTraceparent(
  headers: Headers,
  headerName = 'traceparent',
): string | undefined {
  const raw = firstHeader(headers[headerName] ?? headers[headerName.toLowerCase()]);
  if (!raw) {
    return undefined;
  }
  const match = TRACEPARENT_RE.exec(raw.trim());
  if (!match) {
    return undefined;
  }
  const traceId = match[2];
  // All-zero trace-id is invalid per spec. The capture group already guarantees
  // exactly 32 hex chars, so a constant compare is equivalent to /^0+$/.
  if (traceId === '00000000000000000000000000000000') {
    return undefined;
  }
  return traceId;
}

/**
 * The salient parts of an incoming `traceparent`, kept so the downstream
 * `traceparent` we re-emit faithfully continues the upstream trace instead of
 * fabricating a brand-new one. See {@link toTraceparent}.
 */
export interface ParsedTraceparent {
  /** The 32-hex trace-id (the trace this request belongs to). */
  traceId: string;
  /** The 16-hex upstream span-id, propagated as our re-emitted parent-id. */
  parentId?: string;
  /** The 2-hex W3C trace-flags byte (e.g. `01` sampled, `00` not sampled). */
  flags?: string;
}

/**
 * Parse a `traceparent` header into its trace-id / parent-id / trace-flags.
 * Returns `undefined` if the header is missing, malformed, or carries the
 * reserved all-zero trace-id (same validity rules as {@link extractTraceparent}).
 *
 * @param headers request headers (keys are assumed lower-cased, as Node delivers).
 * @param headerName header to read; defaults to the W3C `traceparent`.
 */
export function parseTraceparent(
  headers: Headers,
  headerName = 'traceparent',
): ParsedTraceparent | undefined {
  const raw = firstHeader(headers[headerName] ?? headers[headerName.toLowerCase()]);
  if (!raw) {
    return undefined;
  }
  const match = TRACEPARENT_RE.exec(raw.trim());
  if (!match) {
    return undefined;
  }
  // Groups 2/3/4 are non-optional in TRACEPARENT_RE, so a successful match
  // always populates them; the assertions just narrow `string | undefined`.
  const traceId = match[2] as string;
  if (traceId === '00000000000000000000000000000000') {
    return undefined;
  }
  return { traceId, parentId: match[3] as string, flags: match[4] as string };
}

// Reused scratch buffers for id generation. `randomFillSync` overwrites every
// byte each call and the result is stringified before returning, so reusing a
// single buffer per size avoids a per-call Buffer allocation. Safe because these
// are synchronous (no yield between fill and `.toString`), single-threaded JS,
// and a worker_thread gets its own module instance / buffers.
const traceIdScratch = Buffer.allocUnsafe(16);
const spanIdScratch = Buffer.allocUnsafe(8);

/** A fresh 16-byte (32 hex char) trace-id, matching the W3C trace-id shape. */
export function randomTraceId(): string {
  return randomFillSync(traceIdScratch).toString('hex');
}

/** A fresh 8-byte (16 hex char) span-id / parent-id, per the W3C shape. */
function randomSpanId(): string {
  return randomFillSync(spanIdScratch).toString('hex');
}

/**
 * Wrap a trace-id back into a `traceparent` header value.
 *
 * When `upstream` (from {@link parseTraceparent}) is supplied, the re-emitted
 * header faithfully continues the incoming trace: the upstream span-id becomes
 * our parent-id and the upstream trace-flags (including the `sampled` bit) are
 * propagated verbatim — so an incoming `-00` (not sampled) round-trips as `-00`.
 *
 * With no `upstream` (a genuinely new trace), we mint a random parent-id and
 * default the flags to `01` (sampled) so downstream collectors keep the span.
 */
export function toTraceparent(traceId: string, upstream?: ParsedTraceparent): string {
  const parentId = upstream?.parentId ?? randomSpanId();
  const flags = upstream?.flags ?? '01';
  return `00-${traceId}-${parentId}-${flags}`;
}
