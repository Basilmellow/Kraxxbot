'use client';

import { useParams, useSearchParams } from 'next/navigation';

/** Resolve the active tenant from the canonical route, with legacy query support. */
export function useGuildId(): string {
  const params = useParams<{ guildId?: string }>();
  const searchParams = useSearchParams();
  const routeGuildId = params?.guildId;

  return (typeof routeGuildId === 'string' && routeGuildId) || searchParams.get('guildId') || '';
}
