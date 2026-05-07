import { describe, it, expect, vi } from 'vitest';
import {
  getListeningPortDetails,
  getListeningPorts,
  getListeningProcessId,
  getNodeVersion,
  getProcessName,
  getProcessCommandLine,
  getRunningProcesses,
} from '../../../lib/utils/system';

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

describe('getListeningProcessId', () => {
  it('extracts the PID for a listening Windows port', async () => {
    const mockExec = vi.fn().mockResolvedValue({
      stdout: '  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       6140',
      stderr: '',
    });

    const pid = await getListeningProcessId(3000, { exec: mockExec, platform: 'win32' });
    expect(pid).toBe(6140);
  });
});

describe('getProcessName', () => {
  it('returns a trimmed process name when available', async () => {
    const mockExec = vi.fn().mockResolvedValue({
      stdout: 'node\n',
      stderr: '',
    });

    const processName = await getProcessName(6140, { exec: mockExec, platform: 'win32' });
    expect(processName).toBe('node');
  });
});

describe('getListeningPortDetails', () => {
  it('returns listening port details with process names on Windows', async () => {
    const mockExec = vi
      .fn()
      .mockResolvedValueOnce({
        stdout: [
          '  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       6140',
          '  TCP    0.0.0.0:5432           0.0.0.0:0              LISTENING       9000',
        ].join('\n'),
        stderr: '',
      })
      .mockResolvedValueOnce({
        stdout: [
          '"node.exe","6140","Console","1","12,000 K"',
          '"postgres.exe","9000","Console","1","18,000 K"',
        ].join('\n'),
        stderr: '',
      });

    const details = await getListeningPortDetails({ exec: mockExec, platform: 'win32' });
    expect(details).toEqual([
      { port: 3000, pid: 6140, processName: 'node' },
      { port: 5432, pid: 9000, processName: 'postgres' },
    ]);
  });
});

describe('getProcessCommandLine', () => {
  it('returns a trimmed command line when available', async () => {
    const mockExec = vi.fn().mockResolvedValue({
      stdout: 'node "C:\\apps\\target\\node_modules\\next\\dist\\bin\\next" dev',
      stderr: '',
    });

    const commandLine = await getProcessCommandLine(6140, { exec: mockExec, platform: 'win32' });
    expect(commandLine).toContain('next');
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
