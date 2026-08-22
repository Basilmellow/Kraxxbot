import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendChannelMessage } from '@/lib/discord';
import { requireTier, RoleTier } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const polls = await prisma.poll.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ polls, total: polls.length });
  } catch (error: any) {
    console.error('Failed to fetch polls:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch polls' }, { status: 500 });
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
    const { question, options = [], channelId, isAnonymous = false, durationHours = 24 } = body;

    if (!question || options.length < 2 || !channelId) {
      return NextResponse.json({ error: 'Question, at least 2 options, and channel are required.' }, { status: 400 });
    }

    const currentUserId = session!.user.discordId;
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    // Format embed for Discord channel
    const optionsText = options.map((opt: string, i: number) => `**${i + 1}.** ${opt}`).join('\n\n');
    const embedPayload = {
      title: `📊 COMMUNITY POLL: ${question}`,
      description: optionsText,
      color: 0x00f0ff,
      footer: { text: `Poll created by ${session!.user.name} • Closes in ${durationHours}h` },
      timestamp: new Date().toISOString(),
    };

    const sentMessage = await sendChannelMessage(channelId, undefined, [embedPayload]).catch(() => null);

    const poll = await prisma.poll.create({
      data: {
        question: question.trim(),
        options: JSON.stringify(options.map((opt: string) => ({ text: opt, votes: 0 }))),
        channelId,
        messageId: sentMessage?.id || null,
        isAnonymous: Boolean(isAnonymous),
        expiresAt,
        status: 'ACTIVE',
        createdBy: currentUserId,
      },
    });

    await logDashboardAction({
      action: 'POLL_CREATE',
      executorId: currentUserId,
      targetId: poll.id,
      targetType: 'POLL',
      details: { question, channelId },
    });

    return NextResponse.json({ success: true, poll });
  } catch (error: any) {
    console.error('Failed to create poll:', error);
    return NextResponse.json({ error: error.message || 'Failed to create poll' }, { status: 500 });
  }
}
