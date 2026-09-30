const { test } = module.require('node:test');
const assert = module.require('node:assert/strict');
module.require('ts-node/register/transpile-only');

let databaseUrl;
try { databaseUrl = new URL(process.env.DATABASE_URL); } catch {}
if (!databaseUrl || !['127.0.0.1', 'localhost', '::1'].includes(databaseUrl.hostname)
  || !/^kraxxbot_gate_[a-z0-9_]+$/i.test(databaseUrl.pathname.slice(1))) {
  test('custom command integration requires the named disposable loopback gate database', { skip: true }, () => {});
} else {
  const { PrismaClient } = module.require('@prisma/client');
  const { CustomCommandService } = module.require('../src/services/custom-command.service.ts');
  const { MessageOperationService } = module.require('../src/services/message-operation.service.ts');
  const db = new PrismaClient();
  let sequence = BigInt('820000000000000000') + BigInt(Date.now()) * 100n;
  const id = () => String(++sequence);
  const guildA = id(), guildB = id(), actor = id(), actorB = id(), actorReplay = id(), channel = id();
  const context = (overrides = {}) => ({ guildId: guildA, trigger: 'hello', actorId: actor, channelId: channel, eventId: id(),
    vars: { user: 'Member', mention: `<@${actor}>`, guild: 'Guild A', channel: 'general' }, authorize: async () => {
      const member = await db.guildMember.findUnique({ where: { guildId_discordId: { guildId: overrides.guildId || guildA, discordId: overrides.actorId || actor } } });
      if (!member) throw new Error('NOT_A_GUILD_MEMBER');
    }, ...overrides });
  const dispatch = async ({ content, idempotencyKey }) => ({ status: content && idempotencyKey ? 'SUCCESS' : 'FAILURE' });
  const executeOperation = (ctx, send = async () => ({ messageId: id() })) => CustomCommandService.execute(ctx,
    (operation, beforeCreate) => MessageOperationService.execute({ guildId: ctx.guildId, actorId: ctx.actorId, source: 'BOT',
      operationType: 'SEND', idempotencyKey: operation.idempotencyKey, channelId: ctx.channelId, content: operation.content, mentionMode: 'NONE' },
    { authorize: async () => {}, send, edit: async () => { throw new Error('UNSUPPORTED'); }, delete: async () => { throw new Error('UNSUPPORTED'); } }, beforeCreate));

  test('custom command persistence, guild isolation, module enforcement, execution and durable concurrent cooldown', async t => {
    await db.guild.createMany({ data: [
      { id: guildA, name: 'Custom A', ownerId: actor }, { id: guildB, name: 'Custom B', ownerId: actorB },
    ] });
    await db.guildModule.createMany({ data: [
      { guildId: guildA, module: 'customCommands', enabled: true }, { guildId: guildB, module: 'customCommands', enabled: true },
    ] });
    await db.guildMember.createMany({ data: [
      { guildId: guildA, discordId: actor, username: 'Actor A', displayName: 'Actor A', updatedAt: new Date() },
      { guildId: guildA, discordId: actorB, username: 'Actor B', displayName: 'Actor B', updatedAt: new Date() },
      { guildId: guildA, discordId: actorReplay, username: 'Replay Actor', displayName: 'Replay Actor', updatedAt: new Date() },
      { guildId: guildB, discordId: actorB, username: 'Actor B', displayName: 'Actor B', updatedAt: new Date() },
    ] });
    try {
      const command = await CustomCommandService.create({ guildId: guildA, trigger: 'Hello', response: 'Hi {user} in {guild}', actorId: actor });
      await assert.rejects(CustomCommandService.create({ guildId: guildA, trigger: 'hello', response: 'duplicate', actorId: actor }), e => e.code === 'P2002');
      const otherGuildCommand = await CustomCommandService.create({ guildId: guildB, trigger: 'hello', response: 'Other guild', actorId: actorB });
      assert.notEqual(command.id, otherGuildCommand.id);

      await t.test('execution is tenant-bound, validates membership, and renders only literal variables', async () => {
        const sent = [];
        const result = await CustomCommandService.execute(context(), async item => { sent.push(item); return dispatch(item); });
        assert.equal(result.status, 'SUCCESS');
        assert.equal(sent[0].content, 'Hi Member in Guild A');
        assert.match(sent[0].idempotencyKey, /^custom-/);
        const repeatedEvent = context({ eventId: id() });
        let sends = 0;
        const first = await executeOperation(repeatedEvent, async () => ({ messageId: (sends++, id()) }));
        const retry = await executeOperation(repeatedEvent, async () => ({ messageId: (sends++, id()) }));
        assert.equal(retry.operationId, first.operationId, 're-delivery reuses durable operation identity');
        assert.equal(retry.messageId, first.messageId);
        assert.equal(sends, 1);
        await assert.rejects(CustomCommandService.execute(context({ authorize: async () => { throw new Error('NOT_A_GUILD_MEMBER'); } }), dispatch), /NOT_A_GUILD_MEMBER/);
        await assert.rejects(CustomCommandService.execute(context({ guildId: guildA, trigger: 'not-in-a' }), dispatch), /COMMAND_NOT_FOUND/);
        await assert.rejects(CustomCommandService.execute(context({ guildId: guildB, trigger: 'hello' }), dispatch), /NOT_A_GUILD_MEMBER/);
        await assert.rejects(CustomCommandService.execute(context({ vars: { user: '{guild}', mention: '', guild: '', channel: '' } }), async x => {
          assert.equal(x.content, '{guild}'); return dispatch(x);
        }), /INVALID_RENDERED_RESPONSE/);
      });

      await t.test('disabled command and disabled module fail closed; records cannot cross guild boundaries', async () => {
        await assert.rejects(CustomCommandService.update({ guildId: guildA, id: otherGuildCommand.id, trigger: 'changed', response: 'foreign', enabled: true, cooldownSeconds: 0, actorId: actor }), /COMMAND_NOT_FOUND/);
        assert.equal((await db.customCommand.findUnique({ where: { id: otherGuildCommand.id } })).trigger, 'hello');
        await CustomCommandService.update({ guildId: guildA, id: command.id, trigger: command.trigger, response: command.response, enabled: false, cooldownSeconds: 0, actorId: actor });
        await assert.rejects(CustomCommandService.execute(context(), dispatch), /COMMAND_NOT_FOUND/);
        assert.equal(await CustomCommandService.remove(guildA, otherGuildCommand.id), false);
        assert.ok(await db.customCommand.findUnique({ where: { id: otherGuildCommand.id } }));
        await CustomCommandService.update({ guildId: guildA, id: command.id, trigger: command.trigger, response: command.response, enabled: true, cooldownSeconds: 0, actorId: actor });
        await db.guildModule.update({ where: { guildId_module: { guildId: guildA, module: 'customCommands' } }, data: { enabled: false } });
        await assert.rejects(CustomCommandService.execute(context(), dispatch), /MODULE_DISABLED/);
        await db.guildModule.update({ where: { guildId_module: { guildId: guildA, module: 'customCommands' } }, data: { enabled: true } });
      });

      await t.test('persistent cooldown is per-user and concurrency-safe', async () => {
        const limited = await CustomCommandService.create({ guildId: guildA, trigger: 'limited', response: 'ok', cooldownSeconds: 60, actorId: actor });
        const raceContexts = [context({ trigger: 'limited' }), context({ trigger: 'limited' })];
        const race = await Promise.allSettled(raceContexts.map(ctx => executeOperation(ctx)));
        assert.equal(race.filter(item => item.status === 'fulfilled').length, 1);
        assert.equal(race.filter(item => item.status === 'rejected' && item.reason.message === 'COMMAND_COOLDOWN').length, 1);
        assert.equal(await db.messageOperation.count({ where: { guildId: guildA, idempotencyKey: { in: raceContexts.map(ctx => `custom-${ctx.eventId}`) } } }), 1);
        await assert.rejects(executeOperation(context({ trigger: 'limited' })), /COMMAND_COOLDOWN/);
        assert.equal((await executeOperation(context({ trigger: 'limited', actorId: actorB }))).status, 'SUCCESS');
        await db.customCommandUse.updateMany({ where: { guildId: guildA, customCommandId: limited.id, userId: actor }, data: { lastExecutedAt: new Date(Date.now() - 61000) } });
        assert.equal((await executeOperation(context({ trigger: 'limited' }))).status, 'SUCCESS');
        await CustomCommandService.create({ guildId: guildA, trigger: 'independent', response: 'other command', cooldownSeconds: 60, actorId: actor });
        assert.equal((await executeOperation(context({ trigger: 'independent' }))).status, 'SUCCESS',
          'a separate command has an independent cooldown for the same member');
      });

      await t.test('cooldown does not interfere with completed or pending same-interaction replays', async () => {
        const limited = await db.customCommand.findFirstOrThrow({ where: { guildId: guildA, normalizedTrigger: 'limited' } });
        const repeatedEvent = context({ trigger: 'limited', actorId: actorReplay, eventId: id() });
        let sends = 0;
        const first = await executeOperation(repeatedEvent, async () => ({ messageId: (sends++, id()) }));
        const retry = await executeOperation(repeatedEvent, async () => ({ messageId: (sends++, id()) }));
        assert.equal(retry.operationId, first.operationId);
        assert.equal(retry.status, 'SUCCESS');
        assert.equal(sends, 1);

        await db.customCommandUse.deleteMany({ where: { guildId: guildA, customCommandId: limited.id, userId: actorReplay } });
        const pendingEvent = context({ trigger: 'limited', actorId: actorReplay, eventId: id() });
        let started;
        const startedPromise = new Promise(resolve => { started = resolve; });
        let release;
        const releasePromise = new Promise(resolve => { release = resolve; });
        let pendingSends = 0;
        const firstPending = executeOperation(pendingEvent, async () => { pendingSends++; started(); await releasePromise; return { messageId: id() }; });
        await startedPromise;
        const pendingReplay = await executeOperation(pendingEvent, async () => { pendingSends++; return { messageId: id() }; });
        assert.equal(pendingReplay.status, 'PENDING');
        release();
        const completed = await firstPending;
        assert.equal(pendingReplay.operationId, completed.operationId);
        assert.equal(pendingSends, 1);
      });

      await t.test('cooldowns and operation identities remain isolated across guilds', async () => {
        const limited = await db.customCommand.findFirstOrThrow({ where: { guildId: guildA, normalizedTrigger: 'limited' } });
        await CustomCommandService.create({ guildId: guildB, trigger: 'limited', response: 'other', cooldownSeconds: 60, actorId: actorB });
        await db.customCommandUse.deleteMany({ where: { guildId: guildA, customCommandId: limited.id, userId: actorReplay } });
        const sharedEventId = id();
        const a = await executeOperation(context({ trigger: 'limited', actorId: actorReplay, eventId: sharedEventId }));
        const b = await executeOperation(context({ guildId: guildB, actorId: actorB, trigger: 'limited', eventId: sharedEventId }));
        assert.notEqual(a.operationId, b.operationId);
        assert.equal(a.status, 'SUCCESS');
        assert.equal(b.status, 'SUCCESS');
      });

      await t.test('deletion is scoped to tenant', async () => {
        assert.equal(await CustomCommandService.remove(guildA, otherGuildCommand.id), false);
        assert.equal(await CustomCommandService.remove(guildB, otherGuildCommand.id), true);
      });
    } finally {
      await db.guild.deleteMany({ where: { id: { in: [guildA, guildB] } } });
      await db.$disconnect();
    }
  });
}
