'use client';

import { useId, useMemo, useState } from 'react';
import { Check, ChevronDown, Hash, Megaphone, Search, X } from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';
import { Input } from '@/components/ui/Form';

export type ChannelChoice = { id: string; name: string; category: string; type?: number };

export function filterChannelChoices(channels: ChannelChoice[], query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  return channels.filter(channel => !normalized || `${channel.name} ${channel.category}`.toLocaleLowerCase().includes(normalized));
}

export function toggleChannelChoice(selectedIds: string[], channelId: string) {
  return selectedIds.includes(channelId) ? selectedIds.filter(id => id !== channelId) : [...selectedIds, channelId];
}

export function toggleVisibleChannelChoices(selectedIds: string[], visibleIds: string[]) {
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
  return allVisibleSelected
    ? selectedIds.filter(id => !visibleIds.includes(id))
    : [...new Set([...selectedIds, ...visibleIds])];
}

export function ChannelMultiSelect({
  channels,
  selectedIds,
  onChange,
  disabled = false,
}: {
  channels: ChannelChoice[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const labelId = useId();
  const selected = useMemo(() => channels.filter(channel => selectedIds.includes(channel.id)), [channels, selectedIds]);
  const filtered = useMemo(() => filterChannelChoices(channels, query), [channels, query]);
  const groups = useMemo(() => {
    const grouped = new Map<string, ChannelChoice[]>();
    for (const channel of filtered) grouped.set(channel.category, [...(grouped.get(channel.category) || []), channel]);
    return [...grouped.entries()];
  }, [filtered]);

  function toggle(channelId: string) {
    onChange(toggleChannelChoice(selectedIds, channelId));
  }

  function toggleVisible() {
    const visibleIds = filtered.map(channel => channel.id);
    onChange(toggleVisibleChannelChoices(selectedIds, visibleIds));
  }

  return (
    <div className="min-w-0">
      <p id={labelId} className="mb-1.5 block text-sm font-medium">Allowed channels</p>
      <p className="mb-2 text-xs text-[var(--text-secondary)]">No selections means all text channels. Select one or more channels to limit Kraxx AI.</p>
      <div className="relative">
        <button type="button" aria-labelledby={labelId} aria-expanded={open} aria-haspopup="true" disabled={disabled}
          onClick={() => setOpen(value => !value)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-[var(--border-base)] bg-[var(--surface-1)] px-3 py-2 text-left text-sm hover:border-[var(--accent-border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] disabled:opacity-50">
          <span className="min-w-0 truncate text-[var(--text-primary)]">
            {selected.length === 0 ? 'All text channels' : `${selected.length} channel${selected.length === 1 ? '' : 's'} selected`}
            {selected.length > 0 && <span className="ml-2 text-xs text-[var(--text-secondary)]">{selected.slice(0, 2).map(channel => `#${channel.name}`).join(', ')}{selected.length > 2 ? ` +${selected.length - 2}` : ''}</span>}
          </span>
          <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && <>
          <button type="button" aria-label="Close channel selector" tabIndex={-1} className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <Dropdown label="Allowed channel selection" onClose={() => setOpen(false)} className="left-0 right-0 z-50 mt-1 max-h-80 p-2">
            <div className="mb-2 flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search aria-hidden="true" className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                <Input type="search" aria-label="Search allowed channels" placeholder="Search channels..." value={query}
                  onChange={event => setQuery(event.target.value)} className="w-full pl-8" />
              </div>
              <button type="button" onClick={toggleVisible} className="shrink-0 rounded px-2 py-2 text-xs text-[var(--accent)] hover:bg-[var(--surface-2)]">
                {filtered.length > 0 && filtered.every(channel => selectedIds.includes(channel.id)) ? 'Clear visible' : 'Select visible'}
              </button>
              <button type="button" aria-label="Clear allowed channels" onClick={() => onChange([])} disabled={selectedIds.length === 0}
                className="rounded p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-2)] disabled:opacity-40"><X aria-hidden="true" className="h-4 w-4" /></button>
            </div>
            <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
              {groups.length === 0 ? <p className="px-2 py-5 text-center text-sm text-[var(--text-secondary)]">No channels match that search.</p> : groups.map(([category, items]) => (
                <section key={category} aria-label={category}>
                  <h3 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{category}</h3>
                  <div className="space-y-0.5">{items.map(channel => {
                    const checked = selectedIds.includes(channel.id);
                    const announcement = channel.type === 5;
                    return <button key={channel.id} type="button" role="checkbox" aria-checked={checked} onClick={() => toggle(channel.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]">
                      <span className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="text-[var(--text-secondary)]">{announcement ? <Megaphone className="h-4 w-4" /> : <Hash className="h-4 w-4" />}</span><span className="truncate">#{channel.name}</span></span>
                      <span aria-hidden="true" className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? 'border-[var(--accent)] bg-[var(--accent)] text-black' : 'border-[var(--border-base)]'}`}>{checked && <Check className="h-3 w-3" />}</span>
                    </button>;
                  })}</div>
                </section>
              ))}
            </div>
          </Dropdown>
        </>}
      </div>
      {selected.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Selected allowed channels">
        {selected.map(channel => <span key={channel.id} className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--border-base)] bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--text-secondary)]">
          <span className="truncate">#{channel.name}</span><button type="button" aria-label={`Remove #${channel.name}`} onClick={() => toggle(channel.id)} className="shrink-0 rounded-full hover:text-[var(--text-primary)]"><X aria-hidden="true" className="h-3 w-3" /></button>
        </span>)}
      </div>}
    </div>
  );
}
