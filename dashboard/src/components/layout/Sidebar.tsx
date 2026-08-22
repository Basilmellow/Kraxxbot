'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Search,
  Bell,
  BarChart3,
  ScrollText,
  MessageSquare,
  Sparkles,
  Layers,
  Megaphone,
  Clock,
  DoorOpen,
  Users,
  ShieldAlert,
  Ticket,
  Shield,
  CheckSquare,
  AlarmClock,
  CalendarClock,
  Zap,
  Vote,
  Gamepad2,
  Wrench,
  Boxes,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Lock,
  Cpu,
  Terminal,
} from 'lucide-react';
import { DASHBOARD_MODULES, RoleTier, ROLE_TIER_LABELS } from '@/lib/constants';

const ICON_MAP: Record<string, any> = {
  LayoutDashboard,
  Search,
  Bell,
  BarChart3,
  ScrollText,
  MessageSquare,
  Sparkles,
  Layers,
  Megaphone,
  Clock,
  DoorOpen,
  Users,
  ShieldAlert,
  Ticket,
  Shield,
  CheckSquare,
  AlarmClock,
  CalendarClock,
  Zap,
  Vote,
  Gamepad2,
  Wrench,
  Boxes,
  Settings,
};

const CATEGORY_HEADERS: Record<string, { label: string; tag: string }> = {
  COMMAND: { label: 'COMMAND', tag: 'OPS' },
  COMMUNICATION: { label: 'COMMUNICATION', tag: 'COMMS' },
  PEOPLE: { label: 'PEOPLE & ACCESS', tag: 'AUTH' },
  OPERATIONS: { label: 'OPERATIONS', tag: 'FLOW' },
  COMMUNITY: { label: 'COMMUNITY', tag: 'HUB' },
  SYSTEM: { label: 'SYSTEM', tag: 'CORE' },
};

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const userTier = session?.user?.roleTier ?? RoleTier.USER;
  const roleName = session?.user?.roleTierName
    ? ROLE_TIER_LABELS[session.user.roleTierName] || session.user.roleTierName
    : 'User';

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const categories = ['COMMAND', 'COMMUNICATION', 'PEOPLE', 'OPERATIONS', 'COMMUNITY', 'SYSTEM'] as const;

  return (
    <>
      {/* Mobile Drawer Trigger Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#0A0F16] border-b border-[#16202E] z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#111823] border border-[#1E2C3F] flex items-center justify-center font-bold text-[#22D3EE] text-xs font-mono">
            K
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs text-[#F1F5F9] font-semibold">
            <span>KRAXX</span>
            <span className="text-[#22D3EE] text-[10px] px-1 py-0.2 rounded bg-[#22D3EE]/10 border border-[#22D3EE]/20">
              HQ
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsMobileOpen((prev) => !prev)}
          className="p-1.5 rounded bg-[#111823] border border-[#16202E] text-[#94A3B8] hover:text-[#F1F5F9]"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-[#05070B]/80 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-[#070B10] border-r border-[#16202E] flex flex-col transition-all duration-200 ${
          isCollapsed ? 'w-[68px]' : 'w-[256px]'
        } ${
          isMobileOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-[#16202E] bg-[#0A0F16] flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded bg-[#111823] border border-[#1E2C3F] flex items-center justify-center font-bold text-[#22D3EE] text-xs font-mono flex-shrink-0 shadow-[0_0_10px_rgba(34,211,238,0.15)]">
              K
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#F1F5F9] tracking-wider flex items-center gap-1.5 font-mono">
                  <span>KRAXX</span>
                  <span className="text-[#22D3EE] text-[9px] px-1 py-0.2 rounded bg-[#22D3EE]/10 border border-[#22D3EE]/20">
                    HQ
                  </span>
                </div>
                <div className="text-[9px] text-[#64748B] tracking-wider uppercase font-mono truncate">
                  OPERATIONS CONTROL
                </div>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="hidden lg:flex p-1 rounded bg-[#111823] border border-[#16202E] text-[#64748B] hover:text-[#22D3EE] transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3.5">
          {categories.map((cat) => {
            const items = DASHBOARD_MODULES.filter((m) => m.category === cat && userTier >= m.tier);
            if (items.length === 0) return null;

            return (
              <div key={cat} className="space-y-0.5">
                {!isCollapsed && (
                  <div className="px-2 pb-1 pt-0.5 flex items-center justify-between text-[9px] font-mono text-[#64748B] uppercase tracking-wider">
                    <span>{CATEGORY_HEADERS[cat].label}</span>
                    <span className="text-[8px] text-[#475569] bg-[#0A0F16] px-1 rounded border border-[#121A24]">
                      {CATEGORY_HEADERS[cat].tag}
                    </span>
                  </div>
                )}

                {items.map((mod) => {
                  const isActive =
                    pathname === mod.href ||
                    (mod.href !== '/dashboard' && pathname.startsWith(mod.href));
                  const Icon = ICON_MAP[mod.icon] || LayoutDashboard;

                  return (
                    <Link
                      key={mod.id}
                      href={mod.href}
                      title={isCollapsed ? mod.label : undefined}
                      className={`sidebar-nav-item ${isActive ? 'active' : ''} ${
                        isCollapsed ? 'justify-center px-0' : ''
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? 'text-[#22D3EE]' : 'text-[#64748B]'
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate text-xs font-medium">{mod.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* User Session & Telemetry Footer */}
        <div className="p-2.5 border-t border-[#16202E] bg-[#0A0F16] flex-shrink-0 space-y-2">
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-2.5 p-2 rounded bg-[#0D131C] border border-[#16202E]">
                {session?.user?.avatar ? (
                  <img
                    src={`https://cdn.discordapp.com/avatars/${session.user.discordId}/${session.user.avatar}.png?size=64`}
                    alt={session.user.name || 'User'}
                    className="w-7 h-7 rounded border border-[#22D3EE]/30 flex-shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded bg-[#16202E] flex items-center justify-center text-xs font-bold text-[#F1F5F9] font-mono flex-shrink-0">
                    {(session?.user?.name || 'O')[0].toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#F1F5F9] truncate font-mono">
                    {session?.user?.displayName || session?.user?.name || 'Operator'}
                  </div>
                  <div className="text-[10px] text-[#22D3EE] flex items-center gap-1 font-mono uppercase tracking-wider truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    <span className="truncate">{roleName}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-[11px] font-mono text-[#64748B] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors border border-transparent hover:border-[#EF4444]/20"
              >
                <LogOut className="w-3 h-3" />
                <span>DISCONNECT</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {session?.user?.avatar ? (
                <img
                  src={`https://cdn.discordapp.com/avatars/${session.user.discordId}/${session.user.avatar}.png?size=64`}
                  alt={session.user.name || 'User'}
                  className="w-7 h-7 rounded border border-[#22D3EE]/30"
                  title={`${session.user.displayName || session.user.name} (${roleName})`}
                />
              ) : (
                <div
                  className="w-7 h-7 rounded bg-[#16202E] flex items-center justify-center text-xs font-bold text-[#F1F5F9] font-mono"
                  title={`${session?.user?.displayName || 'Operator'} (${roleName})`}
                >
                  {(session?.user?.name || 'O')[0].toUpperCase()}
                </div>
              )}

              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="p-1.5 rounded text-[#64748B] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                title="Disconnect Session"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
