import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireGuildAccess } from '@/lib/permissions';
import { TicketDomainService } from '@/lib/ticket-domain';
import { authOptions } from '@/lib/auth';
import { withMutation } from '@/lib/mutation';
import { createGuildTextChannel, deleteGuildChannel, fetchBotRoleContext, fetchGuildMember, fetchGuildChannels, sendChannelMessage } from '@/lib/discord';
import { getServerSession } from 'next-auth';
import { TicketCreationOutcomeUnknownError, TicketOrphanedChannelError } from '../../../../../src/database/repositories/ticket.repository';
import { hasPermission, permission } from '../../../../../src/security/policy';
import { memberPermissions } from '@/lib/capabilities';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') || 'ALL'; // ALL | OPEN | CLAIMED | CLOSED | MY_TICKETS | UNASSIGNED
  const categoryFilter = searchParams.get('category') || '';
  const query = searchParams.get('q')?.toLowerCase() || '';
  const guildId = searchParams.get('guildId');

  if (!guildId) {
    return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  }

  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
  }

  try {
    const currentUserId = auth.session!.user.discordId;
    const whereClause: { guildId: string; status?: string; category?: string; claimerId?: string | null } = { guildId };

    if (statusFilter === 'OPEN') {
      whereClause.status = 'OPEN';
    } else if (statusFilter === 'CLAIMED') {
      whereClause.status = 'CLAIMED';
    } else if (statusFilter === 'CLOSED') {
      whereClause.status = 'CLOSED';
    } else if (statusFilter === 'MY_TICKETS') {
      whereClause.claimerId = currentUserId;
    } else if (statusFilter === 'UNASSIGNED') {
      whereClause.status = 'OPEN';
      whereClause.claimerId = null;
    }

    if (categoryFilter) {
      whereClause.category = categoryFilter;
    }

    const tickets = await TicketDomainService.list(guildId, {
      status: whereClause.status,
      category: whereClause.category,
      claimerId: whereClause.claimerId,
    });

    let filtered = tickets;
    if (query) {
      filtered = tickets.filter(
        (t) =>
          t.subject.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query) ||
          t.ticketNumber.toString().includes(query) ||
          t.openerId.includes(query)
      );
    }

    // Correlate with members to get opener / claimer names
    const userIds = new Set<string>();
    filtered.forEach((t) => {
      if (t.openerId) userIds.add(t.openerId);
      if (t.claimerId) userIds.add(t.claimerId);
      if (t.closedById) userIds.add(t.closedById);
    });

    const members = await prisma.guildMember.findMany({
      where: {
        discordId: { in: Array.from(userIds) },
        ...(guildId ? { guildId } : {}),
      },
    });
    const memberMap = new Map(members.map((m) => [m.discordId, m]));

    const enriched = filtered.map((t) => ({
      ...t,
      openerName: memberMap.get(t.openerId)?.displayName || t.openerId,
      claimerName: t.claimerId ? memberMap.get(t.claimerId)?.displayName || t.claimerId : null,
      closedByName: t.closedById ? memberMap.get(t.closedById)?.displayName || t.closedById : null,
    }));

    return NextResponse.json({
      tickets: enriched,
      total: enriched.length,
    });
  } catch (error: unknown) {
    console.error('Failed to fetch tickets:', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get('guildId');
  const session = await getServerSession(authOptions);
  const actorId = session?.user?.discordId;
  if (!guildId || !actorId) return NextResponse.json({ error: 'Guild and actor are required.' }, { status: 400 });
  const creationKey = request.headers.get('idempotency-key') || '';
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(creationKey)) return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((key) => key !== 'category'))
      return NextResponse.json({ error: 'Only a ticket category may be supplied.' }, { status: 400 });
    const category = body.category ?? 'GENERAL';
    if (typeof category !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(category))
      return NextResponse.json({ error: 'Invalid ticket category.' }, { status: 400 });

    const [module, settings, requester, context, channels] = await Promise.all([
      prisma.guildModule.findUnique({ where: { guildId_module: { guildId, module: 'tickets' } } }),
      prisma.guildSettings.findUnique({ where: { guildId } }),
      fetchGuildMember(guildId, actorId),
      fetchBotRoleContext(guildId),
      fetchGuildChannels(guildId),
    ]);
    if (module && !module.enabled) return NextResponse.json({ error: 'Tickets are disabled for this server.' }, { status: 403 });
    const botPermissions = memberPermissions(context.botMember, context);
    if (!hasPermission(botPermissions, permission(4))) return NextResponse.json({ error: 'Bot cannot manage ticket channels.' }, { status: 502 });
    const botId = context.botMember.user?.id;
    if (!botId) return NextResponse.json({ error: 'Bot identity is unavailable for ticket channel permissions.' }, { status: 502 });

    let parentId: string | undefined;
    if (settings?.ticketCategoryId) {
      const parent = channels.find((channel) => channel.id === settings.ticketCategoryId && channel.guild_id === guildId && channel.type === 4);
      if (!parent) return NextResponse.json({ error: 'Configured ticket category is missing or belongs to another server.' }, { status: 409 });
      parentId = parent.id;
    }
    const validRoleIds = new Set(context.roles.map((role) => role.id));
    const staffRoles = [settings?.adminRoleId, settings?.modRoleId, settings?.supportRoleId, settings?.staffRoleId]
      .filter((roleId): roleId is string => Boolean(roleId && roleId !== guildId && validRoleIds.has(roleId)));
    const overwrites = [
      { id: guildId, type: 0, allow: '0', deny: '1024' },
      { id: actorId, type: 1, allow: '117760', deny: '0' },
      { id: botId, type: 1, allow: '52240', deny: '0' },
      ...staffRoles.map((id) => ({ id, type: 0, allow: '117760', deny: '0' })),
    ];

    const result = await TicketDomainService.create({
      guildId, actorId: requester.user?.id || actorId, authorized: true, creationKey,
      category, subject: `Support Ticket (${category})`, source: 'DASHBOARD',
    }, async (ticketNumber) => {
      const topic = `KRAXX Support Ticket #${String(ticketNumber).padStart(4, '0')} | Opener: ${actorId} | Category: ${category} | Request: ${creationKey}`;
      let channel: Awaited<ReturnType<typeof createGuildTextChannel>>;
      try {
        channel = await createGuildTextChannel(guildId, {
          name: `ticket-${String(ticketNumber).padStart(4, '0')}`,
          topic,
          ...(parentId ? { parent_id: parentId } : {}),
          permission_overwrites: overwrites,
        });
      } catch (creationError) {
        const status = Number((creationError as { status?: number }).status);
        if (status >= 400 && status < 500) throw creationError;
        let candidates: Awaited<ReturnType<typeof fetchGuildChannels>>;
        try { candidates = await fetchGuildChannels(guildId); }
        catch { throw new TicketCreationOutcomeUnknownError(creationKey); }
        const possible = candidates.find((item) => item.guild_id === guildId && item.type === 0 && item.topic === topic);
        if (possible) {
          try { await deleteGuildChannel(guildId, possible.id); }
          catch { throw new TicketOrphanedChannelError(possible.id); }
          throw creationError;
        }
        throw new TicketCreationOutcomeUnknownError(creationKey);
      }
      try {
        await sendChannelMessage(channel.id, `Support Ticket #${ticketNumber} opened by ${requester.nick || requester.user?.username || actorId}.`, [{
          title: `SUPPORT TICKET #${String(ticketNumber).padStart(4, '0')}`,
          description: 'Please describe your request here. Server staff can manage this ticket from the dashboard.',
          color: 0xD4AF37,
          fields: [{ name: 'Category', value: category, inline: true }, { name: 'Status', value: 'OPEN', inline: true }],
        }]);
      } catch (error) {
        try { await deleteGuildChannel(guildId, channel.id); }
        catch { throw new TicketOrphanedChannelError(channel.id); }
        throw error;
      }
      return channel;
    }, (channelId) => deleteGuildChannel(guildId, channelId));

    return NextResponse.json({ success: true, created: result.created, ticket: result.ticket }, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof TicketCreationOutcomeUnknownError) {
      return NextResponse.json({ error: 'Discord did not confirm whether a ticket channel was created. Do not retry until staff inspect the request.', code: 'TICKET_CREATE_OUTCOME_UNKNOWN', requestId: error.creationKey, auditRecorded: error.auditPersisted }, { status: 503 });
    }
    if (error instanceof TicketOrphanedChannelError) {
      return NextResponse.json({ error: 'Ticket channel exists but needs manual recovery.', code: 'TICKET_ORPHANED_CHANNEL', channelId: error.channelId, auditRecorded: error.auditPersisted }, { status: 503 });
    }
    console.error('Ticket creation failed; no successful result is reported.');
    return NextResponse.json({ error: 'Ticket creation failed. No success is reported; verify before retrying.' }, { status: 502 });
  }
}

export const POST = withMutation('MANAGE_TICKETS', handlePOST);
