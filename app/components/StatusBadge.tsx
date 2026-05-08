import type { CheckStatus } from '@/lib/types';

const styles: Record<CheckStatus, string> = {
  ok: 'bg-[#133918] text-[#00ff41] border border-[#1f5324]',
  warning: 'bg-[#5d3c0a] text-[#ffba43] border border-[#7a5313]',
  error: 'bg-[#93000a] text-[#ffdad6] border border-[#c43b46]',
};

export function StatusBadge({ status }: { status: CheckStatus }) {
  return (
    <span
      className={`rounded-sm px-2 py-[2px] text-[10px] font-black uppercase tracking-wide ${styles[status]}`}
      style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
    >
      {status}
    </span>
  );
}
