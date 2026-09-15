'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import {
  Boxes,
  Shield,
  Ticket,
  DoorOpen,
  Megaphone,
  AlarmClock,
  CalendarClock,
  Zap,
  Vote,
  Gamepad2,
  Wrench,
  BarChart3,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';

const MODULE_DESCRIPTIONS: Record<string, { label: string; description: string; icon: any }> = {
  MODERATION: {
    label: 'Automated Moderation',
    description: 'Auto-kick, ban, timeouts, anti-spam, raid shield, and violation logs.',
    icon: Shield,
  },
  TICKETS: {
    label: 'Ticket Support Desk',
    description: 'Interactive button tickets, staff claiming, transcripts, and auto-close.',
    icon: Ticket,
  },
  WELCOME: {
    label: 'Welcome & Gatekeeper',
    description: 'Custom welcome banners, rule verification gates, and auto-role assignment.',
    icon: DoorOpen,
  },
  ANNOUNCEMENTS: {
    label: 'Broadcast Studio',
    description: 'Rich embed templates, multi-channel announcements, and scheduling queue.',
    icon: Megaphone,
  },
  REMINDERS: {
    label: 'Task & Reminder Engine',
    description: 'Scheduled alerts, interval reminders, and personal DM notifications.',
    icon: AlarmClock,
  },
  MEETINGS: {
    label: 'Meeting Coordinator',
    description: 'Event scheduling, RSVPs, automated reminders, and calendar sync.',
    icon: CalendarClock,
  },
  AUTOMATION: {
    label: 'Event Automation Triggers',
    description: 'Trigger-action workflows, reaction roles, and automated responses.',
    icon: Zap,
  },
  SOCIAL: {
    label: 'Community Polls & Feedback',
    description: 'Server voting polls, suggestion box approval queues, and leaderboards.',
    icon: Vote,
  },
  FUN: {
    label: 'Entertainment & Mini-Games',
    description: 'Trivia, 8ball, coinflips, dice rolls, and community gamification.',
    icon: Gamepad2,
  },
  UTILITY: {
    label: 'Server Utilities',
    description: 'Ping, avatar inspectors, serverinfo, userinfo, and channel cleaners.',
    icon: Wrench,
  },
  ANALYTICS: {
    label: 'Activity & Growth Analytics',
    description: 'Member growth charts, message activity, ticket resolution metrics.',
    icon: BarChart3,
  },
  ROLES: {
    label: 'Role Management System',
    description: 'Self-assignable roles, tier role hierarchies, and autorole provisioning.',
    icon: Shield,
  },
};

interface PageProps {
  params: Promise<{ guildId: string }>;
}

export default function GuildModulesPage({ params }: PageProps) {
  const { guildId } = use(params);
  const router = useRouter();

  const [modules, setModules] = useState<{ module: string; enabled: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingModule, setTogglingModule] = useState<string | null>(null);

  const fetchModules = async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/modules`);
      if (res.status === 401) return router.push('/login');
      if (res.ok) {
        const json = await res.json();
        setModules(json.modules || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, [guildId]);

  const handleToggle = async (moduleName: string, currentEnabled: boolean) => {
    setTogglingModule(moduleName);
    try {
      const res = await fetch(`/api/guilds/${guildId}/modules`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: moduleName, enabled: !currentEnabled }),
      });

      if (res.ok) {
        setModules((prev) =>
          prev.map((m) => (m.module === moduleName ? { ...m, enabled: !currentEnabled } : m))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingModule(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#FAF9F5]">
      <Topbar
        title="Module Control Center"
        subtitle="Enable or disable specific KRAXXBot capabilities for this server"
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EADFC7] pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Feature Toggles</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#101828]">
              Server Subsystem Modules
            </h1>
            <p className="text-xs sm:text-sm text-[#667085] mt-0.5">
              Disabled modules will immediately cease processing events and reject command invocations in this server.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-3" />
            <p className="text-sm font-medium text-[#475467]">Loading module configurations...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((m) => {
              const info = MODULE_DESCRIPTIONS[m.module] || {
                label: m.module,
                description: 'Manage this feature for your server.',
                icon: Boxes,
              };
              const Icon = info.icon;
              const isToggling = togglingModule === m.module;

              return (
                <Card
                  key={m.module}
                  className={`p-5 flex flex-col justify-between transition-all ${
                    m.enabled
                      ? 'bg-white border-[#EADFC7] shadow-xs'
                      : 'bg-[#FDFBF7]/60 border-[#E5E7EB] opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          m.enabled
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-gray-100 text-[#98A2B3] border border-[#E5E7EB]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <button
                        onClick={() => handleToggle(m.module, m.enabled)}
                        disabled={isToggling}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                          m.enabled ? 'bg-amber-600' : 'bg-gray-300'
                        }`}
                        role="switch"
                        aria-checked={m.enabled}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            m.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="mt-3">
                      <h3 className="text-sm font-bold text-[#101828] flex items-center gap-2">
                        <span>{info.label}</span>
                        {m.enabled && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                      </h3>
                      <p className="text-xs text-[#667085] mt-1 leading-relaxed">
                        {info.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F1F3F9] flex items-center justify-between">
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-wider ${
                        m.enabled ? 'text-emerald-700' : 'text-[#98A2B3]'
                      }`}
                    >
                      {m.enabled ? 'Active' : 'Disabled'}
                    </span>
                    {isToggling && (
                      <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
