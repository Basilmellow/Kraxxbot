'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  ScrollText,
  MessageSquare,
  Megaphone,
  CheckSquare,
  CalendarClock,
  Ticket,
  Shield,
  BarChart3,
  LogOut,
  ShieldCheck,
  Sparkles,
  Layers,
  Clock,
  Search,
  Bell,
  Users,
  ShieldAlert,
  AlarmClock,
  Zap,
  Wrench,
  Vote,
  Gamepad2,
  Boxes,
  Settings,
  DoorOpen,
} from 'lucide-react';
import { DASHBOARD_MODULES, RoleTier, ROLE_TIER_LABELS } from '@/lib/constants';

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-4 h-4" />,
  Search: <Search className="w-4 h-4" />,
  Bell: <Bell className="w-4 h-4" />,
  ScrollText: <ScrollText className="w-4 h-4" />,
  MessageSquare: <MessageSquare className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
  Layers: <Layers className="w-4 h-4" />,
  Megaphone: <Megaphone className="w-4 h-4" />,
  Clock: <Clock className="w-4 h-4" />,
  DoorOpen: <DoorOpen className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  ShieldAlert: <ShieldAlert className="w-4 h-4" />,
  Ticket: <Ticket className="w-4 h-4" />,
  Shield: <Shield className="w-4 h-4" />,
  CheckSquare: <CheckSquare className="w-4 h-4" />,
  AlarmClock: <AlarmClock className="w-4 h-4" />,
  CalendarClock: <CalendarClock className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  Wrench: <Wrench className="w-4 h-4" />,
  Vote: <Vote className="w-4 h-4" />,
  Gamepad2: <Gamepad2 className="w-4 h-4" />,
  Boxes: <Boxes className="w-4 h-4" />,
  Settings: <Settings className="w-4 h-4" />,
  BarChart3: <BarChart3 className="w-4 h-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  CORE: 'Core Operations',
  COMMUNICATION: 'Communications',
  MANAGEMENT: 'Access & Management',
  PRODUCTIVITY: 'Productivity & Flow',
  COMMUNITY: 'Utilities & Community',
  SYSTEM: 'System & Control',
};

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userTier = session?.user?.roleTier ?? RoleTier.USER;
  const roleName = session?.user?.roleTierName ? ROLE_TIER_LABELS[session.user.roleTierName] || session.user.roleTierName : 'User';

  const categories = ['CORE', 'COMMUNICATION', 'MANAGEMENT', 'PRODUCTIVITY', 'COMMUNITY', 'SYSTEM'] as const;

  return (
    <aside className="w-64 bg-[#0a0e15] border-r border-[#1e2a38] flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-[#1e2a38] bg-[#0f1318]/50 flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00f0ff] to-[#6366f1] p-0.5 flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.3)]">
            <div className="w-full h-full bg-[#0a0e15] rounded-[6px] flex items-center justify-center font-bold text-[#00f0ff] text-sm">
              K
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-[#e2e8f0] tracking-wide flex items-center gap-1.5">
              KRAXX <span className="text-[#00f0ff] text-xs font-semibold px-1.5 py-0.5 rounded bg-[#00f0ff]/10 border border-[#00f0ff]/20">HQ</span>
            </div>
            <div className="text-[10px] text-[#64748b] tracking-wider uppercase font-medium">Operations Platform</div>
          </div>
        </Link>
      </div>

      {/* Navigation Modules (Categorized) */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {categories.map((cat) => {
          const items = DASHBOARD_MODULES.filter((m) => m.category === cat && userTier >= m.tier);
          if (items.length === 0) return null;

          return (
            <div key={cat} className="space-y-1">
              <div className="px-3 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
                {CATEGORY_LABELS[cat]}
              </div>
              {items.map((mod) => {
                const isActive = pathname === mod.href || (mod.href !== '/dashboard' && pathname.startsWith(mod.href));
                return (
                  <Link
                    key={mod.id}
                    href={mod.href}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  >
                    <span className={isActive ? 'text-[#00f0ff]' : 'text-[#64748b]'}>
                      {ICON_MAP[mod.icon] || <LayoutDashboard className="w-4 h-4" />}
                    </span>
                    <span className="flex-1 text-xs font-medium">{mod.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User Session Footer */}
      <div className="p-3 border-t border-[#1e2a38] bg-[#0f1318]/60 flex-shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-[#141a22] border border-[#1e2a38]/80 mb-2">
          {session?.user?.avatar ? (
            <img
              src={`https://cdn.discordapp.com/avatars/${session.user.discordId}/${session.user.avatar}.png?size=64`}
              alt={session.user.name || 'User'}
              className="w-8 h-8 rounded-full border border-[#00f0ff]/30"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#1e2a38] flex items-center justify-center text-xs font-bold text-[#e2e8f0]">
              {(session?.user?.name || 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-[#e2e8f0] truncate">
              {session?.user?.displayName || session?.user?.name || 'Operator'}
            </div>
            <div className="text-[10px] text-[#00f0ff] flex items-center gap-1 truncate font-medium">
              <ShieldCheck className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{roleName}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded text-xs font-medium text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors border border-transparent hover:border-[#ef4444]/20"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Disconnect Session</span>
        </button>
      </div>
    </aside>
  );
}
