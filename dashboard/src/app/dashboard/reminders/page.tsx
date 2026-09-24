import { redirectLegacyGuildRoute, type LegacySearchParams } from '@/lib/legacy-guild-route';

export default async function LegacyRemindersPage({ searchParams }: { searchParams: LegacySearchParams }) {
  await redirectLegacyGuildRoute(searchParams, '/reminders');
}
