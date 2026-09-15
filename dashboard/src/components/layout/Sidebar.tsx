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
  Menu,
  X,
  User,
  Radio,
  ExternalLink,
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

const CATEGORY_HEADERS: Record<string, { label: string }> = {
  COMMAND: { label: 'COMMAND' },
  COMMUNICATION: { label: 'COMMUNICATION' },
  PEOPLE: { label: 'PEOPLE & ACCESS' },
  OPERATIONS: { label: 'OPERATIONS' },
  COMMUNITY: { label: 'COMMUNITY' },
  SYSTEM: { label: 'SYSTEM' },
};

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const userTier = session?.user?.roleTier ?? RoleTier.FOUNDER;
  const roleName = session?.user?.roleTierName
    ? ROLE_TIER_LABELS[session.user.roleTierName] || session.user.roleTierName
    : 'Management Head';

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Fetch unread notifications count
  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          const unread = (data.notifications || []).filter((n: any) => !n.read).length;
          setUnreadCount(unread);
        }
      } catch {
        // quiet fallback
      }
    }
    loadNotifications();
  }, [pathname]);

  const categories = ['COMMAND', 'COMMUNICATION', 'PEOPLE', 'OPERATIONS', 'COMMUNITY', 'SYSTEM'] as const;

  const NavContent = () => (
    <div className="flex flex-col h-full bg-white text-[#101828]">
      {/* Brand Header */}
      <div className="h-[60px] flex items-center justify-between px-4 border-b border-[#F1F3F9] flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
            K
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#101828] tracking-tight flex items-center gap-1.5 leading-none">
              <span>KRAXX HQ</span>
              <span className="text-[9px] font-semibold text-indigo-600 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100">
                PROD
              </span>
            </div>
            <div className="text-[10px] text-[#667085] font-medium truncate mt-1">
              Operations Platform
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 kraxx-scrollbar">
        {categories.map((cat) => {
          const items = DASHBOARD_MODULES.filter((m) => m.category === cat && userTier >= m.tier);
          if (items.length === 0) return null;

          return (
            <div key={cat} className="space-y-0.5">
              <div className="px-3 pb-1.5 pt-1 text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider">
                {CATEGORY_HEADERS[cat].label}
              </div>

              {items.map((mod) => {
                const isActive =
                  pathname === mod.href ||
                  (mod.href !== '/dashboard' && pathname.startsWith(mod.href));
                const Icon = ICON_MAP[mod.icon] || LayoutDashboard;
                const isNotifications = mod.id === 'notifications';

                return (
                  <Link
                    key={mod.id}
                    href={mod.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-50/90 text-indigo-700 font-semibold border border-indigo-100/60 shadow-2xs'
                        : 'text-[#475467] hover:text-[#101828] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? 'text-indigo-600' : 'text-[#667085]'
                      }`}
                    />
                    <span className="truncate flex-1">{mod.label}</span>

                    {isNotifications && unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold shadow-2xs">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User Session & Status Footer Card */}
      <div className="p-3 border-t border-[#F1F3F9] bg-[#F8FAFC] flex-shrink-0">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
            <div className="relative flex-shrink-0">
              {session?.user?.avatar ? (
                <img
                  src={`https://cdn.discordapp.com/avatars/${session.user.discordId}/${session.user.avatar}.png?size=64`}
                  alt={session.user.name || 'User'}
                  className="w-8 h-8 rounded-lg border border-[#E5E7EB] object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                  {(session?.user?.name || 'O')[0].toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#101828] truncate leading-tight">
                {session?.user?.displayName || session?.user?.name || 'Operator'}
              </div>
              <div className="text-[10px] font-bold uppercase text-indigo-600 tracking-wider truncate mt-0.5">
                {roleName}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-1 text-xs">
            <Link
              href="/dashboard/settings"
              className="flex-1 py-1.5 px-2 rounded-lg text-center text-[11px] font-semibold text-[#475467] hover:text-[#101828] hover:bg-white border border-transparent hover:border-[#E5E7EB] transition-colors"
            >
              Settings
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="py-1.5 px-3 rounded-lg text-[11px] font-semibold text-[#667085] hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Disconnect Session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Navigation Bar (Hidden on desktop) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#E5E7EB] z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            K
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#101828]">KRAXX HQ</span>
              <span className="text-[9px] font-semibold text-indigo-600 px-1 py-0.2 rounded bg-indigo-50 border border-indigo-100">
                PROD
              </span>
            </div>
            <span className="text-[9px] text-[#667085] font-medium uppercase tracking-wider">
              Operations Platform
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsMobileOpen((prev) => !prev)}
          className="p-2 rounded-lg bg-[#F3F5FA] border border-[#E5E7EB] text-[#475467] hover:text-[#101828] cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        >
          <div
            className="w-[280px] h-full shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <NavContent />
          </div>
        </div>
      )}

      {/* Desktop Sticky Sidebar (Visible >= 768px) */}
      <aside className="hidden md:flex flex-col sticky top-0 h-screen w-[260px] bg-white border-r border-[#E5E7EB] z-30 flex-shrink-0 select-none shadow-[1px_0_3px_rgba(0,0,0,0.02)]">
        <NavContent />
      </aside>
    </>
  );
}
