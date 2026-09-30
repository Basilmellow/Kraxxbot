import { OWNER_COMMANDS } from '@/lib/owner-commands';
import { OwnerPage, OwnerPanel, OwnerStatus } from '@/components/owner/OwnerUI';
import { requireOwnerPage } from '@/lib/owner-page';

export const dynamic = 'force-dynamic';
export default async function OwnerCommandsPage() {
  await requireOwnerPage();
  return <OwnerPage title="Commands" description="Repository command catalog and registration scope. Live deployment history is not currently persisted.">
    <OwnerPanel title={`${OWNER_COMMANDS.length} commands · Global scope`}><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-[var(--border)] text-[var(--text-secondary)]"><th className="py-3 pr-4">Command</th><th className="py-3 pr-4">Description</th><th className="py-3">Registration</th></tr></thead><tbody>{OWNER_COMMANDS.map(command => <tr key={command.name} className="border-b border-[var(--border)] last:border-0"><td className="py-3 pr-4 font-mono text-[var(--accent)]">/{command.name}</td><td className="py-3 pr-4">{command.description}</td><td className="py-3"><OwnerStatus value="NOT VERIFIED" /></td></tr>)}</tbody></table></div>
      <p className="mt-4 text-xs text-[var(--text-muted)]">Command registration timestamps and Discord-side status are not tracked by this deployment.</p></OwnerPanel>
  </OwnerPage>;
}
