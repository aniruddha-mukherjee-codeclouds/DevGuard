import { describe, it, expect, vi } from 'vitest';
import { portCheck } from '../../../lib/checks/portCheck';
import { defaultConfig } from '../../../lib/constants/defaultConfig';

function makeMockNet(isFree: boolean) {
  const mockServer = {
    once: vi.fn((event: string, handler: () => void) => {
      if (isFree && event === 'listening') setTimeout(handler, 0);
      if (!isFree && event === 'error') setTimeout(handler, 0);
      return mockServer;
    }),
    listen: vi.fn(),
    close: vi.fn((cb?: () => void) => cb?.()),
  };
  return { createServer: vi.fn(() => mockServer) };
}

describe('portCheck', () => {
  it('returns ok when all ports are free', async () => {
    const config = { ...defaultConfig, ports: [3001, 3002] };
    const result = await portCheck.run(config, { net: makeMockNet(true) as never });
    expect(result.status).toBe('ok');
    expect(result.details).toEqual({ occupied: [], free: [3001, 3002] });
  });

  it('returns warning when a port is occupied', async () => {
    const config = { ...defaultConfig, ports: [3001] };
    const result = await portCheck.run(config, { net: makeMockNet(false) as never });
    expect(result.status).toBe('warning');
    expect((result.details as { occupied: number[] }).occupied).toContain(3001);
    expect(result.suggestion).toBeDefined();
  });

  it('returns ok with message when ports array is empty', async () => {
    const config = { ...defaultConfig, ports: [] };
    const result = await portCheck.run(config);
    expect(result.status).toBe('ok');
    expect(result.message).toBe('No ports configured to check');
  });

  it('includes durationMs as a number', async () => {
    const config = { ...defaultConfig, ports: [] };
    const result = await portCheck.run(config);
    expect(typeof result.durationMs).toBe('number');
  });
});
