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

export interface EnvironmentSettings {
  defaultTargetPort: number | null;
  defaultProcesses: string[];
  timeoutMs: number;
  autoScanOnLoad: boolean;
  theme: 'dark' | 'system';
}

export interface ScanHistoryEntry {
  id: string;
  timestamp: string;
  overallStatus: CheckStatus;
  targetPort: number | null;
  selectedProcesses: string[];
  durationMsTotal: number;
  results: Array<{
    name: string;
    status: CheckStatus;
    message: string;
    durationMs: number;
  }>;
}

export interface ProjectRiskItem {
  id: string;
  title: string;
  severity: 'warning' | 'error';
  message: string;
  evidence?: string[];
  suggestion?: string;
}
