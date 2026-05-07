import { describe, it, expect, vi } from 'vitest';
import { portCheck } from '../../../lib/checks/portCheck';
import { defaultConfig } from '../../../lib/constants/defaultConfig';

describe('portCheck', () => {
  it('returns ok when no listening ports are detected', async () => {
    const mockExec = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const result = await portCheck.run(defaultConfig, { exec: mockExec, platform: 'win32' });
    expect(result.status).toBe('ok');
    expect(result.details).toEqual({ occupied: [], total: 0 });
  });

  it('returns warning with the occupied listening ports', async () => {
    const mockExec = vi.fn().mockResolvedValue({
      stdout: '  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       6140',
      stderr: '',
    });
    const result = await portCheck.run(defaultConfig, { exec: mockExec, platform: 'win32' });
    expect(result.status).toBe('warning');
    expect((result.details as { occupied: number[] }).occupied).toContain(3000);
    expect(result.suggestion).toBeDefined();
  });

  it('returns the occupied ports in sorted order', async () => {
    const mockExec = vi.fn().mockResolvedValue({
      stdout: [
        '  TCP    0.0.0.0:5432           0.0.0.0:0              LISTENING       6140',
        '  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       6141',
      ].join('\n'),
      stderr: '',
    });
    const result = await portCheck.run(defaultConfig, { exec: mockExec, platform: 'win32' });
    expect(result.details).toEqual({ occupied: [3000, 5432], total: 2 });
  });

  it('includes durationMs as a number', async () => {
    const mockExec = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const result = await portCheck.run(defaultConfig, { exec: mockExec, platform: 'win32' });
    expect(typeof result.durationMs).toBe('number');
  });
});
