'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Settings,
  Shield,
  Boxes,
  Rocket,
  Loader2,
  Check,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ guildId: string }>;
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
  const [guildInfo, setGuildInfo] = useState<any>(null);

  const [formData, setFormData] = useState({
    prefix: '!',
    welcomeChannelId: '',
    announcementChannelId: '',
    modLogChannelId: '',
    adminRoleId: '',
    modRoleId: '',
    ticketSupportRoleId: '',
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
        console.error(err);
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
      await fetch(`/api/guilds/${guildId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefix: formData.prefix,
          welcomeChannelId: formData.welcomeChannelId,
          announcementChannelId: formData.announcementChannelId,
          modLogChannelId: formData.modLogChannelId,
          adminRoleId: formData.adminRoleId,
          modRoleId: formData.modRoleId,
          ticketSupportRoleId: formData.ticketSupportRoleId,
        }),
      });

      // 2. Save Modules
      for (const [mod, enabled] of Object.entries(formData.modules)) {
        await fetch(`/api/guilds/${guildId}/modules`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ module: mod, enabled }),
        });
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
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-[#475467]">Loading setup wizard...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#FAF9F5]">
      <Topbar
        title="Server Onboarding Wizard"
        subtitle={`Initial setup & configuration for ${guildInfo?.name || 'your server'}`}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full space-y-8">
        {/* Step Indicator */}
        <div className="grid grid-cols-5 gap-2">
          {STEPS.map((s) => (
            <div key={s.id} className="flex flex-col items-center text-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  s.id < currentStep
                    ? 'bg-emerald-600 text-white'
                    : s.id === currentStep
                    ? 'bg-amber-600 text-white ring-4 ring-amber-100'
                    : 'bg-white border border-[#E5E7EB] text-[#98A2B3]'
                }`}
              >
                {s.id < currentStep ? <Check className="w-4 h-4" /> : s.id}
              </div>
              <span className="text-[11px] font-semibold text-[#101828] mt-1.5 hidden sm:block">
                {s.title}
              </span>
            </div>
          ))}
        </div>

        {/* Wizard Container */}
        <Card className="p-6 sm:p-8 bg-white border border-[#EADFC7]/80 shadow-xs">
          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <div className="space-y-6 text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 mx-auto flex items-center justify-center shadow-xs">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#101828]">
                  Welcome to KRAXXBot
                </h2>
                <p className="text-xs sm:text-sm text-[#667085] max-w-md mx-auto mt-1 leading-relaxed">
                  Let&apos;s configure essential settings for <strong className="text-[#101828]">{guildInfo?.name}</strong>. This wizard takes less than 2 minutes.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#EADFC7]/60 text-left max-w-md mx-auto space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>KRAXXBot successfully installed</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Discord Slash Commands synchronized</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-700 font-semibold">
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
                <h2 className="text-base font-bold text-[#101828]">
                  Command Prefix & Essential Channels
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Customize the prefix and choose where KRAXXBot will send automated logs.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Command Prefix
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={formData.prefix}
                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                    className="w-32 px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Moderation Log Channel ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.modLogChannelId}
                    onChange={(e) => setFormData({ ...formData, modLogChannelId: e.target.value })}
                    placeholder="e.g. 123456789012345678"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Welcome Channel ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.welcomeChannelId}
                    onChange={(e) => setFormData({ ...formData, welcomeChannelId: e.target.value })}
                    placeholder="e.g. 123456789012345678"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:border-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Staff Roles */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-[#101828]">
                  Staff Roles Hierarchy
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Bind your Discord server roles so KRAXXBot knows who can run staff commands.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Administrator Role ID
                  </label>
                  <input
                    type="text"
                    value={formData.adminRoleId}
                    onChange={(e) => setFormData({ ...formData, adminRoleId: e.target.value })}
                    placeholder="Full access to bot settings and staff commands"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Moderator Role ID
                  </label>
                  <input
                    type="text"
                    value={formData.modRoleId}
                    onChange={(e) => setFormData({ ...formData, modRoleId: e.target.value })}
                    placeholder="Access to kick, ban, timeout, and warn commands"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Ticket Support Staff Role ID
                  </label>
                  <input
                    type="text"
                    value={formData.ticketSupportRoleId}
                    onChange={(e) => setFormData({ ...formData, ticketSupportRoleId: e.target.value })}
                    placeholder="Allowed to view, claim, and close support tickets"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:border-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Modules */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-[#101828]">
                  Select Features & Modules
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Choose which subsystems you want enabled immediately. You can toggle these anytime.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {Object.entries(formData.modules).map(([mod, enabled]) => (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => handleModuleToggle(mod)}
                    className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                      enabled
                        ? 'bg-amber-50/70 border-amber-300 text-amber-950 font-semibold'
                        : 'bg-white border-[#E5E7EB] text-[#667085]'
                    }`}
                  >
                    <span className="capitalize">{mod.toLowerCase()}</span>
                    {enabled && <Check className="w-4 h-4 text-amber-700 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Ready */}
          {currentStep === 5 && (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                <Rocket className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#101828]">
                  Configuration Complete!
                </h2>
                <p className="text-xs sm:text-sm text-[#667085] max-w-md mx-auto mt-1">
                  KRAXXBot is now calibrated for <strong className="text-[#101828]">{guildInfo?.name}</strong>. Click below to launch your server dashboard.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="mt-8 pt-5 border-t border-[#F1F3F9] flex items-center justify-between">
            {currentStep > 1 && currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-semibold text-[#475467] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
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
      </div>
    </div>
  );
}
