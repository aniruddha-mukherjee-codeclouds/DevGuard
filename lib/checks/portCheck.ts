import type { CheckResult, DevGuardConfig } from '../types';
import type { NetDeps } from '../utils/system';
import { isPortOpen } from '../utils/system';

export const portCheck = {
  name: 'Port Check',

  async run(config: DevGuardConfig, deps: NetDeps = {}): Promise<CheckResult> {
    const start = performance.now();

    if (config.ports.length === 0) {
      return { name: 'Port Check', status: 'ok', message: 'No ports configured to check', durationMs: 0 };
    }

    const results = await Promise.all(
      config.ports.map(async (port) => ({ port, free: await isPortOpen(port, deps) }))
    );

    const occupied = results.filter((r) => !r.free).map((r) => r.port);
    const free = results.filter((r) => r.free).map((r) => r.port);
    const durationMs = Math.round(performance.now() - start);

    if (occupied.length === 0) {
      return {
        name: 'Port Check',
        status: 'ok',
        message: `All ${config.ports.length} configured ports are free`,
        details: { occupied, free },
        durationMs,
      };
    }

    return {
      name: 'Port Check',
      status: 'warning',
      message: `${occupied.length} of ${config.ports.length} configured ports are in use`,
      suggestion: `Stop the process using port${occupied.length > 1 ? 's' : ''} ${occupied.join(', ')} or update your config`,
      details: { occupied, free },
      durationMs,
    };
  },
};
