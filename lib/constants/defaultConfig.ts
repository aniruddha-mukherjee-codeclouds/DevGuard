import type { DevGuardConfig } from '../types';

export const defaultConfig: DevGuardConfig = {
  requiredEnvKeys: [],
  processes: [],
  timeoutMs: 4000,
};
