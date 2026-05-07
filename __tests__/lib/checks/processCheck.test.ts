import { describe, it, expect, vi } from 'vitest';
import { processCheck } from '../../../lib/checks/processCheck';
import { defaultConfig } from '../../../lib/constants/defaultConfig';

describe('processCheck', () => {
  it('returns ok when all processes are running', async () => {
    const mockExec = vi.fn().mockResolvedValue({ stdout: 'redis-server\ndocker\n', stderr: '' });
    const result = await processCheck.run(
      { ...defaultConfig, processes: ['redis', 'docker'] },
      { exec: mockExec }
    );
    expect(result.status).toBe('ok');
    expect((result.details as { running: string[] }).running).toContain('redis');
  });

  it('returns warning when processes are missing', async () => {
    const mockExec = vi.fn().mockResolvedValue({ stdout: 'chrome\n', stderr: '' });
    const result = await processCheck.run(
      { ...defaultConfig, processes: ['redis', 'docker'] },
      { exec: mockExec }
    );
    expect(result.status).toBe('warning');
    expect(result.suggestion).toBeDefined();
    expect((result.details as { missing: string[] }).missing).toContain('redis');
  });

  it('returns ok with message when processes array is empty', async () => {
    const result = await processCheck.run({ ...defaultConfig, processes: [] });
    expect(result.status).toBe('ok');
    expect(result.message).toBe('No processes configured to check');
  });

  it('returns error when exec fails', async () => {
    const mockExec = vi.fn().mockRejectedValue(new Error('exec failed'));
    const result = await processCheck.run(
      { ...defaultConfig, processes: ['redis'] },
      { exec: mockExec }
    );
    expect(result.status).toBe('error');
    expect(result.suggestion).toBeDefined();
  });
});
