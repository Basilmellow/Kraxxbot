import { GuildMember } from 'discord.js';
import { isManagement, isTeamLeadOrAbove, getMemberHighestTier, RoleTier } from '../config/roles';

export class PermissionsService {
  static requireManagement(member: GuildMember): { authorized: boolean; reason?: string } {
    if (!isManagement(member)) {
      return {
        authorized: false,
        reason: 'This operation requires Management Head, Co-Founder, or Founder authorization.',
      };
    }
    return { authorized: true };
  }

  static requireTeamLead(member: GuildMember): { authorized: boolean; reason?: string } {
    if (!isTeamLeadOrAbove(member)) {
      return {
        authorized: false,
        reason: 'This operation requires Team Lead level authorization or higher.',
      };
    }
    return { authorized: true };
  }

  static requireTier(member: GuildMember, minTier: RoleTier): { authorized: boolean; reason?: string } {
    const tier = getMemberHighestTier(member);
    if (tier < minTier) {
      return {
        authorized: false,
        reason: `Insufficient authority. Required tier: ${minTier}, your tier: ${tier}.`,
      };
    }
    return { authorized: true };
  }
}
