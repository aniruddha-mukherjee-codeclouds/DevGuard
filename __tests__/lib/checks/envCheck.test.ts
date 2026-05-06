import { describe, it, expect } from 'vitest';
import { envCheck } from '../../../lib/checks/envCheck';
import { defaultConfig } from '../../../lib/constants/defaultConfig';

function makeDeps(content: string | null, env: Record<string, string> = {}) {
  return {
    fileExists: () => content !== null,
    readFile: () => {
      if (content === null) throw new Error('not found');
      return content;
    },
    env,
  };
}

describe('envCheck', () => {
  it('returns warning when .env.example does not exist', async () => {
    const result = await envCheck.run(defaultConfig, makeDeps(null));
    expect(result.status).toBe('warning');
    expect(result.suggestion).toBeDefined();
  });

  it('returns ok when all keys are present in env', async () => {
    const result = await envCheck.run(
      { ...defaultConfig, requiredEnvKeys: [] },
      makeDeps('DATABASE_URL=\nAPI_KEY=\n', { DATABASE_URL: 'x', API_KEY: 'y' })
    );
    expect(result.status).toBe('ok');
    expect((result.details as { missing: string[] }).missing).toHaveLength(0);
  });

  it('returns error when keys are missing', async () => {
    const result = await envCheck.run(
      { ...defaultConfig, requiredEnvKeys: [] },
      makeDeps('DATABASE_URL=\nAPI_KEY=\n', {})
    );
    expect(result.status).toBe('error');
    expect(result.suggestion).toBeDefined();
    expect((result.details as { missing: string[] }).missing).toContain('DATABASE_URL');
  });

  it('returns ok with message when .env.example is empty', async () => {
    const result = await envCheck.run(defaultConfig, makeDeps('', {}));
    expect(result.status).toBe('ok');
    expect(result.message).toBe('No keys defined in .env.example');
  });

  it('deduplicates keys across .env.example and requiredEnvKeys', async () => {
    const result = await envCheck.run(
      { ...defaultConfig, requiredEnvKeys: ['DATABASE_URL', 'EXTRA'] },
      makeDeps('DATABASE_URL=\n', { DATABASE_URL: 'x', EXTRA: 'y' })
    );
    expect(result.status).toBe('ok');
    expect((result.details as { total: number }).total).toBe(2);
  });
});
