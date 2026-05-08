import type { ScanHistoryEntry, ScanResponse } from '../types';

export const HISTORY_STORAGE_KEY = 'devguard:scan-history:v1';
export const MAX_HISTORY_ENTRIES = 20;

function safeStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isHistoryStatus(value: unknown): value is ScanHistoryEntry['overallStatus'] {
  return value === 'ok' || value === 'warning' || value === 'error';
}

function normalizeEntry(value: unknown): ScanHistoryEntry | null {
  if (!isObject(value)) return null;
  if (typeof value.id !== 'string') return null;
  if (typeof value.timestamp !== 'string') return null;
  if (!isHistoryStatus(value.overallStatus)) return null;
  if (!(typeof value.targetPort === 'number' || value.targetPort === null)) return null;
  if (!Array.isArray(value.selectedProcesses)) return null;
  if (typeof value.durationMsTotal !== 'number') return null;
  if (!Array.isArray(value.results)) return null;

  const selectedProcesses = value.selectedProcesses
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const results = value.results
    .filter((item): item is Record<string, unknown> => isObject(item))
    .filter((item) => typeof item.name === 'string' && typeof item.message === 'string' && typeof item.durationMs === 'number' && isHistoryStatus(item.status))
    .map((item) => ({
      name: item.name as string,
      status: item.status as ScanHistoryEntry['overallStatus'],
      message: item.message as string,
      durationMs: item.durationMs as number,
    }));

  return {
    id: value.id,
    timestamp: value.timestamp,
    overallStatus: value.overallStatus,
    targetPort: value.targetPort,
    selectedProcesses,
    durationMsTotal: value.durationMsTotal,
    results,
  };
}

export function loadHistory(storage?: Storage): ScanHistoryEntry[] {
  const activeStorage = safeStorage(storage);
  if (!activeStorage) return [];

  try {
    const raw = activeStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeEntry(item))
      .filter((item): item is ScanHistoryEntry => item !== null)
      .slice(0, MAX_HISTORY_ENTRIES);
  } catch {
    return [];
  }
}

function persist(entries: ScanHistoryEntry[], storage?: Storage): ScanHistoryEntry[] {
  const activeStorage = safeStorage(storage);
  const trimmed = entries.slice(0, MAX_HISTORY_ENTRIES);

  if (!activeStorage) return trimmed;

  try {
    activeStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    return trimmed;
  }

  return trimmed;
}

export function createScanHistoryEntry(
  result: ScanResponse,
  targetPort: string,
  selectedProcesses: string[]
): ScanHistoryEntry {
  const durationMsTotal = result.results.reduce((total, item) => total + item.durationMs, 0);
  const normalizedPort = targetPort.trim() ? Number(targetPort) : null;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: result.timestamp,
    overallStatus: result.overallStatus,
    targetPort: Number.isInteger(normalizedPort) ? normalizedPort : null,
    selectedProcesses: Array.from(new Set(selectedProcesses.map((item) => item.trim().toLowerCase()).filter(Boolean))),
    durationMsTotal,
    results: result.results.map((item) => ({
      name: item.name,
      status: item.status,
      message: item.message,
      durationMs: item.durationMs,
    })),
  };
}

export function saveScan(entry: ScanHistoryEntry, storage?: Storage): ScanHistoryEntry[] {
  const current = loadHistory(storage);
  return persist([entry, ...current], storage);
}

export function clearHistory(storage?: Storage): void {
  const activeStorage = safeStorage(storage);
  if (!activeStorage) return;

  try {
    activeStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // no-op
  }
}

export function exportHistory(storage?: Storage): string {
  return JSON.stringify(loadHistory(storage), null, 2);
}
