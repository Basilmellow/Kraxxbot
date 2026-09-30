const { test } = module.require('node:test');
const assert = module.require('node:assert/strict');
const { randomUUID } = module.require('node:crypto');
module.require('ts-node/register/transpile-only');

let databaseUrl;
try { databaseUrl = new URL(process.env.DATABASE_URL); } catch {}
if (!databaseUrl || !['127.0.0.1', 'localhost', '::1'].includes(databaseUrl.hostname)
  || !/^kraxxbot_gate_[a-z0-9_]+$/i.test(databaseUrl.pathname.slice(1))) {
  test('poll integration requires the named disposable loopback gate database', { skip: true }, () => {});
} else {
  const { PrismaClient } = module.require('@prisma/client');
  const { PollService } = module.require('../src/services/poll.service.ts');
  const db = new PrismaClient();
  let sequence = BigInt('810000000000000000') + BigInt(Date.now()) * 100n;
  const id = () => String(++sequence);
  const guildA = id(), guildB = id(), userA = id(), userB = id(), userC = id();
  const pollId = randomUUID(), otherPollId = randomUUID(), expiryPollId = randomUUID();
  const createKey = `poll_${randomUUID()}`;
  const createPoll = (id, guildId, expiresAt = null) => ({ id, guildId, question: 'Integration poll', options: JSON.stringify(['Red', 'Blue']),
    channelId: userA, messageId: userB, isAnonymous: false, expiresAt, status: 'ACTIVE', createdBy: userA });

  test('poll vote uniqueness, serialization, closure, expiry, and tenant constraints', async t => {
    await db.guild.createMany({ data: [
      { id: guildA, name: 'Poll integration A', ownerId: userA },
      { id: guildB, name: 'Poll integration B', ownerId: userB },
    ] });
    await db.poll.createMany({ data: [createPoll(pollId, guildA), createPoll(otherPollId, guildB),
      createPoll(expiryPollId, guildA, new Date(Date.now() - 1000))] });
    t.after(async () => {
      await db.guild.deleteMany({ where: { id: { in: [guildA, guildB] } } });
      await db.$disconnect();
    });

    await t.test('cross-guild poll access and invalid option fail closed', async () => {
      await assert.rejects(PollService.vote({ guildId: guildB, pollId, userId: userB, optionIndex: 0 }), /POLL_NOT_FOUND/);
      await assert.rejects(PollService.vote({ guildId: guildA, pollId, userId: userB, optionIndex: 2 }), /INVALID_POLL_OPTION/);
      await assert.rejects(db.pollVote.create({ data: { guildId: guildB, pollId, userId: userB, optionIndex: 0 } }), error => error.code === 'P2003');
    });

    await t.test('creation reservation is atomic, tenant-scoped, and idempotent under concurrency', async () => {
      const request = { guildId: guildA, actorId: userA, question: 'Reserved poll', options: ['One', 'Two'], channelId: userA,
        isAnonymous: false, expiresAt: new Date(Date.now() + 60_000), idempotencyKey: createKey, requestHash: 'same-request-hash' };
      const reservations = await Promise.all([PollService.reserveCreation(request), PollService.reserveCreation(request)]);
      assert.equal(reservations.filter(result => result.created).length, 1);
      assert.equal(reservations[0].poll.id, reservations[1].poll.id);
      assert.equal(reservations[0].poll.status, 'PENDING');
      await assert.rejects(PollService.reserveCreation({ ...request, requestHash: 'different-request-hash' }), /POLL_IDEMPOTENCY_CONFLICT/);
      assert.equal(await db.auditLog.count({ where: { guildId: guildA, targetId: reservations[0].poll.id, action: 'POLL_CREATE' } }), 1);
    });

    await t.test('poll publish reports definite failure and preserves UNKNOWN without replay', async () => {
      const request = { guildId: guildA, actorId: userA, question: 'Failure poll', options: ['A', 'B'], channelId: userA,
        isAnonymous: true, expiresAt: null, idempotencyKey: `poll_${randomUUID()}`, requestHash: randomUUID() };
      const failed = await PollService.publish(request, async () => ({ operationId: randomUUID(), status: 'FAILURE' }));
      assert.equal(failed.status, 'FAILURE');
      assert.equal(failed.poll.status, 'FAILED');

      const uncertainRequest = { ...request, question: 'Uncertain poll', idempotencyKey: `poll_${randomUUID()}`, requestHash: randomUUID() };
      let sends = 0;
      const operationResults = new Map();
      const dispatch = async operation => {
        if (operationResults.has(operation.idempotencyKey)) return operationResults.get(operation.idempotencyKey);
        sends++;
        const result = { operationId: randomUUID(), status: 'UNKNOWN' };
        operationResults.set(operation.idempotencyKey, result);
        return result;
      };
      const first = await PollService.publish(uncertainRequest, dispatch);
      const retry = await PollService.publish(uncertainRequest, dispatch);
      assert.equal(first.status, 'UNKNOWN');
      assert.equal(retry.poll.status, 'UNKNOWN');
      assert.equal(sends, 1);
    });

    await t.test('successful Discord send with Poll persistence failure is recovered without another send', async () => {
      const request = { guildId: guildA, actorId: userA, question: 'Recovery poll', options: ['A', 'B'], channelId: userA,
        isAnonymous: true, expiresAt: null, idempotencyKey: `poll_${randomUUID()}`, requestHash: randomUUID() };
      const trigger = `kraxx_poll_fail_active_${Date.now()}`;
      const fn = `${trigger}_fn`;
      await db.$executeRawUnsafe(`CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."status" = 'ACTIVE' AND NEW."idempotencyKey" = '${request.idempotencyKey}' THEN RAISE EXCEPTION 'injected poll persistence failure'; END IF; RETURN NEW; END $$`);
      await db.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE UPDATE ON "Poll" FOR EACH ROW EXECUTE FUNCTION ${fn}()`);
      let sends = 0;
      const operationResults = new Map();
      const dispatch = async operation => {
        if (operationResults.has(operation.idempotencyKey)) return operationResults.get(operation.idempotencyKey);
        sends++;
        const result = { operationId: randomUUID(), status: 'SUCCESS', messageId: userB };
        operationResults.set(operation.idempotencyKey, result);
        return result;
      };
      try {
        const uncertain = await PollService.publish(request, dispatch);
        assert.equal(uncertain.status, 'UNKNOWN');
        assert.equal(uncertain.poll.status, 'UNKNOWN');
      } finally {
        await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${trigger} ON "Poll"`);
        await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${fn}()`);
      }
      const recovered = await PollService.publish(request, dispatch);
      assert.equal(recovered.status, 'SUCCESS');
      assert.equal(recovered.poll.status, 'ACTIVE');
      assert.equal(recovered.poll.messageId, userB);
      assert.equal(sends, 1);
    });

    await t.test('simultaneous duplicate voter requests create one vote and never toggle', async () => {
      const results = await Promise.all([
        PollService.vote({ guildId: guildA, pollId, userId: userA, optionIndex: 0 }),
        PollService.vote({ guildId: guildA, pollId, userId: userA, optionIndex: 1 }),
      ]);
      assert.deepEqual(results.map(result => result.status).sort(), ['ALREADY_VOTED', 'VOTED']);
      const vote = await db.pollVote.findUnique({ where: { pollId_userId: { pollId, userId: userA } } });
      assert.ok(vote);
      const duplicate = results.find(result => result.status === 'ALREADY_VOTED');
      assert.equal(duplicate.optionIndex, vote.optionIndex);
    });

    await t.test('different voters vote concurrently without lost counts', async () => {
      const results = await Promise.all([
        PollService.vote({ guildId: guildA, pollId, userId: userB, optionIndex: 0 }),
        PollService.vote({ guildId: guildA, pollId, userId: userC, optionIndex: 1 }),
      ]);
      assert.ok(results.every(result => result.status === 'VOTED'));
      const firstVote = await db.pollVote.findUniqueOrThrow({ where: { pollId_userId: { pollId, userId: userA } } });
      const expectedCounts = [0, 0];
      expectedCounts[firstVote.optionIndex]++;
      expectedCounts[0]++;
      expectedCounts[1]++;
      assert.deepEqual(await PollService.counts(guildA, pollId, 2), expectedCounts);
      assert.deepEqual(await PollService.counts(guildB, otherPollId, 2), [0, 0]);
    });

    await t.test('close racing vote serializes; no vote succeeds after close', async () => {
      const racePollId = randomUUID();
      await db.poll.create({ data: createPoll(racePollId, guildA) });
      const [vote, closed] = await Promise.allSettled([
        PollService.vote({ guildId: guildA, pollId: racePollId, userId: id(), optionIndex: 0 }),
        PollService.close({ guildId: guildA, pollId: racePollId, actorId: userA }),
      ]);
      assert.equal(closed.status, 'fulfilled');
      const voteCount = await db.pollVote.count({ where: { guildId: guildA, pollId: racePollId } });
      assert.equal(voteCount, vote.status === 'fulfilled' ? 1 : 0);
      await assert.rejects(PollService.vote({ guildId: guildA, pollId: racePollId, userId: id(), optionIndex: 0 }), /POLL_CLOSED/);
      const repeat = await PollService.close({ guildId: guildA, pollId: racePollId, actorId: userA });
      assert.equal(repeat.changed, false);
    });

    await t.test('expiry closes due polls and writes one durable audit event', async () => {
      const before = await db.auditLog.count({ where: { guildId: guildA, targetId: expiryPollId, action: 'POLL_EXPIRE' } });
      const expired = await PollService.expireDue(new Date());
      const after = await db.auditLog.count({ where: { guildId: guildA, targetId: expiryPollId, action: 'POLL_EXPIRE' } });
      assert.equal(expired.some(poll => poll.id === expiryPollId), true);
      assert.equal(after - before, 1);
      await assert.rejects(PollService.vote({ guildId: guildA, pollId: expiryPollId, userId: userC, optionIndex: 0 }), /POLL_CLOSED/);
    });
  });
}
