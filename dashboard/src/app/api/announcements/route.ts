import { createHash } from 'node:crypto';
import { validateChannel } from '@/lib/destinations';
import { withMutation } from '@/lib/mutation';
// KRAXX Operations Platform — Announcements API
import { logDashboardAction } from '@/lib/audit';
import { authOptions } from '@/lib/auth';
import { fetchGuildChannels, fetchGuildRoles } from '@/lib/discord';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';

async function handlePOST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      bannerUrl,
      scheduledFor, // ISO date string if scheduled
    } = body;

    if (!channelId) {
      return NextResponse.json({ error: 'Target channelId is required' }, { status: 400 });
    }

    const isScheduled = Boolean(scheduledFor);
    if (mentionType !== undefined && !['NONE', 'EVERYONE', 'HERE', 'ROLE'].includes(mentionType))
      return NextResponse.json({ error: 'Unsupported mention type.' }, { status: 400 });
    if (bannerUrl !== undefined && (typeof bannerUrl !== 'string' || bannerUrl.length > 2048 || !/^https:\/\//i.test(bannerUrl)))
      return NextResponse.json({ error: 'Banner URL must be a valid HTTPS URL.' }, { status: 400 });
    const deliveryEmbeds: object[] = Array.isArray(embeds) ? embeds : bannerUrl ? [{ image: { url: bannerUrl } }] : [];
    if (deliveryEmbeds.length > 10 || JSON.stringify(deliveryEmbeds).length > 60_000)
      return NextResponse.json({ error: 'Announcement embeds exceed Discord payload limits.' }, { status: 400 });
    const requestKey = request.headers.get('idempotency-key');
    if (!requestKey || !/^[a-zA-Z0-9_-]{16,128}$/.test(requestKey)) {
      return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
    }

    const guildId = body.guildId || request.nextUrl.searchParams.get('guildId');
    if (!guildId) {
      return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
    }

    const auth = await requireGuildAccess(guildId);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
    }
    await validateChannel(guildId, channelId);
    const channels = await fetchGuildChannels(guildId);
    if (!channels.some((channel) => channel.id === channelId)) {
      return NextResponse.json({ error: 'Channel does not belong to this guild.' }, { status: 400 });
    }
    if (mentionType === 'ROLE') {
      const roles = await fetchGuildRoles(guildId);
      if (!mentionRoleId || !roles.some((role) => role.id === mentionRoleId))
        return NextResponse.json({ error: 'Mention role does not belong to this guild.' }, { status: 400 });
    }

    // Both immediate and scheduled sends are persisted before delivery and
    // processed by the existing durable scheduler. Retries with the same key
    // return the already-created delivery rather than enqueueing a duplicate.
    let scheduledDate: Date;
    if (isScheduled) {
      scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled time must be a valid timestamp in the future.' },
          { status: 400 }
        );
      }

    } else scheduledDate = new Date();

    const idempotencyKey = createHash('sha256').update(`${guildId}:${session.user.discordId}:${requestKey}`).digest('hex');
    let scheduledRecord;
    try {
      scheduledRecord = await prisma.scheduledAnnouncement.create({
        data: {
          guildId, channelId, title: title?.trim() || null, content: content?.trim() || null,
          embedPayload: deliveryEmbeds.length ? JSON.stringify(deliveryEmbeds) : null,
          mentionType: mentionType || 'NONE', mentionRoleId: mentionRoleId || null,
          department: (department || 'GENERAL').toUpperCase(), announcementType: (type || 'GENERAL').toUpperCase(), scheduledFor: scheduledDate,
          status: 'PENDING', createdBy: session.user.discordId, idempotencyKey,
        },
      });
    } catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'P2002') throw error;
      scheduledRecord = await prisma.scheduledAnnouncement.findUnique({ where: { idempotencyKey } });
      if (!scheduledRecord || scheduledRecord.guildId !== guildId || scheduledRecord.createdBy !== session.user.discordId)
        return NextResponse.json({ error: 'Idempotency key conflicts with another request.' }, { status: 409 });
      if (scheduledRecord.channelId !== channelId || scheduledRecord.title !== (title?.trim() || null)
        || scheduledRecord.content !== (content?.trim() || null)
        || scheduledRecord.embedPayload !== (deliveryEmbeds.length ? JSON.stringify(deliveryEmbeds) : null)
        || scheduledRecord.announcementType !== (type || 'GENERAL').toUpperCase()
        || scheduledRecord.mentionType !== (mentionType || 'NONE') || scheduledRecord.mentionRoleId !== (mentionRoleId || null))
        return NextResponse.json({ error: 'Idempotency key was already used for a different announcement.' }, { status: 409 });
    }

    await logDashboardAction({
      guildId,
      action: isScheduled ? 'ANNOUNCEMENT_SCHEDULE' : 'ANNOUNCEMENT_ENQUEUE',
      executorId: session.user.discordId,
      targetId: scheduledRecord.id,
      targetType: 'SCHEDULED_ANNOUNCEMENT',
      details: { channelId, title: scheduledRecord.title, scheduledFor: scheduledDate.toISOString(), idempotencyKey },
    });

    return NextResponse.json({ success: true, scheduled: isScheduled, queued: true, record: scheduledRecord }, { status: 202 });
  } catch {
    console.error('[API] Announcement request failed.');
    return NextResponse.json(
      { error: 'Failed to process announcement' },
      { status: 500 }
    );
  }
}

export const POST = withMutation('MANAGE_ANNOUNCEMENTS', handlePOST);
