import { NextRequest, NextResponse } from 'next/server';
import { ownerApiError, ownerApiGate } from '@/lib/owner-api';
import { getOwnerServer } from '@/lib/owner-data';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const denied = await ownerApiGate(); if (denied) return denied;
  const guildId = request.nextUrl.searchParams.get('guildId') || '';
  if (!/^\d{17,20}$/.test(guildId)) return NextResponse.json({ error: 'A valid guild ID is required.' }, { status: 400 });
  try {
    const server = await getOwnerServer(guildId);
    return server ? NextResponse.json({ server }, { headers: { 'Cache-Control': 'no-store' } }) : NextResponse.json({ error: 'Server not found.' }, { status: 404 });
  } catch { return ownerApiError(); }
}
