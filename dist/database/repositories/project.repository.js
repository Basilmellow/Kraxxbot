"use strict";
// NOTE: The 'Project' model does not exist in the current Prisma schema.
// This repository is a placeholder for future implementation.
// When a GuildProject model is added to schema.prisma, update this file accordingly.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectRepository = void 0;
class ProjectRepository {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static async create(_data) {
        throw new Error('ProjectRepository: Project model not yet available in schema.');
    }
    static async findByCode(_guildId, _code) {
        return null;
    }
    static async listByGuild(_guildId) {
        return [];
    }
}
exports.ProjectRepository = ProjectRepository;
