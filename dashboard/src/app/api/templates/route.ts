// KRAXX Operations Platform — Embed Templates API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManageTemplates } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isMember) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const category = request.nextUrl.searchParams.get('category');

  try {
    const where: Record<string, unknown> = {};
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.isMember) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canManageTemplates(session.user.roleTier)) {
    return NextResponse.json(
      { error: 'Creating embed templates requires Team Lead authority or higher.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { name, category, description, title, embedData } = body;

    if (!name || !embedData) {
      return NextResponse.json({ error: 'Template name and embedData required' }, { status: 400 });
    }

    const cleanName = name.trim();
    const existing = await prisma.embedTemplate.findUnique({
      where: { name: cleanName },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A template with the name "${cleanName}" already exists.` },
        { status: 409 }
      );
    }

    const template = await prisma.embedTemplate.create({
      data: {
        name: cleanName,
        category: (category || 'CUSTOM').toUpperCase(),
        description: description?.trim() || null,
        title: title?.trim() || null,
        embedData: typeof embedData === 'object' ? JSON.stringify(embedData) : embedData,
        createdBy: session.user.discordId,
      },
    });

    await logDashboardAction({
      action: 'TEMPLATE_CREATE',
      executorId: session.user.discordId,
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
