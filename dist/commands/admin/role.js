"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const role_service_1 = require("../../services/role.service");
const permissions_service_1 = require("../../services/permissions.service");
const kraxxEmbedBuilder_1 = require("../../embeds/kraxxEmbedBuilder");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('role')
        .setDescription('Role management and inspection system (Authorized Personnel Only)')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageRoles)
        .addSubcommand(sub => sub
        .setName('assign')
        .setDescription('Assign an organizational role to a member')
        .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to grant').setRequired(true)))
        .addSubcommand(sub => sub
        .setName('remove')
        .setDescription('Remove an organizational role from a member')
        .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true)))
        .addSubcommand(sub => sub
        .setName('info')
        .setDescription('Display diagnostic information for a role')
        .addRoleOption(opt => opt.setName('role').setDescription('Target role').setRequired(true))),
    async execute(interaction) {
        const member = interaction.member;
        const auth = permissions_service_1.PermissionsService.requireManagement(member);
        if (!auth.authorized) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', auth.reason || 'Unauthorized.')],
                ephemeral: true,
            });
            return;
        }
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'assign') {
            await role_service_1.RoleService.assignRole(interaction);
        }
        else if (subcommand === 'remove') {
            await role_service_1.RoleService.removeRole(interaction);
        }
        else if (subcommand === 'info') {
            await role_service_1.RoleService.getRoleInfo(interaction);
        }
    },
};
