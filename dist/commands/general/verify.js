"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const verification_service_1 = require("../../services/verification.service");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your server membership and gain base access'),
    async execute(interaction) {
        await verification_service_1.VerificationService.processVerification(interaction);
    },
};
