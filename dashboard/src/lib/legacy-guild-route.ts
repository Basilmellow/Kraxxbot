import { redirect } from 'next/navigation';

export type LegacySearchParams = Promise<{
  guildId?: string | string[];
}>;

export async function redirectLegacyGuildRoute(
  searchParams: LegacySearchParams,
  subroute: string,
): Promise<never> {
  const query = await searchParams;
  const guildId = Array.isArray(query.guildId) ? query.guildId[0] : query.guildId;

  if (guildId && /^\d{17,20}$/.test(guildId)) {
    redirect(`/dashboard/${guildId}${subroute}`);
  }

  redirect('/dashboard/select-server');
}