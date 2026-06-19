import { Context } from '@agora/context';
import { describe, expect, it } from 'vitest';
import { enterContext, runWithContext } from '../src/index.js';

describe('runWithContext', () => {
  it('runs the callback inside a fake store', () => {
    const out = runWithContext({ tenantId: 't1', userRef: { type: 'user', id: 7 } }, () => {
      expect(Context.tenantId()).toBe('t1');
      expect(Context.userRef()).toEqual({ type: 'user', id: 7 });
      return 'ok';
    });
    expect(out).toBe('ok');
    expect(Context.get()).toBeUndefined();
  });

  it('auto-fills a trace id when omitted', () => {
    runWithContext({}, () => {
      expect(Context.traceId()).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  it('honours an explicit trace id', () => {
    runWithContext({ traceId: 'fixed' }, () => {
      expect(Context.traceId()).toBe('fixed');
    });
  });
});

describe('enterContext', () => {
  it('establishes a fake context that survives an await', async () => {
    await Context.run({ traceId: 'outer' }, async () => {
      enterContext({ tenantId: 'tx' });
      await Promise.resolve();
      expect(Context.tenantId()).toBe('tx');
    });
  });
});
