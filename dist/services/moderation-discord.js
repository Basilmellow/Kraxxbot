"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.channelPermissions = channelPermissions;
exports.createModerationAdapter = createModerationAdapter;
const policy_1 = require("../security/policy");
const discord_transport_1 = require("./discord-transport");
const moderation_contract_1 = require("./moderation-contract");
function channelPermissions(base, member, channel, guildId) {
    if ((0, policy_1.hasPermission)(base, (0, policy_1.permission)(3)))
        return base;
    const apply = (bits, allow, deny) => (bits & ~deny) | allow;
    const everyone = channel.permission_overwrites.find(o => o.type === 0 && o.id === guildId);
    if (everyone)
        base = apply(base, BigInt(everyone.allow), BigInt(everyone.deny));
    let allow = BigInt(0), deny = BigInt(0);
    for (const o of channel.permission_overwrites.filter(o => o.type === 0 && member.roles.includes(o.id))) {
        allow |= BigInt(o.allow);
        deny |= BigInt(o.deny);
    }
    base = apply(base, allow, deny);
    const individual = channel.permission_overwrites.find(o => o.type === 1 && o.id === member.user.id);
    return individual ? apply(base, BigInt(individual.allow), BigInt(individual.deny)) : base;
}
function createModerationAdapter(token) {
    if (!token)
        throw new moderation_contract_1.ModerationError('DISCORD_NOT_CONFIGURED', 503);
    const request = async (path, method = 'GET', body, reason) => {
        const response = await (0, discord_transport_1.discordRequest)(`https://discord.com/api/v10${path}`, {
            method,
            headers: {
                Authorization: `Bot ${token}`,
                'Content-Type': 'application/json',
                ...(reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : {}),
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        return (response.status === 204 ? undefined : await response.json());
    };
    return {
        async authorize(input) {
            const { guildId, actorId, targetId, action } = input;
            const guild = await request(`/guilds/${guildId}`);
            if (guild.id !== guildId)
                throw new policy_1.PolicyError();
            const [roles, actor, botUser] = await Promise.all([
                request(`/guilds/${guildId}/roles`),
                request(`/guilds/${guildId}/members/${actorId}`),
                request('/users/@me'),
            ]);
            const bot = await request(`/guilds/${guildId}/members/${botUser.id}`);
            if (actor.user.id !== actorId || bot.user.id !== botUser.id)
                throw new policy_1.PolicyError();
            const bits = (m) => roles
                .filter(r => r.id === guildId || m.roles.includes(r.id))
                .reduce((b, r) => b | BigInt(r.permissions), BigInt(0));
            const position = (m) => roles.filter(r => m.roles.includes(r.id)).reduce((p, r) => Math.max(p, r.position), 0);
            let actorBits = actorId === guild.owner_id ? (0, policy_1.permission)(3) : bits(actor), botBits = bits(bot);
            if ((0, moderation_contract_1.isChannelAction)(action)) {
                const channel = await request(`/channels/${targetId}`);
                if (channel.guild_id !== guildId ||
                    channel.id !== targetId ||
                    ![0, 5].includes(channel.type) ||
                    (action === 'SLOWMODE' && channel.type !== 0) ||
                    !Array.isArray(channel.permission_overwrites))
                    throw new policy_1.PolicyError('Invalid server text channel.');
                actorBits = channelPermissions(actorBits, actor, channel, guildId);
                botBits = channelPermissions(botBits, bot, channel, guildId);
                const required = (0, policy_1.permission)(10) |
                    (action === 'PURGE'
                        ? (0, policy_1.permission)(13) | (0, policy_1.permission)(16)
                        : action === 'SLOWMODE'
                            ? (0, policy_1.permission)(4)
                            : (0, policy_1.permission)(28));
                if (!(0, policy_1.hasPermission)(actorBits, required) || !(0, policy_1.hasPermission)(botBits, required))
                    throw new policy_1.PolicyError();
                if (['LOCK', 'UNLOCK'].includes(action) &&
                    ((!(0, policy_1.hasPermission)(bits(bot), (0, policy_1.permission)(11)) && !(0, policy_1.hasPermission)(botBits, (0, policy_1.permission)(11))) ||
                        (actorId !== guild.owner_id &&
                            !(0, policy_1.hasPermission)(bits(actor), (0, policy_1.permission)(11)) &&
                            !(0, policy_1.hasPermission)(actorBits, (0, policy_1.permission)(11)))))
                    throw new policy_1.PolicyError();
                if ((actor.communication_disabled_until &&
                    new Date(actor.communication_disabled_until).getTime() > Date.now()) ||
                    (bot.communication_disabled_until &&
                        new Date(bot.communication_disabled_until).getTime() > Date.now()))
                    throw new policy_1.PolicyError();
                return { channel };
            }
            const requiredBit = { WARN: 40, TIMEOUT: 40, KICK: 1, BAN: 2, UNBAN: 2 }[action];
            if (requiredBit === undefined ||
                !(0, policy_1.hasPermission)(actorBits, (0, policy_1.permission)(requiredBit)) ||
                (action !== 'WARN' && !(0, policy_1.hasPermission)(botBits, (0, policy_1.permission)(requiredBit))))
                throw new policy_1.PolicyError();
            if (action !== 'UNBAN') {
                const target = await request(`/guilds/${guildId}/members/${targetId}`);
                if (target.user.id !== targetId)
                    throw new policy_1.PolicyError();
                (0, policy_1.assertModerationHierarchy)({
                    actorId,
                    targetId,
                    ownerId: guild.owner_id,
                    botId: botUser.id,
                    actorPosition: position(actor),
                    targetPosition: position(target),
                    botPosition: position(bot),
                    enforceBotHierarchy: action !== 'WARN',
                });
                if (action === 'TIMEOUT' && (0, policy_1.hasPermission)(bits(target), (0, policy_1.permission)(3)))
                    throw new policy_1.PolicyError();
            }
            else {
                const ban = await request(`/guilds/${guildId}/bans/${targetId}`);
                if (ban.user.id !== targetId)
                    throw new policy_1.PolicyError();
            }
            return {};
        },
        async prepare(input, snapshot, previousLock) {
            const { guildId, targetId, action, durationSeconds, count, actorId } = input;
            const reason = `${input.reason} [actor ${actorId}]`;
            const mutate = (path, method, body) => async () => {
                await request(path, method, body, reason);
            };
            const channelPath = `/channels/${targetId}`;
            const memberPath = `/guilds/${guildId}/members/${targetId}`;
            switch (action) {
                case 'WARN':
                    return { details: {}, perform: async () => { } };
                case 'TIMEOUT': {
                    const until = durationSeconds === 0
                        ? null
                        : new Date(Date.now() + durationSeconds * 1000).toISOString();
                    return {
                        details: { until },
                        perform: mutate(memberPath, 'PATCH', { communication_disabled_until: until }),
                    };
                }
                case 'KICK':
                    return { details: {}, perform: mutate(memberPath, 'DELETE') };
                case 'BAN':
                    return {
                        details: {},
                        perform: mutate(`/guilds/${guildId}/bans/${targetId}`, 'PUT', {
                            delete_message_seconds: 0,
                        }),
                    };
                case 'UNBAN':
                    return { details: {}, perform: mutate(`/guilds/${guildId}/bans/${targetId}`, 'DELETE') };
                case 'SLOWMODE':
                    return {
                        details: { seconds: durationSeconds },
                        perform: mutate(channelPath, 'PATCH', { rate_limit_per_user: durationSeconds }),
                    };
                case 'PURGE': {
                    const messages = await request(`${channelPath}/messages?limit=${count}`);
                    const cutoff = Date.now() - 14 * 86400000 + 60000;
                    const ids = messages
                        .filter(m => !m.pinned &&
                        /^\d{17,20}$/.test(m.id) &&
                        Number(BigInt(m.id) >> BigInt(22)) + 1420070400000 > cutoff)
                        .map(m => m.id);
                    if (new Set(ids).size !== ids.length || ids.length > count)
                        throw new moderation_contract_1.ModerationError('INVALID_DISCORD_MESSAGES', 502);
                    return {
                        details: {
                            messageIds: ids,
                            deletedCount: ids.length,
                            skippedCount: messages.length - ids.length,
                        },
                        perform: ids.length === 0
                            ? async () => { }
                            : ids.length === 1
                                ? mutate(`${channelPath}/messages/${ids[0]}`, 'DELETE')
                                : mutate(`${channelPath}/messages/bulk-delete`, 'POST', { messages: ids }),
                    };
                }
                case 'LOCK':
                case 'UNLOCK': {
                    const channel = snapshot.channel;
                    const overwrite = channel.permission_overwrites.find(o => o.type === 0 && o.id === guildId);
                    const allow = BigInt(overwrite?.allow ?? '0'), deny = BigInt(overwrite?.deny ?? '0'), mask = (0, policy_1.permission)(11);
                    const denied = (deny & mask) !== BigInt(0) && (allow & mask) === BigInt(0);
                    if (previousLock && !denied)
                        throw new moderation_contract_1.ModerationError('LOCK_CHANGED_EXTERNALLY', 409);
                    if (action === 'LOCK' && previousLock)
                        return { details: { ...previousLock, noChange: true }, perform: async () => { } };
                    if (action === 'UNLOCK' && !previousLock)
                        return { details: { noChange: true }, perform: async () => { } };
                    const saved = previousLock ?? {
                        previousAllow: (allow & mask).toString(),
                        previousDeny: (deny & mask).toString(),
                    };
                    const nextAllow = action === 'LOCK'
                        ? allow & ~mask
                        : (allow & ~mask) | BigInt(String(saved.previousAllow));
                    const nextDeny = action === 'LOCK' ? deny | mask : (deny & ~mask) | BigInt(String(saved.previousDeny));
                    return {
                        details: { ...saved, scope: 'EVERYONE_SEND_MESSAGES' },
                        perform: mutate(`${channelPath}/permissions/${guildId}`, 'PUT', {
                            type: 0,
                            allow: nextAllow.toString(),
                            deny: nextDeny.toString(),
                        }),
                    };
                }
                default:
                    throw new moderation_contract_1.ModerationError('INVALID_ACTION');
            }
        },
    };
}
