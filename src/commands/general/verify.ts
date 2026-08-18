import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { VerificationService } from '../../services/verification.service';

export default {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify your KRAXX HQ membership and gain base organization access'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await VerificationService.processVerification(interaction);
  },
};
