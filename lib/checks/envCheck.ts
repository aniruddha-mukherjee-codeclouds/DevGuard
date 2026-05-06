import fs from 'fs';
import path from 'path';
import type { CheckResult, DevGuardConfig } from '../types';

export interface EnvDeps {
  fileExists?: (p: string) => boolean;
  readFile?: (p: string) => string;
  env?: Record<string, string | undefined>;
}

function parseEnvKeys(content: string): string[] {
  return content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('=')[0].trim())
    .filter(Boolean);
}

export const envCheck = {
  name: 'Env Check',

  async run(config: DevGuardConfig, deps: EnvDeps = {}): Promise<CheckResult> {
    const start = performance.now();
    const fileExists = deps.fileExists ?? ((p: string) => fs.existsSync(p));
    const readFile = deps.readFile ?? ((p: string) => fs.readFileSync(p, 'utf-8'));
    const env = deps.env ?? process.env;
    const examplePath = path.join(process.cwd(), '.env.example');

    if (!fileExists(examplePath)) {
      return {
        name: 'Env Check',
        status: 'warning',
        message: '.env.example not found',
        suggestion: 'Create a .env.example file listing required environment variable keys',
        details: { missing: [], present: [], total: 0 },
        durationMs: Math.round(performance.now() - start),
      };
    }

    let keysFromFile: string[] = [];
    try {
      keysFromFile = parseEnvKeys(readFile(examplePath));
    } catch (err) {
      return {
        name: 'Env Check',
        status: 'error',
        message: 'Failed to read .env.example',
        suggestion: 'Check file permissions for .env.example',
        details: { error: (err as Error).message },
        durationMs: Math.round(performance.now() - start),
      };
    }

    const allKeys = [...new Set([...keysFromFile, ...config.requiredEnvKeys])];

    if (allKeys.length === 0) {
      return {
        name: 'Env Check',
        status: 'ok',
        message: 'No keys defined in .env.example',
        details: { missing: [], present: [], total: 0 },
        durationMs: Math.round(performance.now() - start),
      };
    }

    const missing = allKeys.filter((k) => !(k in env));
    const present = allKeys.filter((k) => k in env);
    const durationMs = Math.round(performance.now() - start);

    if (missing.length === 0) {
      return {
        name: 'Env Check',
        status: 'ok',
        message: `All ${allKeys.length} required keys are present`,
        details: { missing, present, total: allKeys.length },
        durationMs,
      };
    }

    return {
      name: 'Env Check',
      status: 'error',
      message: `${missing.length} of ${allKeys.length} required keys are missing`,
      suggestion: `Add the following keys to your environment: ${missing.join(', ')}`,
      details: { missing, present, total: allKeys.length },
      durationMs,
    };
  },
};
