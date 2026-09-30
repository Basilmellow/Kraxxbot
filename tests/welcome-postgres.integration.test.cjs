const { test } = module.require('node:test');
const assert = module.require('node:assert/strict');
module.require('ts-node/register/transpile-only');

let databaseUrl;
try { databaseUrl = new URL(process.env.DATABASE_URL); } catch {}
if (!databaseUrl || !['127.0.0.1', 'localhost', '::1'].includes(databaseUrl.hostname)
  || !/^kraxxbot_gate_[a-z0-9_]+$/i.test(databaseUrl.pathname.slice(1))) {
  test('welcome PostgreSQL integration requires the named disposable loopback gate database', { skip: true }, () => {});
} else {
  const { PrismaClient } = module.require('@prisma/client');
  const { saveWelcomeConfig } = module.require('../src/services/welcome-config.service.ts');
  const { parseWelcomeConfig } = module.require('../src/services/welcome-contract.ts');
  const db = new PrismaClient();
  let nextId = BigInt('700000000000000000') + BigInt(Date.now()) * 100n;
  const newId = () => String(++nextId);
  test('welcome configuration and canonical audit are atomic and guild-scoped', async (t) => {
    const guildId = newId();
    const actorId = newId();
    await db.guild.create({ data: { id: guildId, name: 'Welcome integration', ownerId: actorId } });
    t.after(async () => {
      await db.guild.delete({ where: { id: guildId } });
      await db.$disconnect();
    });

    const input = parseWelcomeConfig({
      guildId, enabled: true, dmEnabled: true, channelId: newId(),
      message: 'Welcome {user}', dmMessage: 'Read {rules}',
    });
    const saved = await saveWelcomeConfig(db, input, actorId);
    assert.equal(saved.guildId, guildId);
    assert.equal(saved.dmEnabled, true);
    const audit = await db.auditLog.findFirst({ where: { guildId, action: 'WELCOME_CONFIG_UPDATE' } });
    assert.ok(audit);
    assert.equal(audit.executorId, actorId);

    const brokenAuditDb = {
      $transaction: (operation) => db.$transaction((transaction) => operation(new Proxy(transaction, {
        get(target, key, receiver) {
          if (key === 'auditLog') return { create: async () => { throw new Error('simulated audit failure'); } };
          return Reflect.get(target, key, receiver);
        },
      }))),
    };
    const rollbackGuild = newId();
    const rollbackActor = newId();
    await db.guild.create({ data: { id: rollbackGuild, name: 'Welcome rollback', ownerId: rollbackActor } });
    try {
      await assert.rejects(saveWelcomeConfig(brokenAuditDb, parseWelcomeConfig({
        guildId: rollbackGuild, enabled: true, dmEnabled: false,
      }), rollbackActor), /simulated audit failure/);
      assert.equal(await db.welcomeConfig.count({ where: { guildId: rollbackGuild } }), 0);
      assert.equal(await db.auditLog.count({ where: { guildId: rollbackGuild, action: 'WELCOME_CONFIG_UPDATE' } }), 0);
    } finally {
      await db.guild.delete({ where: { id: rollbackGuild } });
    }
  });
}
