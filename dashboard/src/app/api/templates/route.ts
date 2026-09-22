import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireGuildAccess } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category');
  const guildId = request.nextUrl.searchParams.get('guildId');

  if (!guildId) {
    return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  }

  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
  }

  try {
    const where: Record<string, unknown> = { guildId };
    if (category && category !== 'ALL') {
      where.category = category.toUpperCase();
    }

    const templates = await prisma.embedTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        description: t.description,
        title: t.title,
        embedData: JSON.parse(t.embedData || '{}'),
        createdBy: t.createdBy,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[API] Fetch templates error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve embed templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, description, title, embedData, guildId: bodyGuildId } = body;
    const guildId = bodyGuildId || request.nextUrl.searchParams.get('guildId');

    if (!guildId) {
      return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
    }

    const auth = await requireGuildAccess(guildId);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
    }

    if (!name || !embedData) {
      return NextResponse.json({ error: 'Template name and embedData required' }, { status: 400 });
    }

    const cleanName = name.trim();
    const existing = await prisma.embedTemplate.findFirst({
      where: { guildId, name: cleanName },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A template with the name "${cleanName}" already exists.` },
        { status: 409 }
      );
    }

    const template = await prisma.embedTemplate.create({
      data: {
        guildId,
        name: cleanName,
        category: (category || 'CUSTOM').toUpperCase(),
        description: description?.trim() || null,
        title: title?.trim() || null,
        embedData: typeof embedData === 'object' ? JSON.stringify(embedData) : embedData,
        createdBy: auth.session!.user.discordId,
      },
    });

    await logDashboardAction({
      guildId,
      action: 'TEMPLATE_CREATE',
      executorId: auth.session!.user.discordId,
      targetId: template.id,
      targetType: 'TEMPLATE',
      details: {
        name: template.name,
        category: template.category,
      },
    });

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        embedData: JSON.parse(template.embedData),
      },
    });
  } catch (error: any) {
    console.error('[API] Create template error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save template' },
      { status: 500 }
    );
  }
}
