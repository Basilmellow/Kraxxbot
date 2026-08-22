import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RoleTier, ROLE_TIER_LABELS } from '@/lib/constants';
import { Sidebar } from '@/components/layout/Sidebar';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { ShieldAlert, LogOut, Terminal, Lock } from 'lucide-react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const isMember = session.user?.isMember;
  const userTier = session.user?.roleTier ?? RoleTier.USER;
  const isAuthorized = isMember && userTier >= RoleTier.MANAGEMENT_HEAD;

  // Strict Server-Side Access Control
  if (!isAuthorized) {
    const roleLabel = session.user?.roleTierName
      ? ROLE_TIER_LABELS[session.user.roleTierName] || session.user.roleTierName
      : 'User';

    return (
      <div className="min-h-screen bg-[#05070B] flex items-center justify-center p-4 kraxx-grid-bg selection:bg-[#EF4444]/30 selection:text-white">
        <div className="w-full max-w-md rounded-md bg-[#0A0F16] border border-[#EF4444]/40 p-8 shadow-[0_0_40px_rgba(239,68,68,0.12)] text-center">
          <div className="w-12 h-12 rounded bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] mx-auto flex items-center justify-center mb-5">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-[10px] font-mono uppercase tracking-wider mb-3">
            <Lock className="w-3 h-3" />
            <span>403 FORBIDDEN — CLEARANCE DENIED</span>
          </div>

          <h2 className="text-lg font-bold text-[#F1F5F9] mb-1 font-mono uppercase tracking-tight">
            KRAXX HQ ACCESS RESTRICTED
          </h2>
          
          <p className="text-xs text-[#94A3B8] leading-relaxed mb-6">
            The KRAXX Operations Command Center is strictly restricted to authenticated <strong className="text-[#F1F5F9]">Founder</strong>, <strong className="text-[#F1F5F9]">Co-Founder</strong>, and <strong className="text-[#F1F5F9]">Management Head</strong> personnel.
          </p>

          {/* User Telemetry Box */}
          <div className="p-3.5 rounded bg-[#070B10] border border-[#16202E] text-left space-y-2 mb-6 font-mono text-xs">
            <div className="flex justify-between text-[#64748B]">
              <span>OPERATOR:</span>
              <span className="text-[#F1F5F9]">{session.user?.displayName || session.user?.name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span>DISCORD ID:</span>
              <span className="text-[#94A3B8]">{session.user?.discordId || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span>RESOLVED TIER:</span>
              <span className="text-[#EF4444] font-semibold">{roleLabel} (Tier {userTier})</span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span>GUILD STATUS:</span>
              <span className={isMember ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                {isMember ? 'VERIFIED MEMBER' : 'NON-GUILD'}
              </span>
            </div>
          </div>

          <a
            href="/api/auth/signout"
            className="kraxx-btn kraxx-btn-ghost text-xs w-full py-2.5 flex items-center justify-center gap-2 hover:border-[#EF4444]/40 hover:text-[#EF4444]"
          >
            <LogOut className="w-4 h-4" />
            <span>DISCONNECT SESSION</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070B] text-[#F1F5F9] flex flex-col selection:bg-[#22D3EE]/25 selection:text-white">
      {/* Global Command Palette (CTRL + K) */}
      <CommandPalette />

      <div className="flex flex-1 min-h-screen">
        {/* Left Command Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-200 lg:pl-[256px]">
          <main className="flex-1 pb-16 flex flex-col">{children}</main>
        </div>
      </div>
    </div>
  );
}
