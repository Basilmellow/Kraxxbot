import 'server-only';
import { NextResponse } from 'next/server';
import { requireKraxxBotOwner } from './owner-auth';

export async function ownerApiGate(): Promise<NextResponse | null> {
  const access = await requireKraxxBotOwner();
  if (access.authorized) return null;
  return NextResponse.json({ error: access.error }, { status: access.status, headers: { 'Cache-Control': 'no-store' } });
}

export function ownerApiError() {
  return NextResponse.json({ error: 'Owner data is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
