import type { DevGuardConfig } from '../types';

export const defaultConfig: DevGuardConfig = {
  requiredEnvKeys: [],
  requiredNodeVersion: '>=18.0.0',
  processes: ['redis', 'docker'],
  timeoutMs: 4000,
};
