import { EmbedBuilder } from 'discord.js';

export const KRAXX_COLORS = {
  BRAND: 0x00f0ff,     // Cyber Aqua / Primary Brand
  SECURITY: 0x10b981,  // Emerald Green / KRAXXSEC
  STUDIO: 0x6366f1,    // Indigo / KRAXX STUDIO
  NEUTRAL: 0x3b82f6,   // Corporate Blue
  WARNING: 0xf59e0b,   // Amber Warning
  DANGER: 0xef4444,    // Crimson Error
  DARK: 0x0b0e14,      // Dark Minimal
};

export class KraxxEmbedBuilder extends EmbedBuilder {
  constructor() {
    super();
    this.setColor(KRAXX_COLORS.BRAND);
    this.setFooter({
      text: 'KRAXX Operations System',
    });
    this.setTimestamp();
  }

  static createHeader(title: string, category?: string): KraxxEmbedBuilder {
    const embed = new KraxxEmbedBuilder();
    const formattedTitle = category ? `KRAXX HQ │ ${category.toUpperCase()}` : 'KRAXX HQ';
    embed.setTitle(formattedTitle);
    embed.setDescription(`**${title}**`);
    return embed;
  }

  static welcome(): KraxxEmbedBuilder {
    const embed = new KraxxEmbedBuilder();
    embed.setColor(KRAXX_COLORS.BRAND);
    embed.setTitle('KRAXX HQ │ WELCOME');
    embed.setDescription(
      `Welcome to **KRAXX HQ**.\n\n` +
      `KRAXX is the parent organization behind our specialized operating divisions:\n\n` +
      `🛡️ **KRAXXSEC**\n*Cybersecurity & Security Engineering*\n\n` +
      `🎨 **KRAXX STUDIO**\n*Digital Creative & Technology Services*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Please verify your membership to access public operations channels.`
    );
    return embed;
  }

  static verification(): KraxxEmbedBuilder {
    const embed = new KraxxEmbedBuilder();
    embed.setColor(KRAXX_COLORS.SECURITY);
    embed.setTitle('KRAXX HQ │ MEMBER VERIFICATION');
    embed.setDescription(
      `Welcome to KRAXX HQ Verification.\n\n` +
      `Click the **[ VERIFY ]** button below to complete verification and obtain base organization access.\n\n` +
      `*Division and management access are granted separately by authorized management.*`
    );
    return embed;
  }

  static announcement(
    title: string,
    content: string,
    department: string = 'GENERAL',
    type: string = 'GENERAL',
    authorName?: string,
    imageUrl?: string
  ): KraxxEmbedBuilder {
    const embed = new KraxxEmbedBuilder();

    let color = KRAXX_COLORS.BRAND;
    if (department === 'KRAXXSEC') color = KRAXX_COLORS.SECURITY;
    if (department === 'KRAXX_STUDIO') color = KRAXX_COLORS.STUDIO;
    if (type === 'IMPORTANT') color = KRAXX_COLORS.WARNING;

    embed.setColor(color);
    embed.setTitle(`KRAXX │ ANNOUNCEMENT [${type.toUpperCase()}]`);
    embed.setDescription(
      `### ${title}\n\n` +
      `${content}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    );

    embed.addFields(
      { name: 'Division', value: `\`${department}\``, inline: true },
      { name: 'Category', value: `\`${type}\``, inline: true }
    );

    if (authorName) {
      embed.addFields({ name: 'Issued By', value: authorName, inline: true });
    }

    if (imageUrl) {
      embed.setImage(imageUrl);
    }

    return embed;
  }

  static task(
    taskNumber: number,
    title: string,
    description: string,
    status: string,
    priority: string,
    department: string,
    assigneeText: string,
    dueDateText?: string
  ): KraxxEmbedBuilder {
    const embed = new KraxxEmbedBuilder();

    let color = KRAXX_COLORS.NEUTRAL;
    if (priority === 'HIGH' || priority === 'URGENT') color = KRAXX_COLORS.WARNING;
    if (status === 'COMPLETED') color = KRAXX_COLORS.SECURITY;

    embed.setColor(color);
    embed.setTitle(`TASK #${taskNumber} │ ${title}`);
    embed.setDescription(description);

    embed.addFields(
      { name: 'Status', value: `\`${status}\``, inline: true },
      { name: 'Priority', value: `\`${priority}\``, inline: true },
      { name: 'Department', value: `\`${department}\``, inline: true },
      { name: 'Assignee', value: assigneeText, inline: true },
      { name: 'Due Date', value: dueDateText || 'Not Set', inline: true }
    );

    return embed;
  }

  static meeting(
    title: string,
    agenda: string,
    department: string,
    startTimeText: string,
    organizerText: string,
    locationText?: string
  ): KraxxEmbedBuilder {
    const embed = new KraxxEmbedBuilder();
    embed.setColor(KRAXX_COLORS.BRAND);
    embed.setTitle(`INTERNAL MEETING │ ${title}`);
    embed.setDescription(`**Agenda:**\n${agenda}`);

    embed.addFields(
      { name: 'Department', value: `\`${department}\``, inline: true },
      { name: 'Start Time', value: startTimeText, inline: true },
      { name: 'Organizer', value: organizerText, inline: true },
      { name: 'Location Channel', value: locationText || 'TBD', inline: true }
    );

    return embed;
  }

  static event(
    title: string,
    description: string,
    type: string,
    department: string,
    startTimeText: string,
    location?: string
  ): KraxxEmbedBuilder {
    const embed = new KraxxEmbedBuilder();
    embed.setColor(KRAXX_COLORS.STUDIO);
    embed.setTitle(`KRAXX EVENT │ ${title}`);
    embed.setDescription(description);

    embed.addFields(
      { name: 'Type', value: `\`${type}\``, inline: true },
      { name: 'Department', value: `\`${department}\``, inline: true },
      { name: 'Schedule', value: startTimeText, inline: true },
      { name: 'Location', value: location || 'KRAXX HQ', inline: true }
    );

    return embed;
  }

  static audit(action: string, executorText: string, details?: string, targetText?: string): KraxxEmbedBuilder {
    const embed = new KraxxEmbedBuilder();
    embed.setColor(KRAXX_COLORS.DARK);
    embed.setTitle(`AUDIT LOG │ ${action.toUpperCase()}`);
    embed.setDescription(`**Action Executed:** \`${action}\``);

    embed.addFields(
      { name: 'Executor', value: executorText, inline: true },
      { name: 'Target', value: targetText || 'N/A', inline: true }
    );

    if (details) {
      embed.addFields({ name: 'Details', value: details, inline: false });
    }

    return embed;
  }

  static success(title: string, message: string): KraxxEmbedBuilder {
    const embed = new KraxxEmbedBuilder();
    embed.setColor(KRAXX_COLORS.SECURITY);
    embed.setTitle(`SUCCESS │ ${title}`);
    embed.setDescription(message);
    return embed;
  }

  static error(title: string, message: string): KraxxEmbedBuilder {
    const embed = new KraxxEmbedBuilder();
    embed.setColor(KRAXX_COLORS.DANGER);
    embed.setTitle(`ERROR │ ${title}`);
    embed.setDescription(message);
    return embed;
  }
}
