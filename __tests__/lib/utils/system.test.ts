import { describe, it, expect, vi } from 'vitest';
import { getNodeVersion, isPortOpen, getRunningProcesses } from '../../../lib/utils/system';

describe('getNodeVersion', () => {
  it('returns version string without leading v', () => {
    const version = getNodeVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(version.startsWith('v')).toBe(false);
  });
});

describe('isPortOpen', () => {
  it('returns true when the port can be bound', async () => {
    const mockServer = {
      once: vi.fn((event: string, handler: () => void) => {
        if (event === 'listening') setTimeout(handler, 0);
        return mockServer;
      }),
      listen: vi.fn(),
      close: vi.fn((cb: () => void) => cb()),
    };
    const mockNet = { createServer: vi.fn(() => mockServer) };

    const result = await isPortOpen(3001, { net: mockNet as never });
    expect(result).toBe(true);
  });

  it('returns false when the port is in use', async () => {
    const mockServer = {
      once: vi.fn((event: string, handler: () => void) => {
        if (event === 'error') setTimeout(handler, 0);
        return mockServer;
      }),
      listen: vi.fn(),
      close: vi.fn(),
    };
    const mockNet = { createServer: vi.fn(() => mockServer) };

    const result = await isPortOpen(3001, { net: mockNet as never });
    expect(result).toBe(false);
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
