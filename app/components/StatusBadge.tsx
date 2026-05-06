import type { CheckStatus } from '@/lib/types';

const styles: Record<CheckStatus, string> = {
  ok: 'bg-green-900 text-green-300 border border-green-700',
  warning: 'bg-yellow-900 text-yellow-300 border border-yellow-700',
  error: 'bg-red-900 text-red-300 border border-red-700',
};

export function StatusBadge({ status }: { status: CheckStatus }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono uppercase ${styles[status]}`}>
      {status}
    </span>
  );
}
