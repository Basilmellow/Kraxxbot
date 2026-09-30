import { NextResponse } from 'next/server';
import { ownerApiError, ownerApiGate } from '@/lib/owner-api';
import { getOwnerOverview } from '@/lib/owner-data';

export const dynamic = 'force-dynamic';
export async function GET() {
  const denied = await ownerApiGate(); if (denied) return denied;
  try { return NextResponse.json(await getOwnerOverview(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return ownerApiError(); }
}
