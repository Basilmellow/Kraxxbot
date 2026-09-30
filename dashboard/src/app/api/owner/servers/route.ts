import { NextRequest, NextResponse } from 'next/server';
import { ownerApiError, ownerApiGate } from '@/lib/owner-api';
import { getOwnerServers } from '@/lib/owner-data';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const denied = await ownerApiGate(); if (denied) return denied;
  const status = request.nextUrl.searchParams.get('status') || undefined;
  if (status && !['ALL', 'CONNECTED', 'UNAVAILABLE', 'UNKNOWN', 'LEFT'].includes(status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  try { return NextResponse.json({ servers: await getOwnerServers({ query: request.nextUrl.searchParams.get('q') || '', status,
    sort: request.nextUrl.searchParams.get('sort') || undefined }) }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return ownerApiError(); }
}
