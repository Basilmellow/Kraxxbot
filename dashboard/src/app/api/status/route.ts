// KRAXX Operations Platform — Status API
// Returns system health status for bot, database, and Discord

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchBotUser } from '@/lib/discord';
import { requireTier, RoleTier } from '@/lib/permissions';

export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error, code: 'TIER_UNAUTHORIZED' }, { status: auth.status });
  }

  const status: Record<string, string> = {
    bot: 'offline',
    database: 'offline',
    discord: 'offline',
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = 'online';
  } catch {
    status.database = 'offline';
  }

  // Check Discord API connectivity (and bot token validity)
  try {
    await fetchBotUser();
    status.bot = 'online';
    status.discord = 'online';
  } catch {
    status.bot = 'offline';
    status.discord = 'offline';
  }

  return NextResponse.json({
    ...status,
    lastChecked: new Date().toISOString(),
  });
}
