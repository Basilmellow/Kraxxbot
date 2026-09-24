import { redirectLegacyGuildRoute } from '@/lib/legacy-guild-route';

export default async function LegacyMeetingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return redirectLegacyGuildRoute(searchParams, '/meetings');
}
