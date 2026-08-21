// KRAXX Operations Platform — TypeScript Type Declarations

import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      discordId: string;
      username: string;
      displayName: string;
      avatar: string | null;
      isMember: boolean;
      roleTier: number;
      roleTierName: string;
      roles: string[];
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    discordId?: string;
    username?: string;
    displayName?: string;
    avatar?: string | null;
    discriminator?: string;
    isMember?: boolean;
    roleTier?: number;
    roleTierName?: string;
    roles?: string[];
  }
}

// Dashboard-specific types
export interface ServerStats {
  memberCount: number;
  onlineCount: number;
  channelCount: number;
  roleCount: number;
  ticketStats: {
    open: number;
    claimed: number;
    closed: number;
    total: number;
  };
  taskStats: {
    pending: number;
    inProgress: number;
    completed: number;
    total: number;
  };
  meetingStats: {
    upcoming: number;
    total: number;
  };
  announcementCount: number;
}

export interface SystemStatus {
  bot: 'online' | 'offline' | 'degraded';
  database: 'online' | 'offline' | 'degraded';
  discord: 'online' | 'offline' | 'degraded';
  lastChecked: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  executorId: string;
  targetId: string | null;
  details: string | null;
  timestamp: string;
}

export interface DashboardAuditEntry {
  id: string;
  action: string;
  executorId: string;
  targetId: string | null;
  targetType: string | null;
  details: string | null;
  ipAddress: string | null;
  source: string;
  timestamp: string;
}
