import { prisma } from '@/lib/prisma';
import { OwnerPage, OwnerPanel, OwnerStatus } from '@/components/owner/OwnerUI';
import { requireOwnerPage } from '@/lib/owner-page';

export const dynamic = 'force-dynamic';
export default async function OwnerSettingsPage() {
  await requireOwnerPage();
  const heartbeat = await prisma.botHeartbeat.findUnique({ where: { id: 'singleton' }, select: { aiProviderStatus: true, aiModel: true, lastHeartbeat: true } });
  return <OwnerPage title="Settings" description="Owner identity and system configuration status. Controls are read-only in this release.">
    <OwnerPanel title="Control center"><div className="space-y-3 text-sm"><p>Owner identity: <OwnerStatus value={process.env.KRAXXBOT_OWNER_DISCORD_ID?.trim() ? 'CONFIGURED' : 'MISSING_CONFIGURATION'} /></p>
      <p>Worker AI configuration: <OwnerStatus value={heartbeat?.aiProviderStatus ?? 'UNKNOWN'} /></p><p>Gemini model: {heartbeat?.aiModel ?? 'Unknown'}</p>
      <p>Last worker heartbeat: {heartbeat?.lastHeartbeat.toLocaleString() ?? 'Unknown'}</p><p>Owner actions: disabled (read-only release)</p></div></OwnerPanel>
  </OwnerPage>;
}
