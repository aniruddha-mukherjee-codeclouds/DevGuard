import fs from 'fs';
import path from 'path';
import type { CheckResult, DevGuardConfig, ProjectRiskItem } from '../types';
import { resolveProjectRootFromPort, type ProjectTargetDeps } from '../utils/projectTarget';

interface ProjectRiskDeps extends ProjectTargetDeps {
  fileExists?: (filePath: string) => boolean;
  readFile?: (filePath: string) => string;
}

const LOCKFILES = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb'];
const ENV_FILES = ['.env', '.env.local'];
const PLACEHOLDER_PATTERNS = ['changeme', 'example', 'your_', 'todo', 'replace', 'placeholder'];
const DEPRECATED_PACKAGES = ['request', 'left-pad', 'node-sass', 'tslint'];
const LARGE_DEPENDENCY_WARNING_THRESHOLD = 80;

function parseJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getMajor(versionRange: string): number | null {
  const match = versionRange.match(/(\d+)/);
  if (!match) return null;
  return Number(match[1]);
}

function collectPlaceholderKeys(envRaw: string): string[] {
  const riskyKeys: string[] = [];

  const lines = envRaw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex <= 0) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    const normalized = value.toLowerCase();

    if (!value || PLACEHOLDER_PATTERNS.some((pattern) => normalized.includes(pattern))) {
      riskyKeys.push(key);
    }
  }

  return riskyKeys;
}

function deriveStatus(risks: ProjectRiskItem[]): 'ok' | 'warning' | 'error' {
  if (risks.some((risk) => risk.severity === 'error')) return 'error';
  if (risks.length > 0) return 'warning';
  return 'ok';
}

function summarizeMessage(risks: ProjectRiskItem[]): string {
  if (risks.length === 0) return 'No operational project risks detected from current rules.';

  const errors = risks.filter((risk) => risk.severity === 'error').length;
  const warnings = risks.filter((risk) => risk.severity === 'warning').length;

  if (errors > 0) {
    return `${errors} error-level and ${warnings} warning-level risks detected.`;
  }

  return `${warnings} warning-level risks detected.`;
}

export async function runProjectRiskCheck(
  config: DevGuardConfig,
  deps: ProjectRiskDeps = {}
): Promise<CheckResult> {
  const startedAt = Date.now();
  const fileExists = deps.fileExists ?? ((filePath: string) => fs.existsSync(filePath));
  const readFile = deps.readFile ?? ((filePath: string) => fs.readFileSync(filePath, 'utf-8'));

  let projectRoot = process.cwd();
  let targetPid: number | null = null;

  if (typeof config.targetPort === 'number') {
    const resolved = await resolveProjectRootFromPort(config.targetPort, deps);
    if (resolved.projectRoot) projectRoot = resolved.projectRoot;
    targetPid = resolved.pid;
  }

  const risks: ProjectRiskItem[] = [];

  const lockfilesPresent = LOCKFILES.filter((filename) => fileExists(path.join(projectRoot, filename)));
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJsonExists = fileExists(packageJsonPath);

  if (packageJsonExists && lockfilesPresent.length === 0) {
    risks.push({
      id: 'missing-lockfile',
      title: 'Missing lockfile',
      severity: 'warning',
      message: 'package.json exists but no package manager lockfile was found.',
      suggestion: 'Commit exactly one lockfile for deterministic installs.',
    });
  }

  if (lockfilesPresent.length > 1) {
    risks.push({
      id: 'multiple-lockfiles',
      title: 'Multiple lockfiles detected',
      severity: 'warning',
      message: 'More than one package manager lockfile was found.',
      evidence: lockfilesPresent,
      suggestion: 'Use one package manager per project or document intentional multi-lockfile usage.',
    });
  }

  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (fileExists(gitignorePath)) {
    const gitignoreRaw = readFile(gitignorePath);

    if (!/^(?:.*\/)?\.env(?:\..+)?$/m.test(gitignoreRaw) && !/^\.env\*/m.test(gitignoreRaw)) {
      risks.push({
        id: 'env-not-gitignored',
        title: '.env may be tracked',
        severity: 'error',
        message: '.gitignore does not appear to include .env ignore patterns.',
        suggestion: 'Add .env and environment-specific secret files to .gitignore.',
      });
    }

    if (!/(^|\n)\s*\/?node_modules\/?\s*(\n|$)/m.test(gitignoreRaw)) {
      risks.push({
        id: 'node-modules-not-gitignored',
        title: 'node_modules may be tracked',
        severity: 'error',
        message: '.gitignore does not include node_modules.',
        suggestion: 'Add node_modules to .gitignore to avoid repository bloat and accidental commits.',
      });
    }
  }

  const placeholderHits: string[] = [];
  for (const envFile of ENV_FILES) {
    const envPath = path.join(projectRoot, envFile);
    if (!fileExists(envPath)) continue;
    const riskyKeys = collectPlaceholderKeys(readFile(envPath));
    placeholderHits.push(...riskyKeys.map((key) => `${envFile}:${key}`));
  }

  if (placeholderHits.length > 0) {
    risks.push({
      id: 'placeholder-env-values',
      title: 'Suspicious env placeholder values',
      severity: 'warning',
      message: 'One or more environment variables look like placeholders or empty values.',
      evidence: placeholderHits,
      suggestion: 'Replace placeholder values before relying on local integration behavior.',
    });
  }

  if (packageJsonExists) {
    const packageJson = parseJson(readFile(packageJsonPath));

    if (packageJson) {
      const dependencies = isRecord(packageJson.dependencies) ? packageJson.dependencies : {};
      const devDependencies = isRecord(packageJson.devDependencies) ? packageJson.devDependencies : {};

      const allDeps = { ...dependencies, ...devDependencies } as Record<string, unknown>;
      const depNames = Object.keys(allDeps);

      if (depNames.length > LARGE_DEPENDENCY_WARNING_THRESHOLD) {
        risks.push({
          id: 'large-dependency-footprint',
          title: 'Large dependency footprint',
          severity: 'warning',
          message: `Project declares ${depNames.length} dependencies/devDependencies.`,
          suggestion: 'Review unused dependencies to reduce install and attack surface overhead.',
        });
      }

      const deprecatedFound = DEPRECATED_PACKAGES.filter((pkg) => depNames.includes(pkg));
      if (deprecatedFound.length > 0) {
        risks.push({
          id: 'deprecated-package-patterns',
          title: 'Deprecated package patterns detected',
          severity: 'warning',
          message: 'Some known outdated package patterns were detected.',
          evidence: deprecatedFound,
          suggestion: 'Validate whether these packages can be replaced with maintained alternatives.',
        });
      }

      const nextVersion = typeof allDeps.next === 'string' ? allDeps.next : null;
      const reactVersion = typeof allDeps.react === 'string' ? allDeps.react : null;

      if (nextVersion && reactVersion) {
        const nextMajor = getMajor(nextVersion);
        const reactMajor = getMajor(reactVersion);

        if (nextMajor !== null && reactMajor !== null && nextMajor >= 15 && reactMajor < 19) {
          risks.push({
            id: 'framework-version-mismatch',
            title: 'Potential framework version mismatch',
            severity: 'warning',
            message: `next@${nextVersion} may be incompatible with react@${reactVersion}.`,
            suggestion: 'Confirm major version compatibility between Next.js and React.',
          });
        }
      }
    }
  }

  const durationMs = Date.now() - startedAt;
  const status = deriveStatus(risks);

  return {
    name: 'Project Risks',
    status,
    message: summarizeMessage(risks),
    suggestion:
      risks.length > 0
        ? 'Review risk evidence and apply fixes with the highest-severity items first.'
        : undefined,
    details: {
      projectRoot,
      targetPort: config.targetPort,
      targetPid,
      risks,
      total: risks.length,
    },
    durationMs,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
