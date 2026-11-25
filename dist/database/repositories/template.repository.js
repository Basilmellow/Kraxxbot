"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateRepository = void 0;
const client_1 = require("../client");
// Maps to EmbedTemplate in schema.prisma
// EmbedTemplate uses 'embedData' (JSON) not 'content'
class TemplateRepository {
    static async create(data) {
        return client_1.prisma.embedTemplate.create({
            data: {
                guildId: data.guildId,
                name: data.name.toLowerCase(),
                category: data.category,
                title: data.title,
                description: data.description,
                embedData: data.embedData,
                createdBy: data.createdBy,
            },
        });
    }
    static async findByName(guildId, name) {
        return client_1.prisma.embedTemplate.findFirst({
            where: { guildId, name: name.toLowerCase() },
        });
    }
    static async listByGuild(guildId) {
        return client_1.prisma.embedTemplate.findMany({
            where: { guildId },
            orderBy: { name: 'asc' },
        });
    }
    static async delete(guildId, name) {
        const res = await client_1.prisma.embedTemplate.deleteMany({
            where: { guildId, name: name.toLowerCase() },
        });
        return res.count > 0;
    }
}
exports.TemplateRepository = TemplateRepository;
