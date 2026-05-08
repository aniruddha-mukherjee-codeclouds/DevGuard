import { describe, expect, it } from 'vitest';
import {
  MAX_HISTORY_ENTRIES,
  createScanHistoryEntry,
  loadHistory,
  saveScan,
} from '@/lib/utils/historyStore';
import type { ScanResponse } from '@/lib/types';

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

const baseResponse: ScanResponse = {
  timestamp: '2026-05-08T00:00:00.000Z',
  overallStatus: 'warning',
  results: [
    { name: 'Port Check', status: 'ok', message: 'ok', durationMs: 100 },
    { name: 'Env Check', status: 'warning', message: 'warn', durationMs: 200 },
  ],
};

describe('historyStore', () => {
  it('creates entry from scan response', () => {
    const entry = createScanHistoryEntry(baseResponse, '3000', ['redis', 'redis']);
    expect(entry.targetPort).toBe(3000);
    expect(entry.selectedProcesses).toEqual(['redis']);
    expect(entry.durationMsTotal).toBe(300);
  });

  it('keeps only latest max entries', () => {
    const storage = new MemoryStorage();

    for (let i = 0; i < MAX_HISTORY_ENTRIES + 5; i += 1) {
      const response: ScanResponse = {
        ...baseResponse,
        timestamp: new Date(2026, 0, 1, 0, 0, i).toISOString(),
      };
      const entry = createScanHistoryEntry(response, '3000', ['redis']);
      saveScan(entry, storage);
    }

    const history = loadHistory(storage);
    expect(history.length).toBe(MAX_HISTORY_ENTRIES);
  });
});
