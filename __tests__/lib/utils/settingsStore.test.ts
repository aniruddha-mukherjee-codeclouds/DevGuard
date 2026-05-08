import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ENVIRONMENT_SETTINGS,
  loadSettings,
  normalizeSettings,
  saveSettings,
} from '@/lib/utils/settingsStore';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('settingsStore', () => {
  it('returns defaults for invalid shape', () => {
    const normalized = normalizeSettings({ timeoutMs: 'oops' });
    expect(normalized).toEqual(DEFAULT_ENVIRONMENT_SETTINGS);
  });

  it('normalizes and persists valid settings', () => {
    const storage = new MemoryStorage();

    saveSettings(
      {
        defaultTargetPort: 3000,
        defaultProcesses: ['Redis', 'redis', ' docker '],
        timeoutMs: 999999,
        autoScanOnLoad: true,
        theme: 'system',
      },
      storage
    );

    const loaded = loadSettings(storage);

    expect(loaded.defaultTargetPort).toBe(3000);
    expect(loaded.defaultProcesses).toEqual(['redis', 'docker']);
    expect(loaded.timeoutMs).toBe(30000);
    expect(loaded.autoScanOnLoad).toBe(true);
    expect(loaded.theme).toBe('system');
  });
});
