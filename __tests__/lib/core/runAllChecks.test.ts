import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runAllChecks } from '../../../lib/core/runAllChecks';
import type { CheckResult, CheckModule, DevGuardConfig } from '../../../lib/types';
import { defaultConfig } from '../../../lib/constants/defaultConfig';

function makeCheck(name: string, override: Partial<CheckResult> = {}): CheckModule {
  return {
    name,
    run: vi.fn().mockResolvedValue({
      name,
      status: 'ok',
      message: 'all good',
      durationMs: 1,
      ...override,
    } as CheckResult),
  };
}

function makeStalledCheck(name: string): CheckModule {
  return { name, run: vi.fn().mockReturnValue(new Promise(() => {})) };
}

describe('runAllChecks — overallStatus derivation', () => {
  it('returns ok when all checks pass', async () => {
    const checks = [makeCheck('A'), makeCheck('B')];
    const res = await runAllChecks({ config: defaultConfig, checks });
    expect(res.overallStatus).toBe('ok');
  });

  it('returns warning when one check warns', async () => {
    const checks = [makeCheck('A'), makeCheck('B', { status: 'warning' })];
    const res = await runAllChecks({ config: defaultConfig, checks });
    expect(res.overallStatus).toBe('warning');
  });

  it('returns error when one check errors', async () => {
    const checks = [
      makeCheck('A'),
      makeCheck('B', { status: 'error', suggestion: 'fix it' }),
    ];
    const res = await runAllChecks({ config: defaultConfig, checks });
    expect(res.overallStatus).toBe('error');
  });
});

describe('runAllChecks — error and timeout handling', () => {
  it('handles a check that throws without crashing the runner', async () => {
    const bad: CheckModule = { name: 'Exploding', run: vi.fn().mockRejectedValue(new Error('boom')) };
    const res = await runAllChecks({ config: defaultConfig, checks: [bad] });
    expect(res.results[0].status).toBe('error');
    expect(res.results[0].suggestion).toBeTruthy();
  });

  describe('timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('produces an error result when a check exceeds timeoutMs', async () => {
      const config = { ...defaultConfig, timeoutMs: 100 };
      const check = makeStalledCheck('Slow');
      const promise = runAllChecks({ config, checks: [check] });
      vi.advanceTimersByTime(200);
      const res = await promise;
      expect(res.results[0].status).toBe('error');
      expect(res.results[0].message).toContain('Slow');
      expect(res.results[0].message).toContain('100ms');
      expect(res.results[0].suggestion).toBeTruthy();
    });
  });
});

describe('runAllChecks — general behaviour', () => {
  it('returns ok for an empty checks array', async () => {
    const res = await runAllChecks({ config: defaultConfig, checks: [] });
    expect(res.overallStatus).toBe('ok');
    expect(res.results).toHaveLength(0);
  });

  it('timestamp is ISO 8601', async () => {
    const res = await runAllChecks({ config: defaultConfig, checks: [] });
    expect(res.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('every error result has a non-empty suggestion', async () => {
    const bad: CheckModule = { name: 'Bad', run: vi.fn().mockRejectedValue(new Error('oops')) };
    const res = await runAllChecks({ config: defaultConfig, checks: [bad] });
    res.results
      .filter((r) => r.status === 'error')
      .forEach((r) => expect(r.suggestion).toBeTruthy());
  });

  it('matches ScanResponse snapshot', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const checks = [makeCheck('Test', { status: 'ok', message: 'all good', durationMs: 5 })];
    const res = await runAllChecks({ config: defaultConfig, checks });
    expect(res).toMatchSnapshot();
    vi.useRealTimers();
  });
});
