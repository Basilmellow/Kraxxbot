export type HealthState = 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';
export function workerHealth(heartbeat: { status: string; gatewayStatus: string; lastHeartbeat: Date; schedulerStatus: string } | null, now = Date.now()) {
  if (!heartbeat) return { worker: 'UNKNOWN' as HealthState, scheduler: 'UNKNOWN' as HealthState };
  const age = now - new Date(heartbeat.lastHeartbeat).getTime();
  const worker: HealthState = heartbeat.status === 'OFFLINE' || age > 90000 ? 'OFFLINE'
    : age > 45000 || heartbeat.status !== 'ONLINE' || heartbeat.gatewayStatus !== 'CONNECTED' ? 'DEGRADED' : 'OPERATIONAL';
  const scheduler: HealthState = worker === 'OFFLINE' ? 'OFFLINE' : age > 45000 ? 'UNKNOWN'
    : ['OPERATIONAL','DEGRADED','OFFLINE','UNKNOWN'].includes(heartbeat.schedulerStatus) ? heartbeat.schedulerStatus as HealthState : 'UNKNOWN';
  return { worker, scheduler };
}
