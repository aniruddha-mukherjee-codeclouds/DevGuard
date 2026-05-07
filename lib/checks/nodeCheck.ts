import fs from 'fs';
import path from 'path';
import semver from 'semver';
import type { CheckResult, DevGuardConfig } from '../types';
import { getNodeVersion as defaultGetNodeVersion } from '../utils/system';
import {
  resolveProjectRootFromPort as defaultResolveProjectRootFromPort,
  type ProjectTargetResolution,
} from '../utils/projectTarget';

export interface NodeDeps {
  getNodeVersion?: () => string;
  fileExists?: (p: string) => boolean;
  readFile?: (p: string) => string;
  resolveProjectRootFromPort?: (port: number) => Promise<ProjectTargetResolution>;
}

interface NodeRequirementInfo {
  required: string | null;
  source: string | null;
  basis?: string | null;
}

function normalizeNodeRange(rawValue: string): string {
  return rawValue.trim().replace(/^v/, '');
}

function readRequiredNodeVersion(
  projectRoot: string,
  fileExists: (p: string) => boolean,
  readFile: (p: string) => string
): NodeRequirementInfo {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fileExists(packageJsonPath)) {
    const packageJson = JSON.parse(readFile(packageJsonPath)) as {
      engines?: { node?: string };
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };
    const engineRange = packageJson.engines?.node?.trim();
    if (engineRange) {
      return { required: engineRange, source: 'package.json#engines.node' };
    }

    const dependencyMap = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.optionalDependencies,
    };
    const toolchainPackages = [
      'next',
      'vite',
      'react-scripts',
      '@remix-run/dev',
      '@angular/cli',
      'nuxt',
      'gatsby',
    ];

    for (const packageName of toolchainPackages) {
      if (!dependencyMap[packageName]) continue;

      const toolPackagePath = path.join(projectRoot, 'node_modules', ...packageName.split('/'), 'package.json');
      if (!fileExists(toolPackagePath)) continue;

      const toolPackageJson = JSON.parse(readFile(toolPackagePath)) as {
        engines?: { node?: string };
      };
      const toolEngineRange = toolPackageJson.engines?.node?.trim();

      if (toolEngineRange) {
        return {
          required: toolEngineRange,
          source: `node_modules/${packageName}/package.json#engines.node`,
          basis: packageName,
        };
      }
    }
  }

  for (const filename of ['.nvmrc', '.node-version']) {
    const filePath = path.join(projectRoot, filename);
    if (fileExists(filePath)) {
      const value = normalizeNodeRange(readFile(filePath));
      if (value) {
        return { required: value, source: filename };
      }
    }
  }

  return { required: null, source: null };
}

export const nodeCheck = {
  name: 'Node Check',

  async run(config: DevGuardConfig, deps: NodeDeps = {}): Promise<CheckResult> {
    const start = performance.now();
    const getVersion = deps.getNodeVersion ?? defaultGetNodeVersion;
    const fileExists = deps.fileExists ?? ((p: string) => fs.existsSync(p));
    const readFile = deps.readFile ?? ((p: string) => fs.readFileSync(p, 'utf-8'));
    const resolveTargetProject =
      deps.resolveProjectRootFromPort ??
      ((port: number) => defaultResolveProjectRootFromPort(port, { fileExists }));
    const current = getVersion();
    let projectRoot = process.cwd();
    let targetPid: number | null = null;

    if (config.targetPort !== undefined) {
      const resolved = await resolveTargetProject(config.targetPort);
      projectRoot = resolved.projectRoot ?? '';
      targetPid = resolved.pid;

      if (!projectRoot) {
        return {
          name: 'Node Check',
          status: 'warning',
          message: `Could not resolve a project path from port ${config.targetPort}`,
          suggestion:
            'Start the target app directly from its project root or add a version file that DevGuard can discover',
          details: { current, targetPort: config.targetPort, targetPid },
          durationMs: Math.round(performance.now() - start),
        };
      }
    }

    let requiredInfo: NodeRequirementInfo;

    try {
      requiredInfo = readRequiredNodeVersion(projectRoot, fileExists, readFile);
    } catch (err) {
      return {
        name: 'Node Check',
        status: 'error',
        message: 'Failed to read target project Node version metadata',
        suggestion: 'Check package.json, .nvmrc, or .node-version in the target project',
        details: {
          current,
          error: (err as Error).message,
          projectRoot,
          targetPort: config.targetPort,
          targetPid,
        },
        durationMs: Math.round(performance.now() - start),
      };
    }

    const required = requiredInfo.required;

    if (!required) {
      return {
        name: 'Node Check',
        status: 'warning',
        message: 'No Node version requirement or toolchain compatibility hint was found in the target project',
        suggestion:
          'Add package.json engines.node, .nvmrc, or .node-version to the target project for a stricter Node check',
        details: {
          current,
          projectRoot,
          targetPort: config.targetPort,
          targetPid,
        },
        durationMs: Math.round(performance.now() - start),
      };
    }

    if (!semver.validRange(required)) {
      return {
        name: 'Node Check',
        status: 'error',
        message: `Invalid Node version requirement: "${required}"`,
        suggestion: `Fix the version requirement in ${requiredInfo.source} (for example ">=18.0.0")`,
        details: {
          current,
          required,
          satisfied: false,
          source: requiredInfo.source,
          projectRoot,
          targetPort: config.targetPort,
          targetPid,
        },
        durationMs: Math.round(performance.now() - start),
      };
    }

    const satisfied = semver.satisfies(current, required);
    const durationMs = Math.round(performance.now() - start);

    if (satisfied) {
      const compatibilityBasis = requiredInfo.basis
        ? ` from ${requiredInfo.basis}`
        : '';

      return {
        name: 'Node Check',
        status: 'ok',
        message: `Node v${current} satisfies ${required}${compatibilityBasis}`,
        details: {
          current,
          required,
          satisfied: true,
          source: requiredInfo.source,
          basis: requiredInfo.basis,
          projectRoot,
          targetPort: config.targetPort,
          targetPid,
        },
        durationMs,
      };
    }

    return {
      name: 'Node Check',
      status: 'error',
      message: `Node v${current} does not satisfy ${required}${requiredInfo.basis ? ` from ${requiredInfo.basis}` : ''}`,
      suggestion: `Upgrade Node.js to satisfy ${required}. Use nvm: nvm install --lts`,
      details: {
        current,
        required,
        satisfied: false,
        source: requiredInfo.source,
        basis: requiredInfo.basis,
        projectRoot,
        targetPort: config.targetPort,
        targetPid,
      },
      durationMs,
    };
  },
};
