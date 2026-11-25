"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN = exports.permission = exports.PolicyError = void 0;
exports.hasPermission = hasPermission;
exports.assertTenant = assertTenant;
exports.assertRolePolicy = assertRolePolicy;
exports.assertModerationHierarchy = assertModerationHierarchy;
// Shared, side-effect-free policy used by both Discord entry points.
class PolicyError extends Error {
    status = 403;
    constructor(message = 'This operation is not permitted.') { super(message); }
}
exports.PolicyError = PolicyError;
const permission = (bit) => BigInt(1) << BigInt(bit);
exports.permission = permission;
exports.ADMIN = (0, exports.permission)(3);
function hasPermission(bits, required) {
    return (bits & exports.ADMIN) !== BigInt(0) || (bits & required) === required;
}
function assertTenant(expected, actual) {
    if (!expected || expected !== actual)
        throw new PolicyError('Resource does not belong to this server.');
}
function assertRolePolicy(p, selfRole = false) {
    if (p.roleId === p.guildId || p.managed)
        throw new PolicyError('This role cannot be managed.');
    if (!hasPermission(p.botPermissions, (0, exports.permission)(28)) || p.position >= p.botPosition)
        throw new PolicyError('The bot cannot manage this role.');
    if (!p.owner && (!hasPermission(p.actorPermissions, (0, exports.permission)(28)) || p.position >= p.actorPosition))
        throw new PolicyError('You cannot manage this role.');
    // Only ordinary member permissions may be made self-assignable. New Discord
    // permission bits fail closed until explicitly reviewed.
    const memberBits = [6, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 20, 21, 25, 26, 31, 35, 36, 37, 38, 39, 42, 45, 46, 49, 50];
    const allowed = memberBits.reduce((bits, bit) => bits | (0, exports.permission)(bit), BigInt(0));
    if (selfRole && (p.permissions & ~allowed) !== BigInt(0))
        throw new PolicyError('Privileged roles cannot be self-assigned.');
}
function assertModerationHierarchy(p) {
    if (p.targetId === p.actorId || p.targetId === p.ownerId || p.targetId === p.botId
        || (p.enforceBotHierarchy !== false && p.targetPosition >= p.botPosition)
        || (p.actorId !== p.ownerId && p.targetPosition >= p.actorPosition))
        throw new PolicyError('You cannot moderate this member.');
}
