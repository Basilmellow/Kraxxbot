// NOTE: The 'Project' model does not exist in the current Prisma schema.
// This repository is a placeholder for future implementation.
// When a GuildProject model is added to schema.prisma, update this file accordingly.

export class ProjectRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async create(_data: {
    guildId: string;
    code: string;
    name: string;
    description: string;
    clientName?: string;
    department?: string;
    leadId?: string;
    channelId?: string;
  }): Promise<Record<string, unknown>> {
    throw new Error('ProjectRepository: Project model not yet available in schema.');
  }

  static async findByCode(_guildId: string, _code: string): Promise<Record<string, unknown> | null> {
    return null;
  }

  static async listByGuild(_guildId: string): Promise<Record<string, unknown>[]> {
    return [];
  }
}
