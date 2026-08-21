// KRAXX Operations Platform — Single Embed Template API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManageTemplates } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isMember) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const template = await prisma.embedTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({
      template: {
        ...template,
        embedData: JSON.parse(template.embedData || '{}'),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isMember) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canManageTemplates(session.user.roleTier)) {
    return NextResponse.json(
      { error: 'Modifying templates requires Team Lead authority or higher.' },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, category, description, title, embedData } = body;

    const updated = await prisma.embedTemplate.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(category ? { category: category.toUpperCase() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(title !== undefined ? { title: title?.trim() || null } : {}),
        ...(embedData ? { embedData: typeof embedData === 'object' ? JSON.stringify(embedData) : embedData } : {}),
      },
    });

    await logDashboardAction({
      action: 'TEMPLATE_UPDATE',
      executorId: session.user.discordId,
      targetId: id,
      targetType: 'TEMPLATE',
      details: { name: updated.name, category: updated.category },
    });

    return NextResponse.json({
      success: true,
      template: {
        ...updated,
        embedData: JSON.parse(updated.embedData || '{}'),
      },
    });
  } catch (error: any) {
    console.error('[API] Update template error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isMember) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canManageTemplates(session.user.roleTier)) {
    return NextResponse.json(
      { error: 'Deleting templates requires Team Lead authority or higher.' },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const template = await prisma.embedTemplate.delete({
      where: { id },
    });

    await logDashboardAction({
      action: 'TEMPLATE_DELETE',
      executorId: session.user.discordId,
      targetId: id,
      targetType: 'TEMPLATE',
      details: { name: template.name },
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('[API] Delete template error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete template' }, { status: 500 });
  }
}
