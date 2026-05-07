import { describe, it, expect, vi } from 'vitest';
import { getListeningPorts, getNodeVersion, getRunningProcesses } from '../../../lib/utils/system';

describe('getNodeVersion', () => {
  it('returns version string without leading v', () => {
    const version = getNodeVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(version.startsWith('v')).toBe(false);
  });
});

describe('getListeningPorts', () => {
  it('parses listening ports from Windows netstat output', async () => {
    const mockExec = vi.fn().mockResolvedValue({
      stdout: [
        '  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       6140',
        '  TCP    [::]:5432              [::]:0                 LISTENING       9000',
      ].join('\n'),
      stderr: '',
    });

    const ports = await getListeningPorts({ exec: mockExec, platform: 'win32' });
    expect(ports).toEqual([3000, 5432]);
  });

  it('deduplicates and sorts listening ports from unix output', async () => {
    const mockExec = vi.fn().mockResolvedValue({
      stdout: [
        'LISTEN 0      511                *:3001             *:*',
        'LISTEN 0      511                *:3000             *:*',
        'LISTEN 0      511                *:3001             *:*',
      ].join('\n'),
      stderr: '',
    });

    const ports = await getListeningPorts({ exec: mockExec, platform: 'linux' });
    expect(ports).toEqual([3000, 3001]);
  });
});

describe('getRunningProcesses', () => {
  it('returns lowercase lines from exec stdout', async () => {
    const mockExec = vi.fn().mockResolvedValue({ stdout: 'Redis-Server\nDockerD\n', stderr: '' });
    const lines = await getRunningProcesses({ exec: mockExec });
    expect(lines).toContain('redis-server');
    expect(lines).toContain('dockerd');
  });

  it('propagates errors from exec', async () => {
    const mockExec = vi.fn().mockRejectedValue(new Error('command not found'));
    await expect(getRunningProcesses({ exec: mockExec })).rejects.toThrow('command not found');
  });
});
