// NOTE: The 'Client' model does not exist in the current Prisma schema.
// This repository is a placeholder for future implementation.
// When a GuildClient model is added to schema.prisma, update this file accordingly.

export class ClientRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async create(_data: {
    guildId: string;
    name: string;
    company: string;
    contactEmail?: string;
    division?: string;
    notes?: string;
  }): Promise<Record<string, unknown>> {
    throw new Error('ClientRepository: Client model not yet available in schema.');
  }

  static async listAll(_guildId: string): Promise<Record<string, unknown>[]> {
    return [];
  }
}
