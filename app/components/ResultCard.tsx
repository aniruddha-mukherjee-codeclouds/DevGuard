'use client';

import { useEffect, useState } from 'react';
import type { CheckResult } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

interface PortListenerDetail {
  port: number;
  pid: number | null;
  processName: string | null;
  isTarget?: boolean;
}

interface PortCheckDetails {
  occupied: number[];
  listeners: PortListenerDetail[];
  total: number;
  targetPort?: number;
  targetOccupied?: boolean;
  targetOwned?: boolean;
  targetListener?: PortListenerDetail;
  targetProjectRoot?: string;
  targetPid?: number | null;
  targetCommandLine?: string | null;
}

interface EnvCheckDetails {
  missing: string[];
  present: string[];
  placeholderLike: string[];
  filesChecked: string[];
  total: number;
  projectRoot?: string;
  targetPort?: number;
  targetPid?: number | null;
  targetCommandLine?: string | null;
  error?: string;
}

interface NodeCheckDetails {
  current: string;
  required?: string;
  satisfied?: boolean;
  source?: string;
  basis?: string | null;
  projectRoot?: string;
  targetPort?: number;
  targetPid?: number | null;
  error?: string;
}

interface ProcessCheckDetails {
  running: string[];
  missing: string[];
  error?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPortCheckDetails(details: unknown): details is PortCheckDetails {
  return isObject(details) && Array.isArray(details.occupied) && Array.isArray(details.listeners);
}

function isEnvCheckDetails(details: unknown): details is EnvCheckDetails {
  return (
    isObject(details) &&
    Array.isArray(details.missing) &&
    Array.isArray(details.present) &&
    Array.isArray(details.placeholderLike) &&
    Array.isArray(details.filesChecked)
  );
}

function isNodeCheckDetails(details: unknown): details is NodeCheckDetails {
  return isObject(details) && typeof details.current === 'string';
}

function isProcessCheckDetails(details: unknown): details is ProcessCheckDetails {
  return isObject(details) && Array.isArray(details.running) && Array.isArray(details.missing);
}

function StatTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const toneStyles = {
    default: 'border-gray-800 bg-gray-950 text-gray-100',
    success: 'border-green-900 bg-green-950/40 text-green-200',
    warning: 'border-yellow-900 bg-yellow-950/40 text-yellow-200',
    danger: 'border-red-900 bg-red-950/40 text-red-200',
  };

  return (
    <div className={`min-w-0 rounded-lg border px-3 py-2 ${toneStyles[tone]}`}>
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm [overflow-wrap:anywhere]">{value}</p>
    </div>
  );
}

function TokenList({
  label,
  items,
  emptyLabel,
  tone = 'default',
}: {
  label: string;
  items: string[];
  emptyLabel: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const toneStyles = {
    default: 'border-gray-800 bg-gray-950 text-gray-100',
    success: 'border-green-900 bg-green-950/40 text-green-200',
    warning: 'border-yellow-900 bg-yellow-950/40 text-yellow-200',
    danger: 'border-red-900 bg-red-950/40 text-red-200',
  };

  return (
    <div className={`min-w-0 rounded-lg border p-3 ${toneStyles[tone]}`}>
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="max-w-full break-all rounded-md border border-current/20 bg-black/20 px-2 py-1 text-xs"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-gray-400">{emptyLabel}</p>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <p className="shrink-0 text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
        <p className="min-w-0 break-words text-sm text-gray-200 sm:max-w-[70%] sm:text-right [overflow-wrap:anywhere]">
          {value}
        </p>
      </div>
    </div>
  );
}

function renderPortDetails(details: PortCheckDetails) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {typeof details.targetPort === 'number' && (
          <StatTile
            label="Target Port"
            value={`${details.targetPort} ${
              details.targetOccupied
                ? details.targetOwned
                  ? 'used by target project'
                  : 'occupied by another process'
                : 'available'
            }`}
            tone={details.targetOccupied ? (details.targetOwned ? 'success' : 'danger') : 'success'}
          />
        )}
        <StatTile label="Occupied Ports" value={String(details.occupied.length)} />
        <StatTile
          label="Primary Match"
          value={details.targetListener?.processName ?? 'No specific target'}
        />
      </div>

      <TokenList
        label="Occupied Port List"
        items={details.occupied.map((port) =>
          port === details.targetPort ? `${port} (target)` : String(port)
        )}
        emptyLabel="No occupied TCP ports detected."
      />

      {details.targetProjectRoot && <DetailRow label="Target Project Root" value={details.targetProjectRoot} />}
      {typeof details.targetPid === 'number' && (
        <DetailRow label="Target PID" value={String(details.targetPid)} />
      )}
      {details.targetCommandLine && <DetailRow label="Target Command" value={details.targetCommandLine} />}

      <div className="min-w-0 rounded-lg border border-gray-800 bg-gray-950 p-3">
        <p className="text-[11px] uppercase tracking-wide text-gray-500">Services By Port</p>
        <div className="mt-2 space-y-2">
          {details.listeners.length > 0 ? (
            details.listeners.map((listener) => (
              <div
                key={`${listener.port}-${listener.pid ?? 'none'}`}
                className={`flex min-w-0 flex-col gap-2 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-start sm:justify-between ${
                  listener.isTarget
                    ? 'border-indigo-700 bg-indigo-950/40 text-indigo-100'
                    : 'border-gray-800 bg-gray-900 text-gray-200'
                }`}
              >
                <span className="shrink-0 font-mono">
                  {listener.port}
                  {listener.isTarget ? ' target' : ''}
                </span>
                <span className="min-w-0 break-words text-left text-gray-300 sm:max-w-[70%] sm:text-right [overflow-wrap:anywhere]">
                  {listener.processName ?? 'Unknown process'}
                  {listener.pid !== null ? ` (PID ${listener.pid})` : ''}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">No active listeners found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function renderEnvDetails(details: EnvCheckDetails) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Required Keys" value={String(details.total)} />
        <StatTile label="Present" value={String(details.present.length)} tone="success" />
        <StatTile label="Missing" value={String(details.missing.length)} tone="danger" />
        <StatTile
          label="Placeholders"
          value={String(details.placeholderLike.length)}
          tone={details.placeholderLike.length > 0 ? 'warning' : 'default'}
        />
      </div>

      {details.projectRoot && <DetailRow label="Project Root" value={details.projectRoot} />}
      {details.filesChecked.length > 0 && (
        <DetailRow label="Files Checked" value={details.filesChecked.join(', ')} />
      )}
      {typeof details.targetPort === 'number' && (
        <DetailRow
          label="Target Port"
          value={`${details.targetPort}${details.targetPid ? ` (PID ${details.targetPid})` : ''}`}
        />
      )}
      {details.targetCommandLine && <DetailRow label="Target Command" value={details.targetCommandLine} />}

      <TokenList
        label="Present Keys"
        items={details.present}
        emptyLabel="No required keys were found yet."
        tone="success"
      />
      <TokenList
        label="Missing Keys"
        items={details.missing}
        emptyLabel="No missing keys."
        tone="danger"
      />
      <TokenList
        label="Placeholder Values"
        items={details.placeholderLike}
        emptyLabel="No placeholder values detected."
        tone="warning"
      />
      {details.error && <DetailRow label="Read Error" value={details.error} />}
    </div>
  );
}

function renderNodeDetails(details: NodeCheckDetails) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Current Node" value={`v${details.current}`} />
        <StatTile label="Required" value={details.required ?? 'Not declared'} />
        <StatTile
          label="Source"
          value={details.source ?? 'No version file'}
          tone={details.source ? 'default' : 'warning'}
        />
      </div>

      {details.projectRoot && <DetailRow label="Project Root" value={details.projectRoot} />}
      {typeof details.targetPort === 'number' && (
        <DetailRow
          label="Target Port"
          value={`${details.targetPort}${details.targetPid ? ` (PID ${details.targetPid})` : ''}`}
        />
      )}
      {details.basis && <DetailRow label="Compatibility Basis" value={details.basis} />}
      {typeof details.satisfied === 'boolean' && (
        <DetailRow
          label="Compatibility"
          value={details.satisfied ? 'Current Node version matches project requirement' : 'Current Node version does not match project requirement'}
        />
      )}
      {details.error && <DetailRow label="Version Error" value={details.error} />}
    </div>
  );
}

function renderProcessDetails(details: ProcessCheckDetails) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile label="Running Matches" value={String(details.running.length)} tone="success" />
        <StatTile label="Missing Matches" value={String(details.missing.length)} tone="warning" />
      </div>

      <TokenList
        label="Running Processes"
        items={details.running}
        emptyLabel="None of the selected process names were found."
        tone="success"
      />
      <TokenList
        label="Missing Processes"
        items={details.missing}
        emptyLabel="No missing processes."
        tone="warning"
      />
      {details.error && <DetailRow label="Process Error" value={details.error} />}
    </div>
  );
}

function renderFallbackDetails(details: CheckResult['details']) {
  if (!isObject(details)) return null;

  const rows = Object.entries(details)
    .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
    .map(([key, value]) => (
      <DetailRow key={key} label={key} value={String(value)} />
    ));

  return rows.length > 0 ? <div className="space-y-2">{rows}</div> : null;
}

export function ResultCard({ result }: { result: CheckResult }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const hasMore = Boolean(result.details || result.suggestion);

  useEffect(() => {
    if (!isModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  let detailsContent = renderFallbackDetails(result.details);

  if (isPortCheckDetails(result.details)) {
    detailsContent = renderPortDetails(result.details);
  } else if (isEnvCheckDetails(result.details)) {
    detailsContent = renderEnvDetails(result.details);
  } else if (isNodeCheckDetails(result.details)) {
    detailsContent = renderNodeDetails(result.details);
  } else if (isProcessCheckDetails(result.details)) {
    detailsContent = renderProcessDetails(result.details);
  }

  return (
    <div className="min-w-0 rounded-xl border border-gray-800 bg-gray-900/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <StatusBadge status={result.status} />
          <span className="truncate font-medium text-gray-100">{result.name}</span>
        </div>
        <span className="shrink-0 rounded-full border border-gray-800 bg-gray-950 px-2 py-1 text-xs text-gray-400">
          {result.durationMs}ms
        </span>
      </div>

      <p className="mt-3 break-words text-sm leading-6 text-gray-300 [overflow-wrap:anywhere]">
        {result.message}
      </p>

      {hasMore && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500 transition-colors hover:text-gray-300"
        >
          Show details
        </button>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-md"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`details-title-${result.name}`}
            className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-800 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={result.status} />
                  <h2
                    id={`details-title-${result.name}`}
                    className="min-w-0 break-words text-lg font-semibold text-gray-100 [overflow-wrap:anywhere]"
                  >
                    {result.name}
                  </h2>
                  <span className="rounded-full border border-gray-800 bg-gray-950 px-2 py-1 text-xs text-gray-400">
                    {result.durationMs}ms
                  </span>
                </div>
                <p className="mt-3 break-words text-sm leading-6 text-gray-300 [overflow-wrap:anywhere]">
                  {result.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="shrink-0 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-300 transition-colors hover:border-gray-700 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="overflow-x-hidden overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
              <div className="space-y-4">
                {result.suggestion && (
                  <div className="rounded-lg border border-yellow-900 bg-yellow-950/40 px-3 py-2 text-sm text-yellow-100 [overflow-wrap:anywhere]">
                    {result.suggestion}
                  </div>
                )}
                {detailsContent}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
