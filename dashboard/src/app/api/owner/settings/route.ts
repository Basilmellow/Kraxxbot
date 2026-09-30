import { NextResponse } from 'next/server';
import { ownerApiError, ownerApiGate } from '@/lib/owner-api';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export async function GET() {
  const denied = await ownerApiGate(); if (denied) return denied;
  try {
    const heartbeat = await prisma.botHeartbeat.findUnique({ where: { id: 'singleton' }, select: { aiProviderStatus: true, aiModel: true, lastHeartbeat: true } });
    return NextResponse.json({ ownerConfigured: Boolean(process.env.KRAXXBOT_OWNER_DISCORD_ID?.trim()),
      workerAiConfiguration: heartbeat?.aiProviderStatus ?? 'UNKNOWN', model: heartbeat?.aiModel ?? 'UNKNOWN',
      lastWorkerHeartbeat: heartbeat?.lastHeartbeat.toISOString() ?? null, actionsEnabled: false }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return ownerApiError(); }
}
