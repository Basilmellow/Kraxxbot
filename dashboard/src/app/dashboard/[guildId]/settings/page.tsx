'use client';

import { PageContainer } from '@/components/ui/Page';
import { Input } from '@/components/ui/Form';

import { LoadingState } from '@/components/ui/Skeleton';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { AlertCircle, CheckCircle2, Hash, Loader2, Save, Settings, Shield } from 'lucide-react';
import React, { use, useCallback, useEffect, useState } from 'react';

interface PageProps {
  params: Promise<{ guildId: string }>;
}

interface GuildSettingsForm {
  prefix: string;
  welcomeChannelId: string;
  announcementChannelId: string;
  modLogChannelId: string;
  logChannelId: string;
  ticketCategoryId: string;
  ticketTranscriptsChannelId: string;
  adminRoleId: string;
  modRoleId: string;
  supportRoleId: string;
}

const EMPTY_SETTINGS: GuildSettingsForm = {
  prefix: '!', welcomeChannelId: '', announcementChannelId: '', modLogChannelId: '',
  logChannelId: '', ticketCategoryId: '', ticketTranscriptsChannelId: '',
  adminRoleId: '', modRoleId: '', supportRoleId: '',
};

function normalizeSettings(settings?: Partial<GuildSettingsForm> | null): GuildSettingsForm {
  return Object.fromEntries(Object.entries(EMPTY_SETTINGS).map(([key, fallback]) => [key, settings?.[key as keyof GuildSettingsForm] ?? fallback])) as unknown as GuildSettingsForm;
}

export default function GuildSettingsPage({ params }: PageProps) {
  const { guildId } = use(params);

  const [settings, setSettings] = useState<GuildSettingsForm>(EMPTY_SETTINGS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const requestSettings = useCallback(async (): Promise<Partial<GuildSettingsForm> | null> => {
    const res = await fetch(`/api/guilds/${guildId}/settings`, { signal: AbortSignal.timeout(20000) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Unable to load settings for this server.');
    return json.settings || null;
  }, [guildId]);

  useEffect(() => {
    let active = true;
    void requestSettings()
      .then((nextSettings) => {
        if (!active) return;
        setSettings(normalizeSettings(nextSettings));
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error('Failed to load guild settings:', error);
        setLoadError(error instanceof Error ? error.message : 'Unable to load settings for this server.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestSettings]);

  const reloadSettings = () => {
    setLoading(true);
    void requestSettings()
      .then((nextSettings) => { setSettings(normalizeSettings(nextSettings)); setLoadError(null); })
      .catch((error: unknown) => { setLoadError(error instanceof Error ? error.message : 'Unable to load settings for this server.'); })
      .finally(() => setLoading(false));
  };

  const handleChange = (field: keyof GuildSettingsForm, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/guilds/${guildId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        const data = await res.json();
        setSaveError(data.error || 'Failed to update settings');
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg)]">
      <Topbar
        title="Settings"
        subtitle="Configure command prefixes, channels, and staff role bindings."
      />

      <PageContainer className="space-y-6">
        {loading ? (
          <LoadingState label="Loading configuration" />
        ) : loadError ? (
          <ErrorState
            title="Settings unavailable"
            message={loadError}
            onRetry={reloadSettings}
          />
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {saveSuccess && (
              <div className="p-4 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] text-[var(--success)] text-[13px] font-semibold flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-[var(--success)] flex-shrink-0" />
                <span>Server settings saved successfully. Changes take effect immediately.</span>
              </div>
            )}

            {saveError && (
              <div className="p-4 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger)] text-[13px] font-semibold flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-[var(--danger)] flex-shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* General Section */}
            <Card className="p-6 bg-[var(--surface-1)] border border-[var(--border-base)]/80 space-y-4">
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-base)] pb-3">
                <Settings className="w-4 h-4 text-[var(--accent)]" />
                <span>General Bot Configuration</span>
              </h2>

              <div>
                <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">
                  Text Command Prefix
                </label>
                <Input aria-label="Text Command Prefix"
                  type="text"
                  maxLength={5}
                  value={settings.prefix}
                  onChange={(e) => handleChange('prefix', e.target.value)}
                  placeholder="!"
                  className="w-32 font-mono"
                />
                <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                  Prefix used for classic prefix commands (slash commands are always available).
                </p>
              </div>
            </Card>

            {/* Channels Section */}
            <Card className="p-6 bg-[var(--surface-1)] border border-[var(--border-base)]/80 space-y-4">
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-base)] pb-3">
                <Hash className="w-4 h-4 text-[var(--accent)]" />
                <span>Discord Channel Bindings</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">
                    Welcome Channel ID
                  </label>
                  <Input aria-label="Welcome Channel ID"
                    type="text"
                    value={settings.welcomeChannelId}
                    onChange={(e) => handleChange('welcomeChannelId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">
                    Announcements Channel ID
                  </label>
                  <Input aria-label="Announcements Channel ID"
                    type="text"
                    value={settings.announcementChannelId}
                    onChange={(e) => handleChange('announcementChannelId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">
                    Moderation Log Channel ID
                  </label>
                  <Input aria-label="Moderation Log Channel ID"
                    type="text"
                    value={settings.modLogChannelId}
                    onChange={(e) => handleChange('modLogChannelId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">
                    Audit Log Channel ID
                  </label>
                  <Input aria-label="Audit Log Channel ID"
                    type="text"
                    value={settings.logChannelId}
                    onChange={(e) => handleChange('logChannelId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">
                    Ticket Category Channel ID
                  </label>
                  <Input aria-label="Ticket Category Channel ID"
                    type="text"
                    value={settings.ticketCategoryId}
                    onChange={(e) => handleChange('ticketCategoryId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">
                    Ticket Transcripts Channel ID
                  </label>
                  <Input aria-label="Ticket Transcripts Channel ID"
                    type="text"
                    value={settings.ticketTranscriptsChannelId}
                    onChange={(e) => handleChange('ticketTranscriptsChannelId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full font-mono"
                  />
                </div>
              </div>
            </Card>

            {/* Staff Roles Section */}
            <Card className="p-6 bg-[var(--surface-1)] border border-[var(--border-base)]/80 space-y-4">
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-base)] pb-3">
                <Shield className="w-4 h-4 text-[var(--accent)]" />
                <span>Staff Role Bindings</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">
                    Admin Role ID
                  </label>
                  <Input aria-label="Admin Role ID"
                    type="text"
                    value={settings.adminRoleId}
                    onChange={(e) => handleChange('adminRoleId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">
                    Moderator Role ID
                  </label>
                  <Input aria-label="Moderator Role ID"
                    type="text"
                    value={settings.modRoleId}
                    onChange={(e) => handleChange('modRoleId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">
                    Ticket Support Role ID
                  </label>
                  <Input aria-label="Ticket Support Role ID"
                    type="text"
                    value={settings.supportRoleId}
                    onChange={(e) => handleChange('supportRoleId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full font-mono"
                  />
                </div>

              </div>
            </Card>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--text-inverse)] text-[13px] font-semibold  transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Server Settings</span>
              </button>
            </div>
          </form>
        )}
      </PageContainer>
    </div>
  );
}
