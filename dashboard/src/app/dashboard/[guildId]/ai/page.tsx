'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { PageContainer } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Switch } from '@/components/ui/Form';
import { ChannelMultiSelect } from '@/components/discord/ChannelMultiSelect';
import { Badge } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/Skeleton';
import { Topbar } from '@/components/layout/Topbar';

type Settings = { allowedChannels: string[]; userCooldownSeconds: number; guildRequestsPerMinute: number; maxInputLength: number; maxOutputLength: number; responseStyle: 'BALANCED'|'CASUAL'|'PROFESSIONAL'|'TECHNICAL' };
type Channel = { id: string; name: string; category: string };
const defaults: Settings = { allowedChannels: [], userCooldownSeconds: 10, guildRequestsPerMinute: 10, maxInputLength: 1200, maxOutputLength: 1200, responseStyle: 'BALANCED' };

export default function KraxxAiPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = use(params);
  const [enabled, setEnabled] = useState(false); const [settings, setSettings] = useState<Settings>(defaults);
  const [channels, setChannels] = useState<Channel[]>([]); const [usage, setUsage] = useState({ requestsToday: 0, successful: 0, failed: 0, rateLimited: 0 });
  const [providerStatus, setProviderStatus] = useState<'RECENTLY_SUCCEEDED'|'UNKNOWN'>('UNKNOWN'); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(async () => {
    const [configResponse, metaResponse] = await Promise.all([fetch(`/api/ai?guildId=${guildId}`), fetch(`/api/discord/meta?guildId=${guildId}`)]);
    const config = await configResponse.json(); const meta = await metaResponse.json();
    if (!configResponse.ok) throw new Error(config.error || 'Unable to load Kraxx AI settings.');
    if (!metaResponse.ok) throw new Error(meta.error || 'Unable to load server channels.');
    return { config, channels: meta.channels as Channel[] };
  }, [guildId]);
  const applyLoaded = useCallback((data: { config: { enabled: boolean; settings: Settings; usage: typeof usage; providerStatus: 'RECENTLY_SUCCEEDED'|'UNKNOWN' }; channels: Channel[] }) => {
    setEnabled(data.config.enabled); setSettings(data.config.settings); setUsage(data.config.usage); setProviderStatus(data.config.providerStatus); setChannels(data.channels);
  }, []);
  useEffect(() => { let active = true; void load().then(data => { if (active) { applyLoaded(data); setError(null); setLoading(false); } }).catch(e => { if (active) { setError(e instanceof Error ? e.message : 'Unable to load settings.'); setLoading(false); } }); return () => { active = false; }; }, [load, applyLoaded]);
  const save = async () => {
    setSaving(true); setError(null); setNotice(null);
    try { const response = await fetch('/api/ai', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guildId, enabled, settings }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to save settings.'); setNotice('Kraxx AI settings saved.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save settings.'); } finally { setSaving(false); }
  };
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings(current => ({ ...current, [key]: value }));
  return <div className="flex-1 flex flex-col bg-[var(--bg)]"><Topbar title="Kraxx AI" subtitle="Configure explicit, response-only AI requests for this server." />
    <PageContainer className="space-y-6"><p className="text-sm text-[var(--text-secondary)]">Only explicit @mentions and /ask prompts are processed. No channel history is read.</p>
      {loading ? <LoadingState label="Loading Kraxx AI settings" /> : error && !channels.length ? <ErrorState title="Kraxx AI settings unavailable" message={error} onRetry={() => { setLoading(true); void load().then(applyLoaded).catch(e => setError(e.message)).finally(() => setLoading(false)); }} /> : <>
        <Card className="p-5 space-y-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-sm font-semibold">AI module</h2><p className="text-sm text-[var(--text-secondary)]">Disabled by default. Members can use AI only when enabled and allowed by channel policy.</p></div><div className="flex items-center gap-3"><Badge variant={enabled ? 'success' : 'neutral'}>{enabled ? 'Enabled' : 'Disabled'}</Badge><Switch checked={enabled} label="Enable Kraxx AI" onClick={() => setEnabled(value => !value)} /></div></div>
          <div className="flex items-center gap-2 text-sm"><StatusDot status={providerStatus === 'RECENTLY_SUCCEEDED' ? 'online' : 'unknown'} label={providerStatus === 'RECENTLY_SUCCEEDED' ? 'A provider request succeeded today' : 'Provider status unknown until a live request succeeds'} /></div>
          <p className="text-xs text-[var(--text-secondary)]">Explicit prompts are sent to Google Gemini for generation. KRAXXBot does not store prompt or response text; Google’s free-tier data handling may differ from its paid tier. No history, search, tools, or server data are supplied.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ChannelMultiSelect channels={channels} selectedIds={settings.allowedChannels} onChange={allowedChannels => update('allowedChannels', allowedChannels)} />
            <label className="text-sm">User cooldown (seconds)<Input type="number" min={5} max={300} value={settings.userCooldownSeconds} className="mt-2 w-full" onChange={e => update('userCooldownSeconds', Number(e.target.value))} /></label>
            <label className="text-sm">Guild request limit / minute<Input type="number" min={1} max={60} value={settings.guildRequestsPerMinute} className="mt-2 w-full" onChange={e => update('guildRequestsPerMinute', Number(e.target.value))} /></label>
            <label className="text-sm">Maximum prompt length<Input type="number" min={20} max={2000} value={settings.maxInputLength} className="mt-2 w-full" onChange={e => update('maxInputLength', Number(e.target.value))} /></label>
            <label className="text-sm">Maximum response length<Input type="number" min={100} max={1800} value={settings.maxOutputLength} className="mt-2 w-full" onChange={e => update('maxOutputLength', Number(e.target.value))} /></label>
            <label className="text-sm">Response style<Select value={settings.responseStyle} className="mt-2 w-full" onChange={e => update('responseStyle', e.target.value as Settings['responseStyle'])}><option value="BALANCED">Balanced</option><option value="CASUAL">Casual</option><option value="PROFESSIONAL">Professional</option><option value="TECHNICAL">Technical</option></Select></label>
          </div>{error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}{notice && <p role="status" className="text-sm text-[var(--success)]">{notice}</p>}<Button isLoading={saving} onClick={() => void save()}>Save settings</Button>
        </Card>
        <Card className="p-5"><h2 className="text-sm font-semibold mb-4">Usage today</h2><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{Object.entries({ 'Requests': usage.requestsToday, 'Successful': usage.successful, 'Failed': usage.failed, 'Rate limited': usage.rateLimited }).map(([label, value]) => <div key={label}><p className="text-xs text-[var(--text-secondary)]">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}</div><p className="mt-3 text-xs text-[var(--text-secondary)]">Only operational counts are retained; prompts and responses are not stored.</p></Card>
      </>}</PageContainer></div>;
}
