import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireGuildAccess } from './permissions';
import { requireGuildCapability, type Capability } from './capabilities';
import { DiscordApiError } from './discord-transport';
import { PolicyError } from '../../../src/security/policy';
import { logDashboardAction } from './audit';
import { validMutationOrigin, MutationLimiter } from './mutation-policy';

const limiter = new MutationLimiter();
export function withMutation<T extends unknown[]>(capability: Capability | 'SESSION' | 'SYNC', handler: (request: NextRequest, ...args: T) => Promise<Response>) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const expected = process.env.NEXTAUTH_URL || (process.env.NODE_ENV !== 'production' ? request.url : '');
    if (!validMutationOrigin(request.headers.get('origin'), request.headers.get('host'), expected)
      || (request.headers.get('sec-fetch-site') && request.headers.get('sec-fetch-site') !== 'same-origin'))
      return NextResponse.json({ error: 'Same-origin request required.' }, { status: 403 });
    if (request.method !== 'DELETE' && request.headers.get('content-type')?.split(';')[0] !== 'application/json')
      return NextResponse.json({ error: 'JSON content type required.' }, { status: 415 });
    const auth = await requireAuth();
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const actor = auth.session!.user.discordId;
    if (!limiter.allow(actor)) return NextResponse.json({ error: 'Too many mutations. Retry later.' }, { status: 429, headers: { 'Retry-After': '60' } });
    let guildId: string | undefined;
    let authorizedTenant = false;
    let response: Response;
    try {
      const raw = await request.clone().text();
      if (raw.length > 65536) return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
      const body = raw ? JSON.parse(raw) : {};
      const pathGuild = request.nextUrl.pathname.match(/^\/api\/guilds\/(\d+)/)?.[1];
      const ids = [pathGuild, request.nextUrl.searchParams.get('guildId'), body.guildId].filter(v => v != null);
      if (ids.some(v => typeof v !== 'string' || !/^\d{17,20}$/.test(v)) || new Set(ids).size > 1)
        return NextResponse.json({ error: 'Invalid or conflicting guild context.' }, { status: 400 });
      guildId = ids[0];
      if (capability !== 'SESSION' && capability !== 'SYNC') {
        if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
        const access = await requireGuildAccess(guildId);
        if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status });
        authorizedTenant = true;
        if (capability !== 'MODERATE_MEMBER') await requireGuildCapability(guildId, actor, capability);
      }
      response = await handler(request, ...args);
    } catch (error) {
      const status = error instanceof PolicyError ? 403 : error instanceof DiscordApiError
        ? (error.status === 429 ? 429 : 502) : error instanceof SyntaxError ? 400 : 500;
      response = NextResponse.json({ error: status === 403 ? 'Operation not permitted.' : 'Operation failed. Verify its state before retrying.' }, { status });
    }
    if (authorizedTenant && guildId) {
      try {
        await logDashboardAction({ guildId, executorId: actor, action: `${request.method}:${request.nextUrl.pathname}`,
          targetId: request.nextUrl.pathname, outcome: response.ok ? 'SUCCESS' : 'FAILURE', details: { status: response.status } });
      } catch { return NextResponse.json({ error: 'Audit unavailable. Verify operation state before retrying.' }, { status: 503 }); }
    }
    if (response.status >= 500) return NextResponse.json({ error: 'Service operation failed. Verify its state before retrying.' }, { status: response.status });
    return response;
  };
}
