// KRAXX Operations Platform — Audit Logging Service
import { prisma } from './prisma';

export async function logDashboardAction(params: {
  action: string;
  executorId: string;
  targetId?: string | null;
  targetType?: string | null;
  details?: Record<string, any> | string | null;
  ipAddress?: string | null;
}) {
  try {
    const detailsString =
      typeof params.details === 'object' && params.details !== null
        ? JSON.stringify(params.details)
        : (params.details as string) || null;

    // Record in DashboardAuditLog
    await prisma.dashboardAuditLog.create({
      data: {
        action: params.action,
        executorId: params.executorId,
        targetId: params.targetId || null,
        targetType: params.targetType || null,
        details: detailsString,
        ipAddress: params.ipAddress || null,
        source: 'DASHBOARD',
      },
    });

    // Also mirror to shared AuditLog for unified bot/dashboard stream
    await prisma.auditLog.create({
      data: {
        action: params.action,
        executorId: params.executorId,
        targetId: params.targetId || null,
        details: detailsString,
      },
    }).catch(() => {});
  } catch (error) {
    console.error('[AuditService] Failed to record dashboard audit log:', error);
  }
}
