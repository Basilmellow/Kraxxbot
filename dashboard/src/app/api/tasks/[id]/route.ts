import { logDashboardAction } from '@/lib/audit';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { withMutation } from '@/lib/mutation';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';

async function handlePATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  const { id: taskId } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const guildAccess = await requireGuildAccess(guildId);
  if (!guildAccess.authorized) return NextResponse.json({ error: guildAccess.error }, { status: guildAccess.status });
  const currentUserId = session!.user.discordId;

  try {
    const body = await request.json();
    const { status, priority, assigneeId, dueDate, title, description } = body;

    const dataToUpdate: Prisma.TaskUpdateInput = {};
    if (status !== undefined) {
      dataToUpdate.status = status;
      if (status === 'COMPLETED') {
        dataToUpdate.completedAt = new Date();
      } else {
        dataToUpdate.completedAt = null;
      }
    }
    if (priority !== undefined) dataToUpdate.priority = priority;
    if (assigneeId !== undefined) dataToUpdate.assigneeId = assigneeId || null;
    if (dueDate !== undefined) dataToUpdate.dueDate = dueDate ? new Date(dueDate) : null;
    if (title !== undefined) dataToUpdate.title = title.trim();
    if (description !== undefined) dataToUpdate.description = description.trim();

    const updatedTask = await prisma.task.update({
      where: { id: taskId, guildId },
      data: dataToUpdate,
    });

    await logDashboardAction({
      guildId,
      action: 'TASK_UPDATE',
      executorId: currentUserId,
      targetId: taskId,
      targetType: 'TASK',
      details: { taskNumber: updatedTask.taskNumber, changes: dataToUpdate },
    });

    return NextResponse.json({ success: true, task: updatedTask });
  } catch {
    console.error('Failed to update task.');
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  const { id: taskId } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const guildAccess = await requireGuildAccess(guildId);
  if (!guildAccess.authorized) return NextResponse.json({ error: guildAccess.error }, { status: guildAccess.status });
  const currentUserId = session!.user.discordId;

  try {
    const task = await prisma.task.delete({
      where: { id: taskId, guildId },
    });

    await logDashboardAction({
      guildId,
      action: 'TASK_DELETE',
      executorId: currentUserId,
      targetId: taskId,
      targetType: 'TASK',
      details: { taskNumber: task.taskNumber, title: task.title },
    });

    return NextResponse.json({ success: true, message: `Task #${task.taskNumber} deleted.` });
  } catch {
    console.error('Failed to delete task.');
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}

export const PATCH = withMutation('MANAGE_SETTINGS', handlePATCH);
export const DELETE = withMutation('MANAGE_SETTINGS', handleDELETE);
