import fs from 'fs';
import path from 'path';
import type { DevGuardConfig } from '../types';
import { defaultConfig } from '../constants/defaultConfig';

export interface ConfigDeps {
  fileExists?: (p: string) => boolean;
  readFile?: (p: string) => string;
}

export interface LoadConfigResult {
  config: DevGuardConfig;
  warning?: string;
}

export function loadConfig(deps: ConfigDeps = {}): LoadConfigResult {
  const fileExists = deps.fileExists ?? ((p: string) => fs.existsSync(p));
  const readFile = deps.readFile ?? ((p: string) => fs.readFileSync(p, 'utf-8'));
  const configPath = path.join(process.cwd(), 'devguard.config.json');

  if (!fileExists(configPath)) {
    return { config: { ...defaultConfig } };
  }

  try {
    const raw = readFile(configPath);
    const parsed = JSON.parse(raw) as Partial<DevGuardConfig>;
    return { config: { ...defaultConfig, ...parsed } };
  } catch (err) {
    return {
      config: { ...defaultConfig },
      warning: `Could not parse devguard.config.json: ${(err as Error).message}`,
    };
  }
}
