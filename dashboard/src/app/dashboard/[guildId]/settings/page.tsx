'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import {
  Settings,
  Hash,
  Shield,
  Ticket,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ guildId: string }>;
}

export default function GuildSettingsPage({ params }: PageProps) {
  const { guildId } = use(params);
  const router = useRouter();

  const [settings, setSettings] = useState<any>({
    prefix: '!',
    welcomeChannelId: '',
    announcementChannelId: '',
    modLogChannelId: '',
    auditLogChannelId: '',
    ticketCategoryId: '',
    ticketTranscriptsChannelId: '',
    adminRoleId: '',
    modRoleId: '',
    ticketSupportRoleId: '',
    verifiedRoleId: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch(`/api/guilds/${guildId}/settings`);
        if (res.status === 401) return router.push('/login');
        if (res.ok) {
          const json = await res.json();
          if (json.settings) {
            setSettings({
              prefix: json.settings.prefix || '!',
              welcomeChannelId: json.settings.welcomeChannelId || '',
              announcementChannelId: json.settings.announcementChannelId || '',
              modLogChannelId: json.settings.modLogChannelId || '',
              auditLogChannelId: json.settings.auditLogChannelId || '',
              ticketCategoryId: json.settings.ticketCategoryId || '',
              ticketTranscriptsChannelId: json.settings.ticketTranscriptsChannelId || '',
              adminRoleId: json.settings.adminRoleId || '',
              modRoleId: json.settings.modRoleId || '',
              ticketSupportRoleId: json.settings.ticketSupportRoleId || '',
              verifiedRoleId: json.settings.verifiedRoleId || '',
            });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [guildId]);

  const handleChange = (field: string, value: string) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
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
    } catch (err: any) {
      setSaveError(err?.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#FAF9F5]">
      <Topbar
        title="Server Settings"
        subtitle="Manage Discord channels, command prefixes, and staff role bindings"
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EADFC7] pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Server Configuration</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#101828]">
              Server Binding & Routing
            </h1>
            <p className="text-xs sm:text-sm text-[#667085] mt-0.5">
              Specify Discord channel IDs and role IDs for this server. KRAXXBot will route logs and check permissions accordingly.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-3" />
            <p className="text-sm font-medium text-[#475467]">Loading server settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {saveSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Server settings saved successfully. Changes take effect immediately.</span>
              </div>
            )}

            {saveError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* General Section */}
            <Card className="p-6 bg-white border border-[#EADFC7]/80 space-y-4">
              <h2 className="text-sm font-bold text-[#101828] flex items-center gap-2 border-b border-[#F1F3F9] pb-3">
                <Settings className="w-4 h-4 text-amber-600" />
                <span>General Bot Configuration</span>
              </h2>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                  Text Command Prefix
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={settings.prefix}
                  onChange={(e) => handleChange('prefix', e.target.value)}
                  placeholder="!"
                  className="w-32 px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                />
                <p className="text-[11px] text-[#667085] mt-1">
                  Prefix used for classic prefix commands (slash commands are always available).
                </p>
              </div>
            </Card>

            {/* Channels Section */}
            <Card className="p-6 bg-white border border-[#EADFC7]/80 space-y-4">
              <h2 className="text-sm font-bold text-[#101828] flex items-center gap-2 border-b border-[#F1F3F9] pb-3">
                <Hash className="w-4 h-4 text-amber-600" />
                <span>Discord Channel Bindings</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Welcome Channel ID
                  </label>
                  <input
                    type="text"
                    value={settings.welcomeChannelId}
                    onChange={(e) => handleChange('welcomeChannelId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Announcements Channel ID
                  </label>
                  <input
                    type="text"
                    value={settings.announcementChannelId}
                    onChange={(e) => handleChange('announcementChannelId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Moderation Log Channel ID
                  </label>
                  <input
                    type="text"
                    value={settings.modLogChannelId}
                    onChange={(e) => handleChange('modLogChannelId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Audit Log Channel ID
                  </label>
                  <input
                    type="text"
                    value={settings.auditLogChannelId}
                    onChange={(e) => handleChange('auditLogChannelId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Ticket Category Channel ID
                  </label>
                  <input
                    type="text"
                    value={settings.ticketCategoryId}
                    onChange={(e) => handleChange('ticketCategoryId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Ticket Transcripts Channel ID
                  </label>
                  <input
                    type="text"
                    value={settings.ticketTranscriptsChannelId}
                    onChange={(e) => handleChange('ticketTranscriptsChannelId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>
              </div>
            </Card>

            {/* Staff Roles Section */}
            <Card className="p-6 bg-white border border-[#EADFC7]/80 space-y-4">
              <h2 className="text-sm font-bold text-[#101828] flex items-center gap-2 border-b border-[#F1F3F9] pb-3">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Staff Role Bindings</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Admin Role ID
                  </label>
                  <input
                    type="text"
                    value={settings.adminRoleId}
                    onChange={(e) => handleChange('adminRoleId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Moderator Role ID
                  </label>
                  <input
                    type="text"
                    value={settings.modRoleId}
                    onChange={(e) => handleChange('modRoleId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Ticket Support Role ID
                  </label>
                  <input
                    type="text"
                    value={settings.ticketSupportRoleId}
                    onChange={(e) => handleChange('ticketSupportRoleId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Verified Member Role ID
                  </label>
                  <input
                    type="text"
                    value={settings.verifiedRoleId}
                    onChange={(e) => handleChange('verifiedRoleId', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
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
      </div>
    </div>
  );
}
