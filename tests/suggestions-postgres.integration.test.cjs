const { test } = module.require('node:test');
const assert = module.require('node:assert/strict');
const { randomUUID } = module.require('node:crypto');
module.require('ts-node/register/transpile-only');

let databaseUrl;
try { databaseUrl = new URL(process.env.DATABASE_URL); } catch {}
if (!databaseUrl || !['127.0.0.1', 'localhost', '::1'].includes(databaseUrl.hostname)
  || !/^kraxxbot_gate_[a-z0-9_]+$/i.test(databaseUrl.pathname.slice(1))) {
  test('suggestion integration requires the named disposable loopback gate database', { skip: true }, () => {});
} else {
  const { PrismaClient } = module.require('@prisma/client');
  const { SuggestionService } = module.require('../src/services/suggestion.service.ts');
  const db = new PrismaClient();
  let sequence = BigInt('810000000000000000') + BigInt(Date.now()) * 100n;
  const id = () => String(++sequence);
  const guildA = id(), guildB = id(), staff = id(), author = id(), outsider = id(), channelA = id(), channelB = id();
  const authorizeGuildMember = expected => async actor => { if (actor !== author && actor !== staff) throw new Error('NOT_A_GUILD_MEMBER'); if (expected !== guildA) throw new Error('GUILD_MISMATCH'); };
  const operationResults = new Map();
  let sends = 0;
  const dispatch = async operation => {
    if (!operationResults.has(operation.idempotencyKey)) {
      sends++;
      operationResults.set(operation.idempotencyKey, Promise.resolve({ operationId: randomUUID(), status: 'SUCCESS', messageId: id() }));
    }
    return operationResults.get(operation.idempotencyKey);
  };
  const submit = (overrides = {}) => SuggestionService.submit({ guildId: guildA, actorId: author, channelId: channelA,
    title: 'Keep the changelog', content: 'Publish release notes', idempotencyKey: `sug_${randomUUID()}`, ...overrides },
    () => authorizeGuildMember(guildA)(overrides.actorId || author), dispatch);

  test('suggestion persistence, idempotency, module/destination gates, tenant scope, and atomic review', async t => {
    await db.guild.createMany({ data: [
      { id: guildA, name: 'Suggestion A', ownerId: staff },
      { id: guildB, name: 'Suggestion B', ownerId: outsider },
    ] });
    await db.guildModule.createMany({ data: [
      { guildId: guildA, module: 'social', enabled: true, config: JSON.stringify({ suggestionChannelId: channelA }) },
      { guildId: guildB, module: 'social', enabled: true, config: JSON.stringify({ suggestionChannelId: channelB }) },
    ] });
    t.after(async () => { await db.guild.deleteMany({ where: { id: { in: [guildA, guildB] } } }); await db.$disconnect(); });

    await t.test('concurrent duplicate submission reserves one suggestion and one logical Discord send', async () => {
      const key = `sug_${randomUUID()}`;
      const input = { guildId: guildA, actorId: author, channelId: channelA, title: 'Same request', content: 'Same body', idempotencyKey: key };
      const before = sends;
      const [first, duplicate] = await Promise.all([
        SuggestionService.submit(input, () => authorizeGuildMember(guildA)(author), dispatch),
        SuggestionService.submit(input, () => authorizeGuildMember(guildA)(author), dispatch),
      ]);
      assert.equal(first.suggestion.id, duplicate.suggestion.id);
      assert.equal(first.operationStatus, 'SUCCESS');
      assert.equal(await db.suggestion.count({ where: { guildId: guildA, idempotencyKey: key } }), 1);
      assert.equal(sends - before, 1);
      assert.equal(await db.auditLog.count({ where: { guildId: guildA, targetId: first.suggestion.id, action: 'SUGGESTION_SUBMIT' } }), 2);
    });

    await t.test('concurrent distinct suggestions remain distinct; disabled module, invalid body and cross-guild channel fail closed', async () => {
      const [a, b] = await Promise.all([submit(), submit()]);
      assert.notEqual(a.suggestion.id, b.suggestion.id);
      await assert.rejects(submit({ title: ' ', idempotencyKey: `sug_${randomUUID()}` }), /INVALID_SUGGESTION_TITLE/);
      await assert.rejects(submit({ channelId: channelB, idempotencyKey: `sug_${randomUUID()}` }), /SUGGESTION_CHANNEL_MISMATCH/);
      await db.guildModule.update({ where: { guildId_module: { guildId: guildA, module: 'social' } }, data: { enabled: false } });
      await assert.rejects(submit({ idempotencyKey: `sug_${randomUUID()}` }), /SUGGESTIONS_DISABLED/);
      await db.guildModule.update({ where: { guildId_module: { guildId: guildA, module: 'social' } }, data: { enabled: true } });
    });

    await t.test('definite Discord failure and ambiguous delivery are never reported as success', async () => {
      const failed = await SuggestionService.submit({ guildId: guildA, actorId: author, channelId: channelA, title: 'Rejected', content: 'Body', idempotencyKey: `sug_${randomUUID()}` },
        () => authorizeGuildMember(guildA)(author), async () => ({ operationId: randomUUID(), status: 'FAILURE' }));
      assert.equal(failed.operationStatus, 'FAILURE');
      assert.equal(failed.suggestion.deliveryStatus, 'FAILURE');
      const unknownKey = `sug_${randomUUID()}`;
      const unknown = await SuggestionService.submit({ guildId: guildA, actorId: author, channelId: channelA, title: 'Unknown', content: 'Body', idempotencyKey: unknownKey },
        () => authorizeGuildMember(guildA)(author), async () => ({ operationId: randomUUID(), status: 'UNKNOWN' }));
      assert.equal(unknown.operationStatus, 'UNKNOWN');
      assert.equal(unknown.suggestion.deliveryStatus, 'UNKNOWN');
      const recoveredMessageId = id();
      await db.messageOperation.create({ data: { guildId: guildA, actorId: author, operationType: 'SEND', idempotencyKey: `suggestion_${unknownKey}`,
        inputHash: randomUUID(), channelId: channelA, status: 'UNKNOWN' } });
      const reconciled = await SuggestionService.recoverSubmission({ guildId: guildA, actorId: staff, suggestionId: unknown.suggestion.id }, async () => undefined,
        async (channel, suggestionId) => channel === channelA && suggestionId === unknown.suggestion.id ? recoveredMessageId : null);
      assert.equal(reconciled.operationStatus, 'SYNCED');
      assert.equal(reconciled.suggestion.messageId, recoveredMessageId);
      const permissionDenied = await SuggestionService.submit({ guildId: guildA, actorId: author, channelId: channelA, title: 'No bot permission', content: 'Still captured locally', idempotencyKey: `sug_${randomUUID()}` },
        () => authorizeGuildMember(guildA)(author), async () => { throw new Error('SUGGESTION_BOT_PERMISSION_DENIED'); });
      assert.equal(permissionDenied.operationStatus, 'FAILURE');
      assert.equal(permissionDenied.suggestion.deliveryStatus, 'FAILURE');
    });

    await t.test('Discord success with injected finalization failure is UNKNOWN and recovers from the durable message operation', async () => {
      const key = `sug_${randomUUID()}`;
      const trigger = `sug_fail_sync_${Date.now()}`.replace(/[^a-z0-9_]/gi, '_');
      const fn = `${trigger}_fn`;
      await db.$executeRawUnsafe(`CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."idempotencyKey" = '${key}' AND NEW."deliveryStatus" = 'SYNCED' THEN RAISE EXCEPTION 'injected suggestion finalization failure'; END IF; RETURN NEW; END $$`);
      await db.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE UPDATE ON "Suggestion" FOR EACH ROW EXECUTE FUNCTION ${fn}()`);
      const messageId = id();
      let created;
      try {
        created = await SuggestionService.submit({ guildId: guildA, actorId: author, channelId: channelA, title: 'Recovery', content: 'Recover persistence', idempotencyKey: key },
          () => authorizeGuildMember(guildA)(author), async () => ({ operationId: randomUUID(), status: 'SUCCESS', messageId }));
        assert.equal(created.operationStatus, 'UNKNOWN');
        assert.equal(created.suggestion.deliveryStatus, 'UNKNOWN');
      } finally {
        await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${trigger} ON "Suggestion"`);
        await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${fn}()`);
      }
      await db.messageOperation.create({ data: { guildId: guildA, actorId: author, operationType: 'SEND', idempotencyKey: `suggestion_${key}`,
        inputHash: randomUUID(), channelId: channelA, status: 'SUCCESS', discordMessageId: messageId } });
      const recovered = await SuggestionService.recoverSubmission({ guildId: guildA, actorId: staff, suggestionId: created.suggestion.id }, async () => undefined);
      assert.equal(recovered.operationStatus, 'SYNCED');
      assert.equal(recovered.suggestion.messageId, messageId);
      assert.equal(await db.auditLog.count({ where: { guildId: guildA, targetId: created.suggestion.id, action: 'SUGGESTION_SUBMIT' } }), 2);
      assert.equal(await db.auditLog.count({ where: { guildId: guildA, targetId: created.suggestion.id, action: 'SUGGESTION_RECOVERY' } }), 1);
    });

    await t.test('tenant-scoped status transition validates state, audit, and concurrent updates', async () => {
      const created = await submit();
      const result = await SuggestionService.transition({ guildId: guildA, actorId: staff, suggestionId: created.suggestion.id, status: 'UNDER_REVIEW' }, async () => undefined, dispatch);
      assert.equal(result.suggestion.status, 'UNDER_REVIEW');
      assert.equal(await db.auditLog.count({ where: { guildId: guildA, targetId: created.suggestion.id, action: 'SUGGESTION_REVIEW' } }), 1);
      await assert.rejects(SuggestionService.transition({ guildId: guildB, actorId: staff, suggestionId: created.suggestion.id, status: 'REJECTED' }, async () => undefined), /SUGGESTION_NOT_FOUND/);
      await assert.rejects(SuggestionService.transition({ guildId: guildA, actorId: staff, suggestionId: created.suggestion.id, status: 'SUBMITTED' }, async () => undefined), /INVALID_SUGGESTION_TRANSITION/);
      const race = await Promise.allSettled([
        SuggestionService.transition({ guildId: guildA, actorId: staff, suggestionId: created.suggestion.id, status: 'APPROVED' }, async () => undefined, dispatch),
        SuggestionService.transition({ guildId: guildA, actorId: outsider, suggestionId: created.suggestion.id, status: 'REJECTED' }, async () => undefined, dispatch),
      ]);
      assert.ok(race.some(item => item.status === 'fulfilled'));
      const final = await db.suggestion.findFirstOrThrow({ where: { id: created.suggestion.id, guildId: guildA } });
      assert.ok(['APPROVED', 'REJECTED'].includes(final.status));
      await assert.rejects(SuggestionService.transition({ guildId: guildA, actorId: outsider, suggestionId: created.suggestion.id, status: 'IMPLEMENTED' }, async () => { throw new Error('UNAUTHORIZED'); }), /UNAUTHORIZED/);
    });

    await t.test('unconfirmed staff message sync blocks later transitions and retries with the same operation key', async () => {
      const created = await submit();
      const keys = [];
      const first = await SuggestionService.transition({ guildId: guildA, actorId: staff, suggestionId: created.suggestion.id, status: 'UNDER_REVIEW' },
        async () => undefined, async operation => { keys.push(operation.idempotencyKey); return { operationId: randomUUID(), status: 'UNKNOWN' }; });
      assert.equal(first.operationStatus, 'UNKNOWN');
      await assert.rejects(SuggestionService.transition({ guildId: guildA, actorId: staff, suggestionId: created.suggestion.id, status: 'APPROVED' }, async () => undefined), /SUGGESTION_SYNC_UNCONFIRMED/);
      const retry = await SuggestionService.transition({ guildId: guildA, actorId: staff, suggestionId: created.suggestion.id, status: 'UNDER_REVIEW' },
        async () => undefined, async operation => { keys.push(operation.idempotencyKey); return { operationId: randomUUID(), status: 'SUCCESS', messageId: created.suggestion.messageId }; });
      assert.equal(retry.operationStatus, 'SUCCESS');
      assert.equal(keys[0], keys[1]);
      assert.equal(await db.auditLog.count({ where: { guildId: guildA, targetId: created.suggestion.id, action: 'SUGGESTION_REVIEW' } }), 1);
    });
  });
}
