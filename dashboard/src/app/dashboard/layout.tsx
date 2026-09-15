import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RoleTier, ROLE_TIER_LABELS } from '@/lib/constants';
import { Sidebar } from '@/components/layout/Sidebar';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { ShieldAlert, LogOut, Lock } from 'lucide-react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = await getServerSession(authOptions);

  // Allow instant local development preview if running locally without Discord OAuth session
  if (!session && process.env.NODE_ENV === 'development') {
    session = {
      user: {
        id: 'dev_founder_1',
        name: 'KRAXX Founder',
        displayName: 'anaya.velvet',
        discordId: '100000000000000001',
        email: 'founder@kraxxsec.com',
        image: null,
        roleTier: RoleTier.MANAGEMENT_HEAD,
        roleTierName: 'MANAGEMENT_HEAD',
        isMember: true,
      },
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    } as any;
  }

  if (!session) {
    redirect('/login');
  }

  const isMember = session.user?.isMember ?? true;
  const userTier = session.user?.roleTier ?? RoleTier.MANAGEMENT_HEAD;
  const isAuthorized = isMember && userTier >= RoleTier.MANAGEMENT_HEAD;

  // Strict Server-Side Access Control
  if (!isAuthorized) {
    const roleLabel = session.user?.roleTierName
      ? ROLE_TIER_LABELS[session.user.roleTierName] || session.user.roleTierName
      : 'User';

    return (
      <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white border border-[#E5E7EB] p-8 shadow-lg text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-red-600 mx-auto flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200/60 text-red-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>403 Forbidden</span>
          </div>

          <h2 className="text-lg font-bold text-[#101828] mb-1.5">
            KRAXX HQ Access Restricted
          </h2>
          
          <p className="text-xs text-[#667085] leading-relaxed mb-6">
            The KRAXX Operations Command Center is strictly restricted to authenticated <strong className="text-[#101828]">Founder</strong>, <strong className="text-[#101828]">Co-Founder</strong>, and <strong className="text-[#101828]">Management Head</strong> personnel.
          </p>

          {/* User Telemetry Box */}
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-left space-y-2 mb-6 text-xs font-mono">
            <div className="flex justify-between text-[#667085]">
              <span>OPERATOR:</span>
              <span className="text-[#101828] font-semibold">{session.user?.displayName || session.user?.name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between text-[#667085]">
              <span>DISCORD ID:</span>
              <span className="text-[#475467]">{session.user?.discordId || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-[#667085]">
              <span>RESOLVED TIER:</span>
              <span className="text-red-600 font-semibold">{roleLabel} (Tier {userTier})</span>
            </div>
            <div className="flex justify-between text-[#667085]">
              <span>GUILD STATUS:</span>
              <span className={isMember ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                {isMember ? 'VERIFIED MEMBER' : 'NON-GUILD'}
              </span>
            </div>
          </div>

          <a
            href="/api/auth/signout"
            className="kraxx-btn kraxx-btn-ghost text-xs w-full py-2.5 flex items-center justify-center gap-2 hover:border-red-200 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            <span>Disconnect Session</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-[#101828] flex flex-col selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* Global Command Palette (CTRL + K) */}
      <CommandPalette />

      <div className="flex flex-1 min-h-screen">
        {/* Left Command Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <main className="flex-1 pb-16 flex flex-col pt-14 md:pt-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
