import { prisma } from '../client';
import { Ticket, TicketPanel } from '@prisma/client';

export class TicketRepository {
  // ── Ticket Panels ──────────────────────────────────────────────

  static async createPanel(data: {
    guildId: string;
    title: string;
    description: string;
    category?: string;
    channelId: string;
    messageId?: string;
  }): Promise<TicketPanel> {
    return prisma.ticketPanel.create({
      data: {
        guildId: data.guildId,
        title: data.title,
        description: data.description,
        category: data.category || 'GENERAL',
        channelId: data.channelId,
        messageId: data.messageId || null,
      },
    });
  }

  static async findPanelById(id: string, guildId?: string): Promise<TicketPanel | null> {
    return prisma.ticketPanel.findFirst({
      where: {
        id,
        ...(guildId ? { guildId } : {}),
      },
    });
  }

  static async findPanelsByGuild(guildId: string): Promise<TicketPanel[]> {
    return prisma.ticketPanel.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async deletePanel(id: string, guildId?: string): Promise<boolean> {
    const res = await prisma.ticketPanel.deleteMany({
      where: {
        id,
        ...(guildId ? { guildId } : {}),
      },
    });
    return res.count > 0;
  }

  // ── Tickets ────────────────────────────────────────────────────

  static async getNextTicketNumber(guildId: string): Promise<number> {
    const highest = await prisma.ticket.findFirst({
      where: { guildId },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true },
    });
    return (highest?.ticketNumber || 0) + 1;
  }

  static async createTicket(data: {
    guildId: string;
    channelId: string;
    openerId: string;
    category?: string;
    subject: string;
    priority?: string;
  }): Promise<Ticket> {
    const ticketNumber = await this.getNextTicketNumber(data.guildId);

    return prisma.ticket.create({
      data: {
        ticketNumber,
        guildId: data.guildId,
        channelId: data.channelId,
        openerId: data.openerId,
        category: data.category || 'GENERAL',
        subject: data.subject,
        priority: data.priority || 'MEDIUM',
        status: 'OPEN',
      },
    });
  }

  static async findByChannelId(channelId: string): Promise<Ticket | null> {
    return prisma.ticket.findUnique({
      where: { channelId },
    });
  }

  static async findById(id: string, guildId?: string): Promise<Ticket | null> {
    return prisma.ticket.findFirst({
      where: {
        id,
        ...(guildId ? { guildId } : {}),
      },
    });
  }

  static async findManyByGuild(
    guildId: string,
    filters?: {
      status?: string;
      category?: string;
      openerId?: string;
      claimerId?: string;
      limit?: number;
    }
  ): Promise<Ticket[]> {
    return prisma.ticket.findMany({
      where: {
        guildId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.category ? { category: filters.category } : {}),
        ...(filters?.openerId ? { openerId: filters.openerId } : {}),
        ...(filters?.claimerId ? { claimerId: filters.claimerId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });
  }

  static async updateTicket(
    channelId: string,
    data: {
      status?: string;
      claimerId?: string | null;
      closedById?: string | null;
      transcriptUrl?: string | null;
      reason?: string | null;
      staffNotes?: string | null;
      closedAt?: Date | null;
    }
  ): Promise<Ticket> {
    return prisma.ticket.update({
      where: { channelId },
      data,
    });
  }

  static async deleteTicket(channelId: string, guildId?: string): Promise<boolean> {
    const res = await prisma.ticket.deleteMany({
      where: {
        channelId,
        ...(guildId ? { guildId } : {}),
      },
    });
    return res.count > 0;
  }
}
