import { redirectLegacyGuildRoute, type LegacySearchParams } from '@/lib/legacy-guild-route';

export default async function LegacyMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: LegacySearchParams;
}) {
  const { id } = await params;
  await redirectLegacyGuildRoute(searchParams, `/members/${encodeURIComponent(id)}`);
}