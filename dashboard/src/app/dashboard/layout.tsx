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
