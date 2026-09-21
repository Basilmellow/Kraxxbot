import { prisma } from '../client';
import { GuildMember as DbGuildMember } from '@prisma/client';

export class MemberRepository {
  static async findByDiscordId(guildId: string, discordId: string): Promise<DbGuildMember | null> {
    return prisma.guildMember.findUnique({
      where: {
        guildId_discordId: { guildId, discordId },
      },
    });
  }

  static async upsertMember(data: {
    guildId: string;
    discordId: string;
    username: string;
    displayName: string;
    avatar?: string | null;
    roleTier?: string;
  }): Promise<DbGuildMember> {
    return prisma.guildMember.upsert({
      where: {
        guildId_discordId: { guildId: data.guildId, discordId: data.discordId },
      },
      update: {
        username: data.username,
        displayName: data.displayName,
        avatar: data.avatar ?? undefined,
        roleTier: data.roleTier,
      },
      create: {
        guildId: data.guildId,
        discordId: data.discordId,
        username: data.username,
        displayName: data.displayName,
        avatar: data.avatar ?? null,
        roleTier: data.roleTier || 'USER',
        isVerified: false,
      },
    });
  }

  static async markVerified(guildId: string, discordId: string): Promise<DbGuildMember> {
    return prisma.guildMember.update({
      where: {
        guildId_discordId: { guildId, discordId },
      },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
  }

  static async logVerificationAttempt(
    guildId: string,
    discordId: string,
    status: 'SUCCESS' | 'FAILED' | 'ALREADY_VERIFIED',
    notes?: string
  ) {
    return prisma.guildMemberVerification.create({
      data: {
        guildId,
        discordId,
        status,
        notes,
      },
    });
  }
}
