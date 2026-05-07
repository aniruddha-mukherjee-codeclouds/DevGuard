'use client';

import { useState } from 'react';
import type { ScanResponse } from '@/lib/types';
import { processOptions } from '@/lib/constants/processOptions';
import { StatusBadge } from './components/StatusBadge';
import { ResultCard } from './components/ResultCard';

export default function HomePage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetPort, setTargetPort] = useState('');
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const [customProcesses, setCustomProcesses] = useState('');

  function toggleProcess(processName: string) {
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
      setResult(await res.json() as ScanResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setScanning(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">DevGuard Web</h1>
        <p className="text-sm text-gray-400 mt-1">Developer environment inspector</p>
      </div>

      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Env Target Port
            </span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="3000"
              value={targetPort}
              onChange={(event) => setTargetPort(event.target.value.replace(/[^\d]/g, ''))}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none transition-colors placeholder:text-gray-600 focus:border-indigo-500 sm:w-40"
            />
          </label>

          <button
            onClick={runScan}
            disabled={scanning}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 text-white font-medium transition-colors"
          >
            {scanning ? 'Scanning...' : 'Run Scan'}
          </button>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Process Targets
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {processOptions.map((option) => {
              const selected = selectedProcesses.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleProcess(option.value)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    selected
                      ? 'border-indigo-500 bg-indigo-950 text-indigo-100'
                      : 'border-gray-800 bg-gray-900 text-gray-300 hover:border-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Custom Processes
          </span>
          <input
            placeholder="pnpm,node,ollama"
            value={customProcesses}
            onChange={(event) => setCustomProcesses(event.target.value)}
            className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none transition-colors placeholder:text-gray-600 focus:border-indigo-500"
          />
        </label>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-5">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/80 px-4 py-3">
            <span className="text-sm text-gray-400">Overall:</span>
            <StatusBadge status={result.overallStatus} />
            <span className="ml-auto text-xs text-gray-500">
              {new Date(result.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {result.results.map((r) => (
              <ResultCard key={r.name} result={r} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
