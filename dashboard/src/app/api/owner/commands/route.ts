import { NextResponse } from 'next/server';
import { ownerApiGate } from '@/lib/owner-api';
import { OWNER_COMMANDS } from '@/lib/owner-commands';

export const dynamic = 'force-dynamic';
export async function GET() {
  const denied = await ownerApiGate(); if (denied) return denied;
  return NextResponse.json({ count: OWNER_COMMANDS.length, scope: 'GLOBAL', deploymentStatus: 'NOT_VERIFIED', lastDeploymentAt: null,
    commands: OWNER_COMMANDS }, { headers: { 'Cache-Control': 'no-store' } });
}
