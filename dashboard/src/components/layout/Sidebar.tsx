'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Server,
  Shield,
  Users,
  ShieldAlert,
  Ticket,
  DoorOpen,
  Megaphone,
  Sparkles,
  CheckSquare,
  AlarmClock,
  Zap,
  BarChart3,
  ScrollText,
  Settings,
  Boxes,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { DASHBOARD_MODULES, CATEGORY_LABELS } from '@/lib/constants';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Server,
  Shield,
  Users,
  ShieldAlert,
  Ticket,
  DoorOpen,
  Megaphone,
  Sparkles,
  CheckSquare,
  AlarmClock,
  Zap,
  BarChart3,
  ScrollText,
  Settings,
  Boxes,
};

const NAV_CATEGORIES = ['OVERVIEW', 'MODERATION', 'SUPPORT', 'COMMUNITY', 'AUTOMATION', 'INSIGHTS', 'SYSTEM'] as const;

interface SidebarProps {
  session: Session;
}

export function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Extract active guildId from route (/dashboard/[guildId]/...) or query parameter (?guildId=...)
  const guildMatch = pathname.match(/^\/dashboard\/(\d+)/);
  const activeGuildId = guildMatch?.[1] || searchParams.get('guildId') || '';

  const getHref = (modId: string, modHref: string) => {
    if (modId === 'select-server') return '/dashboard/select-server';
    if (!activeGuildId) return '/dashboard/select-server';
    if (modId === 'overview') return `/dashboard/${activeGuildId}`;
    return `/dashboard/${activeGuildId}${modHref}`;
  };

  const isActive = (modId: string, modHref: string) => {
    if (modId === 'select-server') return pathname === '/dashboard/select-server';
    const href = getHref(modId, modHref);
    if (modId === 'overview') return pathname === href || (pathname === '/dashboard' && !activeGuildId);
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const user = session?.user as any;
  const displayName = user?.displayName || user?.name || 'User';
  const discordId = user?.discordId ?? '';
  const avatarHash = user?.avatar ?? null;
  const avatarUrl = avatarHash && discordId
    ? `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.png?size=64`
    : null;

  const NavContent = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0C0C0B',
      borderRight: '1px solid #1D1C19',
    }}>
      {/* Brand */}
      <div style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '0 1rem',
        borderBottom: '1px solid #1D1C19',
        flexShrink: 0,
      }}>
        <Link
          href={activeGuildId ? `/dashboard/${activeGuildId}` : '/dashboard'}
          style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none', color: 'inherit' }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #C9A66B, #D8B77D)',
            color: '#090908',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.875rem',
            flexShrink: 0,
          }}>
            K
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F3F0E9', letterSpacing: '-0.01em' }}>
              KRAXXBot
            </div>
            <div style={{ fontSize: '0.625rem', color: '#716D65', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: '1px' }}>
              Dashboard
            </div>
          </div>
        </Link>
      </div>

      {/* Active Guild Indicator */}
      {activeGuildId && (
        <Link
          href="/dashboard/select-server"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            borderBottom: '1px solid #1D1C19',
            textDecoration: 'none',
            flexShrink: 0,
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#161614')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: '#1D1C19',
              border: '1px solid #2A2925',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.625rem',
              fontWeight: 700,
              color: '#C9A66B',
              flexShrink: 0,
            }}>
              G
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#A8A49B', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                Active Server
              </div>
              <div style={{ fontSize: '0.625rem', color: '#716D65', fontFamily: 'monospace' }}>
                {activeGuildId.slice(0, 8)}...
              </div>
            </div>
          </div>
          <ChevronRight style={{ width: '12px', height: '12px', color: '#716D65', flexShrink: 0 }} />
        </Link>
      )}

      {/* Navigation */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0.5rem 0.5rem',
        scrollbarWidth: 'thin',
        scrollbarColor: '#2A2925 transparent',
      }}>
        {NAV_CATEGORIES.map(cat => {
          const items = DASHBOARD_MODULES.filter(m => m.category === cat);
          if (!items.length) return null;

          return (
            <div key={cat} style={{ marginBottom: '1rem' }}>
              <div style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#4A4742',
                padding: '0.25rem 0.75rem 0.375rem',
              }}>
                {CATEGORY_LABELS[cat]}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {items.map(mod => {
                  const href = getHref(mod.id, mod.href);
                  const active = isActive(mod.id, mod.href);
                  const Icon = ICON_MAP[mod.icon] ?? LayoutDashboard;

                  return (
                    <Link
                      key={mod.id}
                      href={href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.4375rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: active ? 600 : 500,
                        textDecoration: 'none',
                        color: active ? '#C9A66B' : '#716D65',
                        background: active ? 'rgba(201, 166, 107, 0.08)' : 'transparent',
                        transition: 'all 0.12s ease',
                        position: 'relative',
                      }}
                      onMouseEnter={e => {
                        if (!active) {
                          e.currentTarget.style.background = '#161614';
                          e.currentTarget.style.color = '#A8A49B';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!active) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#716D65';
                        }
                      }}
                    >
                      {active && (
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: '6px',
                          bottom: '6px',
                          width: '3px',
                          background: '#C9A66B',
                          borderRadius: '0 3px 3px 0',
                        }} />
                      )}
                      <Icon style={{ width: '15px', height: '15px', flexShrink: 0, opacity: active ? 1 : 0.7 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {mod.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Footer */}
      <div style={{
        padding: '0.75rem',
        borderTop: '1px solid #1D1C19',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0.625rem',
          borderRadius: '8px',
          background: '#161614',
          border: '1px solid #2A2925',
          marginBottom: '0.5rem',
        }}>
          {/* Avatar */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(201, 166, 107, 0.12)',
              border: '1px solid rgba(201, 166, 107, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: 700,
              color: '#C9A66B',
              flexShrink: 0,
            }}>
              {displayName[0]?.toUpperCase() ?? 'U'}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#F3F0E9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#716D65', marginTop: '1px' }}>
              Discord
            </div>
          </div>

          {/* Online indicator */}
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#22C55E',
            boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.15)',
            flexShrink: 0,
          }} />
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.375rem',
            padding: '0.4375rem',
            borderRadius: '6px',
            background: 'transparent',
            border: '1px solid #2A2925',
            color: '#716D65',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.12s ease',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.color = '#EF4444';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#2A2925';
            e.currentTarget.style.color = '#716D65';
          }}
        >
          <LogOut style={{ width: '13px', height: '13px' }} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: '#0C0C0B',
        borderBottom: '1px solid #1D1C19',
        zIndex: 40,
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
      }} className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '7px',
            background: 'linear-gradient(135deg, #C9A66B, #D8B77D)',
            color: '#090908',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.8125rem',
          }}>
            K
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F3F0E9' }}>KRAXXBot</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(v => !v)}
          style={{
            padding: '0.375rem',
            borderRadius: '6px',
            background: '#161614',
            border: '1px solid #2A2925',
            color: '#A8A49B',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Toggle menu"
        >
          {isMobileOpen ? <X style={{ width: '18px', height: '18px' }} /> : <Menu style={{ width: '18px', height: '18px' }} />}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {isMobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 50,
          }}
          onClick={() => setIsMobileOpen(false)}
        >
          <div
            style={{ width: '260px', height: '100%' }}
            onClick={e => e.stopPropagation()}
          >
            <NavContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside style={{
        width: '220px',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 30,
      }}>
        <NavContent />
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .mobile-topbar { display: flex !important; }
          aside { display: none !important; }
        }
      `}</style>
    </>
  );
}
