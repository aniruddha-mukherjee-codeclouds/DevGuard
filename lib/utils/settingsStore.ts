import type { EnvironmentSettings } from '../types';

export const SETTINGS_STORAGE_KEY = 'devguard:settings:v1';

export const DEFAULT_ENVIRONMENT_SETTINGS: EnvironmentSettings = {
  defaultTargetPort: null,
  defaultProcesses: [],
  timeoutMs: 4000,
  autoScanOnLoad: false,
  theme: 'dark',
};

const MIN_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 30000;
const MAX_DEFAULT_PROCESSES = 30;

function normalizePort(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < 1 || value > 65535) return null;
  return value;
}

function normalizeProcesses(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const cleaned = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(cleaned)).slice(0, MAX_DEFAULT_PROCESSES);
}

function normalizeTimeout(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return DEFAULT_ENVIRONMENT_SETTINGS.timeoutMs;
  }
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, value));
}

function normalizeTheme(value: unknown): EnvironmentSettings['theme'] {
  return value === 'system' ? 'system' : 'dark';
}

export function normalizeSettings(value: unknown): EnvironmentSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_ENVIRONMENT_SETTINGS };
  }

  const source = value as Record<string, unknown>;

  return {
    defaultTargetPort: normalizePort(source.defaultTargetPort),
    defaultProcesses: normalizeProcesses(source.defaultProcesses),
    timeoutMs: normalizeTimeout(source.timeoutMs),
    autoScanOnLoad: Boolean(source.autoScanOnLoad),
    theme: normalizeTheme(source.theme),
  };
}

function safeStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function loadSettings(storage?: Storage): EnvironmentSettings {
  const activeStorage = safeStorage(storage);
  if (!activeStorage) return { ...DEFAULT_ENVIRONMENT_SETTINGS };

  try {
    const raw = activeStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ENVIRONMENT_SETTINGS };
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_ENVIRONMENT_SETTINGS };
  }
}

export function saveSettings(settings: EnvironmentSettings, storage?: Storage): EnvironmentSettings {
  const activeStorage = safeStorage(storage);
  const normalized = normalizeSettings(settings);

  if (!activeStorage) return normalized;

  try {
    activeStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    return normalized;
  }

  return normalized;
}

export function resetSettings(storage?: Storage): EnvironmentSettings {
  return saveSettings(DEFAULT_ENVIRONMENT_SETTINGS, storage);
}
