import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

const DEFAULT_MODULES = [
  { module: 'messaging', enabled: true, label: 'Message Center', desc: 'Direct channel messaging and rich embeds' },
  { module: 'announcements', enabled: true, label: 'Announcements', desc: 'Division broadcast pipelines and scheduling' },
  { module: 'tickets', enabled: true, label: 'Support Tickets', desc: 'Inquiry routing, claim workflows and transcripts' },
  { module: 'members', enabled: true, label: 'Member Directory', desc: 'Operator dossiers and verification status' },
  { module: 'roles', enabled: true, label: 'Role Hierarchy', desc: 'Role precedence and authority management' },
  { module: 'tasks', enabled: true, label: 'Tasks Engine', desc: 'Task pipelines, assignments and due dates' },
  { module: 'reminders', enabled: true, label: 'Reminders', desc: 'Timed alerts and recurring reminders' },
  { module: 'meetings', enabled: true, label: 'Meetings', desc: 'Briefing countdowns and attendance scheduling' },
  { module: 'welcome', enabled: true, label: 'Welcome System', desc: 'Onboarding greetings and auto-role assignment' },
  { module: 'automation', enabled: true, label: 'Automation Engine', desc: 'Event-driven triggers and automated actions' },
  { module: 'moderation', enabled: true, label: 'Moderation Console', desc: 'Disciplinary sanctions, bans and timeouts' },
  { module: 'social', enabled: true, label: 'Social & Polls', desc: 'Interactive polls and community suggestions' },
  { module: 'entertainment', enabled: true, label: 'Entertainment', desc: 'Lightweight gamification, XP and trivia' },
  { module: 'utilities', enabled: true, label: 'Server Utilities', desc: 'Snowflake decoders and timestamp tools' },
];

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const existingConfigs = await prisma.moduleConfig.findMany();
    const configMap = new Map(existingConfigs.map((c) => [c.module, c]));

    const merged = DEFAULT_MODULES.map((dm) => {
      const saved = configMap.get(dm.module);
      return {
        ...dm,
        enabled: saved ? saved.enabled : dm.enabled,
        updatedAt: saved?.updatedAt || null,
        updatedBy: saved?.updatedBy || null,
      };
    });

    return NextResponse.json({ modules: merged, total: merged.length });
  } catch (error: any) {
    console.error('Failed to fetch modules:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch modules' }, { status: 500 });
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
    const { module: moduleKey, enabled } = body;

    if (!moduleKey || enabled === undefined) {
      return NextResponse.json({ error: 'Module key and enabled boolean are required.' }, { status: 400 });
    }

    const currentUserId = session!.user.discordId;

    const updated = await prisma.moduleConfig.upsert({
      where: { module: moduleKey },
      update: {
        enabled: Boolean(enabled),
        updatedBy: currentUserId,
      },
      create: {
        module: moduleKey,
        enabled: Boolean(enabled),
        updatedBy: currentUserId,
      },
    });

    await logDashboardAction({
      action: enabled ? 'MODULE_ENABLE' : 'MODULE_DISABLE',
      executorId: currentUserId,
      targetId: moduleKey,
      targetType: 'MODULE',
      details: { module: moduleKey, enabled },
    });

    return NextResponse.json({ success: true, module: updated });
  } catch (error: any) {
    console.error('Failed to update module state:', error);
    return NextResponse.json({ error: error.message || 'Failed to update module state' }, { status: 500 });
  }
}
