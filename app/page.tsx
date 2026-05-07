'use client';

import { useState } from 'react';
import type { ScanResponse } from '@/lib/types';
import { StatusBadge } from './components/StatusBadge';
import { ResultCard } from './components/ResultCard';

export default function HomePage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetPort, setTargetPort] = useState('');

  async function runScan() {
    setScanning(true);
    setError(null);
    try {
      const query = targetPort.trim() ? `?targetPort=${encodeURIComponent(targetPort.trim())}` : '';
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
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">DevGuard Web</h1>
        <p className="text-sm text-gray-400 mt-1">Developer environment inspector</p>
      </div>

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

      {error && (
        <div className="mt-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Overall:</span>
            <StatusBadge status={result.overallStatus} />
            <span className="text-xs text-gray-500 ml-auto">
              {new Date(result.timestamp).toLocaleTimeString()}
            </span>
          </div>
          {result.results.map((r) => (
            <ResultCard key={r.name} result={r} />
          ))}
        </div>
      )}
    </main>
  );
}
