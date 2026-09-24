import { redirectLegacyGuildRoute, type LegacySearchParams } from '@/lib/legacy-guild-route';

export default async function LegacyWelcomePage({ searchParams }: { searchParams: LegacySearchParams }) {
  await redirectLegacyGuildRoute(searchParams, '/welcome');
}
