import { NextRequest, NextResponse } from 'next/server';
import { logDashboardAction } from '@/lib/audit';
import { authorizeRole, memberPermissions, memberPosition } from '@/lib/capabilities';
import { createGuildRole, deleteGuildRole, editGuildRole, fetchBotRoleContext, fetchGuildMember, fetchGuildMembers, fetchGuildRoles, getRoleManageability, type DiscordRole, type RoleManageabilityReason } from '@/lib/discord';
import { withMutation } from '@/lib/mutation';
import { requireGuildAccess, type PermissionCheck } from '@/lib/permissions';
import { hasPermission, permission, PolicyError } from '../../../../../src/security/policy';

const MANAGE_ROLES = permission(28);
type AuthorizedGuild = { guildId: string; access: PermissionCheck & { authorized: true; session: NonNullable<PermissionCheck['session']> } };

function roleReasonLabel(reason: RoleManageabilityReason | 'ABOVE_ACTOR_ROLE' | null): string | null {
  switch (reason) {
    case 'EVERYONE': return 'The @everyone role cannot be managed.';
    case 'MANAGED': return 'Discord integration roles cannot be managed here.';
    case 'MISSING_MANAGE_ROLES': return 'KRAXXBot does not have Manage Roles permission.';
    case 'ABOVE_BOT_ROLE': return 'This role is at or above KRAXXBot’s highest role.';
    case 'ABOVE_ACTOR_ROLE': return 'Your highest role is below this role.';
    default: return null;
  }
}

function parseRoleColor(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return 0;
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) throw new PolicyError('Role color must be a six-digit hex value such as #5865F2.');
  return Number.parseInt(value.slice(1), 16);
}

function parseRoleFields(body: Record<string, unknown>, partial: boolean) {
  const fields: { name?: string; color?: number; hoist?: boolean; mentionable?: boolean; permissions?: string } = {};
  if (!partial || body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length < 1 || body.name.trim().length > 100) throw new PolicyError('Role name must be between 1 and 100 characters.');
    fields.name = body.name.trim();
  }
  if (body.color !== undefined) fields.color = parseRoleColor(body.color);
  for (const key of ['hoist', 'mentionable'] as const) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== 'boolean') throw new PolicyError(`${key} must be a boolean.`);
      fields[key] = body[key];
    }
  }
  if (body.permissions !== undefined) {
    if (typeof body.permissions !== 'string' || !/^\d+$/.test(body.permissions)) throw new PolicyError('Role permissions must be a numeric Discord bitfield.');
    fields.permissions = body.permissions;
  }
  return fields;
}

function actorCanManageRole(actorId: string, role: DiscordRole, context: Awaited<ReturnType<typeof fetchBotRoleContext>>, actorBits: bigint, actorPosition: number) {
  const isOwner = actorId === context.guild.owner_id;
  if (role.id === context.guild.id || role.managed || !getRoleManageability(role, context).manageable) return false;
  return isOwner || (hasPermission(actorBits, MANAGE_ROLES) && role.position < actorPosition);
}

async function getAuthorizedGuild(request: NextRequest): Promise<AuthorizedGuild | { response: NextResponse }> {
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return { response: NextResponse.json({ error: 'guildId is required.' }, { status: 400 }) };
  const access = await requireGuildAccess(guildId);
  if (!access.authorized) return { response: NextResponse.json({ error: access.error || access.reason }, { status: access.status }) };
  return { guildId, access: access as AuthorizedGuild['access'] };
}

export async function GET(request: NextRequest) {
  const result = await getAuthorizedGuild(request);
  if (!('guildId' in result)) return result.response;
  const { guildId, access } = result;
  try {
    const [roles, members, actor] = await Promise.all([fetchGuildRoles(guildId), fetchGuildMembers(guildId, 1000), fetchGuildMember(guildId, access.session!.user.discordId)]);
    const context = await fetchBotRoleContext(guildId);
    const actorBits = memberPermissions(actor, context);
    const actorPosition = memberPosition(actor, context);
    const roleCountMap = new Map<string, number>();
    members.forEach((member) => member.roles.forEach((roleId) => roleCountMap.set(roleId, (roleCountMap.get(roleId) || 0) + 1)));
    const enrichedRoles = roles.map((role) => {
      const botCapability = getRoleManageability(role, context);
      const manageable = actorCanManageRole(access.session!.user.discordId, role, context, actorBits, actorPosition);
      const manageabilityReason = manageable ? null : botCapability.manageabilityReason || (access.session!.user.discordId === context.guild.owner_id ? null : 'ABOVE_ACTOR_ROLE');
      return {
        id: role.id, name: role.name, color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : null,
        position: role.position, permissions: role.permissions, memberCount: roleCountMap.get(role.id) || 0,
        isManaged: role.managed, manageable, manageabilityReason,
        manageabilityMessage: roleReasonLabel(manageabilityReason),
      };
    }).sort((a, b) => b.position - a.position);
    return NextResponse.json({ roles: enrichedRoles, total: enrichedRoles.length, memberCountsAvailable: true });
  } catch (error: unknown) {
    console.error('Failed to fetch guild roles:', error);
    return NextResponse.json({ error: 'Unable to load this server’s role hierarchy from Discord.' }, { status: 502 });
  }
}

async function handlePOST(request: NextRequest) {
  const result = await getAuthorizedGuild(request);
  if (!('guildId' in result)) return result.response;
  const { guildId, access } = result;
  const body = await request.json() as Record<string, unknown>;
  const fields = parseRoleFields(body, false);
  if (!fields.name) return NextResponse.json({ error: 'Role name is required.' }, { status: 400 });
  const role = await createGuildRole(guildId, { ...fields, name: fields.name }, `Role created via KRAXX Operations Dashboard by ${access.session!.user.name || 'dashboard user'}`);
  await logDashboardAction({ guildId, executorId: access.session!.user.discordId, action: 'ROLE_CREATE', targetId: role.id, targetType: 'ROLE', details: { name: role.name } });
  return NextResponse.json({ role }, { status: 201 });
}

async function handlePATCH(request: NextRequest) {
  const result = await getAuthorizedGuild(request);
  if (!('guildId' in result)) return result.response;
  const { guildId, access } = result;
  const body = await request.json() as Record<string, unknown>;
  const roleId = typeof body.roleId === 'string' ? body.roleId : '';
  if (!/^\d{17,20}$/.test(roleId)) return NextResponse.json({ error: 'A valid roleId is required.' }, { status: 400 });
  await authorizeRole(guildId, access.session!.user.discordId, roleId);
  const fields = parseRoleFields(body, true);
  if (Object.keys(fields).length === 0) return NextResponse.json({ error: 'No editable role fields were provided.' }, { status: 400 });
  const role = await editGuildRole(guildId, roleId, fields, `Role updated via KRAXX Operations Dashboard by ${access.session!.user.name || 'dashboard user'}`);
  await logDashboardAction({ guildId, executorId: access.session!.user.discordId, action: 'ROLE_UPDATE', targetId: roleId, targetType: 'ROLE', details: fields });
  return NextResponse.json({ role });
}

async function handleDELETE(request: NextRequest) {
  const result = await getAuthorizedGuild(request);
  if (!('guildId' in result)) return result.response;
  const { guildId, access } = result;
  const roleId = request.nextUrl.searchParams.get('roleId');
  if (!roleId || !/^\d{17,20}$/.test(roleId)) return NextResponse.json({ error: 'A valid roleId is required.' }, { status: 400 });
  await authorizeRole(guildId, access.session!.user.discordId, roleId);
  await deleteGuildRole(guildId, roleId, `Role deleted via KRAXX Operations Dashboard by ${access.session!.user.name || 'dashboard user'}`);
  await logDashboardAction({ guildId, executorId: access.session!.user.discordId, action: 'ROLE_DELETE', targetId: roleId, targetType: 'ROLE' });
  return NextResponse.json({ success: true, roleId });
}

export const POST = withMutation('MANAGE_ROLES', handlePOST);
export const PATCH = withMutation('MANAGE_ROLES', handlePATCH);
export const DELETE = withMutation('MANAGE_ROLES', handleDELETE);
