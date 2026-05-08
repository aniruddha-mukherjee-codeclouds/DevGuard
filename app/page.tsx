'use client';

import { useMemo, useState } from 'react';
import type { ScanResponse } from '@/lib/types';
import { processOptions } from '@/lib/constants/processOptions';
import { StatusBadge } from './components/StatusBadge';
import { ResultCard } from './components/ResultCard';

const chunkSize = 10;

export default function HomePage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetPort, setTargetPort] = useState('');
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const [customProcesses, setCustomProcesses] = useState('');

  const processColumns = useMemo(() => {
    const labels = processOptions.map((option) => option.label);
    return [
      labels.slice(0, chunkSize),
      labels.slice(chunkSize, chunkSize * 2),
      labels.slice(chunkSize * 2),
    ];
  }, []);

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

  async function runScan() {
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
      setResult((await res.json()) as ScanResponse);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Unknown error');
    } finally {
      setScanning(false);
    }
  }

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
            <span className="border-r-2 border-[#ebffe2] bg-[#2d382a] px-4 py-2 text-[#ebffe2]">Inspector</span>
            <span className="px-4 py-2 text-[#b9ccb2]">Vulnerabilities</span>
            <span className="px-4 py-2 text-[#b9ccb2]">Scan History</span>
            <span className="px-4 py-2 text-[#b9ccb2]">Environment Settings</span>
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
          <h1 className="text-3xl font-black text-[#dae6d2] md:text-[32px]">DevGuard Web</h1>
          <p className="mt-1 text-sm text-[#b9ccb2]">Developer environment inspector</p>
        </header>

        <div className="flex flex-col gap-8 px-6 pb-10 md:px-10">
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
        </div>
      </main>
    </div>
  );
}
