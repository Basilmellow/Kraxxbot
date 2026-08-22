import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') || '';
  const departmentFilter = searchParams.get('department') || '';
  const priorityFilter = searchParams.get('priority') || '';
  const query = searchParams.get('q')?.toLowerCase() || '';

  try {
    const whereClause: any = {};
    if (statusFilter && statusFilter !== 'ALL') whereClause.status = statusFilter;
    if (departmentFilter && departmentFilter !== 'ALL') whereClause.department = departmentFilter;
    if (priorityFilter && priorityFilter !== 'ALL') whereClause.priority = priorityFilter;

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    let filtered = tasks;
    if (query) {
      filtered = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.taskNumber.toString().includes(query)
      );
    }

    // Correlate assignees and creators
    const userIds = new Set<string>();
    filtered.forEach((t) => {
      if (t.assigneeId) userIds.add(t.assigneeId);
      if (t.creatorId) userIds.add(t.creatorId);
    });

    const members = await prisma.member.findMany({
      where: { discordId: { in: Array.from(userIds) } },
    });
    const memberMap = new Map(members.map((m) => [m.discordId, m]));

    const enriched = filtered.map((t) => ({
      ...t,
      assigneeName: t.assigneeId ? memberMap.get(t.assigneeId)?.displayName || t.assigneeId : null,
      creatorName: memberMap.get(t.creatorId)?.displayName || t.creatorId,
    }));

    return NextResponse.json({ tasks: enriched, total: enriched.length });
  } catch (error: any) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { title, description, department = 'GENERAL', priority = 'MEDIUM', assigneeId, dueDate } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required.' }, { status: 400 });
    }

    const currentUserId = session!.user.discordId;

    // Get highest taskNumber
    const lastTask = await prisma.task.findFirst({
      orderBy: { taskNumber: 'desc' },
    });
    const nextNumber = (lastTask?.taskNumber || 0) + 1;

    const task = await prisma.task.create({
      data: {
        taskNumber: nextNumber,
        title: title.trim(),
        description: description.trim(),
        department,
        priority,
        creatorId: currentUserId,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'PENDING',
      },
    });

    await logDashboardAction({
      action: 'TASK_CREATE',
      executorId: currentUserId,
      targetId: task.id,
      targetType: 'TASK',
      details: { taskNumber: task.taskNumber, title: task.title, department },
    });

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ error: error.message || 'Failed to create task' }, { status: 500 });
  }
}
