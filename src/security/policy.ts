// Shared, side-effect-free policy used by both Discord entry points.
export class PolicyError extends Error {
  readonly status = 403;
  constructor(message = 'This operation is not permitted.') { super(message); }
}

export const permission = (bit: number): bigint => BigInt(1) << BigInt(bit);
export const ADMIN = permission(3);
export function hasPermission(bits: bigint, required: bigint): boolean {
  return (bits & ADMIN) !== BigInt(0) || (bits & required) === required;
}
export function assertTenant(expected: string, actual: string | undefined): void {
  if (!expected || expected !== actual) throw new PolicyError('Resource does not belong to this server.');
}
export interface RolePolicy {
  guildId: string; roleId: string; managed: boolean; position: number;
  permissions: bigint; actorPermissions: bigint; botPermissions: bigint;
  actorPosition: number; botPosition: number; owner: boolean;
}
export function assertRolePolicy(p: RolePolicy, selfRole = false): void {
  if (p.roleId === p.guildId || p.managed) throw new PolicyError('This role cannot be managed.');
  if (!hasPermission(p.botPermissions, permission(28)) || p.position >= p.botPosition)
    throw new PolicyError('The bot cannot manage this role.');
  if (!p.owner && (!hasPermission(p.actorPermissions, permission(28)) || p.position >= p.actorPosition))
    throw new PolicyError('You cannot manage this role.');
  // Only ordinary member permissions may be made self-assignable. New Discord
  // permission bits fail closed until explicitly reviewed.
  const memberBits = [6,8,9,10,11,12,14,15,16,17,18,20,21,25,26,31,35,36,37,38,39,42,45,46,49,50];
  const allowed = memberBits.reduce((bits, bit) => bits | permission(bit), BigInt(0));
  if (selfRole && (p.permissions & ~allowed) !== BigInt(0))
    throw new PolicyError('Privileged roles cannot be self-assigned.');
}

export function assertModerationHierarchy(p: {
  actorId: string; targetId: string; ownerId: string; botId: string;
  actorPosition: number; targetPosition: number; botPosition: number;
  enforceBotHierarchy?: boolean;
}): void {
  if (p.targetId === p.actorId || p.targetId === p.ownerId || p.targetId === p.botId
    || (p.enforceBotHierarchy !== false && p.targetPosition >= p.botPosition)
    || (p.actorId !== p.ownerId && p.targetPosition >= p.actorPosition))
    throw new PolicyError('You cannot moderate this member.');
}
