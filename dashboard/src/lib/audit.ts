import { prisma } from './prisma';
import { assertAuditTenant, createAuditDetails } from '../../../src/services/audit-event';
// AuditLog is canonical; DashboardAuditLog is a compatibility mirror.
export async function logDashboardAction(p: {
 guildId: string; action: string; executorId: string; targetId?: string | null;
 targetType?: string | null; details?: unknown; ipAddress?: string | null; outcome?: 'SUCCESS' | 'FAILURE';
}) {
 assertAuditTenant({ guildId: p.guildId, actorId: p.executorId });
 const data = {guildId:p.guildId, action:p.action, executorId:p.executorId, targetId:p.targetId ?? p.guildId,
 details:createAuditDetails({outcome:p.outcome ?? 'SUCCESS', source:'DASHBOARD', targetType:p.targetType ?? null, metadata:p.details})};
 try { await prisma.auditLog.create({data}); }
 catch { console.error('AUDIT_WRITE_FAILED', {guildId:p.guildId, action:p.action}); throw new Error('Audit unavailable. Verify operation state before retrying.'); }
 try { await prisma.dashboardAuditLog.create({data:{...data, targetType:p.targetType,source:'DASHBOARD'}}); }
 catch { console.error('AUDIT_MIRROR_FAILED', {guildId:p.guildId,action:p.action}); }
}
