'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { OwnerStatus } from './OwnerUI';

type ServerRow = { id: string; name: string; icon: string | null; memberCount: number | null; status: string; firstSeenAt: string; lastSeenAt: string | null; enabledModuleCount: number; aiEnabled: boolean };

export function OwnerServers() {
  const [servers, setServers] = useState<ServerRow[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [sort, setSort] = useState('firstSeen');
  const [error, setError] = useState('');
  useEffect(() => {
    const params = new URLSearchParams({ q: query, status, sort });
    let active = true;
    fetch(`/api/owner/servers?${params}`, { cache: 'no-store' }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load servers.');
      if (active) { setServers(data.servers); setError(''); }
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load servers.'); });
    return () => { active = false; };
  }, [query, status, sort]);

  return <div className="space-y-4">
    <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 md:grid-cols-3">
      <label className="text-sm text-[var(--text-secondary)]">Search by name or guild ID<input value={query} onChange={event => setQuery(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[var(--text-primary)]" /></label>
      <label className="text-sm text-[var(--text-secondary)]">Status<select value={status} onChange={event => setStatus(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[var(--text-primary)]"><option>ALL</option><option>CONNECTED</option><option>UNAVAILABLE</option><option>UNKNOWN</option><option>LEFT</option></select></label>
      <label className="text-sm text-[var(--text-secondary)]">Sort by<select value={sort} onChange={event => setSort(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[var(--text-primary)]"><option value="firstSeen">First seen</option><option value="lastSeen">Last seen</option></select></label>
    </div>
    {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
    <div className="grid gap-3">{servers.map(server => <Link key={server.id} href={`/dashboard/owner/servers/${server.id}`} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 hover:border-[var(--accent)]">
      <div className="flex min-w-0 items-center gap-3">{server.icon ? <span role="img" aria-label={`${server.name} icon`} className="size-10 shrink-0 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png?size=64)` }} /> : <span className="grid size-10 place-items-center rounded-xl bg-[var(--surface-2)] text-lg">K</span>}
        <div className="min-w-0"><h2 className="truncate font-semibold text-[var(--text-primary)]">{server.name}</h2><p className="truncate font-mono text-xs text-[var(--text-secondary)]">{server.id}</p></div></div>
      <div className="flex flex-wrap items-center gap-4 text-sm"><OwnerStatus value={server.status} /><span>{server.memberCount ?? '—'} members</span><span>{server.enabledModuleCount} modules</span><span>AI {server.aiEnabled ? 'enabled' : 'off'}</span></div>
    </Link>)}{!servers.length && !error && <p className="rounded-xl border border-[var(--border)] p-6 text-sm text-[var(--text-secondary)]">No matching servers.</p>}</div>
  </div>;
}
