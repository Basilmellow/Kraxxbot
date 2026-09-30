'use client';
import { Switch } from '@/components/ui/Form';

import { PageContainer } from '@/components/ui/Page';

import React, { useCallback, useEffect, useState, use } from 'react';
import { LoadingState } from '@/components/ui/Skeleton';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Boxes, Shield, Ticket, DoorOpen, Megaphone, AlarmClock, CalendarClock, Zap, Vote, Gamepad2, Wrench, BarChart3, Loader2, type LucideIcon } from 'lucide-react';

const MODULE_DESCRIPTIONS: Record<string, { label: string; description: string; icon: LucideIcon }> = {
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
    label: 'Community Social',
    description: 'Guild-scoped community polls and Discord suggestion submissions with staff review.',
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

  const [modules, setModules] = useState<{ module: string; enabled: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [togglingModule, setTogglingModule] = useState<string | null>(null);

  const requestModules = useCallback(async (): Promise<{ module: string; enabled: boolean }[]> => {
    const res = await fetch(`/api/guilds/${guildId}/modules`, { signal: AbortSignal.timeout(20000) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Unable to load modules for this server.');
    return json.modules || [];
  }, [guildId]);

  useEffect(() => {
    let active = true;
    void requestModules()
      .then((nextModules) => {
        if (!active) return;
        setModules(nextModules);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error('Failed to load guild modules:', error);
        setLoadError(error instanceof Error ? error.message : 'Unable to load modules for this server.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestModules]);

  const reloadModules = () => {
    setLoading(true);
    void requestModules()
      .then((nextModules) => { setModules(nextModules); setLoadError(null); })
      .catch((error: unknown) => { setLoadError(error instanceof Error ? error.message : 'Unable to load modules for this server.'); })
      .finally(() => setLoading(false));
  };

  const handleToggle = async (moduleName: string, currentEnabled: boolean) => {
    setTogglingModule(moduleName);
    try {
      const res = await fetch(`/api/guilds/${guildId}/modules`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: moduleName, enabled: !currentEnabled }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to update this module.');
      setModules((prev) => prev.map((m) => (m.module === moduleName ? { ...m, enabled: !currentEnabled } : m)));
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingModule(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg)]">
      <Topbar
        title="Modules"
        subtitle="Choose which capabilities are enabled for this server."
      />

      <PageContainer className="space-y-6">
        {loading ? (
          <LoadingState label="Loading configuration" />
        ) : loadError ? (
          <ErrorState
            title="Module configuration unavailable"
            message={loadError}
            onRetry={reloadModules}
          />
        ) : modules.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No modules configured"
            description="No module configuration records were returned for this server."
            actionLabel="Refresh"
            onAction={reloadModules}
          />
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
                  className={`p-5 flex flex-col justify-between transition-colors ${
                    m.enabled
                      ? 'bg-[var(--surface-1)] border-[var(--border-base)] '
                      : 'bg-[var(--surface-1)]/60 border-[var(--border-base)] opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          m.enabled
                            ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-border)]'
                            : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border-base)]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <Switch label={`Enable ${info.label}`} checked={m.enabled} disabled={isToggling} onClick={() => handleToggle(m.module, m.enabled)} />
                    </div>

                    <div className="mt-3">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span>{info.label}</span>
                        {m.enabled && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                        )}
                      </h3>
                      <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                        {info.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border-base)] flex items-center justify-between">
                    <span
                      className={`text-[13px] font-semibold uppercase tracking-wider ${
                        m.enabled ? 'text-[var(--success)]' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {m.enabled ? 'Active' : 'Disabled'}
                    </span>
                    {isToggling && (
                      <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
