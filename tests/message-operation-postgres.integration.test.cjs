const { test } = module.require('node:test');
const assert = module.require('node:assert/strict');
const { randomUUID } = module.require('node:crypto');
const { createHash } = module.require('node:crypto');
module.require('ts-node/register/transpile-only');

let databaseUrl;
try { databaseUrl = new URL(process.env.DATABASE_URL); } catch {}
if (!databaseUrl || !['127.0.0.1', 'localhost', '::1'].includes(databaseUrl.hostname)
  || !/^kraxxbot_gate_[a-z0-9_]+$/i.test(databaseUrl.pathname.slice(1))) {
  test('message operation integration requires the named disposable loopback gate database', { skip: true }, () => {});
} else {
  const { PrismaClient } = module.require('@prisma/client');
  const { MessageOperationService } = module.require('../src/services/message-operation.service.ts');
  const { DiscordApiError } = module.require('../src/services/discord-transport.ts');
  const { PolicyError } = module.require('../src/security/policy.ts');
  const db = new PrismaClient();
  let sequence = BigInt('800000000000000000') + BigInt(Date.now()) * 100n;
  const id = () => String(++sequence);
  const guildA = id(), guildB = id(), actor = id(), otherActor = id(), channelA = id(), channelB = id();
  const channelGuild = new Map([[channelA, guildA], [channelB, guildB]]);
  const messageChannel = new Map();
  const invalidTarget = id();
  const makeInput = (overrides = {}) => ({ guildId: guildA, actorId: actor, source: 'BOT', operationType: 'SEND',
    idempotencyKey: randomUUID(), channelId: channelA, content: 'integration message', ...overrides });
  const adapter = (overrides = {}) => ({
    authorize: async input => {
      if (channelGuild.get(input.channelId) !== input.guildId) throw new PolicyError('cross-guild channel');
      if (overrides.actorDenied && input.actorId === otherActor) throw new PolicyError('actor denied');
      if (input.operationType === 'EDIT' && input.targetMessageId === invalidTarget) throw new DiscordApiError(404);
      if (['EDIT', 'DELETE', 'REPLY'].includes(input.operationType) && messageChannel.has(input.targetMessageId)
        && messageChannel.get(input.targetMessageId) !== input.channelId) throw new PolicyError('cross-guild message');
      if (overrides.botDenied) throw new PolicyError('bot capability denied');
    },
    send: async () => ({ messageId: id() }),
    edit: async (_args) => ({ messageId: _args.messageId }),
    delete: async () => ({ alreadyDeleted: false }),
    ...overrides,
  });
  const execute = (input, ad) => MessageOperationService.execute(input, ad || adapter());

  test('message operation persistence, idempotency, permissions and ambiguity semantics', async t => {
    await db.guild.createMany({ data: [
      { id: guildA, name: 'message operation test A', ownerId: actor },
      { id: guildB, name: 'message operation test B', ownerId: otherActor },
    ] });
    t.after(async () => {
      await db.guild.deleteMany({ where: { id: { in: [guildA, guildB] } } });
      await db.$disconnect();
    });

    await t.test('SEND success, durable audit, and exact retry dispatch once', async () => {
      let sends = 0;
      const body = makeInput();
      body.components = [{ type: 1, components: [{ type: 2, custom_id: 'example' }] }];
      const ad = adapter({ send: async args => {
        assert.deepEqual(args.allowedMentions, { parse: [] });
        assert.deepEqual(args.components, body.components);
        assert.equal(args.nonce.length, 25);
        return { messageId: (sends++, id()) };
      } });
      const first = await execute(body, ad);
      const retry = await execute(body, ad);
      assert.equal(first.status, 'SUCCESS');
      assert.equal(retry.operationId, first.operationId);
      assert.equal(retry.messageId, first.messageId);
      assert.equal(sends, 1);
      await assert.rejects(execute(makeInput({ idempotencyKey: 'too-short' })), /INVALID_IDEMPOTENCY_KEY/);
      await assert.rejects(execute(makeInput({ content: '' })), /EMPTY_MESSAGE/);
      assert.equal(await db.auditLog.count({ where: { guildId: guildA, action: 'MESSAGE_OPERATION' } }), 2);
    });

    await t.test('mass mentions require explicit opt-in and role mentions are allow-listed', async () => {
      const everyone = makeInput({ content: 'Attention', mentionMode: 'EVERYONE' });
      let accepted;
      const everyoneResult = await execute(everyone, adapter({ send: async args => { accepted = args; return { messageId: id() }; } }));
      assert.equal(everyoneResult.status, 'SUCCESS');
      assert.deepEqual(accepted.allowedMentions, { parse: ['everyone'] });
      assert.match(accepted.content, /^@everyone/);
      const roleId = id();
      const roleResult = await execute(makeInput({ content: 'Role notice', mentionMode: 'ROLE', mentionRoleId: roleId }),
        adapter({ send: async args => { accepted = args; return { messageId: id() }; } }));
      assert.equal(roleResult.status, 'SUCCESS');
      assert.deepEqual(accepted.allowedMentions, { parse: [], roles: [roleId] });
    });

    await t.test('concurrent duplicate requests have one dispatch owner', async () => {
      let sends = 0, started;
      const startedPromise = new Promise(resolve => { started = resolve; });
      let release;
      const releasePromise = new Promise(resolve => { release = resolve; });
      const body = makeInput();
      const ad = adapter({ send: async () => { sends++; started(); await releasePromise; return { messageId: id() }; } });
      const firstPromise = execute(body, ad);
      await startedPromise;
      const duplicate = await execute(body, ad);
      assert.equal(duplicate.status, 'PENDING');
      release();
      const first = await firstPromise;
      assert.equal(first.status, 'SUCCESS');
      assert.equal(sends, 1);
    });

    await t.test('operation status is tenant- and actor-scoped', async () => {
      const result = await execute(makeInput());
      const own = await MessageOperationService.getStatus(result.operationId, guildA, actor, 'BOT');
      const foreignActor = await MessageOperationService.getStatus(result.operationId, guildA, otherActor, 'BOT');
      const foreignGuild = await MessageOperationService.getStatus(result.operationId, guildB, actor, 'BOT');
      assert.equal(own.status, 'SUCCESS');
      assert.equal(foreignActor, null);
      assert.equal(foreignGuild, null);
    });

    await t.test('key conflicts reject different input, operation, or actor', async () => {
      const body = makeInput();
      await execute(body);
      await assert.rejects(execute({ ...body, content: 'changed input' }), /IDEMPOTENCY_KEY_CONFLICT/);
      await assert.rejects(execute({ ...body, components: [{ type: 1, components: [] }] }), /IDEMPOTENCY_KEY_CONFLICT/);
      await assert.rejects(execute({ ...body, operationType: 'EDIT', targetMessageId: id(), content: 'changed operation' }), /IDEMPOTENCY_KEY_CONFLICT/);
      await assert.rejects(execute({ ...body, actorId: otherActor }), /IDEMPOTENCY_KEY_CONFLICT/);
    });

    await t.test('tenant mismatch, actor denial, and bot denial stop before reservation', async () => {
      const cross = makeInput({ channelId: channelB });
      await assert.rejects(execute(cross), /cross-guild channel/);
      await assert.rejects(execute(makeInput({ actorId: otherActor }), adapter({ actorDenied: true })), /actor denied/);
      await assert.rejects(execute(makeInput(), adapter({ botDenied: true })), /bot capability denied/);
      assert.equal(await db.messageOperation.count({ where: { guildId: guildA, idempotencyKey: cross.idempotencyKey } }), 0);
    });

    await t.test('definite Discord rejection is FAILURE; timeout and 5xx are UNKNOWN', async () => {
      const denied = await execute(makeInput(), adapter({ send: async () => { throw new DiscordApiError(403); } }));
      const timeout = await execute(makeInput(), adapter({ send: async () => { throw new DiscordApiError(408); } }));
      const ambiguous = await execute(makeInput(), adapter({ send: async () => { throw new DiscordApiError(502); } }));
      assert.equal(denied.status, 'FAILURE');
      assert.equal(timeout.status, 'UNKNOWN');
      assert.equal(ambiguous.status, 'UNKNOWN');
    });

    await t.test('successful Discord send with failed database finalization stays UNKNOWN', async () => {
      const trigger = `kraxx_message_op_fail_update_${Date.now()}`;
      const body = makeInput();
      await db.$executeRawUnsafe(`CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."guildId" = '${guildA}' AND NEW."idempotencyKey" = '${body.idempotencyKey}' AND NEW."status" = 'SUCCESS' THEN RAISE EXCEPTION 'injected finalization failure'; END IF; RETURN NEW; END $$`);
      await db.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE UPDATE ON "MessageOperation" FOR EACH ROW EXECUTE FUNCTION ${trigger}()`);
      try {
        let sends = 0;
        const result = await execute(body, adapter({ send: async () => ({ messageId: (sends++, id()) }) }));
        assert.equal(result.status, 'UNKNOWN');
        assert.equal(sends, 1);
        const saved = await db.messageOperation.findUniqueOrThrow({ where: { guildId_idempotencyKey: { guildId: guildA, idempotencyKey: body.idempotencyKey } } });
        assert.equal(saved.status, 'UNKNOWN');
        assert.ok(saved.discordMessageId);
        const unknownAudit = await db.auditLog.findFirst({ where: { guildId: guildA, action: 'MESSAGE_OPERATION', targetId: saved.discordMessageId } });
        assert.equal(JSON.parse(unknownAudit.details).outcome, 'UNKNOWN');
      } finally {
        await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${trigger} ON "MessageOperation"`);
        await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${trigger}()`);
      }
    });

    await t.test('expired PENDING operations become UNKNOWN without replay', async () => {
      const body = makeInput();
      const inputHash = createHash('sha256').update(JSON.stringify({ operationType: body.operationType, channelId: body.channelId,
        targetMessageId: null, content: body.content, embeds: null, components: null, mentionMode: 'NONE', mentionRoleId: null })).digest('hex');
      const stale = await db.messageOperation.create({ data: { guildId: guildA, actorId: actor, operationType: body.operationType,
        idempotencyKey: body.idempotencyKey, inputHash, channelId: channelA, status: 'PENDING', leaseToken: randomUUID(),
        leaseExpiresAt: new Date(Date.now() - 1000) } });
      let sends = 0;
      const result = await execute(body, adapter({ send: async () => { sends++; return { messageId: id() }; } }));
      assert.equal(result.operationId, stale.id);
      assert.equal(result.status, 'UNKNOWN');
      assert.equal(sends, 0);
    });

    await t.test('EDIT success and duplicate are durable, while invalid/cross-guild targets are rejected', async () => {
      const target = id();
      let edits = 0;
      const body = makeInput({ operationType: 'EDIT', targetMessageId: target, content: 'edited' });
      const ad = adapter({ edit: async () => { edits++; return { messageId: target }; } });
      assert.equal((await execute(body, ad)).status, 'SUCCESS');
      assert.equal((await execute(body, ad)).status, 'SUCCESS');
      assert.equal(edits, 1);
      await assert.rejects(execute(makeInput({ operationType: 'EDIT', targetMessageId: id(), channelId: channelB })), /cross-guild channel/);
      await assert.rejects(execute(makeInput({ operationType: 'EDIT', targetMessageId: invalidTarget })), error => error instanceof DiscordApiError && error.status === 404);
      const crossGuildMessage = id();
      messageChannel.set(crossGuildMessage, channelB);
      await assert.rejects(execute(makeInput({ operationType: 'EDIT', targetMessageId: crossGuildMessage })), /cross-guild message/);
      assert.equal((await execute(makeInput({ operationType: 'EDIT', targetMessageId: id() }), adapter({ edit: async () => { throw new DiscordApiError(403); } }))).status, 'FAILURE');
      assert.equal((await execute(makeInput({ operationType: 'EDIT', targetMessageId: id() }), adapter({ edit: async () => { throw new DiscordApiError(502); } }))).status, 'UNKNOWN');
    });

    await t.test('DELETE retries are stable and already-gone messages are deterministic', async () => {
      let deletes = 0;
      const body = makeInput({ operationType: 'DELETE', content: undefined, targetMessageId: id() });
      const ad = adapter({ delete: async () => { deletes++; return { alreadyDeleted: false }; } });
      const first = await execute(body, ad);
      const retry = await execute(body, ad);
      assert.equal(first.status, 'SUCCESS');
      assert.equal(retry.status, 'SUCCESS');
      assert.equal(deletes, 1);
      const alreadyGoneInput = makeInput({ operationType: 'DELETE', content: undefined, targetMessageId: id() });
      const alreadyGoneAdapter = adapter({ delete: async () => ({ alreadyDeleted: true }) });
      const alreadyGone = await execute(alreadyGoneInput, alreadyGoneAdapter);
      assert.equal(alreadyGone.status, 'SUCCESS');
      assert.equal(alreadyGone.alreadyDeleted, true);
      assert.equal((await execute(alreadyGoneInput, alreadyGoneAdapter)).alreadyDeleted, true);
      await assert.rejects(execute(makeInput({ operationType: 'DELETE', content: undefined, targetMessageId: id(), channelId: channelB })), /cross-guild channel/);
      const foreignMessage = id();
      messageChannel.set(foreignMessage, channelB);
      await assert.rejects(execute(makeInput({ operationType: 'DELETE', content: undefined, targetMessageId: foreignMessage })), /cross-guild message/);
      assert.equal((await execute(makeInput({ operationType: 'DELETE', content: undefined, targetMessageId: id() }), adapter({ delete: async () => { throw new DiscordApiError(403); } }))).status, 'FAILURE');
      assert.equal((await execute(makeInput({ operationType: 'DELETE', content: undefined, targetMessageId: id() }), adapter({ delete: async () => { throw new DiscordApiError(408); } }))).status, 'UNKNOWN');
    });

    await t.test('DELETE success followed by audit failure is UNKNOWN and never dispatched twice', async () => {
      const trigger = `kraxx_message_op_fail_audit_${Date.now()}`;
      await db.$executeRawUnsafe(`CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."guildId" = '${guildA}' AND NEW."executorId" = '${actor}' AND NEW."action" = 'MESSAGE_OPERATION' AND NEW."details"::jsonb->>'outcome' = 'SUCCESS' THEN RAISE EXCEPTION 'injected audit failure'; END IF; RETURN NEW; END $$`);
      await db.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION ${trigger}()`);
      try {
        const body = makeInput({ operationType: 'DELETE', content: undefined, targetMessageId: id() });
        let deletes = 0;
        const ad = adapter({ delete: async () => { deletes++; return { alreadyDeleted: false }; } });
        const result = await execute(body, ad);
        assert.equal(result.status, 'UNKNOWN');
        assert.equal(deletes, 1);
        assert.equal((await execute(body, ad)).status, 'UNKNOWN');
        assert.equal(deletes, 1);
      } finally {
        await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${trigger} ON "AuditLog"`);
        await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${trigger}()`);
      }
    });

    await t.test('embed payload success, duplicate, validation, and Discord rejection', async () => {
      let sends = 0;
      const body = makeInput({ embeds: [{ title: 'Integration embed', description: 'Safe test' }] });
      const ad = adapter({ send: async () => ({ messageId: (sends++, id()) }) });
      assert.equal((await execute(body, ad)).status, 'SUCCESS');
      assert.equal((await execute(body, ad)).status, 'SUCCESS');
      assert.equal(sends, 1);
      await assert.rejects(execute(makeInput({ embeds: new Array(11).fill({ title: 'too many' }) })), /INVALID_MESSAGE_EMBEDS/);
      assert.equal((await execute(makeInput({ embeds: [{ title: 'Reject' }] }), adapter({ send: async () => { throw new DiscordApiError(400); } }))).status, 'FAILURE');
    });

    await t.test('reply-to-message is also keyed and uses the canonical operation record', async () => {
      const target = id();
      const body = makeInput({ operationType: 'REPLY', targetMessageId: target, content: 'canonical reply' });
      let sends = 0;
      const ad = adapter({ send: async args => { sends++; assert.equal(args.replyToMessageId, target); return { messageId: id() }; } });
      const first = await execute(body, ad);
      const retry = await execute(body, ad);
      assert.equal(first.status, 'SUCCESS');
      assert.equal(retry.status, 'SUCCESS');
      assert.equal(sends, 1);
    });

    await t.test('bot pin operations are keyed and duplicate requests do not repeat the mutation', async () => {
      const body = makeInput({ operationType: 'PIN', content: undefined, targetMessageId: id() });
      let pins = 0;
      const ad = adapter({ pin: async () => { pins++; } });
      assert.equal((await execute(body, ad)).status, 'SUCCESS');
      assert.equal((await execute(body, ad)).status, 'SUCCESS');
      assert.equal(pins, 1);
    });
  });
}
