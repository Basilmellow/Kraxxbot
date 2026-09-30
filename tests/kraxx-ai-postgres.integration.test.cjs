/* eslint-disable @typescript-eslint/no-require-imports */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node/register/transpile-only');
let target;
try { target = new URL(process.env.DATABASE_URL); } catch {}
if (!target || !['localhost', '127.0.0.1', '::1'].includes(target.hostname) || !/^kraxxbot_(?:gate|ai_replay)_[a-z0-9_]+$/i.test(target.pathname.slice(1))) {
  test('Kraxx AI PostgreSQL integration requires an approved disposable loopback database', { skip: true }, () => {});
} else {
  const { PrismaClient } = require('@prisma/client');
  const { KraxxAiRepository } = require('../src/database/repositories/kraxx-ai.repository.ts');
  const db = new PrismaClient();
  const base = BigInt('700000000000000000') + BigInt(Date.now()) * 1000n;
  const guildA = String(base), guildB = String(base + 1n), actorA = String(base + 2n), actorB = String(base + 3n);
  const snowflake = offset => String(base + BigInt(offset));
  const settings = { allowedChannels: [], userCooldownSeconds: 10, guildRequestsPerMinute: 1, maxInputLength: 500, maxOutputLength: 500, responseStyle: 'BALANCED' };
  after(async () => { await db.guild.deleteMany({ where: { id: { in: [guildA, guildB] } } }); await db.$disconnect(); });

  test('database reservations serialize user cooldown, guild quota, duplicate identities and guild isolation', async () => {
    await db.guild.createMany({ data: [
      { id: guildA, name: 'Kraxx AI Gate A', ownerId: actorA },
      { id: guildB, name: 'Kraxx AI Gate B', ownerId: actorB },
    ] });
    await db.guildModule.createMany({ data: [
      { guildId: guildA, module: 'kraxx-ai', enabled: true, config: JSON.stringify(settings) },
      { guildId: guildB, module: 'kraxx-ai', enabled: true, config: JSON.stringify(settings) },
    ] });
    const policyA = await KraxxAiRepository.policy(guildA);
    assert.equal(policyA.enabled, true); assert.equal(policyA.settings.userCooldownSeconds, 10);
    const pair = await Promise.all([
      KraxxAiRepository.reserve({ guildId: guildA, userId: actorA, channelId: snowflake(4), requestId: snowflake(10), settings }),
      KraxxAiRepository.reserve({ guildId: guildA, userId: actorA, channelId: snowflake(4), requestId: snowflake(11), settings }),
    ]);
    assert.equal(pair.filter(result => result.kind === 'RESERVED').length, 1);
    assert.equal(pair.filter(result => result.kind === 'RATE_LIMITED' && result.reason === 'USER_COOLDOWN').length, 1);
    const winningRequest = pair.find(result => result.kind === 'RESERVED');
    const winnerIndex = pair.indexOf(winningRequest);
    const requestId = snowflake(winnerIndex === 0 ? 10 : 11);
    assert.equal((await KraxxAiRepository.reserve({ guildId: guildA, userId: actorA, channelId: snowflake(4), requestId, settings })).kind, 'DUPLICATE');
    const guildLimited = await KraxxAiRepository.reserve({ guildId: guildA, userId: actorB, channelId: snowflake(5), requestId: snowflake(12), settings });
    assert.deepEqual(guildLimited, { kind: 'RATE_LIMITED', reason: 'GUILD_LIMIT' });
    const isolated = await KraxxAiRepository.reserve({ guildId: guildB, userId: actorB, channelId: snowflake(5), requestId: snowflake(13), settings });
    assert.equal(isolated.kind, 'RESERVED');
    await KraxxAiRepository.finish(isolated.rowId, { status: 'SUCCESS', model: 'gemini-3.8-flash', latencyMs: 25, inputTokens: 3, outputTokens: 4 });
    const stored = await db.kraxxAiRequest.findUnique({ where: { id: isolated.rowId } });
    assert.equal(stored.guildId, guildB); assert.equal(stored.status, 'SUCCESS'); assert.equal('prompt' in stored, false); assert.equal('response' in stored, false);
  });
}
