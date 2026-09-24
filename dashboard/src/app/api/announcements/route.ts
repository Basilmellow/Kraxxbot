// KRAXX Operations Platform — Announcements API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendChannelMessage, fetchGuildChannels } from '@/lib/discord';
import { prisma } from '@/lib/prisma';
import { canMentionMass, canScheduleAnnouncements, requireTier, RoleTier, requireGuildAccess } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isMember) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permCheck = requireTier(session.user.roleTier, RoleTier.MANAGEMENT_HEAD);
  if (!permCheck.authorized) {
    return NextResponse.json({ error: permCheck.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      title,
      content,
      channelId,
      department,
      type,
      mentionType,
      mentionRoleId,
      embeds,
      scheduledFor, // ISO date string if scheduled
    } = body;

    if (!channelId) {
      return NextResponse.json({ error: 'Target channelId is required' }, { status: 400 });
    }

    // Mass mention permission validation
    if ((mentionType === 'EVERYONE' || mentionType === 'HERE') && !canMentionMass(session.user.roleTier)) {
      return NextResponse.json(
        { error: 'Mass mentions (@everyone / @here) require Management Head authority.' },
        { status: 403 }
      );
    }

    const isScheduled = Boolean(scheduledFor);

    // If scheduling, verify scheduling authority
    if (isScheduled && !canScheduleAnnouncements(session.user.roleTier)) {
      return NextResponse.json(
        { error: 'Scheduling announcements requires Team Lead authority or higher.' },
        { status: 403 }
      );
    }

    const guildId = body.guildId || request.nextUrl.searchParams.get('guildId');
    if (!guildId) {
      return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
    }

    const auth = await requireGuildAccess(guildId);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
    }
    const channels = await fetchGuildChannels(guildId);
    if (!channels.some((channel) => channel.id === channelId)) {
      return NextResponse.json({ error: 'Channel does not belong to this guild.' }, { status: 400 });
    }

    // CASE 1: SCHEDULED ANNOUNCEMENT
    if (isScheduled) {
      const scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled time must be a valid timestamp in the future.' },
          { status: 400 }
        );
      }

      const scheduledRecord = await prisma.scheduledAnnouncement.create({
        data: {
          guildId,
          channelId,
          title: title?.trim() || null,
          content: content?.trim() || null,
          embedPayload: embeds && embeds.length > 0 ? JSON.stringify(embeds) : null,
          mentionType: mentionType || 'NONE',
          mentionRoleId: mentionRoleId || null,
          department: (department || 'GENERAL').toUpperCase(),
          scheduledFor: scheduledDate,
          status: 'PENDING',
          createdBy: session.user.discordId,
        },
      });

      await logDashboardAction({
        guildId,
        action: 'ANNOUNCEMENT_SCHEDULE',
        executorId: session.user.discordId,
        targetId: scheduledRecord.id,
        targetType: 'SCHEDULED_ANNOUNCEMENT',
        details: {
          channelId,
          title: scheduledRecord.title,
          scheduledFor: scheduledDate.toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        scheduled: true,
        record: scheduledRecord,
      });
    }

    // CASE 2: IMMEDIATE DISPATCH
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

    // Save history to Announcement model
    const announcementRecord = await prisma.announcement.create({
      data: {
        guildId,
        title: title || 'HQ Announcement',
        content: content || (embeds && embeds[0]?.description) || 'Announcement',
        department: (department || 'GENERAL').toUpperCase(),
        type: (type || 'GENERAL').toUpperCase(),
        authorId: session.user.discordId,
        channelId,
        messageId: sentMessage.id,
        mentionRole: mentionRoleId || (mentionType === 'EVERYONE' ? 'everyone' : mentionType === 'HERE' ? 'here' : null),
        imageUrl: embeds && embeds[0]?.image?.url ? embeds[0].image.url : null,
      },
    });

    await logDashboardAction({
      guildId,
      action: 'ANNOUNCEMENT_SEND',
      executorId: session.user.discordId,
      targetId: channelId,
      targetType: 'CHANNEL',
      details: {
        announcementId: announcementRecord.id,
        messageId: sentMessage.id,
        title: announcementRecord.title,
        channelId,
        department: announcementRecord.department,
      },
    });

    return NextResponse.json({
      success: true,
      scheduled: false,
      messageId: sentMessage.id,
      announcement: announcementRecord,
    });
  } catch (error: any) {
    console.error('[API] Announcement error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process announcement' },
      { status: 500 }
    );
  }
}
