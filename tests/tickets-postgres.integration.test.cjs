const { test } = module.require('node:test');
const assert = module.require('node:assert/strict');
module.require('ts-node/register/transpile-only');

let databaseUrl;
try { databaseUrl = new URL(process.env.DATABASE_URL); } catch {}
if (!databaseUrl || !['127.0.0.1', 'localhost', '::1'].includes(databaseUrl.hostname)
  || !/^kraxxbot_gate_[a-z0-9_]+$/i.test(databaseUrl.pathname.slice(1))) {
  test('ticket PostgreSQL integration requires the named disposable loopback gate database', { skip: true }, () => {});
} else {
  const { PrismaClient } = module.require('@prisma/client');
  const { prisma } = module.require('../src/database/client.ts');
  const { TicketRepository } = module.require('../src/database/repositories/ticket.repository.ts');
  const { TicketDomainService } = module.require('../src/services/ticket-domain.service.ts');
  const db = new PrismaClient();
  let nextId = BigInt('700000000000000000') + BigInt(Date.now()) * 100n;
  const newId = () => String(++nextId);
  const guild = async (name) => {
    const id = newId();
    await db.guild.create({ data: { id, name, ownerId: newId() } });
    return id;
  };
  const create = (guildId, creationKey, provision, cleanup = async () => {}, openerId = newId()) => TicketRepository.createTicketWithProvisioning({
    guildId, openerId, creationKey, subject: 'Integration ticket', category: 'GENERAL', source: 'BOT',
  }, provision, cleanup);

  test('ticket allocator serializes sequential and concurrent creation within a guild', async (t) => {
    const guildId = await guild('Ticket sequence');
    t.after(async () => { await db.guild.delete({ where: { id: guildId } }); });
    const sequence = async (number) => ({ id: newId(), number });
    const first = await create(guildId, 'sequential-1', sequence);
    const second = await create(guildId, 'sequential-2', sequence);
    assert.deepEqual([first.ticket.ticketNumber, second.ticket.ticketNumber], [1, 2]);

    const concurrent = await Promise.all(Array.from({ length: 12 }, (_, index) => create(guildId, `parallel-${index}`, sequence)));
    assert.deepEqual(concurrent.map((item) => item.ticket.ticketNumber).sort((a, b) => a - b), Array.from({ length: 14 }, (_, index) => index + 1).slice(2));
    assert.equal(new Set(concurrent.map((item) => item.ticket.ticketNumber)).size, 12);
  });

  test('different guild advisory locks do not serialize one another', async (t) => {
    const guildA = await guild('Ticket parallel A');
    const guildB = await guild('Ticket parallel B');
    t.after(async () => { await db.guild.deleteMany({ where: { id: { in: [guildA, guildB] } } }); });
    let entered = 0;
    let release;
    const barrier = new Promise((resolve) => { release = resolve; });
    const provision = async () => {
      entered += 1;
      if (entered === 2) release();
      await Promise.race([barrier, new Promise((_, reject) => setTimeout(() => reject(new Error('guild allocations blocked each other')), 4000))]);
      return { id: newId() };
    };
    const results = await Promise.all([create(guildA, 'parallel-guild-A', provision), create(guildB, 'parallel-guild-B', provision)]);
    assert.deepEqual(results.map((item) => item.ticket.ticketNumber), [1, 1]);
  });

  test('Discord provisioning failure rolls back allocation and leaves no active ticket', async (t) => {
    const guildId = await guild('Ticket provision failure');
    t.after(async () => { await db.guild.delete({ where: { id: guildId } }); });
    await assert.rejects(create(guildId, 'discord-failure', async () => { throw new Error('mock Discord channel failure'); }));
    assert.equal(await db.ticket.count({ where: { guildId } }), 0);
    const next = await create(guildId, 'after-discord-failure', async () => ({ id: newId() }));
    assert.equal(next.ticket.ticketNumber, 1);
  });

  test('database persistence failure cleans up the created channel and rolls back its number', async (t) => {
    const guildId = await guild('Ticket database failure');
    t.after(async () => { await db.guild.delete({ where: { id: guildId } }); });
    const first = await create(guildId, 'base', async () => ({ id: 'known-channel' }));
    let cleaned = false;
    await assert.rejects(create(guildId, 'persistence-conflict', async () => ({ id: first.ticket.channelId }), async () => { cleaned = true; }));
    assert.equal(cleaned, true);
    assert.equal(await db.ticket.count({ where: { guildId } }), 1);
    const next = await create(guildId, 'after-persistence-failure', async () => ({ id: newId() }));
    assert.equal(next.ticket.ticketNumber, 2);
  });

  test('orphan cleanup failure is surfaced and recorded as an UNKNOWN canonical audit', async (t) => {
    const guildId = await guild('Ticket orphan recovery');
    t.after(async () => { await db.guild.delete({ where: { id: guildId } }); });
    const base = await create(guildId, 'orphan-base', async () => ({ id: 'orphan-test-channel' }));
    await assert.rejects(
      create(guildId, 'orphan-attempt', async () => ({ id: base.ticket.channelId }), async () => { throw new Error('mock cleanup failure'); }),
      (error) => error.name === 'TicketOrphanedChannelError' && error.channelId === base.ticket.channelId && error.auditPersisted
    );
    const audit = await db.auditLog.findFirst({ where: { guildId, action: 'TICKET_CREATE_ORPHANED_CHANNEL' } });
    assert.ok(audit);
    assert.equal(JSON.parse(audit.details).outcome, 'UNKNOWN');
  });

  test('same interaction retry returns the existing ticket without another Discord channel', async (t) => {
    const guildId = await guild('Ticket idempotency');
    t.after(async () => { await db.guild.delete({ where: { id: guildId } }); });
    let provisions = 0;
    const provision = async () => ({ id: `retry-${++provisions}` });
    const openerId = newId();
    const first = await create(guildId, 'same-interaction', provision, async () => {}, openerId);
    const retry = await create(guildId, 'same-interaction', provision, async () => {}, openerId);
    assert.equal(first.created, true);
    assert.equal(retry.created, false);
    assert.equal(retry.ticket.id, first.ticket.id);
    assert.equal(provisions, 1);
    await assert.rejects(create(guildId, 'same-interaction', async () => assert.fail('different opener must not re-use an idempotency result')),
      /TICKET_IDEMPOTENCY_CONFLICT/);
  });

  test('ticket creation reconciles a lost transaction commit acknowledgement', async (t) => {
    const guildId = await guild('Ticket commit acknowledgement');
    t.after(async () => { await db.guild.delete({ where: { id: guildId } }); });
    const channelId = newId();
    const originalTransaction = prisma.$transaction.bind(prisma);
    prisma.$transaction = async (callback, options) => {
      await originalTransaction(callback, options);
      throw new Error('simulated lost commit acknowledgement');
    };
    try {
      const result = await TicketDomainService.create({
        guildId, actorId: newId(), authorized: true, creationKey: 'commit-ack-ticket', category: 'GENERAL', subject: 'Commit ack',
      }, async () => ({ id: channelId }), async () => assert.fail('committed channel must not be cleaned up'));
      assert.equal(result.created, true);
      assert.equal(result.ticket.channelId, channelId);
      assert.equal(await db.ticket.count({ where: { guildId } }), 1);
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  test('ticket transition with an ambiguous commit is not compensated against possibly committed state', async (t) => {
    const guildId = await guild('Ticket transition commit acknowledgement');
    t.after(async () => { await db.guild.delete({ where: { id: guildId } }); });
    const actorId = newId();
    const created = await TicketDomainService.create({
      guildId, actorId, authorized: true, creationKey: 'transition-commit-ticket', category: 'GENERAL', subject: 'Commit transition',
    }, async () => ({ id: newId() }), async () => {});
    const originalTransaction = prisma.$transaction.bind(prisma);
    prisma.$transaction = async (callback, options) => {
      await originalTransaction(callback, options);
      throw new Error('simulated lost commit acknowledgement');
    };
    let compensated = false;
    try {
      await assert.rejects(TicketDomainService.transition(
        guildId, created.ticket.id, { id: actorId, authorized: true }, 'CLOSE', undefined,
        async () => async () => { compensated = true; },
      ), (error) => error.name === 'TicketRecoveryRequiredError' && error.auditPersisted);
      assert.equal(compensated, false);
      assert.equal((await db.ticket.findUnique({ where: { channelId: created.ticket.channelId, guildId } })).status, 'CLOSED');
      assert.equal(await db.auditLog.count({ where: { guildId, action: 'TICKET_TRANSITION_RECOVERY_REQUIRED' } }), 1);
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  test('bot and dashboard callers use the same domain allocator', async (t) => {
    const guildId = await guild('Ticket shared domain');
    t.after(async () => { await db.guild.delete({ where: { id: guildId } }); });
    const provision = async () => ({ id: newId() });
    const bot = await TicketDomainService.create({ guildId, actorId: newId(), authorized: true, creationKey: 'bot-path', category: 'GENERAL', subject: 'Bot ticket', source: 'BOT' }, provision, async () => {});
    const dashboard = await TicketDomainService.create({ guildId, actorId: newId(), authorized: true, creationKey: 'dashboard-path', category: 'GENERAL', subject: 'Dashboard ticket', source: 'DASHBOARD' }, provision, async () => {});
    assert.deepEqual([bot.ticket.ticketNumber, dashboard.ticket.ticketNumber], [1, 2]);
    assert.equal((await db.auditLog.findFirst({ where: { guildId, targetId: dashboard.ticket.id } })).details.includes('DASHBOARD'), true);
  });

  test('concurrent state transitions cannot overwrite a ticket lifecycle state', async (t) => {
    const guildId = await guild('Ticket transition race');
    t.after(async () => { await db.guild.delete({ where: { id: guildId } }); });
    const channelId = newId();
    const created = await TicketDomainService.create({ guildId, actorId: newId(), authorized: true, creationKey: 'state-ticket', category: 'GENERAL', subject: 'State ticket' }, async () => ({ id: channelId }), async () => {});
    const actors = [newId(), newId()];
    const results = await Promise.allSettled(actors.map((actorId) => TicketDomainService.transition(guildId, created.ticket.id, { id: actorId, authorized: true }, 'CLAIM')));
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal((await db.ticket.findUnique({ where: { channelId, guildId } })).status, 'CLAIMED');
    assert.equal(await db.auditLog.count({ where: { guildId, action: 'TICKET_CLAIM' } }), 1);
  });

  test('ticket lifecycle allows only OPEN→CLAIMED→OPEN→CLOSED→OPEN→CLOSED→DELETE', async (t) => {
    const guildId = await guild('Ticket lifecycle');
    t.after(async () => { await db.guild.delete({ where: { id: guildId } }); });
    const actorId = newId();
    const created = await TicketDomainService.create({ guildId, actorId, authorized: true, creationKey: 'lifecycle-ticket', category: 'GENERAL', subject: 'Lifecycle' }, async () => ({ id: newId() }), async () => {});
    assert.equal((await TicketDomainService.transition(guildId, created.ticket.id, { id: actorId, authorized: true }, 'CLAIM')).status, 'CLAIMED');
    await assert.rejects(TicketDomainService.transition(guildId, created.ticket.id, { id: actorId, authorized: true }, 'CLAIM'), /TICKET_STATE_CONFLICT/);
    assert.equal((await TicketDomainService.transition(guildId, created.ticket.id, { id: actorId, authorized: true }, 'UNCLAIM')).status, 'OPEN');
    assert.equal((await TicketDomainService.transition(guildId, created.ticket.id, { id: actorId, authorized: true }, 'CLOSE')).status, 'CLOSED');
    await assert.rejects(TicketDomainService.transition(guildId, created.ticket.id, { id: actorId, authorized: true }, 'CLOSE'), /TICKET_STATE_CONFLICT/);
    assert.equal((await TicketDomainService.transition(guildId, created.ticket.id, { id: actorId, authorized: true }, 'REOPEN')).status, 'OPEN');
    assert.equal((await TicketDomainService.transition(guildId, created.ticket.id, { id: actorId, authorized: true }, 'CLOSE')).status, 'CLOSED');
    assert.equal((await TicketDomainService.transition(guildId, created.ticket.id, { id: actorId, authorized: true }, 'DELETE')).id, created.ticket.id);
    assert.equal(await db.ticket.count({ where: { guildId } }), 0);
    const auditGroups = await db.auditLog.groupBy({ by: ['action'], where: { guildId }, _count: { _all: true } });
    const auditCounts = Object.fromEntries(auditGroups.map((row) => [row.action, row._count._all]));
    assert.deepEqual(auditCounts, {
      TICKET_CREATE: 1, TICKET_CLAIM: 1, TICKET_UNCLAIM: 1,
      TICKET_CLOSE: 2, TICKET_REOPEN: 1, TICKET_DELETE: 1,
    });
  });

  test('a guild cannot transition a ticket owned by another tenant', async (t) => {
    const guildA = await guild('Ticket isolation A');
    const guildB = await guild('Ticket isolation B');
    t.after(async () => { await db.guild.deleteMany({ where: { id: { in: [guildA, guildB] } } }); });
    const foreignChannelId = newId();
    const ticket = await TicketDomainService.create({ guildId: guildB, actorId: newId(), authorized: true, creationKey: 'foreign-ticket', category: 'GENERAL', subject: 'Tenant B' }, async () => ({ id: foreignChannelId }), async () => {});
    assert.equal(await TicketDomainService.transition(guildA, ticket.ticket.id, { id: newId(), authorized: true }, 'CLOSE'), null);
    assert.equal((await db.ticket.findUnique({ where: { channelId: foreignChannelId, guildId: guildB } })).status, 'OPEN');
  });

  test('ticket creation writes canonical guild-scoped audit atomically', async (t) => {
    const guildId = await guild('Ticket audit');
    const actorId = newId();
    t.after(async () => { await db.guild.delete({ where: { id: guildId } }); await db.$disconnect(); });
    const result = await TicketRepository.createTicketWithProvisioning({ guildId, openerId: actorId, creationKey: 'audit-create', subject: 'Audited', source: 'BOT' }, async () => ({ id: 'audit-channel' }), async () => {});
    const audit = await db.auditLog.findFirst({ where: { guildId, targetId: result.ticket.id, action: 'TICKET_CREATE' } });
    assert.ok(audit);
    assert.equal(audit.executorId, actorId);
  });
}
