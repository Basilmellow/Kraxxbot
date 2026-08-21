'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { StatusDot } from '@/components/ui/StatusDot';
import { Badge } from '@/components/ui/Badge';
import { Bell, Terminal, RefreshCw } from 'lucide-react';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Topbar({
  title = 'Command Center',
  subtitle = 'KRAXX Organizational Overview & Diagnostics',
  onRefresh,
  isRefreshing = false,
}: TopbarProps) {
  const { data: session } = useSession();

  return (
    <header className="h-16 bg-[#0a0e15]/80 backdrop-blur-md border-b border-[#1e2a38] sticky top-0 z-20 px-6 flex items-center justify-between">
      <div>
        <h1 className="text-base font-bold text-[#e2e8f0] tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-[#64748b]">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* System Health Pulse */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#141a22] border border-[#1e2a38]">
          <StatusDot status="online" label="Operations Active" showPulse />
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-[#141a22] border border-[#1e2a38] text-[#94a3b8] hover:text-[#00f0ff] hover:border-[#00f0ff]/30 transition-all disabled:opacity-50"
            title="Refresh Diagnostics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#00f0ff]' : ''}`} />
          </button>
        )}

        {/* Division Indicator */}
        <Badge variant="brand" className="hidden md:inline-flex">
          KRAXX HQ
        </Badge>
      </div>
    </header>
  );
}
