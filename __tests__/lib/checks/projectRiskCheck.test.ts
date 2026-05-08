import { describe, expect, it } from 'vitest';
import { runProjectRiskCheck } from '@/lib/checks/projectRiskCheck';
import type { DevGuardConfig } from '@/lib/types';

const baseConfig: DevGuardConfig = {
  requiredEnvKeys: [],
  processes: [],
  timeoutMs: 4000,
};

describe('projectRiskCheck', () => {
  it('returns warning for missing lockfile when package exists', async () => {
    const result = await runProjectRiskCheck(baseConfig, {
      fileExists(filePath) {
        return filePath.endsWith('package.json') || filePath.endsWith('.gitignore');
      },
      readFile(filePath) {
        if (filePath.endsWith('.gitignore')) return '.env\nnode_modules\n';
        if (filePath.endsWith('package.json')) return JSON.stringify({ dependencies: { next: '^14.2.0' } });
        return '';
      },
    });

    expect(result.status).toBe('warning');
    expect(result.name).toBe('Project Risks');
    expect(result.details?.total).toBeGreaterThan(0);
  });

  it('returns ok when no risks are detected', async () => {
    const result = await runProjectRiskCheck(baseConfig, {
      fileExists(filePath) {
        return filePath.endsWith('.gitignore') || filePath.endsWith('package.json') || filePath.endsWith('package-lock.json');
      },
      readFile(filePath) {
        if (filePath.endsWith('.gitignore')) return '.env\nnode_modules\n';
        if (filePath.endsWith('package.json')) {
          return JSON.stringify({
            dependencies: { next: '^14.2.0', react: '^18.3.0' },
            devDependencies: { typescript: '^5.0.0' },
          });
        }
        return '';
      },
    });

    expect(result.status).toBe('ok');
    expect(result.details?.total).toBe(0);
  });

  it('accepts /node_modules ignore style', async () => {
    const result = await runProjectRiskCheck(baseConfig, {
      fileExists(filePath) {
        return filePath.endsWith('.gitignore') || filePath.endsWith('package.json') || filePath.endsWith('package-lock.json');
      },
      readFile(filePath) {
        if (filePath.endsWith('.gitignore')) return '/node_modules\n.env*.local\n';
        if (filePath.endsWith('package.json')) {
          return JSON.stringify({
            dependencies: { next: '^14.2.0', react: '^18.3.0' },
          });
        }
        return '';
      },
    });

    expect(result.status).toBe('ok');
    expect(result.details?.total).toBe(0);
  });
});
