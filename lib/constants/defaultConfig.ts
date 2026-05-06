import type { DevGuardConfig } from '../types';

export const defaultConfig: DevGuardConfig = {
  ports: [3000, 5432, 6379],
  requiredEnvKeys: [],
  requiredNodeVersion: '>=18.0.0',
  processes: ['redis', 'docker'],
  timeoutMs: 4000,
};
