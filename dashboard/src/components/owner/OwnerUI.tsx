import Link from 'next/link';
import { ReactNode } from 'react';

export function OwnerPage({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="mx-auto w-full max-w-7xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-5">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">KRAXXBot Control Center</p>
        <h1 className="text-3xl font-semibold text-[var(--text-primary)]">{title}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p></div>
      <Link href="/dashboard/owner" className="text-sm text-[var(--accent)] hover:underline">Owner overview</Link>
    </header>{children}
  </section>;
}

export function OwnerCard({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
    <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">{label}</p>
    <div className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</div>
    {detail !== undefined && <p className="mt-2 text-sm text-[var(--text-secondary)]">{detail}</p>}
  </article>;
}

export function OwnerPanel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
    <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">{title}</h2>{children}
  </section>;
}

export function OwnerStatus({ value }: { value: string }) {
  const tone = value === 'OPERATIONAL' || value === 'CONNECTED' || value === 'HEALTHY' || value === 'CONFIGURED'
    ? 'text-emerald-400' : value === 'DEGRADED' || value === 'UNKNOWN' || value === 'NOT_TRACKED' || value === 'NOT_VERIFIED'
      ? 'text-amber-300' : 'text-[var(--text-secondary)]';
  return <span className={`font-medium ${tone}`}>{value.replaceAll('_', ' ')}</span>;
}
