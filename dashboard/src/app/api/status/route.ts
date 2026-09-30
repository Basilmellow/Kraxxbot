import { workerHealth } from '@/lib/health';
import { requireAuth } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
export async function GET() {
 const auth=await requireAuth(); if(!auth.authorized) return NextResponse.json({error:'Unauthorized'},{status:401});
 try {
  const heartbeat=await prisma.botHeartbeat.findUnique({where:{id:'singleton'}});
  const health=workerHealth(heartbeat);
  return NextResponse.json({bot:health.worker,scheduler:health.scheduler,database:'OPERATIONAL',
    discord:heartbeat ? (health.worker==='OPERATIONAL'?'OPERATIONAL':health.worker) : 'UNKNOWN',lastChecked:new Date().toISOString()});
 } catch {return NextResponse.json({bot:'UNKNOWN',scheduler:'UNKNOWN',database:'OFFLINE',discord:'UNKNOWN',lastChecked:new Date().toISOString()});}
}
