'use client';

import { useState } from 'react';
import type { CheckResult } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

export function ResultCard({ result }: { result: CheckResult }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = result.details || result.suggestion;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <StatusBadge status={result.status} />
          <span className="font-medium text-gray-100 truncate">{result.name}</span>
        </div>
        <span className="text-xs text-gray-500 shrink-0">{result.durationMs}ms</span>
      </div>

      <p className="mt-2 text-sm text-gray-400">{result.message}</p>

      {hasMore && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          {expanded ? '▲ Hide details' : '▼ Show details'}
        </button>
      )}

      {expanded && (
        <div className="mt-3 space-y-2">
          {result.suggestion && (
            <p className="text-xs text-yellow-400">
              <span className="font-semibold">Suggestion:</span> {result.suggestion}
            </p>
          )}
          {result.details && (
            <pre className="text-xs text-gray-400 bg-gray-950 rounded p-2 overflow-auto">
              {JSON.stringify(result.details, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
