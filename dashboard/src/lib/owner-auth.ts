import 'server-only';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export type OwnerAuthorization =
  | { authorized: true; discordId: string }
  | { authorized: false; status: 401 | 403 | 503; error: string };

/** Pure fail-closed identity check, separated so security behavior is unit-testable. */
export function authorizeKraxxBotOwner(identity: unknown, configuredOwnerId: unknown): OwnerAuthorization {
  if (typeof configuredOwnerId !== 'string' || !/^\d{17,20}$/.test(configuredOwnerId.trim())) {
    return { authorized: false, status: 503, error: 'Owner access is not configured.' };
  }
  if (typeof identity !== 'string' || !/^\d{17,20}$/.test(identity)) {
    return { authorized: false, status: 401, error: 'Unauthorized.' };
  }
  if (identity !== configuredOwnerId.trim()) {
    return { authorized: false, status: 403, error: 'Forbidden.' };
  }
  return { authorized: true, discordId: identity };
}

/** The signed server-side NextAuth Discord identity is the only identity source. */
export async function requireKraxxBotOwner(): Promise<OwnerAuthorization> {
  const session = await getServerSession(authOptions);
  return authorizeKraxxBotOwner(session?.user?.discordId, process.env.KRAXXBOT_OWNER_DISCORD_ID);
}
