// KRAXX Operations Platform — NextAuth Configuration
// Discord OAuth2 authentication with guild membership + role verification

import { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { resolveRoleTier, getRoleTierName } from './permissions';
import { RoleTier } from './constants';

// Discord OAuth2 scopes
const DISCORD_SCOPES = ['identify', 'guilds', 'guilds.members.read'].join(' ');

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
      // On initial sign-in, fetch guild member data
      if (account && profile) {
        token.accessToken = account.access_token;
        token.discordId = (profile as { id: string }).id;
        token.username = (profile as { username: string }).username;
        token.avatar = (profile as { avatar?: string }).avatar || null;
        token.discriminator = (profile as { discriminator?: string }).discriminator || '0';

        // Fetch guild member info to get roles
        try {
          const guildId = process.env.DISCORD_GUILD_ID;
          if (!guildId) throw new Error('DISCORD_GUILD_ID not configured');

          const memberRes = await fetch(
            `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
            {
              headers: {
                Authorization: `Bearer ${account.access_token}`,
              },
            }
          );

          if (!memberRes.ok) {
            // User is not in the guild
            token.isMember = false;
            token.roleTier = RoleTier.USER;
            token.roleTierName = 'USER';
            token.roles = [];
            return token;
          }

          const memberData = await memberRes.json();
          const roleIds: string[] = memberData.roles || [];

          const tier = resolveRoleTier(roleIds);

          token.isMember = true;
          token.roles = roleIds;
          token.roleTier = tier;
          token.roleTierName = getRoleTierName(tier);
          token.displayName = memberData.nick || token.username;
        } catch (error) {
          console.error('[Auth] Failed to fetch guild member data:', error);
          token.isMember = false;
          token.roleTier = RoleTier.USER;
          token.roleTierName = 'USER';
          token.roles = [];
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Expose safe user data to the client session
      session.user = {
        ...session.user,
        discordId: token.discordId as string,
        username: token.username as string,
        displayName: (token.displayName as string) || (token.username as string),
        avatar: token.avatar as string | null,
        isMember: token.isMember as boolean,
        roleTier: token.roleTier as number,
        roleTierName: token.roleTierName as string,
        roles: token.roles as string[],
      };

      return session;
    },

    async signIn({ account }) {
      if (!account) return false;

      // Verify the user is a member of the KRAXX guild
      try {
        const guildId = process.env.DISCORD_GUILD_ID;
        if (!guildId) return false;

        const memberRes = await fetch(
          `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
          {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          }
        );

        // Allow sign-in but mark non-members
        // The session callback will set isMember = false
        return true;
      } catch {
        return false;
      }
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

  secret: process.env.NEXTAUTH_SECRET,
};
