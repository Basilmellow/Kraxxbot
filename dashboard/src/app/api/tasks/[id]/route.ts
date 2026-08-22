import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: taskId } = await params;
  const currentUserId = session!.user.discordId;

  try {
    const body = await request.json();
    const { status, priority, assigneeId, dueDate, title, description } = body;

    const dataToUpdate: any = {};
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
      where: { id: taskId },
      data: dataToUpdate,
    });

    await logDashboardAction({
      action: 'TASK_UPDATE',
      executorId: currentUserId,
      targetId: taskId,
      targetType: 'TASK',
      details: { taskNumber: updatedTask.taskNumber, changes: dataToUpdate },
    });

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: any) {
    console.error('Failed to update task:', error);
    return NextResponse.json({ error: error.message || 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: taskId } = await params;
  const currentUserId = session!.user.discordId;

  try {
    const task = await prisma.task.delete({
      where: { id: taskId },
    });

    await logDashboardAction({
      action: 'TASK_DELETE',
      executorId: currentUserId,
      targetId: taskId,
      targetType: 'TASK',
      details: { taskNumber: task.taskNumber, title: task.title },
    });

    return NextResponse.json({ success: true, message: `Task #${task.taskNumber} deleted.` });
  } catch (error: any) {
    console.error('Failed to delete task:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete task' }, { status: 500 });
  }
}
