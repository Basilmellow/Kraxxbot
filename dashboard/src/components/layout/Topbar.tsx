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
    <header className="h-[64px] bg-[#0C0C0B]/95 backdrop-blur-md border-b border-[#2A2925] sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between flex-shrink-0">
      {/* Left: ServerSelector & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <ServerSelector />
        <div className="hidden sm:block h-6 w-px bg-[#2A2925]" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-semibold text-[#F3F0E9] tracking-tight truncate">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="text-xs text-[#A8A49B] hidden md:block truncate">
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
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#161614] border border-[#2A2925] text-xs text-[#A8A49B] hover:text-[#F3F0E9] hover:border-[#4A4742] transition-all cursor-pointer"
          title="Open Command Palette (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-[#A8A49B]" />
          <span className="hidden md:inline text-xs font-medium">Search</span>
          <kbd className="hidden sm:inline-flex items-center text-[10px] text-[#716D65] bg-[#1D1C19] px-1.5 py-0.5 rounded border border-[#2A2925] font-sans font-medium">
            Ctrl+K
          </kbd>
        </button>

        {/* Live Systems Telemetry Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#161614] border border-[#2A2925] text-[#A8A49B] text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
          <span>All Systems Operational</span>
        </div>

        {/* Notifications Icon Button */}
        <Link
          href="/dashboard/notifications"
          className="p-2 rounded-lg text-[#716D65] hover:text-[#F3F0E9] hover:bg-[#161614] transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </Link>

        {/* Refresh Diagnostics Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
          className="p-2 rounded-lg text-[#716D65] hover:text-[#C9A66B] hover:bg-[#161614] transition-colors disabled:opacity-50"
            title="Refresh Diagnostics"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#C9A66B]' : ''}`}
            />
          </button>
        )}

        {/* User Mini Avatar & Role */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#2A2925]">
          {session?.user?.avatar ? (
            <img
              src={`https://cdn.discordapp.com/avatars/${session.user.discordId}/${session.user.avatar}.png?size=64`}
              alt={session.user.name || 'User'}
              className="w-7 h-7 rounded-full border border-[#2A2925] object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#1D1C19] border border-[#2A2925] flex items-center justify-center text-xs font-bold text-[#C9A66B]">
              {(session?.user?.name || 'O')[0].toUpperCase()}
            </div>
          )}
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-[#F3F0E9] leading-tight truncate max-w-[120px]">
              {session?.user?.displayName || session?.user?.name || 'anaya.velvet'}
            </span>
            <span className="text-[10px] font-semibold text-[#C9A66B] uppercase tracking-wider">
              {roleName}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
