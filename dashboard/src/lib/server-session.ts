import { NextRequest } from 'next/server';
import 'server-only';
import { headers } from 'next/headers';
import { getToken } from 'next-auth/jwt';

// Read NextAuth's encrypted, HttpOnly JWT on the server. Never put this value
// in Session, props, API responses, or client components.
export async function getDiscordAccessToken(): Promise<string | null> {
  const incoming = await headers();
  const token = await getToken({
    req: new NextRequest('http://session.internal', { headers: { cookie: incoming.get('cookie') || '' } }),
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
    secureCookie: process.env.NEXTAUTH_URL?.startsWith('https://') ?? process.env.NODE_ENV === 'production',
  });
  if (!token?.accessToken || typeof token.accessToken !== 'string') return null;
  if (typeof token.accessTokenExpires === 'number' && token.accessTokenExpires <= Date.now()) return null;
  return token.accessToken;
}
