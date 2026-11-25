"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeModerationDuration = normalizeModerationDuration;
exports.createNumberedModerationCase = createNumberedModerationCase;
function normalizeModerationDuration(value) {
    if (value === undefined || value === null)
        return null;
    if (!Number.isSafeInteger(value) || value < 0 || value > 2_419_200) {
        throw new Error('Moderation duration must be an integer from 0 to 2419200 seconds.');
    }
    return value;
}
/** Must be called inside the caller's transaction. The transaction-scoped 64-bit lock
 * serializes case-number allocation within a guild and releases on commit or rollback.
 */
async function createNumberedModerationCase(transaction, input) {
    const durationSeconds = normalizeModerationDuration(input.durationSeconds);
    await transaction.$executeRaw `SELECT pg_advisory_xact_lock(hashtextextended(${input.guildId}, 0))`;
    const lastCase = await transaction.moderationCase.findFirst({
        where: { guildId: input.guildId },
        orderBy: { caseNumber: 'desc' },
        select: { caseNumber: true },
    });
    const caseNumber = (lastCase?.caseNumber ?? 0) + 1;
    return transaction.moderationCase.create({
        data: {
            guildId: input.guildId,
            targetId: input.targetId,
            targetTag: input.targetTag ?? null,
            moderatorId: input.moderatorId,
            moderatorTag: input.moderatorTag ?? null,
            action: input.action,
            reason: input.reason ?? null,
            evidence: input.evidence ?? null,
            durationSeconds,
            caseNumber,
            status: input.status ?? 'SUCCESS',
            active: !input.status || input.status === 'SUCCESS',
            requestKey: input.requestKey,
            requestHash: input.requestHash,
            details: input.details,
        },
    });
}
