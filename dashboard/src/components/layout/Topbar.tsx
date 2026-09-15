'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { StatusDot } from '@/components/ui/StatusDot';
import { RefreshCw, Search, Bell, ShieldCheck } from 'lucide-react';
import { ROLE_TIER_LABELS } from '@/lib/constants';

import { ServerSelector } from '@/components/layout/ServerSelector';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Topbar({
  title = 'Command Center',
  subtitle = 'Infrastructure diagnostics & subsystem telemetry',
  onRefresh,
  isRefreshing = false,
}: TopbarProps) {
  const { data: session } = useSession();
  const roleName = session?.user?.roleTierName
    ? ROLE_TIER_LABELS[session.user.roleTierName] || session.user.roleTierName
    : 'Management Head';

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <header className="h-[58px] bg-white/90 backdrop-blur-md border-b border-[#E5E7EB] sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between flex-shrink-0">
      {/* Left: ServerSelector & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <ServerSelector />
        <div className="hidden sm:block h-6 w-px bg-[#E5E7EB]" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-semibold text-[#101828] tracking-tight truncate">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="text-xs text-[#667085] hidden md:block truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Search, Live Status, Notifications, & User Badge */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Command Palette Trigger Button */}
        <button
          onClick={handleOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F3F5FA] border border-[#E5E7EB] text-xs text-[#667085] hover:text-[#101828] hover:border-[#D1D5DB] transition-all cursor-pointer shadow-2xs"
          title="Open Command Palette (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-[#667085]" />
          <span className="hidden md:inline text-xs font-medium">Search</span>
          <kbd className="hidden sm:inline-flex items-center text-[10px] text-[#98A2B3] bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB] font-sans font-medium shadow-2xs">
            Ctrl+K
          </kbd>
        </button>

        {/* Live Systems Telemetry Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>All Systems Operational</span>
        </div>

        {/* Notifications Icon Button */}
        <Link
          href="/dashboard/notifications"
          className="p-2 rounded-lg text-[#667085] hover:text-[#101828] hover:bg-[#F3F5FA] transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </Link>

        {/* Refresh Diagnostics Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg text-[#667085] hover:text-indigo-600 hover:bg-[#F3F5FA] transition-colors disabled:opacity-50"
            title="Refresh Diagnostics"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`}
            />
          </button>
        )}

        {/* User Mini Avatar & Role */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#E5E7EB]">
          {session?.user?.avatar ? (
            <img
              src={`https://cdn.discordapp.com/avatars/${session.user.discordId}/${session.user.avatar}.png?size=64`}
              alt={session.user.name || 'User'}
              className="w-7 h-7 rounded-full border border-[#E5E7EB] object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
              {(session?.user?.name || 'O')[0].toUpperCase()}
            </div>
          )}
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-[#101828] leading-tight truncate max-w-[120px]">
              {session?.user?.displayName || session?.user?.name || 'anaya.velvet'}
            </span>
            <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
              {roleName}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
