import { redirectLegacyGuildRoute, type LegacySearchParams } from '@/lib/legacy-guild-route';

export default async function LegacyEmbedBuilderPage({ searchParams }: { searchParams: LegacySearchParams }) {
  await redirectLegacyGuildRoute(searchParams, '/messages/embed');
}
