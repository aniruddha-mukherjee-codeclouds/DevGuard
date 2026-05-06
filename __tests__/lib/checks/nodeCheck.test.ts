import { describe, it, expect, vi } from 'vitest';
import { nodeCheck } from '../../../lib/checks/nodeCheck';
import { defaultConfig } from '../../../lib/constants/defaultConfig';

describe('nodeCheck', () => {
  it('returns ok when version satisfies the range', async () => {
    const result = await nodeCheck.run(
      { ...defaultConfig, requiredNodeVersion: '>=18.0.0' },
      { getNodeVersion: () => '20.11.0' }
    );
    expect(result.status).toBe('ok');
    expect(result.details).toMatchObject({ current: '20.11.0', required: '>=18.0.0', satisfied: true });
  });

  it('returns error when version does not satisfy the range', async () => {
    const result = await nodeCheck.run(
      { ...defaultConfig, requiredNodeVersion: '>=18.0.0' },
      { getNodeVersion: () => '16.20.0' }
    );
    expect(result.status).toBe('error');
    expect(result.suggestion).toBeDefined();
    expect((result.details as { satisfied: boolean }).satisfied).toBe(false);
  });

  it('returns error when requiredNodeVersion is not a valid semver range', async () => {
    const result = await nodeCheck.run(
      { ...defaultConfig, requiredNodeVersion: 'not-a-range' },
      { getNodeVersion: () => '20.0.0' }
    );
    expect(result.status).toBe('error');
    expect(result.suggestion).toBeDefined();
  });

  it('calls getNodeVersion from deps and never reads process.version directly', async () => {
    const mockGetVersion = vi.fn().mockReturnValue('20.0.0');
    await nodeCheck.run(defaultConfig, { getNodeVersion: mockGetVersion });
    expect(mockGetVersion).toHaveBeenCalledOnce();
  });
});
