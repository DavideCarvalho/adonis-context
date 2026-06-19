import { describe, expect, it } from 'vitest';
import { wireContextIntoDiagnostics } from '../src/diagnostics_bridge.js';

describe('wireContextIntoDiagnostics', () => {
  it('no-ops silently when @agora/diagnostics is not installed', async () => {
    // The optional peer is absent in this repo; the dynamic import rejects and
    // the bridge swallows it — no throw, no return value.
    await expect(wireContextIntoDiagnostics()).resolves.toBeUndefined();
  });
});
