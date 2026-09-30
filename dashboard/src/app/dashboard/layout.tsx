import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Require real Discord OAuth2 session — no dev bypass
  if (!session) {
    redirect('/login');
  }

  const isOwner = Boolean(session.user?.discordId && process.env.KRAXXBOT_OWNER_DISCORD_ID
    && session.user.discordId === process.env.KRAXXBOT_OWNER_DISCORD_ID.trim());
  return <DashboardShell session={session} isOwner={isOwner}>{children}</DashboardShell>;
}
