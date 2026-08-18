import { GuildMember, PartialGuildMember } from 'discord.js';
import { AuditService } from '../services/audit.service';
import { logger } from '../utils/logger';

export async function onGuildMemberRemove(member: GuildMember | PartialGuildMember): Promise<void> {
  logger.info({ discordId: member.id, user: member.user.tag }, 'Member departed KRAXX HQ');

  await AuditService.logEvent(
    member.guild,
    'MEMBER_LEAVE',
    member.id,
    member.id,
    `Member ${member.user.tag} departed from KRAXX HQ.`
  );
}
