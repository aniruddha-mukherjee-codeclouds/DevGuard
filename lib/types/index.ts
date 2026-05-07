export type CheckStatus = 'ok' | 'warning' | 'error';

export interface CheckResult {
  name: string;
  status: CheckStatus;
  message: string;
  suggestion?: string;
  details?: Record<string, unknown>;
  durationMs: number;
}

export interface ScanResponse {
  timestamp: string;
  overallStatus: CheckStatus;
  results: CheckResult[];
}

export interface DevGuardConfig {
  requiredEnvKeys: string[];
  processes: string[];
  timeoutMs: number;
  targetPort?: number;
}

export interface CheckModule {
  name: string;
  run: (config: DevGuardConfig) => Promise<CheckResult>;
}
