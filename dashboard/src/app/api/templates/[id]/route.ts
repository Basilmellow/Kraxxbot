import { withMutation } from '@/lib/mutation';
// KRAXX Operations Platform — Single Embed Template API
import { logDashboardAction } from '@/lib/audit';
import { authOptions } from '@/lib/auth';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const access = await requireGuildAccess(guildId);
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const template = await prisma.embedTemplate.findUnique({
      where: { id, guildId },
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

async function handlePUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const access = await requireGuildAccess(guildId);
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    const { name, category, description, title, embedData } = body;

    const updated = await prisma.embedTemplate.update({
      where: { id, guildId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(category ? { category: category.toUpperCase() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(title !== undefined ? { title: title?.trim() || null } : {}),
        ...(embedData ? { embedData: typeof embedData === 'object' ? JSON.stringify(embedData) : embedData } : {}),
      },
    });

    await logDashboardAction({
      guildId,
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
  } catch {
    console.error('[API] Update template request failed.');
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

async function handleDELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const access = await requireGuildAccess(guildId);
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const template = await prisma.embedTemplate.delete({
      where: { id, guildId },
    });

    await logDashboardAction({
      guildId,
      action: 'TEMPLATE_DELETE',
      executorId: session.user.discordId,
      targetId: id,
      targetType: 'TEMPLATE',
      details: { name: template.name },
    });

    return NextResponse.json({ success: true, id });
  } catch {
    console.error('[API] Delete template request failed.');
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}

export const PUT = withMutation('MANAGE_ANNOUNCEMENTS', handlePUT);
export const DELETE = withMutation('MANAGE_ANNOUNCEMENTS', handleDELETE);
