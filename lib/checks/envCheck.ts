import fs from 'fs';
import path from 'path';
import type { CheckResult, DevGuardConfig } from '../types';
import type { ExecDeps } from '../utils/system';
import {
  resolveProjectRootFromPort as defaultResolveProjectRootFromPort,
  type ProjectTargetResolution,
} from '../utils/projectTarget';

export interface EnvDeps extends ExecDeps {
  fileExists?: (p: string) => boolean;
  readFile?: (p: string) => string;
  resolveProjectRootFromPort?: (port: number) => Promise<ProjectTargetResolution>;
}

const DEFAULT_ENV_FILES = ['.env', '.env.local'];
const PLACEHOLDER_PATTERNS = [
  /^$/,
  /^changeme$/i,
  /^replace[-_ ]?me$/i,
  /^your[-_ a-z0-9]*$/i,
  /^example$/i,
  /^example[-_ a-z0-9]*$/i,
  /^todo$/i,
  /^test$/i,
];

function parseEnvKeys(content: string): string[] {
  return content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('=')[0].trim())
    .filter(Boolean);
}

function stripInlineComment(value: string): string {
  let inSingleQuotes = false;
  let inDoubleQuotes = false;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];

    if (char === "'" && !inDoubleQuotes) inSingleQuotes = !inSingleQuotes;
    if (char === '"' && !inSingleQuotes) inDoubleQuotes = !inDoubleQuotes;

    if (char === '#' && !inSingleQuotes && !inDoubleQuotes) {
      return value.slice(0, i).trim();
    }
  }

  return value.trim();
}

function normalizeValue(value: string): string {
  const trimmed = stripInlineComment(value);

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function parseEnvMap(content: string): Record<string, string> {
  const entries = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex <= 0) return null;

      const key = line.slice(0, separatorIndex).trim();
      if (!key) return null;

      const rawValue = line.slice(separatorIndex + 1);
      return [key, normalizeValue(rawValue)] as const;
    })
    .filter((entry): entry is readonly [string, string] => entry !== null);

  return Object.fromEntries(entries);
}

function isPlaceholderValue(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value.trim()));
}

export const envCheck = {
  name: 'Env Check',

  async run(config: DevGuardConfig, deps: EnvDeps = {}): Promise<CheckResult> {
    const start = performance.now();
    const fileExists = deps.fileExists ?? ((p: string) => fs.existsSync(p));
    const readFile = deps.readFile ?? ((p: string) => fs.readFileSync(p, 'utf-8'));
    const resolveTargetProject =
      deps.resolveProjectRootFromPort ??
      ((port: number) => defaultResolveProjectRootFromPort(port, { ...deps, fileExists }));

    let projectRoot = process.cwd();
    let targetPid: number | null = null;
    let targetCommandLine: string | null = null;

    if (config.targetPort !== undefined) {
      const resolved = await resolveTargetProject(config.targetPort);
      projectRoot = resolved.projectRoot ?? '';
      targetPid = resolved.pid;
      targetCommandLine = resolved.commandLine;

      if (!projectRoot) {
        return {
          name: 'Env Check',
          status: 'warning',
          message: `Could not resolve a project path from port ${config.targetPort}`,
          suggestion:
            'Start the target app directly from its project root or extend DevGuard with an explicit project path fallback',
          details: {
            targetPort: config.targetPort,
            targetPid,
            targetCommandLine,
          },
          durationMs: Math.round(performance.now() - start),
        };
      }
    }

    const examplePath = path.join(projectRoot, '.env.example');

    if (!fileExists(examplePath)) {
      return {
        name: 'Env Check',
        status: 'warning',
        message: '.env.example not found',
        suggestion: 'Create a .env.example file listing required environment variable keys',
        details: {
          missing: [],
          present: [],
          placeholderLike: [],
          filesChecked: [],
          total: 0,
          projectRoot,
          targetPort: config.targetPort,
          targetPid,
        },
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
        details: {
          error: (err as Error).message,
          filesChecked: ['.env.example'],
          projectRoot,
          targetPort: config.targetPort,
          targetPid,
        },
        durationMs: Math.round(performance.now() - start),
      };
    }

    const allKeys = Array.from(new Set([...keysFromFile, ...config.requiredEnvKeys]));

    if (allKeys.length === 0) {
      return {
        name: 'Env Check',
        status: 'ok',
        message: 'No keys defined in .env.example',
        details: {
          missing: [],
          present: [],
          placeholderLike: [],
          filesChecked: [],
          total: 0,
          projectRoot,
          targetPort: config.targetPort,
          targetPid,
        },
        durationMs: Math.round(performance.now() - start),
      };
    }

    const filesChecked = DEFAULT_ENV_FILES.filter((filename) =>
      fileExists(path.join(projectRoot, filename))
    );

    if (filesChecked.length === 0) {
      return {
        name: 'Env Check',
        status: 'warning',
        message: 'No env files found for the target project',
        suggestion: 'Create .env or .env.local with the required keys from .env.example',
        details: {
          missing: allKeys,
          present: [],
          placeholderLike: [],
          filesChecked,
          total: allKeys.length,
          projectRoot,
          targetPort: config.targetPort,
          targetPid,
        },
        durationMs: Math.round(performance.now() - start),
      };
    }

    let mergedEnv: Record<string, string> = {};

    try {
      for (const filename of filesChecked) {
        const filePath = path.join(projectRoot, filename);
        mergedEnv = { ...mergedEnv, ...parseEnvMap(readFile(filePath)) };
      }
    } catch (err) {
      return {
        name: 'Env Check',
        status: 'error',
        message: 'Failed to read project env files',
        suggestion: 'Check file permissions for .env and .env.local',
        details: {
          error: (err as Error).message,
          filesChecked,
          projectRoot,
          targetPort: config.targetPort,
          targetPid,
        },
        durationMs: Math.round(performance.now() - start),
      };
    }

    const missing = allKeys.filter((k) => !(k in mergedEnv));
    const placeholderLike = allKeys.filter((k) => k in mergedEnv && isPlaceholderValue(mergedEnv[k]));
    const present = allKeys.filter((k) => k in mergedEnv && !placeholderLike.includes(k));
    const durationMs = Math.round(performance.now() - start);

    if (missing.length === 0 && placeholderLike.length === 0) {
      return {
        name: 'Env Check',
        status: 'ok',
        message: `All ${allKeys.length} required keys are present in project env files`,
        details: {
          missing,
          present,
          placeholderLike,
          filesChecked,
          total: allKeys.length,
          projectRoot,
          targetPort: config.targetPort,
          targetPid,
        },
        durationMs,
      };
    }

    const issueCount = missing.length + placeholderLike.length;

    return {
      name: 'Env Check',
      status: 'error',
      message: `${issueCount} env configuration issue${issueCount === 1 ? '' : 's'} found`,
      suggestion:
        missing.length > 0
          ? `Add the missing keys to .env or .env.local: ${missing.join(', ')}`
          : `Replace placeholder values in .env or .env.local: ${placeholderLike.join(', ')}`,
      details: {
        missing,
        present,
        placeholderLike,
        filesChecked,
        total: allKeys.length,
        projectRoot,
        targetPort: config.targetPort,
        targetPid,
      },
      durationMs,
    };
  },
};
