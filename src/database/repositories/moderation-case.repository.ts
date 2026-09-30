import type { Prisma } from '@prisma/client';

export type NumberedModerationCaseInput = {
  guildId: string;
  targetId: string;
  moderatorId: string;
  moderatorTag?: string | null;
  action: string;
  reason?: string | null;
  evidence?: string | null;
  durationSeconds?: number | null;
  targetTag?: string | null;
  status?: string;
  requestKey?: string;
  requestHash?: string;
  details?: string;
};

export function normalizeModerationDuration(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 2_419_200) {
    throw new Error('Moderation duration must be an integer from 0 to 2419200 seconds.');
  }
  return value as number;
}

/** Must be called inside the caller's transaction. The transaction-scoped 64-bit lock
 * serializes case-number allocation within a guild and releases on commit or rollback.
 */
export async function createNumberedModerationCase(
  transaction: Pick<Prisma.TransactionClient, '$executeRaw' | 'moderationCase'>,
  input: NumberedModerationCaseInput,
) {
  const durationSeconds = normalizeModerationDuration(input.durationSeconds);
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.guildId}, 0))`;
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
