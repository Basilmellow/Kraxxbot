// KRAXX Operations Platform — Send Message / Embed API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendChannelMessage, fetchGuildChannels } from '@/lib/discord';
import { requireTier, canMentionMass, RoleTier, requireGuildAccess } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isMember) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Minimum required tier: MANAGEMENT_HEAD (80)
  const permCheck = requireTier(session.user.roleTier, RoleTier.MANAGEMENT_HEAD);
  if (!permCheck.authorized) {
    return NextResponse.json({ error: permCheck.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { channelId, content, embeds, mentionType, mentionRoleId, guildId } = body;

    if (!channelId) {
      return NextResponse.json({ error: 'Target channelId is required' }, { status: 400 });
    }
    if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
    const access = await requireGuildAccess(guildId);
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status });
    const channels = await fetchGuildChannels(guildId);
    if (!channels.some((channel) => channel.id === channelId)) return NextResponse.json({ error: 'Channel does not belong to this guild.' }, { status: 400 });

    if (!content && (!embeds || embeds.length === 0)) {
      return NextResponse.json({ error: 'Message content or embed payload required' }, { status: 400 });
    }

    // Mass mention security check
    const containsMassMention =
      mentionType === 'EVERYONE' ||
      mentionType === 'HERE' ||
      (content && (content.includes('@everyone') || content.includes('@here')));

    if (containsMassMention && !canMentionMass(session.user.roleTier)) {
      return NextResponse.json(
        { error: 'Mass mentions (@everyone / @here) require Management Head authority or higher.' },
        { status: 403 }
      );
    }

    // Construct final text content with mentions if applicable
    let finalContent = content ? content.trim() : undefined;
    if (mentionType === 'EVERYONE') {
      finalContent = finalContent ? `@everyone\n${finalContent}` : '@everyone';
    } else if (mentionType === 'HERE') {
      finalContent = finalContent ? `@here\n${finalContent}` : '@here';
    } else if (mentionType === 'ROLE' && mentionRoleId) {
      const roleMention = `<@&${mentionRoleId}>`;
      finalContent = finalContent ? `${roleMention}\n${finalContent}` : roleMention;
    }

    const sentMessage = await sendChannelMessage(channelId, finalContent, embeds);

    // Audit Log
    await logDashboardAction({
      guildId,
      action: embeds && embeds.length > 0 ? 'EMBED_SEND' : 'MESSAGE_SEND',
      executorId: session.user.discordId,
      targetId: channelId,
      targetType: 'CHANNEL',
      details: {
        messageId: sentMessage.id,
        channelId,
        hasEmbed: Boolean(embeds && embeds.length > 0),
        mentionType: mentionType || 'NONE',
        contentPreview: finalContent ? finalContent.slice(0, 100) : null,
      },
    });

    return NextResponse.json({
      success: true,
      messageId: sentMessage.id,
      channelId,
      timestamp: sentMessage.timestamp || new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API] Send message error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to dispatch message via Discord REST API' },
      { status: 500 }
    );
  }
}
