'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CheckResult, EnvironmentSettings, ScanHistoryEntry, ScanResponse } from '@/lib/types';
import { processOptions } from '@/lib/constants/processOptions';
import { StatusBadge } from './components/StatusBadge';
import { ResultCard } from './components/ResultCard';
import {
  createScanHistoryEntry,
  saveScan,
  loadHistory,
  clearHistory,
  exportHistory,
} from '@/lib/utils/historyStore';
import {
  DEFAULT_ENVIRONMENT_SETTINGS,
  loadSettings,
  resetSettings,
  saveSettings,
} from '@/lib/utils/settingsStore';

type SectionKey = 'inspector' | 'project-risks' | 'scan-history' | 'environment-settings';

interface SidebarItem {
  key: SectionKey;
  label: string;
}

const sidebarItems: SidebarItem[] = [
  { key: 'inspector', label: 'Inspector' },
  { key: 'project-risks', label: 'Project Risks' },
  { key: 'scan-history', label: 'Scan History' },
  { key: 'environment-settings', label: 'Environment Settings' },
];

const chunkSize = 10;

function normalizeProcessNames(input: string[]): string[] {
  return Array.from(new Set(input.map((item) => item.trim().toLowerCase()).filter(Boolean)));
}

export default function HomePage() {
  const [activeSection, setActiveSection] = useState<SectionKey>('inspector');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetPort, setTargetPort] = useState('');
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const [customProcesses, setCustomProcesses] = useState('');
  const [historyEntries, setHistoryEntries] = useState<ScanHistoryEntry[]>([]);
  const [riskResult, setRiskResult] = useState<CheckResult | null>(null);
  const [risksLoading, setRisksLoading] = useState(false);
  const [risksError, setRisksError] = useState<string | null>(null);

  const [settings, setSettings] = useState<EnvironmentSettings>(DEFAULT_ENVIRONMENT_SETTINGS);
  const [settingsDraft, setSettingsDraft] = useState<EnvironmentSettings>(DEFAULT_ENVIRONMENT_SETTINGS);
  const [defaultProcessesInput, setDefaultProcessesInput] = useState('');
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  const processColumns = useMemo(() => {
    const labels = processOptions.map((option) => option.label);
    return [
      labels.slice(0, chunkSize),
      labels.slice(chunkSize, chunkSize * 2),
      labels.slice(chunkSize * 2),
    ];
  }, []);

  const initializeFromSettings = useCallback((initial: EnvironmentSettings) => {
    if (typeof initial.defaultTargetPort === 'number') {
      setTargetPort(String(initial.defaultTargetPort));
    }

    const normalizedDefaults = normalizeProcessNames(initial.defaultProcesses);
    setCustomProcesses(normalizedDefaults.join(','));
    setSelectedProcesses(normalizedDefaults);
  }, []);

  useEffect(() => {
    const storedSettings = loadSettings();
    const storedHistory = loadHistory();

    setSettings(storedSettings);
    setSettingsDraft(storedSettings);
    setDefaultProcessesInput(storedSettings.defaultProcesses.join(','));
    setHistoryEntries(storedHistory);
    initializeFromSettings(storedSettings);
  }, [initializeFromSettings]);

  function normalizeProcessLabel(label: string) {
    return processOptions.find((option) => option.label === label)?.value ?? label.toLowerCase();
  }

  function isSelectedProcess(label: string) {
    return selectedProcesses.includes(normalizeProcessLabel(label));
  }

  function toggleProcess(label: string) {
    const processName = normalizeProcessLabel(label);
    setSelectedProcesses((current) =>
      current.includes(processName)
        ? current.filter((value) => value !== processName)
        : [...current, processName]
    );
  }

  const runScan = useCallback(async () => {
    setScanning(true);
    setError(null);

    try {
      const allProcesses = Array.from(
        new Set([
          ...selectedProcesses,
          ...customProcesses
            .split(',')
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean),
        ])
      );

      const params = new URLSearchParams();
      if (targetPort.trim()) params.set('targetPort', targetPort.trim());
      if (allProcesses.length > 0) params.set('processes', allProcesses.join(','));

      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/scan${query}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const scanResult = (await res.json()) as ScanResponse;
      setResult(scanResult);

      const historyEntry = createScanHistoryEntry(scanResult, targetPort, allProcesses);
      setHistoryEntries(saveScan(historyEntry));
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Unknown error');
    } finally {
      setScanning(false);
    }
  }, [customProcesses, selectedProcesses, targetPort]);

  useEffect(() => {
    if (!settings.autoScanOnLoad) return;
    if (!targetPort.trim()) return;

    runScan();
  }, [runScan, settings.autoScanOnLoad, targetPort]);

  const loadProjectRisks = useCallback(async () => {
    setRisksLoading(true);
    setRisksError(null);

    try {
      const params = new URLSearchParams();
      if (targetPort.trim()) params.set('targetPort', targetPort.trim());

      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/project-risks${query}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const payload = (await res.json()) as CheckResult;
      setRiskResult(payload);
    } catch (riskError) {
      setRisksError(riskError instanceof Error ? riskError.message : 'Unknown error');
    } finally {
      setRisksLoading(false);
    }
  }, [targetPort]);

  useEffect(() => {
    if (activeSection !== 'project-risks') return;
    loadProjectRisks();
  }, [activeSection, loadProjectRisks]);

  function handleExportHistory() {
    const content = exportHistory();
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'devguard-scan-history.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleClearHistory() {
    clearHistory();
    setHistoryEntries([]);
  }

  function handleSaveSettings() {
    const draftToPersist: EnvironmentSettings = {
      ...settingsDraft,
      defaultProcesses: normalizeProcessNames(defaultProcessesInput.split(',')),
    };

    const persisted = saveSettings(draftToPersist);
    setSettings(persisted);
    setSettingsDraft(persisted);
    setDefaultProcessesInput(persisted.defaultProcesses.join(','));
    const normalizedDefaults = normalizeProcessNames(persisted.defaultProcesses);
    setCustomProcesses(normalizedDefaults.join(','));
    setSelectedProcesses(normalizedDefaults);
    setSettingsMessage('Settings saved locally.');
  }

  function handleResetSettings() {
    const reset = resetSettings();
    setSettings(reset);
    setSettingsDraft(reset);
    setDefaultProcessesInput('');
    setCustomProcesses('');
    setSelectedProcesses([]);
    setSettingsMessage('Settings reset to defaults.');
  }

  const sectionTitle =
    activeSection === 'inspector'
      ? 'Inspector'
      : activeSection === 'project-risks'
        ? 'Project Risks'
        : activeSection === 'scan-history'
          ? 'Scan History'
          : 'Environment Settings';

  const sectionDescription =
    activeSection === 'inspector'
      ? 'Developer environment inspector'
      : activeSection === 'project-risks'
        ? 'Operational risk detection for local projects'
        : activeSection === 'scan-history'
          ? 'Latest 20 local scans, newest first'
          : 'Local scan preferences and defaults';

  return (
    <div className="relative min-h-screen bg-[#0c160a] text-[#dae6d2] lg:pl-64">
      <aside className="fixed left-0 top-0 z-20 hidden h-screen w-64 flex-col border-r border-[#3b4b37] bg-[#141e12] lg:flex">
        <div className="flex flex-col gap-1 px-4 py-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-sm bg-[#00ff41] p-1">
              <span className="block text-sm font-bold text-[#003907]">&gt;_</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#ebffe2]">DEVGUARD</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#b9ccb2]">v3.1.0-beta</span>
            </div>
          </div>

          <nav className="flex flex-col gap-1 text-sm" style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
            {sidebarItems.map((item) => {
              const active = activeSection === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveSection(item.key)}
                  className={`px-4 py-2 text-left transition-colors ${
                    active
                      ? 'border-r-2 border-[#ebffe2] bg-[#2d382a] text-[#ebffe2]'
                      : 'text-[#b9ccb2] hover:bg-[#222d20]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-[#3b4b37] p-4">
          <div className="flex items-center gap-3 rounded-sm bg-[#222d20] p-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#3b4b37] text-[#b9ccb2]">U</div>
            <div>
              <p className="text-xs font-bold text-[#dae6d2]">Developer</p>
              <p className="text-[11px] text-[#b9ccb2]" style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                local@user
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="h-screen min-w-0 overflow-y-auto">
        <header className="px-6 py-6 md:px-10 md:py-8">
          <h1 className="text-3xl font-black text-[#dae6d2] md:text-[32px]">{sectionTitle}</h1>
          <p className="mt-1 text-sm text-[#b9ccb2]">{sectionDescription}</p>
        </header>

        <div className="flex flex-col gap-8 px-6 pb-10 md:px-10">
          {activeSection === 'inspector' && (
            <>
              <section className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label
                    className="text-[11px] uppercase tracking-[0.2em] text-[#b9ccb2]"
                    style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
                  >
                    Env Target Port
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="3000"
                      value={targetPort}
                      onChange={(event) => setTargetPort(event.target.value.replace(/[^\d]/g, ''))}
                      className="h-10 w-full rounded-sm border border-[#3b4b37] bg-[#182216] px-4 text-sm text-[#dae6d2] outline-none transition-colors placeholder:text-[#84967e] focus:border-[#ebffe2] sm:w-48"
                      style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
                    />
                    <button
                      onClick={runScan}
                      disabled={scanning}
                      className="h-10 rounded-sm bg-[#5c4ae4] px-6 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#6c5af4] disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
                    >
                      {scanning ? 'Scanning...' : 'Run Scan'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    className="text-[11px] uppercase tracking-[0.2em] text-[#b9ccb2]"
                    style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
                  >
                    Process Targets
                  </label>
                  <div className="grid gap-2 md:grid-cols-3">
                    {processColumns.map((column, columnIndex) => (
                      <div key={`col-${columnIndex}`} className="flex flex-col gap-2">
                        {column.map((label) => {
                          const selected = isSelectedProcess(label);
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => toggleProcess(label)}
                              className={`rounded-sm border px-4 py-2 text-left text-xs transition-colors ${
                                selected
                                  ? 'border-[#3b358a] bg-[#1c1a3b] text-[#dae6d2]'
                                  : 'border-[#3b4b37] bg-[#182216] text-[#b9ccb2] hover:border-[#84967e]'
                              }`}
                              style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    className="text-[11px] uppercase tracking-[0.2em] text-[#b9ccb2]"
                    style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
                  >
                    Custom Processes
                  </label>
                  <input
                    placeholder="pnpm,node,ollama"
                    value={customProcesses}
                    onChange={(event) => setCustomProcesses(event.target.value)}
                    className="h-10 w-full rounded-sm border border-[#3b4b37] bg-[#182216] px-4 text-sm text-[#dae6d2] outline-none transition-colors placeholder:text-[#84967e] focus:border-[#ebffe2]"
                    style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
                  />
                </div>
              </section>

              {error && (
                <div className="rounded-sm border border-[#c43b46] bg-[#93000a] px-4 py-3 text-sm text-[#ffdad6]">{error}</div>
              )}

              {result && (
                <>
                  <section className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-[#3b4b37] bg-[#182216] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#b9ccb2]" style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                        Overall:
                      </span>
                      <StatusBadge status={result.overallStatus} />
                    </div>
                    <span className="text-xs text-[#84967e]" style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </section>

                  <section className="grid gap-6 lg:grid-cols-2">
                    {result.results.map((entry) => (
                      <ResultCard key={entry.name} result={entry} />
                    ))}
                  </section>
                </>
              )}
            </>
          )}

          {activeSection === 'project-risks' && (
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={loadProjectRisks}
                  disabled={risksLoading}
                  className="h-10 rounded-sm bg-[#5c4ae4] px-6 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#6c5af4] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
                >
                  {risksLoading ? 'Checking...' : 'Run Risk Check'}
                </button>
                {riskResult && <StatusBadge status={riskResult.status} />}
              </div>

              {risksError && (
                <div className="rounded-sm border border-[#c43b46] bg-[#93000a] px-4 py-3 text-sm text-[#ffdad6]">{risksError}</div>
              )}

              {riskResult && (
                <div className="rounded-sm border border-[#3b4b37] bg-[#182216] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-[#dae6d2]">{riskResult.name}</h2>
                    <span className="text-[11px] text-[#84967e]">{riskResult.durationMs}ms</span>
                  </div>
                  <p className="mt-2 text-sm text-[#b9ccb2]">{riskResult.message}</p>

                  <div className="mt-4 space-y-3">
                    {Array.isArray(riskResult.details?.risks) && riskResult.details.risks.length > 0 ? (
                      (riskResult.details.risks as Array<Record<string, unknown>>).map((risk) => (
                        <div key={String(risk.id)} className="rounded-sm border border-[#3b4b37] bg-[#141e12] p-4">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-sm px-2 py-[2px] text-[10px] font-black uppercase ${risk.severity === 'error' ? 'bg-[#93000a] text-[#ffdad6]' : 'bg-[#5d3c0a] text-[#ffba43]'}`}>
                              {String(risk.severity)}
                            </span>
                            <h3 className="text-sm font-bold text-[#dae6d2]">{String(risk.title)}</h3>
                          </div>
                          <p className="mt-2 text-sm text-[#b9ccb2]">{String(risk.message)}</p>
                          {Array.isArray(risk.evidence) && risk.evidence.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {risk.evidence.map((item) => (
                                <span key={String(item)} className="rounded-sm border border-[#3b4b37] bg-[#182216] px-2 py-1 text-xs text-[#dae6d2]">
                                  {String(item)}
                                </span>
                              ))}
                            </div>
                          )}
                          {typeof risk.suggestion === 'string' && (
                            <p className="mt-2 text-xs text-[#84967e]">{risk.suggestion}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#b9ccb2]">No risks found in current rule set.</p>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {activeSection === 'scan-history' && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportHistory}
                  className="h-10 rounded-sm border border-[#3b4b37] bg-[#182216] px-4 text-xs font-bold uppercase tracking-wide text-[#dae6d2] transition-colors hover:border-[#84967e]"
                  style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="h-10 rounded-sm border border-[#c43b46] bg-[#93000a] px-4 text-xs font-bold uppercase tracking-wide text-[#ffdad6] transition-colors hover:opacity-90"
                  style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
                >
                  Clear History
                </button>
              </div>

              {historyEntries.length === 0 ? (
                <div className="rounded-sm border border-[#3b4b37] bg-[#182216] p-5 text-sm text-[#b9ccb2]">
                  No scans saved yet. Run Inspector to create history snapshots.
                </div>
              ) : (
                <div className="space-y-3">
                  {historyEntries.map((entry) => (
                    <div key={entry.id} className="rounded-sm border border-[#3b4b37] bg-[#182216] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <StatusBadge status={entry.overallStatus} />
                          <span className="text-sm font-bold text-[#dae6d2]">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-xs text-[#84967e]">{entry.durationMsTotal}ms total</span>
                      </div>
                      <p className="mt-2 text-xs text-[#b9ccb2]">
                        target port: {entry.targetPort ?? 'none'} | processes: {entry.selectedProcesses.join(', ') || 'none'}
                      </p>
                      <div className="mt-3 grid gap-2 lg:grid-cols-2">
                        {entry.results.map((item) => (
                          <div key={`${entry.id}-${item.name}`} className="rounded-sm border border-[#3b4b37] bg-[#141e12] p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-[#dae6d2]">{item.name}</span>
                              <StatusBadge status={item.status} />
                            </div>
                            <p className="mt-1 text-xs text-[#b9ccb2]">{item.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeSection === 'environment-settings' && (
            <section className="space-y-4">
              <div className="rounded-sm border border-[#3b4b37] bg-[#182216] p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-[#b9ccb2]">Default Target Port</span>
                    <input
                      inputMode="numeric"
                      value={settingsDraft.defaultTargetPort ?? ''}
                      onChange={(event) => {
                        const value = event.target.value.replace(/[^\d]/g, '');
                        setSettingsDraft((current) => ({
                          ...current,
                          defaultTargetPort: value ? Number(value) : null,
                        }));
                      }}
                      className="h-10 rounded-sm border border-[#3b4b37] bg-[#141e12] px-3 text-sm text-[#dae6d2] outline-none focus:border-[#ebffe2]"
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-[#b9ccb2]">Timeout (ms)</span>
                    <input
                      inputMode="numeric"
                      value={settingsDraft.timeoutMs}
                      onChange={(event) => {
                        const value = event.target.value.replace(/[^\d]/g, '');
                        setSettingsDraft((current) => ({
                          ...current,
                          timeoutMs: value ? Number(value) : current.timeoutMs,
                        }));
                      }}
                      className="h-10 rounded-sm border border-[#3b4b37] bg-[#141e12] px-3 text-sm text-[#dae6d2] outline-none focus:border-[#ebffe2]"
                    />
                  </label>
                </div>

                <label className="mt-4 flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-[#b9ccb2]">Default Processes (comma separated)</span>
                  <input
                    value={defaultProcessesInput}
                    onChange={(event) => setDefaultProcessesInput(event.target.value)}
                    className="h-10 rounded-sm border border-[#3b4b37] bg-[#141e12] px-3 text-sm text-[#dae6d2] outline-none focus:border-[#ebffe2]"
                  />
                </label>

                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-[#dae6d2]">
                    <input
                      type="checkbox"
                      checked={settingsDraft.autoScanOnLoad}
                      onChange={(event) =>
                        setSettingsDraft((current) => ({
                          ...current,
                          autoScanOnLoad: event.target.checked,
                        }))
                      }
                    />
                    Auto-scan on load
                  </label>

                  <label className="flex items-center gap-2 text-sm text-[#dae6d2]">
                    Theme
                    <select
                      value={settingsDraft.theme}
                      onChange={(event) =>
                        setSettingsDraft((current) => ({
                          ...current,
                          theme: event.target.value === 'system' ? 'system' : 'dark',
                        }))
                      }
                      className="rounded-sm border border-[#3b4b37] bg-[#141e12] px-2 py-1 text-sm text-[#dae6d2]"
                    >
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </label>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="h-10 rounded-sm bg-[#5c4ae4] px-6 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#6c5af4]"
                    style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
                  >
                    Save Settings
                  </button>
                  <button
                    type="button"
                    onClick={handleResetSettings}
                    className="h-10 rounded-sm border border-[#3b4b37] bg-[#141e12] px-6 text-xs font-bold uppercase tracking-wide text-[#dae6d2] transition-colors hover:border-[#84967e]"
                    style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
                  >
                    Reset Defaults
                  </button>
                </div>

                {settingsMessage && <p className="mt-3 text-xs text-[#84967e]">{settingsMessage}</p>}
                <p className="mt-2 text-xs text-[#84967e]">Active timeout: {settings.timeoutMs}ms</p>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
