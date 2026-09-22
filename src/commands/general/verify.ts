import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { VerificationService } from '../../services/verification.service';

export default {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify your server membership and gain base access'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await VerificationService.processVerification(interaction);
  },
};
