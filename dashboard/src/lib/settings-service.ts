import { settingsContract } from './settings-contract';
import { prisma } from './prisma';
import { fetchGuildChannels, fetchGuildRoles } from './discord';
import { PolicyError } from '../../../src/security/policy';
export async function saveSettings(guildId: string, input: unknown) {
  const data = settingsContract.parse(input);
  const [channels, roles] = await Promise.all([fetchGuildChannels(guildId), fetchGuildRoles(guildId)]);
  for (const [key, value] of Object.entries(data)) {
    if (!value || !key.endsWith('Id')) continue;
    if (key.endsWith('RoleId')) {
      if (!roles.some(r => r.id === value && !r.managed && r.id !== guildId)) throw new PolicyError('Invalid server role.');
    } else if (!channels.some(c => c.id === value && (key === 'ticketCategoryId' ? c.type === 4 : [0,5].includes(c.type))))
      throw new PolicyError('Invalid server channel.');
  }
  return prisma.guildSettings.upsert({ where: { guildId }, update: data, create: { guildId, ...data } });
}
