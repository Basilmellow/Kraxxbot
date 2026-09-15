// KRAXX Operations Platform — NextAuth Configuration
// Multi-tenant Discord OAuth2 — works across ALL guilds, not just KRAXX HQ

import { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';

// Discord OAuth2 scopes: identify = user profile, guilds = server list for selector
const DISCORD_SCOPES = ['identify', 'guilds'].join(' ');

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: DISCORD_SCOPES,
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      // On initial sign-in, store Discord identity in JWT
      if (account && profile) {
        token.accessToken = account.access_token;
        token.discordId = (profile as { id: string }).id;
        token.username = (profile as { username: string }).username;
        token.avatar = (profile as { avatar?: string }).avatar || null;
        token.discriminator = (profile as { discriminator?: string }).discriminator || '0';
        token.displayName = (profile as { global_name?: string }).global_name
          || (profile as { username: string }).username;
      }

      return token;
    },

    async session({ session, token }) {
      // Expose safe user identity to the client session
      // Guild-specific data (roles, permissions) is resolved server-side per request
      session.user = {
        ...session.user,
        discordId: token.discordId as string,
        username: token.username as string,
        displayName: (token.displayName as string) || (token.username as string),
        avatar: token.avatar as string | null,
        accessToken: token.accessToken as string,
      };

      return session;
    },

    // Allow any Discord user to sign in — guild access is checked per-route
    async signIn() {
      return true;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
};
