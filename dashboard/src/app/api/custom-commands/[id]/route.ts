import { NextRequest, NextResponse } from 'next/server';
import { requireGuildAccess } from '@/lib/permissions';
import { withMutation } from '@/lib/mutation';
import { logDashboardAction } from '@/lib/audit';
import { CustomCommandService } from '../../../../../../src/services/custom-command.service';
import { isJsonObject } from '@/lib/json-body';

type Context = { params: Promise<{ id: string }> };
const validationMessage: Record<string, string> = {
  INVALID_GUILD: 'A valid server is required.', INVALID_TRIGGER: 'Trigger must be 1–32 letters, numbers, underscores, or hyphens.',
  INVALID_RESPONSE: 'Response must contain 1–1800 characters.', INVALID_COOLDOWN: 'Cooldown must be 0 or between 5 and 86,400 seconds.',
  INVALID_TEMPLATE_VARIABLE: 'Use only the supported variables: {user}, {mention}, {guild}, and {channel}.',
};

async function handlePATCH(request: NextRequest, context: Context) {
  const body = await request.json();
  if (!isJsonObject(body)) return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
  const guildId = body.guildId;
  const { id } = await context.params;
  if (typeof guildId !== 'string' || !/^\d{17,20}$/.test(guildId)) return NextResponse.json({ error: 'Valid guildId is required.' }, { status: 400 });
  if (typeof body.enabled !== 'boolean') return NextResponse.json({ error: 'enabled must be true or false.' }, { status: 400 });
  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
  const trigger = body.trigger;
  const response = body.response;
  const cooldownSeconds = body.cooldownSeconds;
  try {
    if (typeof trigger !== 'string') return NextResponse.json({ error: validationMessage.INVALID_TRIGGER }, { status: 400 });
    if (typeof response !== 'string') return NextResponse.json({ error: validationMessage.INVALID_RESPONSE }, { status: 400 });
    if (typeof cooldownSeconds !== 'number') return NextResponse.json({ error: validationMessage.INVALID_COOLDOWN }, { status: 400 });
    const command = await CustomCommandService.update({ guildId, id, trigger, response,
      enabled: body.enabled, cooldownSeconds, actorId: auth.session!.user.discordId });
    if (!command) return NextResponse.json({ error: 'Command not found in this server.' }, { status: 404 });
    await logDashboardAction({ guildId, executorId: auth.session!.user.discordId, action: 'CUSTOM_COMMAND_UPDATE', targetId: id,
      targetType: 'CUSTOM_COMMAND', details: { trigger: command.trigger, enabled: command.enabled, cooldownSeconds: command.cooldownSeconds } });
    return NextResponse.json({ command });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') return NextResponse.json({ error: 'That trigger already exists in this server.' }, { status: 409 });
    const code = error instanceof Error ? error.message : '';
    if (validationMessage[code]) return NextResponse.json({ error: validationMessage[code] }, { status: 400 });
    throw error;
  }
}

async function handleDELETE(request: NextRequest, context: Context) {
  const guildId = request.nextUrl.searchParams.get('guildId');
  const { id } = await context.params;
  if (!guildId || !/^\d{17,20}$/.test(guildId)) return NextResponse.json({ error: 'Valid guildId is required.' }, { status: 400 });
  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
  const deleted = await CustomCommandService.remove(guildId, id);
  if (!deleted) return NextResponse.json({ error: 'Command not found in this server.' }, { status: 404 });
  await logDashboardAction({ guildId, executorId: auth.session!.user.discordId, action: 'CUSTOM_COMMAND_DELETE', targetId: id, targetType: 'CUSTOM_COMMAND' });
  return NextResponse.json({ success: true });
}

export const PATCH = withMutation('MANAGE_SETTINGS', handlePATCH);
export const DELETE = withMutation('MANAGE_SETTINGS', handleDELETE);
