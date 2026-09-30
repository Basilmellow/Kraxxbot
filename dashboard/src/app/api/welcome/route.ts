import { authorizeRole } from '@/lib/capabilities';
import { validateChannel } from '@/lib/destinations';
import { withMutation } from '@/lib/mutation';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { PolicyError } from '../../../../../src/security/policy';
import { saveWelcomeConfig } from '../../../../../src/services/welcome-config.service';
import { parseWelcomeConfig, WelcomeConfigError } from '../../../../../src/services/welcome-contract';
import { DiscordApiError } from '@/lib/discord-transport';
import { NextRequest,NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get('guildId');

  if (!guildId) {
    return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  }

  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
  }

  try {
    const config = await prisma.welcomeConfig.findUnique({
      where: { guildId },
    });

    return NextResponse.json({ config });
  } catch (error: unknown) {
    console.error('Failed to fetch welcome config:', error);
    return NextResponse.json({ error: 'Failed to fetch welcome configuration.' }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const input = parseWelcomeConfig(await request.json());
    const queryGuildId = request.nextUrl.searchParams.get('guildId');
    if (queryGuildId && queryGuildId !== input.guildId)
      return NextResponse.json({ error: 'Conflicting guild context.' }, { status: 400 });
    const guildId = input.guildId;

    const auth = await requireGuildAccess(guildId);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
    }

    const currentUserId = auth.session?.user?.discordId;
    if (!currentUserId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    if (input.channelId) await validateChannel(guildId, input.channelId);
    if (input.leaveChannelId) await validateChannel(guildId, input.leaveChannelId);
    if (input.roleId) await authorizeRole(guildId, currentUserId, input.roleId, true);
    const config = await saveWelcomeConfig(prisma, input, currentUserId);

    return NextResponse.json({ success: true, config });
  } catch (error: unknown) {
    if (error instanceof WelcomeConfigError || error instanceof SyntaxError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof PolicyError)
      return NextResponse.json({ error: 'The selected channel or role is not available in this server.' }, { status: 403 });
    if (error instanceof DiscordApiError)
      return NextResponse.json({ error: 'Could not verify the configured Discord destination.' }, { status: error.status === 404 ? 400 : 502 });
    console.error('Failed to update welcome config.');
    return NextResponse.json({ error: 'Failed to update welcome configuration.' }, { status: 500 });
  }
}

export const POST = withMutation('MANAGE_SETTINGS', handlePOST);
