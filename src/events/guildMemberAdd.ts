import { GuildMember } from 'discord.js';
import { OnboardingService } from '../services/onboarding.service';

export async function onGuildMemberAdd(member: GuildMember): Promise<void> {
  await OnboardingService.handleMemberAdd(member);
}
