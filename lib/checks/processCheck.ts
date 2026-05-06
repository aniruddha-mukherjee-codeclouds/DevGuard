import type { CheckResult, DevGuardConfig } from '../types';
import type { ExecDeps } from '../utils/system';
import { getRunningProcesses } from '../utils/system';

export const processCheck = {
  name: 'Process Check',

  async run(config: DevGuardConfig, deps: ExecDeps = {}): Promise<CheckResult> {
    const start = performance.now();

    if (config.processes.length === 0) {
      return { name: 'Process Check', status: 'ok', message: 'No processes configured to check', durationMs: 0 };
    }

    let processList: string[];
    try {
      processList = await getRunningProcesses(deps);
    } catch (err) {
      return {
        name: 'Process Check',
        status: 'error',
        message: 'Failed to list running processes',
        suggestion: 'Ensure your shell has access to tasklist (Windows) or ps (macOS/Linux)',
        details: { error: (err as Error).message },
        durationMs: Math.round(performance.now() - start),
      };
    }

    const running = config.processes.filter((name) =>
      processList.some((line) => line.includes(name.toLowerCase()))
    );
    const missing = config.processes.filter((name) => !running.includes(name));
    const durationMs = Math.round(performance.now() - start);

    if (missing.length === 0) {
      return {
        name: 'Process Check',
        status: 'ok',
        message: `All ${config.processes.length} configured processes are running`,
        details: { running, missing },
        durationMs,
      };
    }

    return {
      name: 'Process Check',
      status: 'warning',
      message: `${missing.length} of ${config.processes.length} configured processes not found`,
      suggestion: `Start the missing process${missing.length > 1 ? 'es' : ''}: ${missing.join(', ')}`,
      details: { running, missing },
      durationMs,
    };
  },
};
