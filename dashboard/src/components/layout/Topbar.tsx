'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { StatusDot } from '@/components/ui/StatusDot';
import { Badge } from '@/components/ui/Badge';
import { RefreshCw, Search, ShieldCheck, Terminal, Radio } from 'lucide-react';
import { ROLE_TIER_LABELS } from '@/lib/constants';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Topbar({
  title = 'Command Center',
  subtitle = 'KRAXX HQ // Operations Telemetry & Diagnostics',
  onRefresh,
  isRefreshing = false,
}: TopbarProps) {
  const { data: session } = useSession();
  const roleName = session?.user?.roleTierName
    ? ROLE_TIER_LABELS[session.user.roleTierName] || session.user.roleTierName
    : 'User';

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <header className="h-14 bg-[#070B10]/95 backdrop-blur-md border-b border-[#16202E] sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between flex-shrink-0">
      {/* Left: Section Path & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#22D3EE] font-bold tracking-wider uppercase">
              KRAXX HQ
            </span>
            <span className="text-[#475569] text-xs font-mono">/</span>
            <h1 className="text-xs sm:text-sm font-semibold text-[#F1F5F9] tracking-tight truncate font-mono">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="text-[10px] text-[#64748B] font-mono hidden sm:block truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Telemetry Indicators & Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Command Palette Trigger Button */}
        <button
          onClick={handleOpenSearch}
          className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0A0F16] border border-[#16202E] text-xs text-[#94A3B8] hover:text-[#F1F5F9] hover:border-[#1E2C3F] transition-all font-mono"
          title="Open Command Palette (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-[#22D3EE]" />
          <span className="hidden md:inline text-[11px]">SEARCH</span>
          <span className="hidden sm:inline text-[9px] text-[#64748B] px-1 py-0.2 rounded bg-[#111823] border border-[#16202E]">
            CTRL+K
          </span>
        </button>

        {/* Live Systems Telemetry Pulse */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-[#0A0F16] border border-[#16202E]">
          <StatusDot status="online" label="ALL SYSTEMS OPERATIONAL" showPulse />
        </div>

        {/* Refresh Diagnostics */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded bg-[#0A0F16] border border-[#16202E] text-[#94A3B8] hover:text-[#22D3EE] hover:border-[#22D3EE]/30 transition-all disabled:opacity-50"
            title="Refresh Telemetry"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#22D3EE]' : ''}`}
            />
          </button>
        )}

        {/* Operator Role Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.8 rounded bg-[#0D131C] border border-[#1E2C3F] text-[10px] font-mono text-[#22D3EE] uppercase tracking-wider">
          <ShieldCheck className="w-3 h-3 text-[#10B981]" />
          <span className="truncate max-w-[110px]">{roleName}</span>
        </div>
      </div>
    </header>
  );
}
