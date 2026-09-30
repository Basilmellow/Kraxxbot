import type { PrismaClient } from '@prisma/client';
import { createAuditDetails } from './audit-event';
import type { WelcomeConfigInput } from './welcome-contract';

export async function saveWelcomeConfig(
  database: PrismaClient,
  input: WelcomeConfigInput,
  actorId: string,
) {
  return database.$transaction(async (transaction) => {
    const config = await transaction.welcomeConfig.upsert({
      where: { guildId: input.guildId },
      update: {
        enabled: input.enabled,
        channelId: input.channelId,
        message: input.message,
        ...(input.embedJson === null ? {} : { embedJson: input.embedJson }),
        imageUrl: input.imageUrl,
        roleId: input.roleId,
        dmEnabled: input.dmEnabled,
        dmMessage: input.dmMessage,
        leaveChannelId: input.leaveChannelId,
        leaveMessage: input.leaveMessage,
      },
      create: {
        guildId: input.guildId,
        enabled: input.enabled,
        channelId: input.channelId,
        message: input.message,
        embedJson: input.embedJson,
        imageUrl: input.imageUrl,
        roleId: input.roleId,
        dmEnabled: input.dmEnabled,
        dmMessage: input.dmMessage,
        leaveChannelId: input.leaveChannelId,
        leaveMessage: input.leaveMessage,
      },
    });

    await transaction.auditLog.create({
      data: {
        guildId: input.guildId,
        executorId: actorId,
        targetId: input.guildId,
        action: 'WELCOME_CONFIG_UPDATE',
        details: createAuditDetails({
          source: 'DASHBOARD',
          targetType: 'GUILD',
          outcome: 'SUCCESS',
          metadata: {
            enabled: config.enabled,
            channelConfigured: Boolean(config.channelId),
            departureConfigured: Boolean(config.leaveChannelId),
            dmEnabled: config.dmEnabled,
          },
        }),
      },
    });
    return config;
  });
}
