// KRAXX Operations Platform — Message Edit & Delete API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchChannelMessage, editChannelMessage, deleteChannelMessage } from '@/lib/discord';
import { canEditMessages, canDeleteMessages, canMentionMass } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isMember || !canEditMessages(session.user.roleTier)) {
    return NextResponse.json({ error: 'Unauthorized: Management Head clearance required' }, { status: 403 });
  }

  const { id: messageId } = await params;
  const channelId = request.nextUrl.searchParams.get('channelId');

  if (!channelId || !messageId) {
    return NextResponse.json({ error: 'channelId and messageId required' }, { status: 400 });
  }

  try {
    const message = await fetchChannelMessage(channelId, messageId);
    return NextResponse.json({ message });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Message not found in specified channel' },
      { status: 404 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isMember) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canEditMessages(session.user.roleTier)) {
    return NextResponse.json(
      { error: 'Editing bot messages requires Team Lead authority or higher.' },
      { status: 403 }
    );
  }

  const { id: messageId } = await params;

  try {
    const body = await request.json();
    const { channelId, content, embeds, mentionType, mentionRoleId } = body;

    if (!channelId || !messageId) {
      return NextResponse.json({ error: 'channelId and messageId are required' }, { status: 400 });
    }

    // Mass mention check for edited content
    const containsMassMention =
      mentionType === 'EVERYONE' ||
      mentionType === 'HERE' ||
      (content && (content.includes('@everyone') || content.includes('@here')));

    if (containsMassMention && !canMentionMass(session.user.roleTier)) {
      return NextResponse.json(
        { error: 'Mass mentions require Management Head authority.' },
        { status: 403 }
      );
    }

    let finalContent = content !== undefined ? content : undefined;
    if (mentionType === 'EVERYONE' && content) {
      finalContent = `@everyone\n${content}`;
    } else if (mentionType === 'HERE' && content) {
      finalContent = `@here\n${content}`;
    } else if (mentionType === 'ROLE' && mentionRoleId && content) {
      finalContent = `<@&${mentionRoleId}>\n${content}`;
    }

    const updatedMessage = await editChannelMessage(channelId, messageId, finalContent, embeds);

    // Audit Log
    await logDashboardAction({
      action: 'MESSAGE_EDIT',
      executorId: session.user.discordId,
      targetId: messageId,
      targetType: 'MESSAGE',
      details: {
        channelId,
        messageId,
        hasEmbed: Boolean(embeds && embeds.length > 0),
        editedContentPreview: finalContent ? String(finalContent).slice(0, 100) : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: updatedMessage,
    });
  } catch (error: any) {
    console.error('[API] Edit message error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to edit message' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isMember) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Deleting messages is a destructive action requiring MANAGEMENT_HEAD (80+)
  if (!canDeleteMessages(session.user.roleTier)) {
    return NextResponse.json(
      { error: 'Deleting messages requires Management Head authority or higher.' },
      { status: 403 }
    );
  }

  const { id: messageId } = await params;
  const channelId = request.nextUrl.searchParams.get('channelId');

  if (!channelId || !messageId) {
    return NextResponse.json({ error: 'channelId and messageId are required' }, { status: 400 });
  }

  try {
    await deleteChannelMessage(channelId, messageId);

    // Audit Log
    await logDashboardAction({
      action: 'MESSAGE_DELETE',
      executorId: session.user.discordId,
      targetId: messageId,
      targetType: 'MESSAGE',
      details: {
        channelId,
        messageId,
      },
    });

    return NextResponse.json({ success: true, messageId, channelId });
  } catch (error: any) {
    console.error('[API] Delete message error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete message from Discord channel' },
      { status: 500 }
    );
  }
}
