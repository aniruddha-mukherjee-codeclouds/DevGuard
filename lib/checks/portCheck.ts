import type { CheckResult, DevGuardConfig } from '../types';
import type { ExecDeps } from '../utils/system';
import { getListeningPorts } from '../utils/system';

export const portCheck = {
  name: 'Port Check',

  async run(_config: DevGuardConfig, deps: ExecDeps = {}): Promise<CheckResult> {
    const start = performance.now();
    const occupied = await getListeningPorts(deps);
    const durationMs = Math.round(performance.now() - start);

    if (occupied.length === 0) {
      return {
        name: 'Port Check',
        status: 'ok',
        message: 'No occupied TCP listening ports detected',
        details: { occupied, total: 0 },
        durationMs,
      };
    }

    return {
      name: 'Port Check',
      status: 'warning',
      message: `Detected ${occupied.length} occupied TCP listening port${occupied.length === 1 ? '' : 's'}`,
      suggestion: 'Stop the process using a conflicting port or change your app port before starting another service',
      details: { occupied, total: occupied.length },
      durationMs,
    };
  },
};
