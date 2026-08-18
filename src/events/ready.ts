import { Client } from 'discord.js';
import { logger } from '../utils/logger';
import { SchedulerService } from '../services/scheduler.service';
import { getChannelDiagnostics } from '../config/channels';
import { env } from '../config/environment';

export async function onReady(client: Client): Promise<void> {
  if (!client.user) return;

  logger.info(`============================================================`);
  logger.info(`🤖 KRAXX Discord Operations Bot Connected`);
  logger.info(`Tag: ${client.user.tag} (ID: ${client.user.id})`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`============================================================`);

  // Start background scheduler
  SchedulerService.start(client);

  // Print channel mapping diagnostic report
  const diag = getChannelDiagnostics();
  const configuredCount = diag.filter(c => c.configured).length;
  logger.info(`Channel Configuration Status: ${configuredCount}/${diag.length} channels bound.`);

  client.user.setPresence({
    activities: [{ name: 'KRAXX Operations System', type: 3 }], // Watching
    status: 'online',
  });
}
