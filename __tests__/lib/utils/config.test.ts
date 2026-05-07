import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../../lib/utils/config';
import { defaultConfig } from '../../../lib/constants/defaultConfig';

describe('loadConfig', () => {
  it('returns defaults when config file does not exist', () => {
    const { config, warning } = loadConfig({
      fileExists: () => false,
      readFile: () => '',
    });
    expect(config).toEqual(defaultConfig);
    expect(warning).toBeUndefined();
  });

  it('returns shallow-merged config when file is valid JSON', () => {
    const { config, warning } = loadConfig({
      fileExists: () => true,
      readFile: () => JSON.stringify({ processes: ['postgres'], timeoutMs: 2000 }),
    });
    expect(config.processes).toEqual(['postgres']);
    expect(config.timeoutMs).toBe(2000);
    expect(config.requiredEnvKeys).toEqual(defaultConfig.requiredEnvKeys);
    expect(warning).toBeUndefined();
  });

  it('returns defaults and warning when file has malformed JSON', () => {
    const { config, warning } = loadConfig({
      fileExists: () => true,
      readFile: () => '{ not valid json',
    });
    expect(config).toEqual(defaultConfig);
    expect(warning).toMatch(/Could not parse/);
  });
});
