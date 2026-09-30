import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient, ModerationCase } from '@prisma/client';
import { createNumberedModerationCase } from '../database/repositories/moderation-case.repository';
import { PolicyError } from '../security/policy';
import { createAuditDetails } from './audit-event';
import { DiscordApiError } from './discord-transport';
import {
  isChannelAction,
  ModerationError,
  parseModerationInput,
  type ModerationInput,
} from './moderation-contract';
import type { ModerationAdapter } from './moderation-discord';

export function moderationFailureCode(error: unknown): string {
  if (error instanceof DiscordApiError) return `DISCORD_${error.status}`;
  if (error instanceof PolicyError) return 'NOT_PERMITTED';
  if (error instanceof ModerationError) return error.code;
  return 'INTERNAL_FAILURE';
}
function auditData(
  input: ModerationInput,
  status: string,
  record?: ModerationCase,
  metadata: Record<string, unknown> = {}
) {
  return {
    guildId: input.guildId,
    executorId: input.actorId,
    targetId: input.targetId,
    action: `MODERATION_${input.action}${status === 'PENDING' ? '_ATTEMPT' : ''}`,
    details: createAuditDetails({
      source: input.source,
      targetType: isChannelAction(input.action) ? 'CHANNEL' : 'USER',
      outcome: status === 'SUCCESS' || status === 'PENDING' ? 'SUCCESS' : 'FAILURE',
      metadata: {
        status,
        reason: input.reason,
        caseNumber: record?.caseNumber,
        executionId: record?.id,
        sourceCaseNumber: input.sourceCaseNumber,
        ...metadata,
      },
    }),
  };
}
export async function runModeration(
  database: PrismaClient,
  adapter: ModerationAdapter,
  raw: unknown,
  actorId: string,
  source: 'BOT' | 'DASHBOARD'
) {
  const input = parseModerationInput(raw, actorId, source);
  const guild = await database.guild.findUnique({ where: { id: input.guildId } });
  if (!guild?.botInstalled) throw new ModerationError('GUILD_NOT_REGISTERED', 409);
  const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const replay = (row: ModerationCase) => {
    if (row.requestHash !== requestHash || row.moderatorId !== actorId)
      throw new ModerationError('REQUEST_KEY_CONFLICT', 409);
    return row;
  };
  const previous = await database.moderationCase.findUnique({
    where: { guildId_requestKey: { guildId: input.guildId, requestKey: input.requestKey } },
  });
  if (previous) return replay(previous);
  let effective = input;
  let sourceCase: ModerationCase | null = null;
  try {
    if (input.action === 'ESCALATE') {
      sourceCase = await database.moderationCase.findUnique({
        where: {
          guildId_caseNumber: { guildId: input.guildId, caseNumber: input.sourceCaseNumber! },
        },
      });
      if (
        !sourceCase ||
        sourceCase.targetId !== input.targetId ||
        sourceCase.status !== 'SUCCESS' ||
        !sourceCase.active ||
        !['WARN', 'TIMEOUT'].includes(sourceCase.action) ||
        (sourceCase.action === 'TIMEOUT' && !sourceCase.durationSeconds)
      )
        throw new ModerationError('INVALID_ESCALATION_SOURCE', 409);
      effective = { ...input, action: sourceCase.action === 'WARN' ? 'TIMEOUT' : 'BAN' };
      if (effective.action === 'TIMEOUT' && effective.durationSeconds === 0)
        throw new ModerationError('ESCALATION_REQUIRES_POSITIVE_DURATION');
    }
    await adapter.authorize(effective);
  } catch (error) {
    await database.auditLog.create({
      data: auditData(input, 'FAILURE', undefined, { errorCode: moderationFailureCode(error) }),
    });
    throw error;
  }
  const reserved = await database.$transaction(async transaction => {
    const lockKey = `moderation-operation:${input.guildId}:${input.targetId}`;
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
    const duplicate = await transaction.moderationCase.findUnique({
      where: { guildId_requestKey: { guildId: input.guildId, requestKey: input.requestKey } },
    });
    if (duplicate) return { record: replay(duplicate), fresh: false };
    const pending = await transaction.moderationCase.findFirst({
      where: {
        guildId: input.guildId,
        targetId: input.targetId,
        status: { in: ['PENDING', 'UNKNOWN'] },
      },
    });
    if (pending) throw new ModerationError('TARGET_REQUIRES_RECONCILIATION', 409);
    if (sourceCase) {
      const current = await transaction.moderationCase.findFirst({
        where: { id: sourceCase.id, guildId: input.guildId, active: true, status: 'SUCCESS' },
      });
      if (!current) throw new ModerationError('ESCALATION_ALREADY_APPLIED', 409);
    }
    const record = await createNumberedModerationCase(transaction, {
      guildId: input.guildId,
      targetId: input.targetId,
      moderatorId: actorId,
      action: effective.action,
      reason: input.reason,
      evidence: JSON.stringify(input.evidence),
      durationSeconds: ['TIMEOUT', 'SLOWMODE'].includes(effective.action)
        ? input.durationSeconds
        : null,
      status: 'PENDING',
      requestKey: input.requestKey,
      requestHash,
    });
    await transaction.auditLog.create({ data: auditData(input, 'PENDING', record) });
    return { record, fresh: true };
  });
  if (!reserved.fresh) return reserved.record;
  const record = reserved.record;
  let started = false;
  let details: Record<string, unknown> = { sourceCaseNumber: input.sourceCaseNumber };
  const finish = (status: string, errorCode: string | null) =>
    database.$transaction(async (transaction: Prisma.TransactionClient) => {
      const updated = await transaction.moderationCase.update({
        where: { guildId_caseNumber: { guildId: input.guildId, caseNumber: record.caseNumber } },
        data: {
          status,
          active:
            status === 'SUCCESS' &&
            !['UNBAN', 'UNLOCK'].includes(effective.action) &&
            !(effective.action === 'TIMEOUT' && effective.durationSeconds === 0),
          errorCode,
          details: JSON.stringify(details),
        },
      });
      if (
        status === 'SUCCESS' &&
        (effective.action === 'UNBAN' ||
          (effective.action === 'TIMEOUT' && effective.durationSeconds === 0))
      ) {
        await transaction.moderationCase.updateMany({
          where: {
            guildId: input.guildId,
            targetId: input.targetId,
            action: effective.action === 'UNBAN' ? 'BAN' : 'TIMEOUT',
          },
          data: { active: false },
        });
      }
      if (status === 'SUCCESS' && sourceCase)
        await transaction.moderationCase.updateMany({
          where: { id: sourceCase.id, guildId: input.guildId, targetId: input.targetId },
          data: { active: false },
        });
      await transaction.auditLog.create({
        data: auditData(input, status, record, {
          ...details,
          errorCode,
          effectiveAction: effective.action,
        }),
      });
      return updated;
    });
  try {
    // Re-read authority/channel overwrites after reserving the target to limit stale decisions.
    const snapshot = await adapter.authorize(effective);
    const lastLock = await database.moderationCase.findFirst({
      where: {
        guildId: input.guildId,
        targetId: input.targetId,
        status: 'SUCCESS',
        action: { in: ['LOCK', 'UNLOCK'] },
      },
      orderBy: { caseNumber: 'desc' },
    });
    const priorLock =
      lastLock?.action === 'LOCK' && lastLock.details
        ? (JSON.parse(lastLock.details) as Record<string, unknown>)
        : null;
    const plan = await adapter.prepare(effective, snapshot, priorLock);
    details = { ...details, ...plan.details };
    await database.moderationCase.update({
      where: { guildId_caseNumber: { guildId: input.guildId, caseNumber: record.caseNumber } },
      data: { details: JSON.stringify(details) },
    });
    started = true;
    await plan.perform();
  } catch (error) {
    const definitive =
      !started ||
      (error instanceof DiscordApiError &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 408);
    try {
      return await finish(definitive ? 'FAILURE' : 'UNKNOWN', moderationFailureCode(error));
    } catch {
      throw new ModerationError('AUDIT_OR_STATE_UNAVAILABLE_VERIFY_BEFORE_RETRY', 503);
    }
  }
  try {
    return await finish('SUCCESS', null);
  } catch {
    // Discord cannot participate in a database transaction. Never replay an uncertain punishment.
    try {
      await finish('UNKNOWN', 'DB_FINALIZE_FAILED');
    } catch {
      /* Durable PENDING record remains and blocks new attempts. */
    }
    throw new ModerationError('AUDIT_OR_STATE_UNAVAILABLE_VERIFY_BEFORE_RETRY', 503);
  }
}
