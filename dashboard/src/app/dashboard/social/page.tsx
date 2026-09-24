import { redirectLegacyGuildRoute } from '@/lib/legacy-guild-route';

export default async function LegacySocialPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return redirectLegacyGuildRoute(searchParams, '/social');
}
