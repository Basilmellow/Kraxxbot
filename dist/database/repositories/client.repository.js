"use strict";
// NOTE: The 'Client' model does not exist in the current Prisma schema.
// This repository is a placeholder for future implementation.
// When a GuildClient model is added to schema.prisma, update this file accordingly.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientRepository = void 0;
class ClientRepository {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static async create(_data) {
        throw new Error('ClientRepository: Client model not yet available in schema.');
    }
    static async listAll(_guildId) {
        return [];
    }
}
exports.ClientRepository = ClientRepository;
