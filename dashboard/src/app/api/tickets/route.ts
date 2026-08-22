import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') || 'ALL'; // ALL | OPEN | CLAIMED | CLOSED | MY_TICKETS | UNASSIGNED
  const categoryFilter = searchParams.get('category') || '';
  const query = searchParams.get('q')?.toLowerCase() || '';

  try {
    const currentUserId = session!.user.discordId;
    let whereClause: any = {};

    if (statusFilter === 'OPEN') {
      whereClause.status = 'OPEN';
    } else if (statusFilter === 'CLAIMED') {
      whereClause.status = 'CLAIMED';
    } else if (statusFilter === 'CLOSED') {
      whereClause.status = 'CLOSED';
    } else if (statusFilter === 'MY_TICKETS') {
      whereClause.claimerId = currentUserId;
    } else if (statusFilter === 'UNASSIGNED') {
      whereClause.status = 'OPEN';
      whereClause.claimerId = null;
    }

    if (categoryFilter) {
      whereClause.category = categoryFilter;
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    let filtered = tickets;
    if (query) {
      filtered = tickets.filter(
        (t) =>
          t.subject.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query) ||
          t.ticketNumber.toString().includes(query) ||
          t.openerId.includes(query)
      );
    }

    // Correlate with members to get opener / claimer names
    const userIds = new Set<string>();
    filtered.forEach((t) => {
      if (t.openerId) userIds.add(t.openerId);
      if (t.claimerId) userIds.add(t.claimerId);
      if (t.closedById) userIds.add(t.closedById);
    });

    const members = await prisma.member.findMany({
      where: { discordId: { in: Array.from(userIds) } },
    });
    const memberMap = new Map(members.map((m) => [m.discordId, m]));

    const enriched = filtered.map((t) => ({
      ...t,
      openerName: memberMap.get(t.openerId)?.displayName || t.openerId,
      claimerName: t.claimerId ? memberMap.get(t.claimerId)?.displayName || t.claimerId : null,
      closedByName: t.closedById ? memberMap.get(t.closedById)?.displayName || t.closedById : null,
    }));

    return NextResponse.json({
      tickets: enriched,
      total: enriched.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch tickets:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch tickets' }, { status: 500 });
  }
}
