import { prisma } from '../client';
import { GuildMember as DbGuildMember } from '@prisma/client';
import { createAuditDetails } from '../../services/audit-event';

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
    return prisma.$transaction(async (transaction) => {
      const changed = await transaction.guildMember.updateMany({
        where: { guildId, discordId, isVerified: false },
        data: { isVerified: true, verifiedAt: new Date() },
      });
      const member = await transaction.guildMember.findUnique({ where: { guildId_discordId: { guildId, discordId } } });
      if (!member) throw new Error('Verification member is no longer registered.');
      // A concurrent verifier already committed the state and its canonical audit.
      if (!changed.count) return member;
      await transaction.guildMemberVerification.create({
        data: {
          guildId,
          discordId,
          guildMemberId: member.id,
          status: 'SUCCESS',
          notes: 'Membership verified successfully',
        },
      });
      await transaction.auditLog.create({
        data: {
          guildId,
          executorId: discordId,
          targetId: discordId,
          action: 'MEMBER_VERIFIED',
          details: createAuditDetails({
            source: 'BOT',
            targetType: 'MEMBER',
            outcome: 'SUCCESS',
            metadata: { verificationId: member.id },
          }),
        },
      });
      return member;
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
