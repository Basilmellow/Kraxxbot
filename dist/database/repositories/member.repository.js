"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberRepository = void 0;
const client_1 = require("../client");
const audit_event_1 = require("../../services/audit-event");
class MemberRepository {
    static async findByDiscordId(guildId, discordId) {
        return client_1.prisma.guildMember.findUnique({
            where: {
                guildId_discordId: { guildId, discordId },
            },
        });
    }
    static async upsertMember(data) {
        return client_1.prisma.guildMember.upsert({
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
    static async markVerified(guildId, discordId) {
        return client_1.prisma.$transaction(async (transaction) => {
            const changed = await transaction.guildMember.updateMany({
                where: { guildId, discordId, isVerified: false },
                data: { isVerified: true, verifiedAt: new Date() },
            });
            const member = await transaction.guildMember.findUnique({ where: { guildId_discordId: { guildId, discordId } } });
            if (!member)
                throw new Error('Verification member is no longer registered.');
            // A concurrent verifier already committed the state and its canonical audit.
            if (!changed.count)
                return member;
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
                    details: (0, audit_event_1.createAuditDetails)({
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
    static async logVerificationAttempt(guildId, discordId, status, notes) {
        return client_1.prisma.guildMemberVerification.create({
            data: {
                guildId,
                discordId,
                status,
                notes,
            },
        });
    }
}
exports.MemberRepository = MemberRepository;
