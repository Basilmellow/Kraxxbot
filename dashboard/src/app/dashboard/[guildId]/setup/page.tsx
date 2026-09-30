'use client';

import { PageContainer } from '@/components/ui/Page';
import { Input } from '@/components/ui/Form';

import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, Rocket, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';

interface PageProps {
  params: Promise<{ guildId: string }>;
}

interface SetupGuildInfo {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  botInstalled: boolean;
}

const STEPS = [
  { id: 1, title: 'Welcome', desc: 'Overview & Verification' },
  { id: 2, title: 'Prefix & Channels', desc: 'Logging & Broadcasts' },
  { id: 3, title: 'Staff Roles', desc: 'Permissions Hierarchy' },
  { id: 4, title: 'Modules', desc: 'Feature Activation' },
  { id: 5, title: 'Ready', desc: 'Launch Command Center' },
];

export default function SetupWizardPage({ params }: PageProps) {
  const { guildId } = use(params);
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guildInfo, setGuildInfo] = useState<SetupGuildInfo | null>(null);

  const [formData, setFormData] = useState({
    prefix: '!',
    welcomeChannelId: '',
    announcementChannelId: '',
    modLogChannelId: '',
    adminRoleId: '',
    modRoleId: '',
    supportRoleId: '',
    modules: {
      MODERATION: true,
      TICKETS: true,
      WELCOME: true,
      ANNOUNCEMENTS: true,
      REMINDERS: true,
      MEETINGS: true,
      AUTOMATION: true,
      SOCIAL: true,
      FUN: true,
      UTILITY: true,
      ANALYTICS: true,
      ROLES: true,
    } as Record<string, boolean>,
  });

  useEffect(() => {
    async function loadSetup() {
      try {
        const res = await fetch(`/api/guilds/${guildId}/status`);
        if (res.ok) {
          const data = await res.json();
          setGuildInfo(data.guild);
        }
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Setup could not be saved.");
      } finally {
        setLoading(false);
      }
    }
    loadSetup();
  }, [guildId]);

  const handleModuleToggle = (mod: string) => {
    setFormData((prev) => ({
      ...prev,
      modules: {
        ...prev.modules,
        [mod]: !prev.modules[mod],
      },
    }));
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // 1. Save Settings
      const settingsResponse = await fetch(`/api/guilds/${guildId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefix: formData.prefix,
          welcomeChannelId: formData.welcomeChannelId,
          announcementChannelId: formData.announcementChannelId,
          modLogChannelId: formData.modLogChannelId,
          adminRoleId: formData.adminRoleId,
          modRoleId: formData.modRoleId,
          supportRoleId: formData.supportRoleId,
        }),
      });

      if (!settingsResponse.ok) throw new Error("Settings could not be saved. Check the selected channels and roles.");

      // 2. Save Modules
      for (const [mod, enabled] of Object.entries(formData.modules)) {
        const moduleResponse = await fetch(`/api/guilds/${guildId}/modules`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ module: mod, enabled }),
        });
        if (!moduleResponse.ok) throw new Error("Module settings could not be saved. Please retry.");
      }

      router.push(`/dashboard/${guildId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex min-w-0 flex-col">
        <Topbar title="Server setup" subtitle="Configure the essential settings for your server." />
        <div className="flex flex-1 flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mb-3" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">Loading setup wizard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg)]">
      <Topbar
        title="Server setup"
        subtitle="Configure the essential settings for your server."
      />

      <PageContainer className="space-y-6">
        {/* Step Indicator */}
        <div className="grid grid-cols-5 gap-2">
          {STEPS.map((s) => (
            <div key={s.id} className="flex flex-col items-center text-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-colors ${
                  s.id < currentStep
                    ? 'bg-[var(--success)] text-[var(--text-inverse)]'
                    : s.id === currentStep
                    ? 'bg-[var(--accent)] text-[var(--text-inverse)] ring-4 ring-[var(--accent-border)]'
                    : 'bg-[var(--surface-1)] border border-[var(--border-base)] text-[var(--text-secondary)]'
                }`}
              >
                {s.id < currentStep ? <Check className="w-4 h-4" /> : s.id}
              </div>
              <span className="text-[13px] font-semibold text-[var(--text-primary)] mt-2 hidden sm:block">
                {s.title}
              </span>
            </div>
          ))}
        </div>

        {/* Wizard Container */}
        <Card className="p-6 sm:p-8 bg-[var(--surface-1)] border border-[var(--border-base)]/80 ">
          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <div className="space-y-6 text-center py-4">
              <div className="w-14 h-14 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent-border)] text-[var(--accent)] mx-auto flex items-center justify-center ">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Welcome to KRAXXBot
                </h2>
                <p className="text-[13px] sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto mt-1 leading-relaxed">
                  Let&apos;s configure essential settings for <strong className="text-[var(--text-primary)]">{guildInfo?.name}</strong>. This wizard takes less than 2 minutes.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border-base)]/60 text-left max-w-md mx-auto space-y-3 text-[13px]">
                <div className="flex items-center gap-2 text-[var(--success)] font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>KRAXXBot successfully installed</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--success)] font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Discord Slash Commands synchronized</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--success)] font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Multi-tenant database schema provisioned</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Prefix & Channels */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Command Prefix & Essential Channels
                </h2>
                <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
                  Customize the prefix and choose where KRAXXBot will send automated logs.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">
                    Command Prefix
                  </label>
                  <Input aria-label="Command Prefix"
                    type="text"
                    maxLength={5}
                    value={formData.prefix}
                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                    className="w-32 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">
                    Moderation Log Channel ID (Optional)
                  </label>
                  <Input aria-label="Moderation Log Channel ID (Optional)"
                    type="text"
                    value={formData.modLogChannelId}
                    onChange={(e) => setFormData({ ...formData, modLogChannelId: e.target.value })}
                    placeholder="e.g. 123456789012345678"
                    className="w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">
                    Welcome Channel ID (Optional)
                  </label>
                  <Input aria-label="Welcome Channel ID (Optional)"
                    type="text"
                    value={formData.welcomeChannelId}
                    onChange={(e) => setFormData({ ...formData, welcomeChannelId: e.target.value })}
                    placeholder="e.g. 123456789012345678"
                    className="w-full font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Staff Roles */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Staff Roles Hierarchy
                </h2>
                <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
                  Bind your Discord server roles so KRAXXBot knows who can run staff commands.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">
                    Administrator Role ID
                  </label>
                  <Input aria-label="Administrator Role ID"
                    type="text"
                    value={formData.adminRoleId}
                    onChange={(e) => setFormData({ ...formData, adminRoleId: e.target.value })}
                    placeholder="Full access to bot settings and staff commands"
                    className="w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">
                    Moderator Role ID
                  </label>
                  <Input aria-label="Moderator Role ID"
                    type="text"
                    value={formData.modRoleId}
                    onChange={(e) => setFormData({ ...formData, modRoleId: e.target.value })}
                    placeholder="Access to kick, ban, timeout, and warn commands"
                    className="w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">
                    Ticket Support Staff Role ID
                  </label>
                  <Input aria-label="Ticket Support Staff Role ID"
                    type="text"
                    value={formData.supportRoleId}
                    onChange={(e) => setFormData({ ...formData, supportRoleId: e.target.value })}
                    placeholder="Allowed to view, claim, and close support tickets"
                    className="w-full font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Modules */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Select Features & Modules
                </h2>
                <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
                  Choose which subsystems you want enabled immediately. You can toggle these anytime.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {Object.entries(formData.modules).map(([mod, enabled]) => (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => handleModuleToggle(mod)}
                    className={`p-3 rounded-xl border text-left text-[13px] font-medium transition-colors flex items-center justify-between cursor-pointer ${
                      enabled
                        ? 'bg-[var(--accent-dim)] border-[var(--accent-border)] text-[var(--accent)] font-semibold'
                        : 'bg-[var(--surface-1)] border-[var(--border-base)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="capitalize">{mod.toLowerCase()}</span>
                    {enabled && <Check className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Ready */}
          {currentStep === 5 && (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] text-[var(--success)] mx-auto flex items-center justify-center ">
                <Rocket className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Configuration Complete!
                </h2>
                <p className="text-[13px] sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto mt-1">
                  KRAXXBot is now calibrated for <strong className="text-[var(--text-primary)]">{guildInfo?.name}</strong>. Click below to launch your server dashboard.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="mt-8 pt-5 border-t border-[var(--border-base)] flex items-center justify-between">
            {currentStep > 1 && currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-1)] border border-[var(--border-base)] text-[13px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--text-inverse)] text-[13px] font-semibold  transition-colors cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--success)] hover:bg-[var(--success)] text-white text-[13px] font-semibold  transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Rocket className="w-4 h-4" />
                )}
                <span>Launch Command Center</span>
              </button>
            )}
          </div>
        </Card>
      </PageContainer>
    </div>
  );
}
