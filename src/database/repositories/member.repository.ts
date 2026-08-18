import { prisma } from '../client';
import { Member } from '@prisma/client';

export class MemberRepository {
  static async findByDiscordId(discordId: string): Promise<Member | null> {
    return prisma.member.findUnique({
      where: { discordId },
    });
  }

  static async upsertMember(data: {
    discordId: string;
    username: string;
    displayName: string;
    roleTier?: string;
    department?: string | null;
  }): Promise<Member> {
    return prisma.member.upsert({
      where: { discordId: data.discordId },
      update: {
        username: data.username,
        displayName: data.displayName,
        roleTier: data.roleTier,
        department: data.department,
      },
      create: {
        discordId: data.discordId,
        username: data.username,
        displayName: data.displayName,
        roleTier: data.roleTier || 'USER',
        department: data.department || null,
        isVerified: false,
      },
    });
  }

  static async markVerified(discordId: string): Promise<Member> {
    return prisma.member.update({
      where: { discordId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
  }

  static async updateDepartment(discordId: string, department: string | null): Promise<Member> {
    return prisma.member.update({
      where: { discordId },
      data: { department },
    });
  }

  static async logVerificationAttempt(
    discordId: string,
    status: 'SUCCESS' | 'FAILED' | 'ALREADY_VERIFIED',
    notes?: string
  ) {
    return prisma.verificationLog.create({
      data: {
        discordId,
        status,
        notes,
      },
    });
  }
}
