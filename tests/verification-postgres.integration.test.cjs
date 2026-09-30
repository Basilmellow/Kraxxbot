const { test } = module.require('node:test');
const assert = module.require('node:assert/strict');
module.require('ts-node/register/transpile-only');
let databaseUrl;
try { databaseUrl = new URL(process.env.DATABASE_URL); } catch {}

if (!databaseUrl || !['127.0.0.1', 'localhost', '::1'].includes(databaseUrl.hostname)
  || !/^kraxxbot_gate_[a-z0-9_]+$/i.test(databaseUrl.pathname.slice(1))) {
  test('verification PostgreSQL integration requires the named disposable loopback gate database', { skip: true }, () => {});
} else {
  const { prisma } = module.require('../src/database/client.ts');
  const { MemberRepository } = module.require('../src/database/repositories/member.repository.ts');
  let nextId = BigInt('800000000000000000') + BigInt(Date.now()) * 100n;
  const newId = () => String(++nextId);
  test('verified member, success attempt and canonical audit commit atomically', async (t) => {
    const guildId = newId();
    const userId = newId();
    await prisma.guild.create({ data: { id: guildId, name: 'Verification integration', ownerId: userId } });
    await prisma.guildMember.create({ data: {
      guildId, discordId: userId, username: 'member', displayName: 'Member', isVerified: false,
    } });
    t.after(async () => {
      await prisma.guild.delete({ where: { id: guildId } });
      await prisma.$disconnect();
    });

    const originalTransaction = prisma.$transaction.bind(prisma);
    prisma.$transaction = (operation, ...args) => originalTransaction((transaction) => operation(new Proxy(transaction, {
      get(target, key, receiver) {
        if (key === 'auditLog') return { create: async () => { throw new Error('simulated verification audit failure'); } };
        return Reflect.get(target, key, receiver);
      },
    })), ...args);
    try {
      await assert.rejects(MemberRepository.markVerified(guildId, userId), /simulated verification audit failure/);
    } finally {
      prisma.$transaction = originalTransaction;
    }
    assert.equal((await prisma.guildMember.findUniqueOrThrow({ where: { guildId_discordId: { guildId, discordId: userId } } })).isVerified, false);
    assert.equal(await prisma.guildMemberVerification.count({ where: { guildId, discordId: userId, status: 'SUCCESS' } }), 0);
    assert.equal(await prisma.auditLog.count({ where: { guildId, action: 'MEMBER_VERIFIED' } }), 0);

    const verified = await MemberRepository.markVerified(guildId, userId);
    assert.equal(verified.isVerified, true);
    assert.equal(await prisma.guildMemberVerification.count({ where: { guildId, discordId: userId, status: 'SUCCESS' } }), 1);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { guildId, action: 'MEMBER_VERIFIED' } });
    assert.equal(audit.executorId, userId);

    const concurrentUserId = newId();
    await prisma.guildMember.create({ data: {
      guildId, discordId: concurrentUserId, username: 'concurrent', displayName: 'Concurrent', isVerified: false,
    } });
    await Promise.all([
      MemberRepository.markVerified(guildId, concurrentUserId),
      MemberRepository.markVerified(guildId, concurrentUserId),
    ]);
    assert.equal(await prisma.guildMemberVerification.count({ where: { guildId, discordId: concurrentUserId, status: 'SUCCESS' } }), 1);
    assert.equal(await prisma.auditLog.count({ where: { guildId, targetId: concurrentUserId, action: 'MEMBER_VERIFIED' } }), 1);
  });
}
