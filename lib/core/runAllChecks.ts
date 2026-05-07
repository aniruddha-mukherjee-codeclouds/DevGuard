import type { CheckResult, CheckModule, ScanResponse, CheckStatus, DevGuardConfig } from '../types';
import { registry as defaultRegistry } from './registry';
import { loadConfig } from '../utils/config';

interface RunOptions {
  config?: DevGuardConfig;
  checks?: CheckModule[];
  configOverrides?: Partial<DevGuardConfig>;
}

function deriveOverallStatus(results: CheckResult[]): CheckStatus {
  if (results.some((r) => r.status === 'error')) return 'error';
  if (results.some((r) => r.status === 'warning')) return 'warning';
  return 'ok';
}

function createTimeout(ms: number, checkName: string): Promise<CheckResult> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          name: checkName,
          status: 'error',
          message: `${checkName} timed out after ${ms}ms`,
          suggestion: 'Increase timeoutMs in devguard.config.json or investigate system slowness',
          durationMs: ms,
        }),
      ms
    )
  );
}

export async function runAllChecks(options: RunOptions = {}): Promise<ScanResponse> {
  const results: CheckResult[] = [];
  let config: DevGuardConfig;

  if (options.config) {
    config = { ...options.config, ...options.configOverrides };
  } else {
    const loaded = loadConfig();
    config = { ...loaded.config, ...options.configOverrides };
    if (loaded.warning) {
      results.push({
        name: 'Config',
        status: 'warning',
        message: loaded.warning,
        suggestion: 'Fix the JSON syntax in devguard.config.json or delete it to use defaults',
        durationMs: 0,
      });
    }
  }

  const activeChecks = options.checks ?? defaultRegistry;

  const settled = await Promise.allSettled(
    activeChecks.map((check) =>
      Promise.race([check.run(config), createTimeout(config.timeoutMs, check.name)])
    )
  );

  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      results.push({
        name: activeChecks[i].name,
        status: 'error',
        message: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        suggestion: 'Check the application logs or file a bug report',
        details: { error: String(result.reason) },
        durationMs: 0,
      });
    }
  });

  return {
    timestamp: new Date().toISOString(),
    overallStatus: deriveOverallStatus(results),
    results,
  };
}
