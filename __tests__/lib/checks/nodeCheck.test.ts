import { describe, it, expect, vi } from 'vitest';
import { nodeCheck } from '../../../lib/checks/nodeCheck';
import { defaultConfig } from '../../../lib/constants/defaultConfig';

function makeDeps(files: Record<string, string>) {
  const normalizedEntries = Object.entries(files)
    .map(([filePath, contents]) => [filePath.replace(/\\/g, '/'), contents] as const)
    .sort(([left], [right]) => right.length - left.length);

  return {
    fileExists: (filePath: string) => {
      const normalized = filePath.replace(/\\/g, '/');
      return normalizedEntries.some(([key]) => normalized.endsWith(key));
    },
    readFile: (filePath: string) => {
      const normalized = filePath.replace(/\\/g, '/');
      const match = normalizedEntries.find(([key]) => normalized.endsWith(key));
      if (!match) throw new Error('not found');
      return match[1];
    },
  };
}

describe('nodeCheck', () => {
  it('returns ok when version satisfies package.json engines.node', async () => {
    const result = await nodeCheck.run(
      defaultConfig,
      {
        ...makeDeps({
          'package.json': JSON.stringify({ engines: { node: '>=18.0.0' } }),
        }),
        getNodeVersion: () => '20.11.0',
      }
    );
    expect(result.status).toBe('ok');
    expect(result.details).toMatchObject({
      current: '20.11.0',
      required: '>=18.0.0',
      satisfied: true,
      source: 'package.json#engines.node',
    });
  });

  it('returns error when version does not satisfy the target project requirement', async () => {
    const result = await nodeCheck.run(
      defaultConfig,
      {
        ...makeDeps({
          '.nvmrc': '18.20.4\n',
        }),
        getNodeVersion: () => '16.20.0',
      }
    );
    expect(result.status).toBe('error');
    expect(result.suggestion).toBeDefined();
    expect((result.details as { satisfied: boolean }).satisfied).toBe(false);
  });

  it('returns error when the discovered Node requirement is not a valid semver range', async () => {
    const result = await nodeCheck.run(
      defaultConfig,
      {
        ...makeDeps({
          'package.json': JSON.stringify({ engines: { node: 'not-a-range' } }),
        }),
        getNodeVersion: () => '20.0.0',
      }
    );
    expect(result.status).toBe('error');
    expect(result.suggestion).toBeDefined();
  });

  it('returns warning when the target project has no Node version metadata', async () => {
    const result = await nodeCheck.run(
      defaultConfig,
      {
        ...makeDeps({
          'package.json': JSON.stringify({ name: 'target-app' }),
        }),
        getNodeVersion: () => '20.0.0',
      }
    );
    expect(result.status).toBe('warning');
  });

  it('falls back to installed framework toolchain metadata when no explicit Node version file exists', async () => {
    const result = await nodeCheck.run(
      defaultConfig,
      {
        ...makeDeps({
          'package.json': JSON.stringify({
            name: 'next-app',
            dependencies: { next: '14.2.0', react: '^18.0.0' },
          }),
          'node_modules/next/package.json': JSON.stringify({
            engines: { node: '>=18.17.0' },
          }),
        }),
        getNodeVersion: () => '20.11.0',
      }
    );
    expect(result.status).toBe('ok');
    expect(result.message).toContain('from next');
    expect(result.details).toMatchObject({
      required: '>=18.17.0',
      basis: 'next',
      source: 'node_modules/next/package.json#engines.node',
    });
  });

  it('returns error when the installed framework toolchain is incompatible with the current Node version', async () => {
    const result = await nodeCheck.run(
      defaultConfig,
      {
        ...makeDeps({
          'package.json': JSON.stringify({
            name: 'vite-app',
            devDependencies: { vite: '^7.0.0' },
          }),
          'node_modules/vite/package.json': JSON.stringify({
            engines: { node: '>=20.19.0' },
          }),
        }),
        getNodeVersion: () => '18.20.0',
      }
    );
    expect(result.status).toBe('error');
    expect(result.message).toContain('from vite');
    expect((result.details as { basis: string }).basis).toBe('vite');
  });

  it('uses the resolved project root when targetPort is provided', async () => {
    const result = await nodeCheck.run(
      { ...defaultConfig, targetPort: 3000 },
      {
        ...makeDeps({
          'C:/apps/target/package.json': JSON.stringify({ engines: { node: '>=20.0.0' } }),
        }),
        getNodeVersion: () => '20.11.0',
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

  it('calls getNodeVersion from deps and never reads process.version directly', async () => {
    const mockGetVersion = vi.fn().mockReturnValue('20.0.0');
    await nodeCheck.run(defaultConfig, {
      ...makeDeps({
        'package.json': JSON.stringify({ engines: { node: '>=18.0.0' } }),
      }),
      getNodeVersion: mockGetVersion,
    });
    expect(mockGetVersion).toHaveBeenCalledOnce();
  });
});
