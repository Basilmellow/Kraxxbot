import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../database/client';

const SNOWFLAKE = /^\d{17,20}$/;
const TRIGGER = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const MAX_RESPONSE = 1800;
const ALLOWED_VARIABLES = new Set(['user', 'mention', 'guild', 'channel']);

export function canExecuteCustomCommand(isGuildContext: boolean, actorIsBot: boolean): boolean {
  return isGuildContext && !actorIsBot;
}

function validateTemplate(template: string): void {
  for (const [, key] of template.matchAll(/\{([^{}]+)\}/g)) if (!ALLOWED_VARIABLES.has(key)) throw new Error('INVALID_TEMPLATE_VARIABLE');
  const stripped = template.replace(/\{(user|mention|guild|channel)\}/g, 'x');
  if (stripped.includes('{') || stripped.includes('}')) throw new Error('INVALID_TEMPLATE_VARIABLE');
}

export function validateCustomCommand(input: { guildId: unknown; trigger: unknown; response: unknown; cooldownSeconds?: unknown }) {
  if (typeof input.guildId !== 'string' || !SNOWFLAKE.test(input.guildId)) throw new Error('INVALID_GUILD');
  if (typeof input.trigger !== 'string' || !TRIGGER.test(input.trigger.trim().toLowerCase())) throw new Error('INVALID_TRIGGER');
  if (typeof input.response !== 'string' || !input.response.trim() || input.response.length > MAX_RESPONSE) throw new Error('INVALID_RESPONSE');
  validateTemplate(input.response);
  const cooldownSeconds = input.cooldownSeconds === undefined ? 0 : input.cooldownSeconds;
  if (typeof cooldownSeconds !== 'number' || !Number.isInteger(cooldownSeconds)
    || (cooldownSeconds !== 0 && (cooldownSeconds < 5 || cooldownSeconds > 86400))) throw new Error('INVALID_COOLDOWN');
  return { guildId: input.guildId, trigger: input.trigger.trim(), normalizedTrigger: input.trigger.trim().toLowerCase(),
    response: input.response.trim(), cooldownSeconds: cooldownSeconds as number };
}

export function renderCustomCommand(template: string, vars: { user: string; mention: string; guild: string; channel: string }): string {
  const tokens = [...template.matchAll(/\{([^{}]+)\}/g)];
  for (const [, key] of tokens) if (!ALLOWED_VARIABLES.has(key)) throw new Error('UNKNOWN_TEMPLATE_VARIABLE');
  const rendered = template.replace(/\{(user|mention|guild|channel)\}/g, (_match, key: keyof typeof vars) => vars[key]);
  if (rendered.includes('{') || rendered.includes('}') || rendered.length > 2000 || !rendered.trim()) throw new Error('INVALID_RENDERED_RESPONSE');
  return rendered;
}

export class CustomCommandService {
  static async create(input: { guildId: string; trigger: string; response: string; cooldownSeconds?: number; actorId: string }) {
    const command = validateCustomCommand(input);
    if (!SNOWFLAKE.test(input.actorId)) throw new Error('INVALID_ACTOR');
    return prisma.customCommand.create({ data: { ...command, createdBy: input.actorId, updatedBy: input.actorId } });
  }

  static async update(input: { guildId: string; id: string; trigger: string; response: string; enabled: boolean; cooldownSeconds: number; actorId: string }) {
    const command = validateCustomCommand(input);
    if (!SNOWFLAKE.test(input.actorId) || typeof input.enabled !== 'boolean') throw new Error('INVALID_ACTOR');
    const changed = await prisma.customCommand.updateMany({ where: { id: input.id, guildId: input.guildId }, data: {
      trigger: command.trigger, normalizedTrigger: command.normalizedTrigger, response: command.response,
      cooldownSeconds: command.cooldownSeconds, enabled: input.enabled, updatedBy: input.actorId,
    } });
    if (!changed.count) throw new Error('COMMAND_NOT_FOUND');
    return prisma.customCommand.findFirst({ where: { id: input.id, guildId: input.guildId } });
  }

  static async remove(guildId: string, id: string): Promise<boolean> {
    const result = await prisma.customCommand.deleteMany({ where: { id, guildId } });
    return result.count === 1;
  }

  static async execute(input: { guildId: string; trigger: string; actorId: string; channelId: string; eventId: string;
    vars: { user: string; mention: string; guild: string; channel: string }; authorize: () => Promise<void> },
    dispatch: (input: { content: string; idempotencyKey: string },
      beforeCreate?: (tx: Prisma.TransactionClient) => Promise<void>) => Promise<{ status: string }>) {
    if (!SNOWFLAKE.test(input.guildId) || !SNOWFLAKE.test(input.actorId) || !SNOWFLAKE.test(input.channelId) || !SNOWFLAKE.test(input.eventId))
      throw new Error('INVALID_EXECUTION_CONTEXT');
    await input.authorize();
    const [module, command] = await Promise.all([
      prisma.guildModule.findUnique({ where: { guildId_module: { guildId: input.guildId, module: 'customCommands' } } }),
      prisma.customCommand.findFirst({ where: { guildId: input.guildId, normalizedTrigger: input.trigger.toLowerCase(), enabled: true } }),
    ]);
    if (!module?.enabled) throw new Error('MODULE_DISABLED');
    if (!command) throw new Error('COMMAND_NOT_FOUND');
    const content = renderCustomCommand(command.response, input.vars);
    const claimCooldown = command.cooldownSeconds === 0 ? undefined : async (tx: Prisma.TransactionClient) => {
      const claimed = await tx.$executeRaw(Prisma.sql`INSERT INTO "CustomCommandUse" ("id", "guildId", "customCommandId", "userId", "lastExecutedAt")
        VALUES (${randomUUID()}, ${input.guildId}, ${command.id}, ${input.actorId}, CURRENT_TIMESTAMP)
        ON CONFLICT ("guildId", "customCommandId", "userId") DO UPDATE SET "lastExecutedAt" = CURRENT_TIMESTAMP
        WHERE "CustomCommandUse"."lastExecutedAt" <= CURRENT_TIMESTAMP - (${command.cooldownSeconds} * INTERVAL '1 second')`);
      if (!claimed) throw new Error('COMMAND_COOLDOWN');
    };
    return dispatch({ content, idempotencyKey: `custom-${input.eventId}` }, claimCooldown);
  }
}
