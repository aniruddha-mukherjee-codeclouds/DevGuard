import { describe, it, expect, vi } from 'vitest';
import { portCheck } from '../../../lib/checks/portCheck';
import { defaultConfig } from '../../../lib/constants/defaultConfig';

describe('portCheck', () => {
  it('returns ok when no listening ports are detected', async () => {
    const mockExec = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const result = await portCheck.run(defaultConfig, { exec: mockExec, platform: 'win32' });
    expect(result.status).toBe('ok');
    expect(result.details).toEqual({ occupied: [], listeners: [], total: 0 });
  });

  it('returns warning with the occupied listening ports', async () => {
    const mockExec = vi
      .fn()
      .mockResolvedValueOnce({
        stdout: '  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       6140',
        stderr: '',
      })
      .mockResolvedValueOnce({
        stdout: '"node.exe","6140","Console","1","12,000 K"',
        stderr: '',
      });
    const result = await portCheck.run(defaultConfig, { exec: mockExec, platform: 'win32' });
    expect(result.status).toBe('warning');
    expect((result.details as { occupied: number[] }).occupied).toContain(3000);
    expect((result.details as { listeners: Array<{ processName: string }> }).listeners[0].processName).toBe('node');
    expect(result.suggestion).toBeDefined();
  });

  it('returns the occupied ports in sorted order', async () => {
    const mockExec = vi
      .fn()
      .mockResolvedValueOnce({
        stdout: [
          '  TCP    0.0.0.0:5432           0.0.0.0:0              LISTENING       6140',
          '  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       6141',
        ].join('\n'),
        stderr: '',
      })
      .mockResolvedValueOnce({
        stdout: [
          '"postgres.exe","6140","Console","1","18,000 K"',
          '"node.exe","6141","Console","1","12,000 K"',
        ].join('\n'),
        stderr: '',
      });
    const result = await portCheck.run(defaultConfig, { exec: mockExec, platform: 'win32' });
    expect(result.details).toEqual({
      occupied: [3000, 5432],
      listeners: [
        { port: 3000, pid: 6141, processName: 'node', isTarget: false },
        { port: 5432, pid: 6140, processName: 'postgres', isTarget: false },
      ],
      total: 2,
    });
  });

  it('returns error when the target port is already occupied', async () => {
    const mockExec = vi
      .fn()
      .mockResolvedValueOnce({
        stdout: '  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       6140',
        stderr: '',
      })
      .mockResolvedValueOnce({
        stdout: '"node.exe","6140","Console","1","12,000 K"',
        stderr: '',
      });
    const result = await portCheck.run(
      { ...defaultConfig, targetPort: 3000 },
      {
        exec: mockExec,
        platform: 'win32',
        resolveProjectRootFromPort: async () => ({
          projectRoot: null,
          pid: 6140,
          commandLine: null,
        }),
      }
    );
    expect(result.status).toBe('error');
    expect(result.message).toContain('another process');
  });

  it('returns ok when the target port is available', async () => {
    const mockExec = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const result = await portCheck.run(
      { ...defaultConfig, targetPort: 3000 },
      { exec: mockExec, platform: 'win32' }
    );
    expect(result.status).toBe('ok');
    expect(result.message).toContain('Port 3000 is available');
  });

  it('returns ok when the target port is already in use by the resolved target project', async () => {
    const mockExec = vi
      .fn()
      .mockResolvedValueOnce({
        stdout: '  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       6140',
        stderr: '',
      })
      .mockResolvedValueOnce({
        stdout: '"node.exe","6140","Console","1","12,000 K"',
        stderr: '',
      });
    const result = await portCheck.run(
      { ...defaultConfig, targetPort: 3000 },
      {
        exec: mockExec,
        platform: 'win32',
        resolveProjectRootFromPort: async () => ({
          projectRoot: 'C:/apps/frontend',
          pid: 6140,
          commandLine: 'node C:/apps/frontend/node_modules/next/dist/bin/next dev',
        }),
      }
    );
    expect(result.status).toBe('ok');
    expect(result.message).toContain('target project');
    expect(result.details).toMatchObject({
      targetOwned: true,
      targetProjectRoot: 'C:/apps/frontend',
      targetPid: 6140,
    });
  });

  it('includes durationMs as a number', async () => {
    const mockExec = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const result = await portCheck.run(defaultConfig, { exec: mockExec, platform: 'win32' });
    expect(typeof result.durationMs).toBe('number');
  });
});
