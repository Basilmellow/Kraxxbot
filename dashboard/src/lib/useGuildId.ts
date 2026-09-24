'use client';

import { useParams } from 'next/navigation';

/** Resolve the active tenant exclusively from the canonical route segment. */
export function useGuildId(): string {
  const params = useParams<{ guildId?: string }>();
  const routeGuildId = params?.guildId;

  return typeof routeGuildId === 'string' ? routeGuildId : '';
}
