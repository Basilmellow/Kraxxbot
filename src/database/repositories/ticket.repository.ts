import { prisma } from '../client';
import { Ticket, TicketPanel } from '@prisma/client';

export class TicketRepository {
  // --- Ticket Panels ---
  static async createPanel(data: {
    title: string;
    description: string;
    category?: string;
    channelId: string;
    messageId?: string;
  }): Promise<TicketPanel> {
    return prisma.ticketPanel.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category || 'GENERAL',
        channelId: data.channelId,
        messageId: data.messageId || null,
      },
    });
  }

  static async findPanelById(id: string): Promise<TicketPanel | null> {
    return prisma.ticketPanel.findUnique({
      where: { id },
    });
  }

  static async findAllPanels(): Promise<TicketPanel[]> {
    return prisma.ticketPanel.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  static async deletePanel(id: string): Promise<boolean> {
    const res = await prisma.ticketPanel.deleteMany({
      where: { id },
    });
    return res.count > 0;
  }

  // --- Tickets ---
  static async getNextTicketNumber(): Promise<number> {
    const highest = await prisma.ticket.findFirst({
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
  }): Promise<Ticket> {
    const ticketNumber = await this.getNextTicketNumber();

    return prisma.ticket.create({
      data: {
        ticketNumber,
        guildId: data.guildId,
        channelId: data.channelId,
        openerId: data.openerId,
        category: data.category || 'GENERAL',
        subject: data.subject,
        status: 'OPEN',
      },
    });
  }

  static async findByChannelId(channelId: string): Promise<Ticket | null> {
    return prisma.ticket.findUnique({
      where: { channelId },
    });
  }

  static async findById(id: string): Promise<Ticket | null> {
    return prisma.ticket.findUnique({
      where: { id },
    });
  }

  static async updateTicket(
    channelId: string,
    data: {
      status?: string;
      claimerId?: string | null;
      reason?: string | null;
      closedAt?: Date | null;
    }
  ): Promise<Ticket> {
    return prisma.ticket.update({
      where: { channelId },
      data,
    });
  }

  static async deleteTicket(channelId: string): Promise<boolean> {
    const res = await prisma.ticket.deleteMany({
      where: { channelId },
    });
    return res.count > 0;
  }
}
