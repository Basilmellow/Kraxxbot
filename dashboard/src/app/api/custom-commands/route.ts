import { NextRequest, NextResponse } from 'next/server';
import { requireGuildAccess } from '@/lib/permissions';
import { withMutation } from '@/lib/mutation';
import { logDashboardAction } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { CustomCommandService } from '../../../../../src/services/custom-command.service';
import { isJsonObject } from '@/lib/json-body';

const SNOWFLAKE = /^\d{17,20}$/;
const validationMessage: Record<string, string> = {
  INVALID_GUILD: 'A valid server is required.', INVALID_TRIGGER: 'Trigger must be 1–32 letters, numbers, underscores, or hyphens.',
  INVALID_RESPONSE: 'Response must contain 1–1800 characters.', INVALID_COOLDOWN: 'Cooldown must be 0 or between 5 and 86,400 seconds.',
  INVALID_TEMPLATE_VARIABLE: 'Use only the supported variables: {user}, {mention}, {guild}, and {channel}.',
};

export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId || !SNOWFLAKE.test(guildId)) return NextResponse.json({ error: 'Valid guildId is required.' }, { status: 400 });
  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
  const [commands, module] = await Promise.all([
    prisma.customCommand.findMany({ where: { guildId }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.guildModule.findUnique({ where: { guildId_module: { guildId, module: 'customCommands' } }, select: { enabled: true } }),
  ]);
  return NextResponse.json({ commands, moduleEnabled: module?.enabled === true });
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  if (!isJsonObject(body)) return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
  const guildId = body.guildId;
  if (typeof guildId !== 'string' || !SNOWFLAKE.test(guildId)) return NextResponse.json({ error: 'Valid guildId is required.' }, { status: 400 });
  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
  const actorId = auth.session!.user.discordId;
  const trigger = body.trigger;
  const response = body.response;
  const cooldownSeconds = body.cooldownSeconds;
  try {
    if (typeof trigger !== 'string') return NextResponse.json({ error: validationMessage.INVALID_TRIGGER }, { status: 400 });
    if (typeof response !== 'string') return NextResponse.json({ error: validationMessage.INVALID_RESPONSE }, { status: 400 });
    if (cooldownSeconds !== undefined && typeof cooldownSeconds !== 'number') return NextResponse.json({ error: validationMessage.INVALID_COOLDOWN }, { status: 400 });
    const command = await CustomCommandService.create({ guildId, trigger, response, cooldownSeconds, actorId });
    await logDashboardAction({ guildId, executorId: actorId, action: 'CUSTOM_COMMAND_CREATE', targetId: command.id,
      targetType: 'CUSTOM_COMMAND', details: { trigger: command.trigger, cooldownSeconds: command.cooldownSeconds } });
    return NextResponse.json({ command }, { status: 201 });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') return NextResponse.json({ error: 'That trigger already exists in this server.' }, { status: 409 });
    const code = error instanceof Error ? error.message : '';
    if (validationMessage[code]) return NextResponse.json({ error: validationMessage[code] }, { status: 400 });
    throw error;
  }
}

export const POST = withMutation('MANAGE_SETTINGS', handlePOST);
