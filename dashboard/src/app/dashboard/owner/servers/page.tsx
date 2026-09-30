import { OwnerPage } from '@/components/owner/OwnerUI';
import { OwnerServers } from '@/components/owner/OwnerServers';
import { requireOwnerPage } from '@/lib/owner-page';

export const dynamic = 'force-dynamic';
export default async function OwnerServersPage() {
  await requireOwnerPage();
  return <OwnerPage title="Servers" description="All known bot installations from the worker Gateway registry, independent of your personal Discord guild list."><OwnerServers /></OwnerPage>;
}
