import type { Meeting, Prisma } from '@prisma/client';

type MeetingAnnouncementStage = 'SCHEDULED' | 'STARTED' | 'CONCLUDED';

export function meetingAnnouncementIdempotencyKey(stage: MeetingAnnouncementStage, meetingId: string) {
  const stagePrefix = stage === 'SCHEDULED' ? 'ms' : stage === 'STARTED' ? 'mt' : 'mc';
  return `${stagePrefix}-${meetingId}`;
}

export function meetingCreateIdempotencyKey(requestId: string, guildId: string, actorId: string) {
  return `mc-${requestId.replaceAll('-', '')}:${guildId}:${actorId}`;
}

export async function queueMeetingAnnouncement(
  tx: Prisma.TransactionClient,
  meeting: Meeting,
  stage: MeetingAnnouncementStage,
  createdBy: string,
  now = new Date(),
  idempotency?: { key: string; announcementId?: string },
) {
  if (!meeting.locationChannelId) throw new Error('MEETING_CHANNEL_REQUIRED');

  const heading = stage === 'SCHEDULED' ? 'Meeting scheduled' : stage === 'STARTED' ? 'Meeting started' : 'Meeting concluded';
  const timestamp = Math.floor(meeting.startTime.getTime() / 1000);
  const content = [
    `**${heading}: ${meeting.title}**`,
    `Department: ${meeting.department}`,
    `When: <t:${timestamp}:F>`,
    `Agenda: ${meeting.agenda.slice(0, 1200)}`,
  ].join('\n');

  return tx.scheduledAnnouncement.create({
    data: {
      ...(idempotency?.announcementId ? { id: idempotency.announcementId } : {}),
      guildId: meeting.guildId,
      channelId: meeting.locationChannelId,
      title: `${heading}: ${meeting.title}`.slice(0, 200),
      content: content.slice(0, 1900),
      mentionType: 'NONE',
      department: meeting.department,
      announcementType: 'MEETING',
      scheduledFor: now,
      createdBy,
      idempotencyKey: idempotency?.key || meetingAnnouncementIdempotencyKey(stage, meeting.id),
    },
  });
}
