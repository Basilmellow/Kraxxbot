import { redirectLegacyGuildRoute, type LegacySearchParams } from '@/lib/legacy-guild-route';

export default async function LegacyTicketsPage({ searchParams }: { searchParams: LegacySearchParams }) {
  await redirectLegacyGuildRoute(searchParams, '/tickets');
}
