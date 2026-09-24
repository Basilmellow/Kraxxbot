// KRAXX Operations Platform — Audit Log API
// Lists audit log entries with optional filtering and pagination

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTier, requireGuildAccess } from '@/lib/permissions';
import { RoleTier } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isMember) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Require at least Management Head to view audit logs
  const permCheck = requireTier(session.user.roleTier, RoleTier.MANAGEMENT_HEAD);
  if (!permCheck.authorized) {
    return NextResponse.json({ error: permCheck.reason }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const action = searchParams.get('action') || undefined;
  const executorId = searchParams.get('executorId') || undefined;
  const guildId = searchParams.get('guildId');
  if (!guildId) {
    return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  }
  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
  }

  const skip = (page - 1) * limit;

  try {
    const where: Record<string, unknown> = { guildId };
    if (action) where.action = action;
    if (executorId) where.executorId = executorId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      data: logs.map((log: { id: string; action: string; executorId: string; targetId: string | null; details: string | null; timestamp: Date }) => ({
        id: log.id,
        action: log.action,
        executorId: log.executorId,
        targetId: log.targetId,
        details: log.details,
        timestamp: log.timestamp.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[API] Audit log error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
