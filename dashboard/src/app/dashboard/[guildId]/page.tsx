'use client';

import React, { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Topbar } from '@/components/layout/Topbar';
import {
  Users, Ticket, AlarmClock, Shield, Settings, Boxes, ShieldAlert,
  ArrowRight, RefreshCw, CheckCircle2, XCircle,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ guildId: string }>;
}

interface GuildDashboardStatus {
  guild: {
    id: string;
    name: string;
    icon: string | null;
    ownerId: string;
    botInstalled: boolean;
    memberCount: number;
    presenceCount: number;
  };
  bot: { status: string; ping: number | null; uptime: number | null };
  modules: { module: string; enabled: boolean }[];
  stats: { activeTickets: number; pendingReminders: number; pendingAnnouncements: number };
}

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  linkLabel,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  href: string;
  linkLabel: string;
}) {
  return (
    <div style={{
      background: '#161614',
      border: '1px solid #2A2925',
      borderRadius: '12px',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#716D65' }}>
          {label}
        </span>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'rgba(201, 166, 107, 0.08)',
          border: '1px solid rgba(201, 166, 107, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#C9A66B',
        }}>
          <Icon style={{ width: '15px', height: '15px' }} />
        </div>
      </div>
      <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#F3F0E9', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '0.875rem' }}>
        {value}
      </div>
      <div style={{ height: '1px', background: '#1D1C19', marginBottom: '0.875rem' }} />
      <Link
        href={href}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '0.75rem', fontWeight: 700, color: '#C9A66B', textDecoration: 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#D8B77D'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#C9A66B'; }}
      >
        <span>{linkLabel}</span>
        <ArrowRight style={{ width: '13px', height: '13px', transition: 'transform 0.12s' }} />
      </Link>
    </div>
  );
}

export default function GuildDashboardPage({ params }: PageProps) {
  const { guildId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<GuildDashboardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const requestStatus = useCallback(async (): Promise<GuildDashboardStatus> => {
    const res = await fetch(`/api/guilds/${guildId}/status`, { signal: AbortSignal.timeout(20000) });
    const payload = await res.json().catch(() => ({}));
    if (res.status === 401) {
      router.push('/login');
      throw new Error('Your session has expired. Sign in again to continue.');
    }
    if (!res.ok) throw new Error(payload.error || 'Failed to load server details.');
    return payload as GuildDashboardStatus;
  }, [guildId, router]);

  const fetchData = useCallback(() => {
    setIsRefreshing(true);
    void requestStatus()
      .then((nextData) => { setData(nextData); setError(null); })
      .catch((err: unknown) => { setError(err instanceof Error ? err.message : 'Network error'); })
      .finally(() => { setLoading(false); setIsRefreshing(false); });
  }, [requestStatus]);

  useEffect(() => {
    let active = true;
    const load = () => {
      void requestStatus()
        .then((nextData) => { if (active) { setData(nextData); setError(null); } })
        .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Network error'); })
        .finally(() => { if (active) setLoading(false); });
    };
    load();
    const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [requestStatus]);

  const base: React.CSSProperties = {
    flex: 1,
    background: '#090908',
    color: '#F3F0E9',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    WebkitFontSmoothing: 'antialiased',
  };

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...base, display: 'flex', flexDirection: 'column', minHeight: '60vh' }}>
        <Topbar title="Guild Overview" subtitle="Server health, activity and enabled modules" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '28px', height: '28px',
            border: '2px solid #2A2925',
            borderTopColor: '#C9A66B',
            borderRadius: '50%',
            animation: 'spin 0.75s linear infinite',
            margin: '0 auto 0.875rem',
          }} />
          <p style={{ fontSize: '0.875rem', color: '#716D65' }}>Loading server dashboard...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ ...base, display: 'flex', flexDirection: 'column', minHeight: '60vh' }}>
        <Topbar title="Guild Overview" subtitle="Server health, activity and enabled modules" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '0 1.5rem' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', color: '#EF4444',
          }}>
            <ShieldAlert style={{ width: '22px', height: '22px' }} />
          </div>
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#F3F0E9', marginBottom: '0.5rem' }}>
            Access Error
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#716D65', marginBottom: '1.5rem' }}>{error}</p>
          <Link
            href="/dashboard/select-server"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.5rem 1.125rem', borderRadius: '8px',
              background: '#C9A66B', color: '#090908',
              fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none',
            }}
          >
            Select a Server
            <ArrowRight style={{ width: '14px', height: '14px' }} />
          </Link>
        </div>
        </div>
      </div>
    );
  }

  const { guild, modules = [], stats } = data || {};
  const enabledCount = modules.filter((module) => module.enabled).length;

  return (
    <div style={base}>
      <Topbar
        title="Guild Overview"
        subtitle="Server health, activity and enabled modules"
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />
      {/* Page Header */}
      <div style={{
        padding: '1.5rem 1.5rem 0',
        borderBottom: '1px solid #1D1C19',
        marginBottom: '0',
      }}>
        <div style={{
          maxWidth: '1100px', margin: '0 auto',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: '1rem', flexWrap: 'wrap', paddingBottom: '1.25rem',
        }}>
          {/* Guild identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {guild?.icon ? (
              <img
                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`}
                alt={guild.name}
                style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #2A2925', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: '52px', height: '52px', borderRadius: '12px',
                background: 'rgba(201, 166, 107, 0.12)',
                border: '1px solid rgba(201, 166, 107, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem', fontWeight: 800, color: '#C9A66B', flexShrink: 0,
              }}>
                {guild?.name?.charAt(0).toUpperCase() ?? 'G'}
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F3F0E9', letterSpacing: '-0.02em' }}>
                  {guild?.name ?? 'Server Dashboard'}
                </h1>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  fontSize: '0.6875rem', fontWeight: 700,
                  color: '#22C55E', background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  padding: '0.1875rem 0.5rem', borderRadius: '9999px',
                }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                  KRAXXBot Active
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
            <button
              onClick={fetchData}
              disabled={isRefreshing}
              title="Refresh"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', borderRadius: '8px',
                background: '#161614', border: '1px solid #2A2925',
                color: '#716D65', cursor: 'pointer', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#3A3832'; e.currentTarget.style.color = '#A8A49B'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2925'; e.currentTarget.style.color = '#716D65'; }}
            >
              <RefreshCw style={{ width: '14px', height: '14px', ...(isRefreshing ? { animation: 'spin 0.75s linear infinite' } : {}) }} />
            </button>
            <Link
              href={`/dashboard/${guildId}/settings`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.4375rem 0.875rem', borderRadius: '8px',
                background: '#161614', border: '1px solid #2A2925',
                color: '#A8A49B', fontSize: '0.8125rem', fontWeight: 600,
                textDecoration: 'none', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#F3F0E9'; e.currentTarget.style.borderColor = '#3A3832'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#A8A49B'; e.currentTarget.style.borderColor = '#2A2925'; }}
            >
              <Settings style={{ width: '13px', height: '13px' }} />
              <span>Settings</span>
            </Link>
            <Link
              href={`/dashboard/${guildId}/modules`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.4375rem 0.875rem', borderRadius: '8px',
                background: '#C9A66B', color: '#090908',
                fontSize: '0.8125rem', fontWeight: 700,
                textDecoration: 'none', transition: 'background 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#D8B77D'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#C9A66B'; }}
            >
              <Boxes style={{ width: '13px', height: '13px' }} />
              <span>Modules</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Stat Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}>
          <StatCard label="Active Tickets" value={stats?.activeTickets ?? 0} icon={Ticket} href={`/dashboard/${guildId}/tickets`} linkLabel="View Tickets" />
          <StatCard label="Total Members" value={guild?.memberCount ?? '—'} icon={Users} href={`/dashboard/${guildId}/members`} linkLabel="View Members" />
          <StatCard label="Pending Reminders" value={stats?.pendingReminders ?? 0} icon={AlarmClock} href={`/dashboard/${guildId}/reminders`} linkLabel="View Reminders" />
          <StatCard label="Active Modules" value={enabledCount} icon={Boxes} href={`/dashboard/${guildId}/modules`} linkLabel="Manage Modules" />
        </div>

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '0.75rem' }}>
          {/* Module Status */}
          <div style={{ background: '#161614', border: '1px solid #2A2925', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#F3F0E9' }}>Module Status</h2>
              <Link
                href={`/dashboard/${guildId}/modules`}
                style={{ fontSize: '0.75rem', fontWeight: 600, color: '#C9A66B', textDecoration: 'none' }}
              >
                Manage →
              </Link>
            </div>

            {modules.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: '#716D65' }}>No modules configured yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {modules.slice(0, 8).map((mod) => (
                  <div key={mod.module} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem', borderRadius: '8px',
                    background: '#0F0F0E', border: '1px solid #1D1C19',
                  }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: mod.enabled ? '#A8A49B' : '#4A4742' }}>
                      {mod.module}
                    </span>
                    {mod.enabled ? (
                      <CheckCircle2 style={{ width: '14px', height: '14px', color: '#22C55E', flexShrink: 0 }} />
                    ) : (
                      <XCircle style={{ width: '14px', height: '14px', color: '#4A4742', flexShrink: 0 }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ background: '#161614', border: '1px solid #2A2925', borderRadius: '12px', padding: '1.25rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#F3F0E9', marginBottom: '1rem' }}>Quick Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'View Moderation Logs', href: `/dashboard/${guildId}/moderation`, icon: Shield },
                { label: 'Manage Support Tickets', href: `/dashboard/${guildId}/tickets`, icon: Ticket },
                { label: 'Configure Welcome System', href: `/dashboard/${guildId}/welcome`, icon: Users },
                { label: 'Audit Logs', href: `/dashboard/${guildId}/audit`, icon: ShieldAlert },
                { label: 'Bot Settings', href: `/dashboard/${guildId}/settings`, icon: Settings },
              ].map(action => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: '0.625rem', padding: '0.625rem 0.75rem', borderRadius: '8px',
                      background: '#0F0F0E', border: '1px solid #1D1C19',
                      textDecoration: 'none', color: '#A8A49B',
                      fontSize: '0.8125rem', fontWeight: 500,
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#2A2925';
                      e.currentTarget.style.background = '#161614';
                      e.currentTarget.style.color = '#F3F0E9';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#1D1C19';
                      e.currentTarget.style.background = '#0F0F0E';
                      e.currentTarget.style.color = '#A8A49B';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Icon style={{ width: '14px', height: '14px', flexShrink: 0, color: '#C9A66B' }} />
                      <span>{action.label}</span>
                    </div>
                    <ArrowRight style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
