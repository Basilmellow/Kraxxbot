import { withMutation } from '@/lib/mutation';
import { logDashboardAction } from '@/lib/audit';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { fetchGuildChannels } from '@/lib/discord';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { kraxxAiSettingsSchema, parseKraxxAiSettings } from '../../../../../src/services/kraxx-ai-contract';

export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const access = await requireGuildAccess(guildId);
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status });
  const moduleRow = await prisma.guildModule.findUnique({ where: { guildId_module: { guildId, module: 'kraxx-ai' } } });
  let settings;
  try { settings = parseKraxxAiSettings(moduleRow?.config); }
  catch { return NextResponse.json({ error: 'Kraxx AI settings are invalid. Disable and reconfigure the module.' }, { status: 409 }); }
  const since = new Date(); since.setHours(0, 0, 0, 0);
  const rows = await prisma.kraxxAiRequest.groupBy({ by: ['status'], where: { guildId, createdAt: { gte: since } }, _count: { _all: true } });
  const counts = Object.fromEntries(rows.map(row => [row.status, row._count._all]));
  return NextResponse.json({ enabled: moduleRow?.enabled ?? false, settings, providerStatus: rows.some(row => row.status === 'SUCCESS') ? 'RECENTLY_SUCCEEDED' : 'UNKNOWN', usage: {
    requestsToday: rows.reduce((sum, row) => sum + row._count._all, 0), successful: counts.SUCCESS || 0,
    failed: (counts.FAILURE || 0) + (counts.PROVIDER_ERROR || 0) + (counts.PROVIDER_UNKNOWN || 0), rateLimited: counts.RATE_LIMITED || 0,
  } });
}

async function patchSettings(request: NextRequest) {
  const body: unknown = await request.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'A settings object is required.' }, { status: 400 });
  const data = body as Record<string, unknown>;
  if (typeof data.guildId !== 'string' || typeof data.enabled !== 'boolean' || !data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings))
    return NextResponse.json({ error: 'Invalid Kraxx AI settings.' }, { status: 400 });
  const parsed = kraxxAiSettingsSchema.safeParse(data.settings);
  if (!parsed.success) return NextResponse.json({ error: 'One or more settings are outside the supported limits.' }, { status: 400 });
  const channels = await fetchGuildChannels(data.guildId);
  const textChannels = new Set(channels.filter(channel => channel.type === 0 || channel.type === 5).map(channel => channel.id));
  if (parsed.data.allowedChannels.some(id => !textChannels.has(id))) return NextResponse.json({ error: 'Choose text channels that belong to this server.' }, { status: 400 });
  const session = await getServerSession(authOptions);
  const actorId = session?.user?.discordId;
  if (!actorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const previous = await prisma.guildModule.findUnique({ where: { guildId_module: { guildId: data.guildId, module: 'kraxx-ai' } } });
  await prisma.guildModule.upsert({ where: { guildId_module: { guildId: data.guildId, module: 'kraxx-ai' } },
    update: { enabled: data.enabled, config: JSON.stringify(parsed.data), updatedBy: actorId },
    create: { guildId: data.guildId, module: 'kraxx-ai', enabled: data.enabled, config: JSON.stringify(parsed.data), updatedBy: actorId } });
  const action = previous?.enabled !== data.enabled ? (data.enabled ? 'KRAxx_AI_ENABLED' : 'KRAxx_AI_DISABLED') : 'KRAxx_AI_SETTINGS_UPDATED';
  await logDashboardAction({ guildId: data.guildId, executorId: actorId, action, targetId: 'kraxx-ai', targetType: 'MODULE',
    details: { enabled: data.enabled, allowedChannelCount: parsed.data.allowedChannels.length, userCooldownSeconds: parsed.data.userCooldownSeconds,
      guildRequestsPerMinute: parsed.data.guildRequestsPerMinute, maxInputLength: parsed.data.maxInputLength,
      maxOutputLength: parsed.data.maxOutputLength, responseStyle: parsed.data.responseStyle } });
  return NextResponse.json({ success: true });
}

export const PATCH = withMutation('MANAGE_SETTINGS', patchSettings);
