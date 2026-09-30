'use client';

import { Input, Textarea } from '@/components/ui/Form';
import { useConfirm } from '@/components/ui/ConfirmDialog';

import React, { useCallback, useEffect, useState } from 'react';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { PageContainer } from '@/components/ui/Page';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Terminal, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';

type CustomCommand = { id: string; trigger: string; response: string; enabled: boolean; cooldownSeconds: number; createdAt: string };

export default function CustomCommandsPage() {
  const confirm = useConfirm();
  const guildId = useGuildId();
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [moduleEnabled, setModuleEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<CustomCommand | null>(null);
  const [trigger, setTrigger] = useState('');
  const [response, setResponse] = useState('');
  const [cooldown, setCooldown] = useState('0');

  const load = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    try {
      const result = await fetch(`/api/custom-commands?guildId=${encodeURIComponent(guildId)}`, { cache: 'no-store' });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || 'Could not load commands.');
      setCommands(data.commands || []);
      setModuleEnabled(data.moduleEnabled === true);
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load commands.'); }
    finally { setLoading(false); }
  }, [guildId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function startEdit(command?: CustomCommand) {
    setEditing(command || null);
    setTrigger(command?.trigger || '');
    setResponse(command?.response || '');
    setCooldown(String(command?.cooldownSeconds || 0));
    setError('');
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { guildId, trigger, response, cooldownSeconds: Number(cooldown), ...(editing ? { enabled: editing.enabled } : {}) };
      const result = await fetch(editing ? `/api/custom-commands/${editing.id}` : '/api/custom-commands', {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || 'Could not save command.');
      startEdit();
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save command.'); }
    finally { setBusy(false); }
  }

  async function toggle(command: CustomCommand) {
    setBusy(true);
    try {
      const result = await fetch(`/api/custom-commands/${command.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId, trigger: command.trigger, response: command.response, cooldownSeconds: command.cooldownSeconds, enabled: !command.enabled }) });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || 'Could not update command.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update command.'); }
    finally { setBusy(false); }
  }

  async function remove(command: CustomCommand) {
    if (!await confirm(`Delete /${command.trigger}?`)) return;
    setBusy(true);
    try {
      const result = await fetch(`/api/custom-commands/${command.id}?guildId=${encodeURIComponent(guildId)}`, { method: 'DELETE' });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || 'Could not delete command.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete command.'); }
    finally { setBusy(false); }
  }

  return <div className="min-w-0">
    <Topbar title="Custom Commands" subtitle="Configure simple, safe responses for your server" />
    <PageContainer className="space-y-6">
    {!loading && !error && !moduleEnabled && <Card className="border border-[var(--warning-border)]"><p className="text-sm text-[var(--warning)]">Custom Commands is currently disabled. Enable it from <a className="underline" href={`/dashboard/${guildId}/modules`}>Modules</a> before members can run commands.</p></Card>}
    {error && <div role="alert" className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3 text-sm text-[var(--danger)]">{error}</div>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.75fr)]">
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-base font-semibold"><Terminal size={18} />Configured commands</h2><Button aria-label="Refresh commands" variant="ghost" size="sm" onClick={() => void load()}><RefreshCw size={14} /></Button></div>
        {loading ? <SkeletonTable rows={3} /> : commands.length === 0
          ? <EmptyState icon={Terminal} title="No commands to display" description={error ? 'Resolve the loading error and try again.' : 'Create your first server command using the form.'} />
          : <div className="space-y-3">{commands.map(command => <div key={command.id} className="rounded-lg border border-[var(--border-base)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 flex-wrap items-center gap-2"><code className="break-all text-sm text-[var(--accent)]">/custom trigger:{command.trigger}</code><Badge variant={command.enabled ? 'success' : 'neutral'}>{command.enabled ? 'Enabled' : 'Disabled'}</Badge></div>
              <div className="flex gap-2"><Button size="sm" variant="ghost" disabled={busy} onClick={() => void toggle(command)}>{command.enabled ? 'Disable' : 'Enable'}</Button><Button aria-label={`Edit ${command.trigger}`} size="sm" variant="ghost" onClick={() => startEdit(command)}><Pencil size={14} /></Button><Button aria-label={`Delete ${command.trigger}`} size="sm" variant="danger" disabled={busy} onClick={() => void remove(command)}><Trash2 size={14} /></Button></div></div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--text-secondary)]">{command.response}</p>
            <p className="mt-2 text-[13px] text-[var(--text-secondary)]">Per-member cooldown: {command.cooldownSeconds ? `${command.cooldownSeconds}s` : 'none'}</p>
          </div>)}</div>}
      </Card>
      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold"><Plus size={18} />{editing ? 'Edit command' : 'Create command'}</h2>
        <form onSubmit={save} className="space-y-4">
          <label className="block text-sm">Trigger<Input required maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,31}" value={trigger} onChange={event => setTrigger(event.target.value)} placeholder="rules" className="mt-1 w-full" /><span className="mt-1 block text-[13px] text-[var(--text-secondary)]">Letters, numbers, underscore and hyphen; unique per server.</span></label>
          <label className="block text-sm">Response<Textarea required maxLength={1800} rows={6} value={response} onChange={event => setResponse(event.target.value)} placeholder="Welcome {mention}! See {guild}'s rules." className="mt-1 w-full resize-y" /></label>
          <label className="block text-sm">Per-member cooldown (seconds)<Input type="number" min={0} max={86400} value={cooldown} onChange={event => setCooldown(event.target.value)} className="mt-1 w-full" /><span className="mt-1 block text-[13px] text-[var(--text-secondary)]">Use 0 for no cooldown, or 5–86400 seconds.</span></label>
          <p className="text-[13px] text-[var(--text-secondary)]">Variables: {'{user}'}, {'{mention}'}, {'{guild}'}, {'{channel}'}. Mentions never notify anyone.</p>
          <div className="flex gap-2"><Button type="submit" isLoading={busy}>{editing ? 'Save changes' : 'Create command'}</Button>{editing && <Button type="button" variant="ghost" onClick={() => startEdit()}>Cancel</Button>}</div>
        </form>
      </Card>
    </div>
    </PageContainer>
  </div>;
}
