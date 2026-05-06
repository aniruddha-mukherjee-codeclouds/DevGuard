import semver from 'semver';
import type { CheckResult, DevGuardConfig } from '../types';
import { getNodeVersion as defaultGetNodeVersion } from '../utils/system';

export interface NodeDeps {
  getNodeVersion?: () => string;
}

export const nodeCheck = {
  name: 'Node Check',

  async run(config: DevGuardConfig, deps: NodeDeps = {}): Promise<CheckResult> {
    const start = performance.now();
    const getVersion = deps.getNodeVersion ?? defaultGetNodeVersion;
    const current = getVersion();
    const required = config.requiredNodeVersion;

    if (!semver.validRange(required)) {
      return {
        name: 'Node Check',
        status: 'error',
        message: `Invalid requiredNodeVersion: "${required}"`,
        suggestion: 'Fix requiredNodeVersion in devguard.config.json (e.g., ">=18.0.0")',
        details: { current, required, satisfied: false },
        durationMs: Math.round(performance.now() - start),
      };
    }

    const satisfied = semver.satisfies(current, required);
    const durationMs = Math.round(performance.now() - start);

    if (satisfied) {
      return {
        name: 'Node Check',
        status: 'ok',
        message: `Node v${current} satisfies ${required}`,
        details: { current, required, satisfied: true },
        durationMs,
      };
    }

    return {
      name: 'Node Check',
      status: 'error',
      message: `Node v${current} does not satisfy ${required}`,
      suggestion: `Upgrade Node.js to satisfy ${required}. Use nvm: nvm install --lts`,
      details: { current, required, satisfied: false },
      durationMs,
    };
  },
};
