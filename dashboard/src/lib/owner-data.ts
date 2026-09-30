import 'server-only';
import { prisma } from './prisma';
import { workerHealth } from './health';

const dayStart = () => { const date = new Date(); date.setHours(0, 0, 0, 0); return date; };
const asIso = (date: Date | null) => date?.toISOString() ?? null;
const effectiveGuildStatus = (installed: boolean, registryStatus: string, workerStatus: string) =>
  !installed ? 'LEFT' : workerStatus === 'UNKNOWN' ? 'UNKNOWN' : workerStatus !== 'OPERATIONAL' ? 'UNAVAILABLE' : registryStatus;

export async function getOwnerOverview() {
  const since = dayStart();
  const [guilds, heartbeat, aiEnabledGuilds, aiRows, executionGroups] = await Promise.all([
    prisma.guild.findMany({ select: { id: true, name: true, botInstalled: true, connectionStatus: true, joinedAt: true, leftAt: true } }),
    prisma.botHeartbeat.findUnique({ where: { id: 'singleton' } }),
    prisma.guildModule.count({ where: { module: 'kraxx-ai', enabled: true, guild: { botInstalled: true } } }),
    prisma.kraxxAiRequest.groupBy({ by: ['status'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.automationExecution.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  const health = workerHealth(heartbeat);
  const counts = Object.fromEntries(aiRows.map(row => [row.status, row._count._all]));
  return {
    servers: {
      known: guilds.length,
      connected: guilds.filter(g => effectiveGuildStatus(g.botInstalled, g.connectionStatus, health.worker) === 'CONNECTED').length,
      unavailable: guilds.filter(g => effectiveGuildStatus(g.botInstalled, g.connectionStatus, health.worker) === 'UNAVAILABLE').length,
      unknown: guilds.filter(g => effectiveGuildStatus(g.botInstalled, g.connectionStatus, health.worker) === 'UNKNOWN').length,
      recentlyJoined: guilds.filter(g => g.joinedAt >= new Date(Date.now() - 7 * 86400000)).length,
      recentlyLeft: guilds.filter(g => g.leftAt && g.leftAt >= new Date(Date.now() - 7 * 86400000)).length,
    },
    commands: { count: 24, scope: 'GLOBAL', deploymentStatus: 'NOT_TRACKED' },
    ai: {
      enabledGuilds: aiEnabledGuilds,
      requestsToday: aiRows.reduce((sum, row) => sum + row._count._all, 0),
      successful: counts.SUCCESS || 0,
      failed: (counts.FAILURE || 0) + (counts.PROVIDER_ERROR || 0) + (counts.PROVIDER_UNKNOWN || 0) + (counts.DELIVERY_UNKNOWN || 0),
      rateLimited: counts.RATE_LIMITED || 0,
      timeouts: await prisma.kraxxAiRequest.count({ where: { createdAt: { gte: since }, errorCode: 'TIMEOUT' } }),
    },
    worker: {
      status: health.worker,
      scheduler: health.scheduler,
      database: 'HEALTHY',
      gatewayStatus: heartbeat?.gatewayStatus ?? 'UNKNOWN',
      guildCount: heartbeat?.guildCount ?? 0,
      uptimeSeconds: heartbeat?.uptime ?? null,
      latencyMs: heartbeat?.ping ?? null,
      lastHeartbeat: asIso(heartbeat?.lastHeartbeat ?? null),
    },
    automationExecutions: Object.fromEntries(executionGroups.map(row => [row.status, row._count._all])),
  };
}

export async function getOwnerServers(input: { query?: string; status?: string; sort?: string } = {}) {
  const query = input.query?.trim().toLocaleLowerCase() ?? '';
  const orderBy = input.sort === 'lastSeen' ? { lastSeenAt: 'desc' as const } : { joinedAt: 'desc' as const };
  const [guilds, heartbeat] = await Promise.all([
    prisma.guild.findMany({ orderBy, include: { modules: { select: { module: true, enabled: true } } } }),
    prisma.botHeartbeat.findUnique({ where: { id: 'singleton' } }),
  ]);
  const workerStatus = workerHealth(heartbeat).worker;
  return guilds.filter(guild => {
    const matchesQuery = !query || guild.name.toLocaleLowerCase().includes(query) || guild.id.includes(query);
    const state = effectiveGuildStatus(guild.botInstalled, guild.connectionStatus, workerStatus);
    return matchesQuery && (!input.status || input.status === 'ALL' || state === input.status);
  }).map(guild => ({
    id: guild.id, name: guild.name, icon: guild.icon, memberCount: guild.memberCount,
    tenantId: guild.id, botInstalled: guild.botInstalled,
    status: effectiveGuildStatus(guild.botInstalled, guild.connectionStatus, workerStatus),
    firstSeenAt: guild.joinedAt.toISOString(), lastSeenAt: asIso(guild.lastSeenAt), leftAt: asIso(guild.leftAt),
    enabledModuleCount: guild.modules.filter(module => module.enabled).length,
    aiEnabled: guild.modules.some(module => module.module === 'kraxx-ai' && module.enabled),
  }));
}

export async function getOwnerServer(guildId: string) {
  const guild = await prisma.guild.findUnique({ where: { id: guildId }, include: { modules: true } });
  if (!guild) return null;
  const [heartbeat, events] = await Promise.all([
    prisma.botHeartbeat.findUnique({ where: { id: 'singleton' } }),
    prisma.auditLog.findMany({ where: { guildId }, orderBy: { timestamp: 'desc' }, take: 10,
      select: { action: true, executorId: true, targetId: true, timestamp: true } }),
  ]);
  const aiModule = guild.modules.find(module => module.module === 'kraxx-ai');
  let aiSettings: Record<string, unknown> = {};
  if (aiModule?.config) {
    try {
      const parsed: unknown = JSON.parse(aiModule.config);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) aiSettings = parsed as Record<string, unknown>;
    } catch { /* malformed tenant config is represented as unavailable, never returned raw */ }
  }
  return {
    id: guild.id, name: guild.name, icon: guild.icon, memberCount: guild.memberCount,
    botInstalled: guild.botInstalled, status: effectiveGuildStatus(guild.botInstalled, guild.connectionStatus, workerHealth(heartbeat).worker),
    tenantId: guild.id, firstSeenAt: guild.joinedAt.toISOString(), lastSeenAt: asIso(guild.lastSeenAt), leftAt: asIso(guild.leftAt),
    modules: guild.modules.map(({ module, enabled, updatedAt }) => ({ module, enabled, updatedAt: updatedAt.toISOString() })),
    ai: { enabled: aiModule?.enabled ?? false, allowedChannelCount: Array.isArray(aiSettings.allowedChannels) ? aiSettings.allowedChannels.length : 0,
      userCooldownSeconds: typeof aiSettings.userCooldownSeconds === 'number' ? aiSettings.userCooldownSeconds : null,
      guildRequestsPerMinute: typeof aiSettings.guildRequestsPerMinute === 'number' ? aiSettings.guildRequestsPerMinute : null },
    scheduler: workerHealth(heartbeat).scheduler,
    recentEvents: events.map(event => ({ ...event, timestamp: event.timestamp.toISOString() })),
  };
}

export async function getOwnerAi() {
  const since = dayStart();
  const [heartbeat, enabledGuilds, rows, aggregate, latestSuccess, latestFailure] = await Promise.all([
    prisma.botHeartbeat.findUnique({ where: { id: 'singleton' } }),
    prisma.guildModule.count({ where: { module: 'kraxx-ai', enabled: true, guild: { botInstalled: true } } }),
    prisma.kraxxAiRequest.groupBy({ by: ['status'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.kraxxAiRequest.aggregate({ where: { createdAt: { gte: since }, latencyMs: { not: null } }, _avg: { latencyMs: true } }),
    prisma.kraxxAiRequest.findFirst({ where: { status: 'SUCCESS' }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    prisma.kraxxAiRequest.findFirst({ where: { status: { in: ['PROVIDER_ERROR', 'PROVIDER_UNKNOWN', 'FAILURE'] } }, orderBy: { createdAt: 'desc' }, select: { errorCode: true, status: true, createdAt: true } }),
  ]);
  const counts = Object.fromEntries(rows.map(row => [row.status, row._count._all]));
  return {
    provider: 'GEMINI', model: heartbeat?.aiModel ?? 'UNKNOWN',
    configuration: heartbeat?.aiProviderStatus ?? 'UNKNOWN',
    readiness: latestSuccess && latestSuccess.createdAt >= new Date(Date.now() - 24 * 60 * 60 * 1000) ? 'RECENTLY_SUCCEEDED' : 'UNKNOWN_UNTIL_SUCCESSFUL_REQUEST',
    enabledGuilds,
    requestsToday: rows.reduce((sum, row) => sum + row._count._all, 0),
    successful: counts.SUCCESS || 0,
    failed: (counts.FAILURE || 0) + (counts.PROVIDER_ERROR || 0) + (counts.PROVIDER_UNKNOWN || 0) + (counts.DELIVERY_UNKNOWN || 0),
    rateLimited: counts.RATE_LIMITED || 0,
    timeouts: await prisma.kraxxAiRequest.count({ where: { createdAt: { gte: since }, errorCode: 'TIMEOUT' } }),
    averageLatencyMs: aggregate._avg.latencyMs,
    lastSuccessAt: asIso(latestSuccess?.createdAt ?? null),
    latestFailure: latestFailure ? { status: latestFailure.status, category: latestFailure.errorCode, at: latestFailure.createdAt.toISOString() } : null,
  };
}

export async function getOwnerHealth() {
  const [heartbeat, executions, reminders, announcements, migrationRows, latestFailure] = await Promise.all([
    prisma.botHeartbeat.findUnique({ where: { id: 'singleton' } }),
    prisma.automationExecution.groupBy({ by: ['status'], _count: { _all: true }, _sum: { attempts: true } }),
    prisma.reminder.groupBy({ by: ['status'], _count: { _all: true }, _sum: { attempts: true } }),
    prisma.scheduledAnnouncement.groupBy({ by: ['status'], _count: { _all: true }, _sum: { attempts: true } }),
    prisma.$queryRaw<Array<{ migration_name: string; successful: boolean; rolled_back: boolean }>>`SELECT migration_name, (finished_at IS NOT NULL) AS successful, (rolled_back_at IS NOT NULL) AS rolled_back FROM "_prisma_migrations" ORDER BY started_at DESC`.catch(() => []),
    prisma.kraxxAiRequest.findFirst({ where: { status: { in: ['PROVIDER_ERROR', 'PROVIDER_UNKNOWN', 'FAILURE'] } }, orderBy: { createdAt: 'desc' }, select: { status: true, errorCode: true, createdAt: true } }),
  ]);
  const health = workerHealth(heartbeat);
  const summarize = (groups: { status: string; _count: { _all: number } }[]) => Object.fromEntries(groups.map(row => [row.status, row._count._all]));
  return {
    worker: { status: health.worker, uptimeSeconds: heartbeat?.uptime ?? null, gatewayLatencyMs: heartbeat?.ping ?? null,
      guildCount: heartbeat?.guildCount ?? 0, lastHeartbeat: asIso(heartbeat?.lastHeartbeat ?? null) },
    database: { status: 'HEALTHY', migration: migrationRows[0] ? { latest: migrationRows[0].migration_name, successful: migrationRows[0].successful,
      rolledBack: migrationRows[0].rolled_back, total: migrationRows.length, failedCount: migrationRows.filter(row => !row.successful && !row.rolled_back).length,
      rolledBackCount: migrationRows.filter(row => row.rolled_back).length } : 'UNKNOWN' },
    scheduler: { status: health.scheduler, executions: summarize(executions), reminders: summarize(reminders), announcements: summarize(announcements),
      executionAttempts: executions.reduce((sum, row) => sum + (row._sum.attempts ?? 0), 0),
      reminderAttempts: reminders.reduce((sum, row) => sum + (row._sum.attempts ?? 0), 0),
      announcementAttempts: announcements.reduce((sum, row) => sum + (row._sum.attempts ?? 0), 0) },
    ai: { provider: heartbeat?.aiProviderStatus ?? 'UNKNOWN', model: heartbeat?.aiModel ?? 'UNKNOWN',
      latestFailure: latestFailure ? { status: latestFailure.status, category: latestFailure.errorCode, at: latestFailure.createdAt.toISOString() } : null },
    discord: { gateway: heartbeat?.gatewayStatus ?? 'UNKNOWN', rest: 'UNKNOWN_NO_REST_HEALTH_TELEMETRY' },
  };
}

export async function getOwnerActivity() {
  type OwnerEvent = { type: string; guildId: string; guildName: string; actorId?: string; targetId?: string | null; source?: string; occurredAt: Date };
  const [guilds, botEvents, dashboardEvents, aiFailures, heartbeat] = await Promise.all([
    prisma.guild.findMany({ orderBy: { updatedAt: 'desc' }, take: 50, select: { id: true, name: true, joinedAt: true, leftAt: true, connectionStatus: true } }),
    prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 100,
      select: { guildId: true, action: true, executorId: true, targetId: true, timestamp: true, guild: { select: { name: true } } } }),
    prisma.dashboardAuditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 100,
      select: { guildId: true, action: true, executorId: true, targetId: true, timestamp: true, guild: { select: { name: true } } } }),
    prisma.kraxxAiRequest.findMany({ where: { status: { in: ['PROVIDER_ERROR', 'PROVIDER_UNKNOWN', 'FAILURE', 'DELIVERY_UNKNOWN'] } },
      orderBy: { createdAt: 'desc' }, take: 30, select: { guildId: true, status: true, errorCode: true, createdAt: true, guild: { select: { name: true } } } }),
    prisma.botHeartbeat.findUnique({ where: { id: 'singleton' }, select: { lastHeartbeat: true, uptime: true } }),
  ]);
  const registryEvents: OwnerEvent[] = guilds.flatMap(guild => [
    { type: 'GUILD_JOINED', guildId: guild.id, guildName: guild.name, occurredAt: guild.joinedAt },
    ...(guild.leftAt ? [{ type: 'GUILD_LEFT', guildId: guild.id, guildName: guild.name, occurredAt: guild.leftAt }] : []),
  ]);
  const auditEvents: OwnerEvent[] = [...botEvents, ...dashboardEvents].map(event => ({ type: event.action, guildId: event.guildId, guildName: event.guild.name,
    actorId: event.executorId, targetId: event.targetId, occurredAt: event.timestamp }));
  const providerEvents: OwnerEvent[] = aiFailures.map(event => ({ type: `AI_${event.status}${event.errorCode ? `_${event.errorCode}` : ''}`,
    guildId: event.guildId, guildName: event.guild.name, source: 'AI_TELEMETRY', occurredAt: event.createdAt }));
  const workerEvents: OwnerEvent[] = heartbeat ? [{ type: 'WORKER_START_TIME_ESTIMATE', guildId: '', guildName: '', source: 'HEARTBEAT_DERIVED',
    occurredAt: new Date(heartbeat.lastHeartbeat.getTime() - heartbeat.uptime * 1000) }] : [];
  return [...registryEvents, ...auditEvents, ...providerEvents, ...workerEvents].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, 100)
    .map(event => ({ ...event, occurredAt: event.occurredAt.toISOString() }));
}
