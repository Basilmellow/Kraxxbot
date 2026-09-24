import { redirectLegacyGuildRoute, type LegacySearchParams } from '@/lib/legacy-guild-route';

export default async function LegacyMessagesPage({ searchParams }: { searchParams: LegacySearchParams }) {
  await redirectLegacyGuildRoute(searchParams, '/messages');
}
