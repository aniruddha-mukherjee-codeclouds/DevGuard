import { describe, it, expect } from 'vitest';
import { envCheck } from '../../../lib/checks/envCheck';
import { defaultConfig } from '../../../lib/constants/defaultConfig';

function makeDeps(files: Record<string, string>) {
  return {
    fileExists: (filePath: string) => {
      const normalized = filePath.replace(/\\/g, '/');
      return Object.keys(files).some((key) => normalized.endsWith(key.replace(/\\/g, '/')));
    },
    readFile: (filePath: string) => {
      const normalized = filePath.replace(/\\/g, '/');
      const match = Object.keys(files).find((key) => normalized.endsWith(key.replace(/\\/g, '/')));
      if (!match) throw new Error('not found');
      return files[match];
    },
  };
}

describe('envCheck', () => {
  it('returns warning when .env.example does not exist', async () => {
    const result = await envCheck.run(defaultConfig, makeDeps({}));
    expect(result.status).toBe('warning');
    expect(result.suggestion).toBeDefined();
  });

  it('returns ok when all keys are present in project env files', async () => {
    const result = await envCheck.run(
      { ...defaultConfig, requiredEnvKeys: [] },
      makeDeps({
        '.env.example': 'DATABASE_URL=\nAPI_KEY=\n',
        '.env': 'DATABASE_URL=postgres://db\nAPI_KEY=secret\n',
      })
    );
    expect(result.status).toBe('ok');
    expect((result.details as { missing: string[] }).missing).toHaveLength(0);
  });

  it('returns error when keys are missing from project env files', async () => {
    const result = await envCheck.run(
      { ...defaultConfig, requiredEnvKeys: [] },
      makeDeps({
        '.env.example': 'DATABASE_URL=\nAPI_KEY=\n',
        '.env': '',
      })
    );
    expect(result.status).toBe('error');
    expect(result.suggestion).toBeDefined();
    expect((result.details as { missing: string[] }).missing).toContain('DATABASE_URL');
  });

  it('returns ok with message when .env.example is empty', async () => {
    const result = await envCheck.run(defaultConfig, makeDeps({ '.env.example': '' }));
    expect(result.status).toBe('ok');
    expect(result.message).toBe('No keys defined in .env.example');
  });

  it('deduplicates keys across .env.example and requiredEnvKeys', async () => {
    const result = await envCheck.run(
      { ...defaultConfig, requiredEnvKeys: ['DATABASE_URL', 'EXTRA'] },
      makeDeps({
        '.env.example': 'DATABASE_URL=\n',
        '.env': 'DATABASE_URL=x\nEXTRA=y\n',
      })
    );
    expect(result.status).toBe('ok');
    expect((result.details as { total: number }).total).toBe(2);
  });

  it('prefers .env.local over .env for the same key', async () => {
    const result = await envCheck.run(
      { ...defaultConfig, requiredEnvKeys: [] },
      makeDeps({
        '.env.example': 'API_KEY=\n',
        '.env': 'API_KEY=changeme\n',
        '.env.local': 'API_KEY=real-secret\n',
      })
    );
    expect(result.status).toBe('ok');
  });

  it('flags placeholder values as configuration issues', async () => {
    const result = await envCheck.run(
      { ...defaultConfig, requiredEnvKeys: [] },
      makeDeps({
        '.env.example': 'API_KEY=\n',
        '.env.local': 'API_KEY=changeme\n',
      })
    );
    expect(result.status).toBe('error');
    expect((result.details as { placeholderLike: string[] }).placeholderLike).toContain('API_KEY');
  });

  it('returns warning when no project env files exist', async () => {
    const result = await envCheck.run(
      { ...defaultConfig, requiredEnvKeys: [] },
      makeDeps({
        '.env.example': 'DATABASE_URL=\nAPI_KEY=\n',
      })
    );
    expect(result.status).toBe('warning');
    expect((result.details as { filesChecked: string[] }).filesChecked).toEqual([]);
  });

  it('uses the resolved project root when targetPort is provided', async () => {
    const result = await envCheck.run(
      { ...defaultConfig, requiredEnvKeys: [], targetPort: 3000 },
      {
        ...makeDeps({
          'C:/apps/target/.env.example': 'API_KEY=\n',
          'C:/apps/target/.env.local': 'API_KEY=real-secret\n',
          'C:/apps/target/package.json': '{}',
        }),
        resolveProjectRootFromPort: async () => ({
          projectRoot: 'C:/apps/target',
          pid: 6140,
          commandLine: 'node C:/apps/target/node_modules/next/dist/bin/next dev',
        }),
      }
    );

    expect(result.status).toBe('ok');
    expect((result.details as { projectRoot: string }).projectRoot).toBe('C:/apps/target');
  });

  it('returns a warning when targetPort cannot be resolved to a project root', async () => {
    const result = await envCheck.run(
      { ...defaultConfig, requiredEnvKeys: [], targetPort: 3000 },
      {
        ...makeDeps({}),
        resolveProjectRootFromPort: async () => ({
          projectRoot: null,
          pid: 6140,
          commandLine: null,
        }),
      }
    );

    expect(result.status).toBe('warning');
    expect(result.message).toContain('port 3000');
  });
});
