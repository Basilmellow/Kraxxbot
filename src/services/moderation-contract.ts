export const MODERATION_ACTIONS = [
  'WARN',
  'TIMEOUT',
  'KICK',
  'BAN',
  'UNBAN',
  'PURGE',
  'SLOWMODE',
  'LOCK',
  'UNLOCK',
  'ESCALATE',
] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];
export type ModerationInput = {
  guildId: string;
  actorId: string;
  targetId: string;
  action: ModerationAction;
  requestKey: string;
  reason: string;
  durationSeconds: number;
  count: number;
  evidence: string[];
  sourceCaseNumber?: number;
  source: 'BOT' | 'DASHBOARD';
};
export class ModerationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 400
  ) {
    super(code);
  }
}
export const isChannelAction = (action: string) =>
  ['PURGE', 'SLOWMODE', 'LOCK', 'UNLOCK'].includes(action);
export function validateModerationEvidence(guildId: string, value: unknown): string[] {
  if (!/^\d{17,20}$/.test(guildId)) throw new ModerationError('INVALID_GUILD');
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 5) throw new ModerationError('INVALID_EVIDENCE');
  return value.map(item => {
    if (typeof item !== 'string' || item.length > 300)
      throw new ModerationError('INVALID_EVIDENCE');
    let url: URL;
    try {
      url = new URL(item);
    } catch {
      throw new ModerationError('INVALID_EVIDENCE');
    }
    if (
      url.origin !== 'https://discord.com' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !new RegExp(`^/channels/${guildId}/[0-9]{17,20}/[0-9]{17,20}$`).test(url.pathname)
    )
      throw new ModerationError('INVALID_EVIDENCE');
    return url.toString();
  });
}
export function parseModerationInput(
  value: unknown,
  actorId: string,
  source: 'BOT' | 'DASHBOARD'
): ModerationInput {
  if (!value || typeof value !== 'object') throw new ModerationError('INVALID_REQUEST');
  const b = value as Record<string, unknown>;
  for (const id of [b.guildId, b.targetId, actorId]) {
    if (typeof id !== 'string' || !/^\d{17,20}$/.test(id)) throw new ModerationError('INVALID_ID');
  }
  if (!MODERATION_ACTIONS.includes(b.action as ModerationAction))
    throw new ModerationError('INVALID_ACTION');
  if (typeof b.requestKey !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(b.requestKey))
    throw new ModerationError('INVALID_REQUEST_KEY');
  if (b.reason !== undefined && (typeof b.reason !== 'string' || b.reason.length > 400))
    throw new ModerationError('INVALID_REASON');
  const duration = b.durationSeconds ?? (b.action === 'SLOWMODE' ? 0 : 600);
  const maximum = b.action === 'SLOWMODE' ? 21600 : 2419200;
  if (!Number.isInteger(duration) || Number(duration) < 0 || Number(duration) > maximum)
    throw new ModerationError('INVALID_DURATION');
  const count = b.count ?? 50;
  if (!Number.isInteger(count) || Number(count) < 1 || Number(count) > 100)
    throw new ModerationError('INVALID_COUNT');
  if (
    b.action === 'ESCALATE' &&
    (!Number.isSafeInteger(b.sourceCaseNumber) || Number(b.sourceCaseNumber) < 1)
  )
    throw new ModerationError('INVALID_SOURCE_CASE');
  return {
    guildId: b.guildId as string,
    actorId,
    targetId: b.targetId as string,
    action: b.action as ModerationAction,
    requestKey: b.requestKey,
    reason: (b.reason as string)?.trim() || 'No reason provided',
    durationSeconds: Number(duration),
    count: Number(count),
    evidence: validateModerationEvidence(b.guildId as string, b.evidence),
    sourceCaseNumber: b.action === 'ESCALATE' ? Number(b.sourceCaseNumber) : undefined,
    source,
  };
}
