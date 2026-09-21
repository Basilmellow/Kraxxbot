import { GuildMember, PartialGuildMember } from 'discord.js';
import { OnboardingService } from '../services/onboarding.service';

export async function onGuildMemberRemove(member: GuildMember | PartialGuildMember): Promise<void> {
  if (member.partial) {
    // Partial member — fetch if possible, then delegate
    try {
      const full = await member.fetch();
      await OnboardingService.handleMemberRemove(full);
    } catch {
      // Member data unavailable (left before fetch) — silently skip
    }
    return;
  }

  await OnboardingService.handleMemberRemove(member as GuildMember);
}
