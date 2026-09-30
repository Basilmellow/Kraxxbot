export type AuditOutcome = 'PENDING' | 'SUCCESS' | 'FAILURE' | 'UNKNOWN';

export interface CanonicalAuditEvent {
  guildId: string;
  actorId: string;
  action: string;
  targetId: string | null;
  targetType: string | null;
  outcome: AuditOutcome;
  metadata?: unknown;
  source: 'BOT' | 'DASHBOARD';
}

export function createAuditDetails(event: Pick<CanonicalAuditEvent, 'targetType' | 'outcome' | 'metadata' | 'source'>): string {
  return JSON.stringify({
    outcome: event.outcome,
    source: event.source,
    targetType: event.targetType,
    data: event.metadata,
  });
}

export function assertAuditTenant(event: Pick<CanonicalAuditEvent, 'guildId' | 'actorId'>): void {
  if (!event.guildId || !event.actorId) throw new Error('Audit tenant and actor are required.');
}
