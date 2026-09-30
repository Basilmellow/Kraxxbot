const { test } = module.require('node:test');
const assert = module.require('node:assert/strict');
const { randomUUID } = module.require('node:crypto');

module.require('ts-node/register/transpile-only');

const rawDatabaseUrl = process.env.DATABASE_URL;
let databaseUrl;
try {
  databaseUrl = new URL(rawDatabaseUrl);
} catch {
  databaseUrl = null;
}

const databaseName = databaseUrl?.pathname.slice(1);
const isLoopback = ['127.0.0.1', 'localhost', '::1'].includes(databaseUrl?.hostname);
const isDedicatedGateDatabase = /^kraxxbot_gate_[a-z0-9_]+$/i.test(databaseName || '');

if (!isLoopback || !isDedicatedGateDatabase) {
  test('scheduler PostgreSQL integration suite requires a dedicated loopback test database', {
    skip: 'Set DATABASE_URL to a disposable loopback database named kraxxbot_gate_*; no other database will be touched.',
  }, () => {});
} else {
  const { PrismaClient } = module.require('@prisma/client');
  const { prisma: applicationPrisma } = module.require('../src/database/client.ts');
  const { SchedulerRepository } = module.require('../src/database/repositories/scheduler.repository.ts');
  const { deliveryFailurePolicy, retryDecision, safeDeliveryError } = module.require('../src/services/scheduler-policy.ts');
  const { AutomationExecutionRepository } = module.require('../src/database/repositories/automation-execution.repository.ts');
  const { AutomationExecutionService } = module.require('../src/services/automation-execution.service.ts');
  const { AnnouncementRepository } = module.require('../src/database/repositories/announcement.repository.ts');
  const { createNumberedModerationCase, normalizeModerationDuration } = module.require('../src/database/repositories/moderation-case.repository.ts');
  const { validateModerationEvidence } = module.require('../dashboard/src/lib/moderation-case.ts');
  const prisma = new PrismaClient();
  const testSnowflake = () => String(100000000000000000n + BigInt(randomUUID().replace(/\D/g, '').slice(0, 17)));
  const guildA = testSnowflake();
  const guildB = testSnowflake();
  const baseTime = new Date('2026-09-26T12:00:00.000Z');
  const createCase = (input) => prisma.$transaction((transaction) => createNumberedModerationCase(transaction, input));

  async function makeGuild(id) {
    await prisma.guild.create({ data: { id, name: id, ownerId: 'integration-test-owner' } });
    await prisma.guildModule.create({ data: { guildId: id, module: 'automation', enabled: true } });
  }

  async function makeReminder(guildId = guildA, overrides = {}) {
    return prisma.reminder.create({
      data: {
        guildId,
        title: 'Integration reminder',
        message: 'Deterministic scheduler integration fixture',
        targetType: 'CHANNEL',
        targetId: 'test-channel',
        triggerAt: new Date(baseTime.getTime() - 1000),
        createdBy: 'integration-test-actor',
        ...overrides,
      },
    });
  }

  async function makeAnnouncement(guildId = guildA, overrides = {}) {
    return prisma.scheduledAnnouncement.create({
      data: {
        guildId,
        channelId: 'test-channel',
        content: 'Deterministic scheduler integration fixture',
        scheduledFor: new Date(baseTime.getTime() - 1000),
        createdBy: 'integration-test-actor',
        ...overrides,
      },
    });
  }

  async function makeAutomationRule(guildId, trigger, action, config) {
    return prisma.automationRule.create({
      data: { guildId, name: `Integration ${trigger} ${action}`, trigger, action, config: JSON.stringify(config), createdBy: 'integration-test-actor' },
    });
  }

  function memberEvent(guildId = guildA, overrides = {}) {
    return {
      guildId,
      userId: '123456789012345678',
      username: 'test-user',
      displayName: 'Test User',
      serverName: 'Test Guild',
      memberCount: 7,
      ...overrides,
    };
  }

  test('durable scheduler repository behavior against disposable PostgreSQL', async (t) => {
    await makeGuild(guildA);
    await makeGuild(guildB);
    t.after(async () => {
      await prisma.guild.deleteMany({ where: { id: { in: [guildA, guildB] } } });
      await prisma.$disconnect();
    });

    await t.test('A. due reminder and announcement are discoverable', async () => {
      const reminder = await makeReminder();
      const announcement = await makeAnnouncement();
      assert((await SchedulerRepository.findDueReminders(baseTime)).some((item) => item.id === reminder.id));
      assert((await SchedulerRepository.findDueAnnouncements(baseTime)).some((item) => item.id === announcement.id));
    });

    await t.test('B. a due reminder is claimed and attempts persist', async () => {
      const item = await makeReminder();
      const expires = new Date(baseTime.getTime() + 300_000);
      const result = await SchedulerRepository.claimReminder(item, baseTime, 'worker-one', expires);
      const saved = await prisma.reminder.findUniqueOrThrow({ where: { id: item.id } });
      assert.equal(result.count, 1);
      assert.equal(saved.status, 'PROCESSING');
      assert.equal(saved.leaseToken, 'worker-one');
      assert.equal(saved.attempts, 1);
      assert.equal(saved.leaseExpiresAt.getTime(), expires.getTime());
    });

    await t.test('C. concurrent workers cannot both claim one reminder', async () => {
      const item = await makeReminder();
      const claims = await Promise.all([
        SchedulerRepository.claimReminder(item, baseTime, 'worker-a', new Date(baseTime.getTime() + 300_000)),
        SchedulerRepository.claimReminder(item, baseTime, 'worker-b', new Date(baseTime.getTime() + 300_000)),
      ]);
      assert.equal(claims.reduce((sum, result) => sum + result.count, 0), 1);
      assert.equal((await prisma.reminder.findUniqueOrThrow({ where: { id: item.id } })).attempts, 1);
    });

    await t.test('D. completion is fenced by current lease ownership', async () => {
      const item = await makeReminder();
      await SchedulerRepository.claimReminder(item, baseTime, 'owner-token', new Date(baseTime.getTime() + 300_000));
      assert.equal((await SchedulerRepository.completeReminder(item.id, guildA, 'wrong-token')).count, 0);
      assert.equal((await SchedulerRepository.completeReminder(item.id, guildA, 'owner-token')).count, 1);
      assert.equal((await prisma.reminder.findUniqueOrThrow({ where: { id: item.id } })).status, 'COMPLETED');
    });

    await t.test('E. an expired lease is discoverable and reclaimable', async () => {
      const item = await makeReminder();
      await SchedulerRepository.claimReminder(item, baseTime, 'expired-token', new Date(baseTime.getTime() + 300_000));
      await prisma.reminder.update({ where: { id: item.id }, data: { leaseExpiresAt: new Date(baseTime.getTime() - 1) } });
      const due = await SchedulerRepository.findDueReminders(baseTime);
      const recovered = due.find((candidate) => candidate.id === item.id);
      assert(recovered);
      assert.equal((await SchedulerRepository.claimReminder(recovered, baseTime, 'recovered-token', new Date(baseTime.getTime() + 300_000))).count, 1);
    });

    await t.test('F. stale worker completion is rejected after recovery claim', async () => {
      const item = await makeReminder();
      await SchedulerRepository.claimReminder(item, baseTime, 'stale-worker', new Date(baseTime.getTime() + 300_000));
      await prisma.reminder.update({ where: { id: item.id }, data: { leaseExpiresAt: new Date(baseTime.getTime() - 1) } });
      const recovered = (await SchedulerRepository.findDueReminders(baseTime)).find((candidate) => candidate.id === item.id);
      assert(recovered);
      await SchedulerRepository.claimReminder(recovered, baseTime, 'new-worker', new Date(baseTime.getTime() + 300_000));
      assert.equal((await SchedulerRepository.completeReminder(item.id, guildA, 'stale-worker')).count, 0);
      assert.equal((await prisma.reminder.findUniqueOrThrow({ where: { id: item.id } })).leaseToken, 'new-worker');
    });

    await t.test('G. retry time is persisted and controls due selection', async () => {
      const item = await makeReminder();
      await SchedulerRepository.claimReminder(item, baseTime, 'retry-worker', new Date(baseTime.getTime() + 300_000));
      const decision = retryDecision(1, 5, 'ACTIVE', baseTime);
      assert.equal((await SchedulerRepository.failReminder(item.id, guildA, 'retry-worker', decision, 'DiscordAPIError')).count, 1);
      const saved = await prisma.reminder.findUniqueOrThrow({ where: { id: item.id } });
      assert.equal(saved.nextAttemptAt.getTime(), decision.nextAttemptAt.getTime());
      assert.equal((await SchedulerRepository.findDueReminders(decision.nextAttemptAt)).some((row) => row.id === item.id), true);
    });

    await t.test('H. retry exhaustion persists terminal failure', async () => {
      const item = await makeReminder(guildA, { maxAttempts: 1 });
      await SchedulerRepository.claimReminder(item, baseTime, 'last-worker', new Date(baseTime.getTime() + 300_000));
      const decision = retryDecision(1, 1, 'ACTIVE', baseTime);
      assert.deepEqual(decision, { status: 'FAILED', nextAttemptAt: null });
      await SchedulerRepository.failReminder(item.id, guildA, 'last-worker', decision, 'DiscordAPIError');
      assert.equal((await prisma.reminder.findUniqueOrThrow({ where: { id: item.id } })).status, 'FAILED');
    });

    await t.test('I. permanent HTTP 4xx failures do not retry', async () => {
      const failure = deliveryFailurePolicy({ status: 403, retryAfter: 0 });
      const decision = retryDecision(1, 5, 'PENDING', baseTime, failure);
      assert.equal(decision.status, 'FAILED');
      const item = await makeAnnouncement(guildA, { maxAttempts: 5 });
      await SchedulerRepository.claimAnnouncement(item, baseTime, 'permanent-worker', new Date(baseTime.getTime() + 300_000));
      await SchedulerRepository.failAnnouncement(item.id, guildA, 'permanent-worker', decision, 'DiscordAPIError', 'Delivery failed.');
      assert.equal((await prisma.scheduledAnnouncement.findUniqueOrThrow({ where: { id: item.id } })).status, 'FAILED');
    });

    await t.test('J. HTTP 429 retry-after is honored and persisted', async () => {
      const failure = deliveryFailurePolicy({ status: 429, retryAfter: 90_000 });
      const decision = retryDecision(1, 5, 'PENDING', baseTime, failure);
      assert.equal(decision.nextAttemptAt.getTime(), baseTime.getTime() + 90_000);
      const item = await makeAnnouncement();
      await SchedulerRepository.claimAnnouncement(item, baseTime, 'rate-limited-worker', new Date(baseTime.getTime() + 300_000));
      await SchedulerRepository.failAnnouncement(item.id, guildA, 'rate-limited-worker', decision, 'DiscordRateLimitError', 'Delivery failed.');
      const saved = await prisma.scheduledAnnouncement.findUniqueOrThrow({ where: { id: item.id } });
      assert.equal(saved.nextAttemptAt.getTime(), decision.nextAttemptAt.getTime());
      assert.equal(saved.status, 'PENDING');
    });

    await t.test('K. a fresh worker recovers work left by a restarted worker', async () => {
      const item = await makeAnnouncement();
      await SchedulerRepository.claimAnnouncement(item, baseTime, 'before-restart', new Date(baseTime.getTime() + 300_000));
      await prisma.scheduledAnnouncement.update({ where: { id: item.id }, data: { leaseExpiresAt: new Date(baseTime.getTime() - 1) } });
      const due = (await SchedulerRepository.findDueAnnouncements(baseTime)).find((candidate) => candidate.id === item.id);
      assert(due);
      assert.equal((await SchedulerRepository.claimAnnouncement(due, baseTime, 'after-restart', new Date(baseTime.getTime() + 300_000))).count, 1);
      const saved = await prisma.scheduledAnnouncement.findUniqueOrThrow({ where: { id: item.id } });
      assert.equal(saved.attempts, 2);
      assert.equal(saved.leaseToken, 'after-restart');
    });

    await t.test('L. tenant predicates prevent cross-guild discovery and claims', async () => {
      const item = await makeReminder(guildB);
      // The scheduler intentionally scans due work across tenants; the atomic
      // claim must still bind both the row ID and authoritative guild ID.
      assert.equal((await SchedulerRepository.findDueReminders(baseTime)).some((candidate) => candidate.id === item.id), true);
      assert.equal((await SchedulerRepository.claimReminder({ ...item, guildId: guildA }, baseTime, 'wrong-tenant', new Date(baseTime.getTime() + 300_000))).count, 0);
      assert.equal((await prisma.reminder.findUniqueOrThrow({ where: { id: item.id } })).status, 'ACTIVE');
    });

    await t.test('M. concurrent announcement workers produce one lease owner', async () => {
      const item = await makeAnnouncement();
      const claims = await Promise.all([
        SchedulerRepository.claimAnnouncement(item, baseTime, 'announcement-a', new Date(baseTime.getTime() + 300_000)),
        SchedulerRepository.claimAnnouncement(item, baseTime, 'announcement-b', new Date(baseTime.getTime() + 300_000)),
      ]);
      assert.equal(claims.reduce((sum, result) => sum + result.count, 0), 1);
      assert.equal((await prisma.scheduledAnnouncement.findUniqueOrThrow({ where: { id: item.id } })).attempts, 1);
    });

    await t.test('N. persisted diagnostics contain safe identifiers, not upstream messages', async () => {
      const item = await makeAnnouncement();
      await SchedulerRepository.claimAnnouncement(item, baseTime, 'safe-error-worker', new Date(baseTime.getTime() + 300_000));
      const secretError = Object.assign(new Error('sensitive token=should-not-persist'), { name: 'DiscordAPIError' });
      const safeCode = safeDeliveryError(secretError);
      await SchedulerRepository.failAnnouncement(item.id, guildA, 'safe-error-worker', retryDecision(1, 5, 'PENDING', baseTime), safeCode, 'Delivery failed.');
      const saved = await prisma.scheduledAnnouncement.findUniqueOrThrow({ where: { id: item.id } });
      assert.equal(saved.lastError, 'DiscordAPIError');
      assert.equal(saved.error, 'Delivery failed.');
      assert(!JSON.stringify(saved).includes('should-not-persist'));
    });

    await t.test('O. successful completion persists SENT state and Discord message metadata', async () => {
      const item = await makeAnnouncement();
      await SchedulerRepository.claimAnnouncement(item, baseTime, 'success-worker', new Date(baseTime.getTime() + 300_000));
      const sentAt = new Date(baseTime.getTime() + 1000);
      assert.equal((await SchedulerRepository.completeAnnouncement(item.id, guildA, 'success-worker', 'discord-message-1', sentAt, {
        title: 'Queued title', content: 'Queued content', department: 'GENERAL', type: 'IMPORTANT', authorId: 'integration-test-actor', channelId: '123456789012345679', mentionRole: null,
      })).count, 1);
      const saved = await prisma.scheduledAnnouncement.findUniqueOrThrow({ where: { id: item.id } });
      assert.equal(saved.status, 'SENT');
      assert.equal(saved.messageId, 'discord-message-1');
      assert.equal(saved.sentAt.getTime(), sentAt.getTime());
      assert.equal(saved.leaseToken, null);
      const history = await prisma.announcement.findFirstOrThrow({ where: { guildId: guildA, messageId: 'discord-message-1' } });
      assert.equal(history.title, 'Queued title');
      assert.equal(history.type, 'IMPORTANT');
    });

    await t.test('O2. announcement history failure rolls back SENT completion atomically', async () => {
      const item = await makeAnnouncement();
      await SchedulerRepository.claimAnnouncement(item, baseTime, 'history-failure-worker', new Date(baseTime.getTime() + 300_000));
      const originalTransaction = applicationPrisma.$transaction.bind(applicationPrisma);
      applicationPrisma.$transaction = (operation, ...args) => originalTransaction((transaction) => operation(new Proxy(transaction, {
        get(target, key, receiver) {
          if (key === 'announcement') return { create: async () => { throw new Error('simulated announcement history failure'); } };
          return Reflect.get(target, key, receiver);
        },
      })), ...args);
      try {
        await assert.rejects(SchedulerRepository.completeAnnouncement(item.id, guildA, 'history-failure-worker', 'discord-message-unpersisted', baseTime, {
          title: 'Cannot persist', content: 'Must remain retryable', department: 'GENERAL', type: 'GENERAL', authorId: 'integration-test-actor',
          channelId: '123456789012345679', mentionRole: null,
        }), /simulated announcement history failure/);
      } finally {
        applicationPrisma.$transaction = originalTransaction;
      }
      const stillProcessing = await prisma.scheduledAnnouncement.findUniqueOrThrow({ where: { id: item.id } });
      assert.equal(stillProcessing.status, 'PROCESSING');
      assert.equal(stillProcessing.messageId, null);
      assert.equal(await prisma.announcement.count({ where: { guildId: guildA, messageId: 'discord-message-unpersisted' } }), 0);
    });

    await t.test('O3. bot announcement modal retries enqueue one durable audited delivery', async () => {
      const input = {
        guildId: guildA, interactionId: 'integration-modal-interaction-1', title: 'Bot announcement',
        content: 'Queued through shared scheduler', department: 'GENERAL', type: 'IMPORTANT',
        authorId: 'integration-test-actor', channelId: '123456789012345679', mentionType: 'NONE',
        embedPayload: JSON.stringify([{ title: 'Bot announcement' }]),
      };
      const [first, retry] = await Promise.all([
        AnnouncementRepository.enqueueDelivery(input), AnnouncementRepository.enqueueDelivery(input),
      ]);
      assert.equal(first.id, retry.id);
      assert.equal(await prisma.scheduledAnnouncement.count({ where: { idempotencyKey: first.idempotencyKey } }), 1);
      assert.equal(first.announcementType, 'IMPORTANT');
      assert.equal(await prisma.auditLog.count({ where: { guildId: guildA, targetId: first.id, action: 'ANNOUNCEMENT_ENQUEUE' } }), 1);
    });

    await t.test('P. send success followed by stale database completion demonstrates at-least-once delivery', async () => {
      const item = await makeAnnouncement();
      await SchedulerRepository.claimAnnouncement(item, baseTime, 'old-owner', new Date(baseTime.getTime() + 300_000));
      let sends = 0;
      const fakeDiscordSend = async () => ({ id: `discord-message-${++sends}` });
      const sent = await fakeDiscordSend();
      await prisma.scheduledAnnouncement.update({ where: { id: item.id }, data: { leaseExpiresAt: new Date(baseTime.getTime() - 1) } });
      const recovered = (await SchedulerRepository.findDueAnnouncements(baseTime)).find((candidate) => candidate.id === item.id);
      assert(recovered);
      await SchedulerRepository.claimAnnouncement(recovered, baseTime, 'new-owner', new Date(baseTime.getTime() + 300_000));
      assert.equal((await SchedulerRepository.completeAnnouncement(item.id, guildA, 'old-owner', sent.id, baseTime)).count, 0);
      assert.equal(sends, 1);
      const persisted = await prisma.scheduledAnnouncement.findUniqueOrThrow({ where: { id: item.id } });
      assert.equal(persisted.status, 'PROCESSING');
      assert.equal(persisted.leaseToken, 'new-owner');
      assert.equal(persisted.messageId, null);
      const secondSend = await fakeDiscordSend();
      assert.equal((await SchedulerRepository.completeAnnouncement(item.id, guildA, 'new-owner', secondSend.id, baseTime)).count, 1);
      assert.equal(sends, 2);
      assert.equal((await prisma.scheduledAnnouncement.findUniqueOrThrow({ where: { id: item.id } })).messageId, secondSend.id);
    });

    await t.test('Q. gateway event enqueue is idempotent in PostgreSQL', async () => {
      const rule = await makeAutomationRule(guildA, 'MEMBER_JOIN', 'SEND_MESSAGE', { channelId: '123456789012345679', message: 'Welcome {user}' });
      const payload = memberEvent();
      const results = await Promise.all([
        AutomationExecutionRepository.enqueueEvent(guildA, 'MEMBER_JOIN', 'member:epoch-1', payload),
        AutomationExecutionRepository.enqueueEvent(guildA, 'MEMBER_JOIN', 'member:epoch-1', payload),
      ]);
      assert.equal(results.reduce((sum, result) => sum + result.count, 0), 1);
      assert.equal(await prisma.automationExecution.count({ where: { ruleId: rule.id, eventId: 'member:epoch-1' } }), 1);
    });

    await t.test('Q2. automation enqueue fails closed for disabled and unavailable module states', async () => {
      const rule = await makeAutomationRule(guildA, 'MEMBER_LEAVE', 'SEND_DM', { message: 'Goodbye {user}' });
      const moduleRecord = await prisma.guildModule.findUniqueOrThrow({ where: { guildId_module: { guildId: guildA, module: 'automation' } } });
      await prisma.guildModule.update({ where: { id: moduleRecord.id }, data: { enabled: false } });
      const disabled = await AutomationExecutionRepository.enqueueEvent(guildA, 'MEMBER_LEAVE', 'member:module-disabled', memberEvent());
      assert.equal(disabled.count, 0);
      assert.equal(disabled.moduleState, 'DISABLED');

      await prisma.guildModule.update({ where: { id: moduleRecord.id }, data: { enabled: true } });
      const { getModuleDefinition } = module.require('../src/config/modules.ts');
      const automationDefinition = getModuleDefinition('automation');
      const wasImplemented = automationDefinition.runtimeImplemented;
      try {
        automationDefinition.runtimeImplemented = false;
        const unavailable = await AutomationExecutionRepository.enqueueEvent(guildA, 'MEMBER_LEAVE', 'member:module-unavailable', memberEvent());
        assert.equal(unavailable.count, 0);
        assert.equal(unavailable.moduleState, 'UNAVAILABLE');
        assert.equal(await prisma.automationExecution.count({ where: { guildId: guildA, eventId: { in: ['member:module-disabled', 'member:module-unavailable'] } } }), 0);
      } finally {
        automationDefinition.runtimeImplemented = wasImplemented;
      }
      await prisma.automationRule.update({ where: { id: rule.id }, data: { enabled: false } });
    });

    await t.test('Q3. queued automation pauses without consuming attempts and resumes after re-enable', async () => {
      const rule = await makeAutomationRule(guildA, 'MEMBER_LEAVE', 'SEND_DM', { message: 'Goodbye {user}' });
      await AutomationExecutionRepository.enqueueEvent(guildA, 'MEMBER_LEAVE', 'member:module-pause-resume', memberEvent());
      const moduleRecord = await prisma.guildModule.findUniqueOrThrow({ where: { guildId_module: { guildId: guildA, module: 'automation' } } });
      const { getModuleDefinition } = module.require('../src/config/modules.ts');
      const automationDefinition = getModuleDefinition('automation');
      const wasImplemented = automationDefinition.runtimeImplemented;
      try {
        automationDefinition.runtimeImplemented = false;
        await AutomationExecutionService.processDue({}, new Date(Date.now() + 1000));
      } finally {
        automationDefinition.runtimeImplemented = wasImplemented;
      }
      let execution = await prisma.automationExecution.findFirstOrThrow({ where: { ruleId: rule.id, eventId: 'member:module-pause-resume' } });
      assert.equal(execution.status, 'PENDING');
      assert.equal(execution.attempts, 0);

      await prisma.guildModule.update({ where: { id: moduleRecord.id }, data: { enabled: false } });
      let sends = 0;
      const user = { send: async () => { sends += 1; return { id: 'discord-dm-paused' }; } };
      const client = { guilds: { fetch: async () => ({}) }, users: { fetch: async () => user } };
      await AutomationExecutionService.processDue(client, new Date(Date.now() + 1000));
      await AutomationExecutionService.processDue(client, new Date(Date.now() + 2000));
      execution = await prisma.automationExecution.findFirstOrThrow({ where: { ruleId: rule.id, eventId: 'member:module-pause-resume' } });
      assert.equal(execution.status, 'PENDING');
      assert.equal(execution.attempts, 0);
      assert.equal(sends, 0);

      await prisma.guildModule.update({ where: { id: moduleRecord.id }, data: { enabled: true } });
      await Promise.all([
        AutomationExecutionService.processDue(client, new Date(Date.now() + 3000)),
        AutomationExecutionService.processDue(client, new Date(Date.now() + 3000)),
      ]);
      execution = await prisma.automationExecution.findUniqueOrThrow({ where: { id: execution.id } });
      assert.equal(execution.status, 'COMPLETED');
      assert.equal(execution.attempts, 1);
      assert.equal(sends, 1);
    });

    await t.test('Q4. a disable racing with lease acquisition releases the lease without charging a retry', async () => {
      const rule = await makeAutomationRule(guildA, 'MEMBER_LEAVE', 'SEND_DM', { message: 'Goodbye {user}' });
      await AutomationExecutionRepository.enqueueEvent(guildA, 'MEMBER_LEAVE', 'member:module-disable-race', memberEvent());
      const target = await prisma.automationExecution.findFirstOrThrow({ where: { ruleId: rule.id, eventId: 'member:module-disable-race' } });
      const findDue = AutomationExecutionRepository.findDue;
      const { GuildRepository } = module.require('../src/database/repositories/guild.repository.ts');
      const resolveState = GuildRepository.getModuleOperationalState;
      let stateReads = 0;
      AutomationExecutionRepository.findDue = async (now) => (await findDue(now)).filter((item) => item.id === target.id);
      GuildRepository.getModuleOperationalState = async (targetGuildId, moduleKey) => {
        if (targetGuildId === guildA && moduleKey === 'automation' && ++stateReads === 2) return 'DISABLED';
        return resolveState(targetGuildId, moduleKey);
      };
      try {
        await AutomationExecutionService.processDue({}, new Date(Date.now() + 1000));
      } finally {
        AutomationExecutionRepository.findDue = findDue;
        GuildRepository.getModuleOperationalState = resolveState;
      }
      const execution = await prisma.automationExecution.findUniqueOrThrow({ where: { id: target.id } });
      assert.equal(execution.status, 'PENDING');
      assert.equal(execution.attempts, 0);
      assert.equal(execution.leaseToken, null);
      await prisma.automationRule.update({ where: { id: rule.id }, data: { enabled: false } });
    });

    await t.test('R. durable automation worker dispatches a channel action and completes its lease', async () => {
      const rule = await makeAutomationRule(guildA, 'MEMBER_JOIN', 'SEND_MESSAGE', {
        channelId: '123456789012345679',
        message: 'Welcome {user} to {server} ({memberCount})',
      });
      const payload = memberEvent();
      await AutomationExecutionRepository.enqueueEvent(guildA, 'MEMBER_JOIN', 'member:epoch-2', payload);
      const sent = [];
      const channel = {
        guild: { id: guildA },
        isTextBased: () => true,
        isThread: () => false,
        permissionsFor: () => ({ has: () => true }),
        send: async (options) => { sent.push(options); return { id: 'discord-message-automation-1' }; },
      };
      const guild = { channels: { fetch: async () => channel }, members: { fetchMe: async () => ({}) } };
      const client = { guilds: { fetch: async () => guild } };
      await AutomationExecutionService.processDue(client, new Date(Date.now() + 1000));
      const execution = await prisma.automationExecution.findFirstOrThrow({ where: { ruleId: rule.id, eventId: 'member:epoch-2' } });
      assert.equal(execution.status, 'COMPLETED');
      assert.equal(execution.attempts, 1);
      const sentForExecution = sent.filter((message) => message.nonce === execution.idempotencyKey.slice(0, 25));
      assert.equal(sentForExecution.length, 1);
      assert.equal(sentForExecution[0].content, 'Welcome Test User to Test Guild (7)');
      assert.deepEqual(sentForExecution[0].allowedMentions.parse, []);
      assert.equal(sentForExecution[0].enforceNonce, true);
      const audit = await prisma.auditLog.findFirst({ where: { guildId: guildA, targetId: execution.id, action: 'AUTOMATION_EXECUTION' } });
      assert(audit);
      assert.match(audit.details, /SUCCESS/);
    });

    await t.test('S. durable automation worker can deliver direct messages for join/leave event snapshots', async () => {
      const rule = await makeAutomationRule(guildA, 'MEMBER_LEAVE', 'SEND_DM', { message: 'Thanks {user} from {server}' });
      const payload = memberEvent();
      await AutomationExecutionRepository.enqueueEvent(guildA, 'MEMBER_LEAVE', 'member:epoch-3', payload);
      const sent = [];
      const user = { send: async (options) => { sent.push(options); return { id: 'discord-dm-1' }; } };
      const client = { guilds: { fetch: async () => ({}) }, users: { fetch: async () => user } };
      await AutomationExecutionService.processDue(client, new Date(Date.now() + 1000));
      const execution = await prisma.automationExecution.findFirstOrThrow({ where: { ruleId: rule.id, eventId: 'member:epoch-3' } });
      assert.equal(execution.status, 'COMPLETED');
      const sentForExecution = sent.filter((message) => message.nonce === execution.idempotencyKey.slice(0, 25));
      assert.equal(sentForExecution.length, 1);
      assert.equal(sentForExecution[0].content, 'Thanks Test User from Test Guild');
      assert.deepEqual(sentForExecution[0].allowedMentions.parse, []);
      const audit = await prisma.auditLog.findFirst({ where: { guildId: guildA, targetId: execution.id, action: 'AUTOMATION_EXECUTION' } });
      assert(audit);
      assert.match(audit.details, /SUCCESS/);
    });

    await t.test('S2. welcome delivery uses the durable worker with dedupe, retry, nonce, and module checks', async () => {
      const oldFetch = global.fetch;
      const oldToken = process.env.DISCORD_TOKEN;
      const event = memberEvent();
      const enqueue = () => AutomationExecutionService.enqueueWelcomeMemberEvent({
        ...event, eventType: 'MEMBER_JOIN', eventId: 'welcome-member:joined-at-1',
        config: {
          enabled: true, channelId: '123456789012345679', message: 'Welcome {user} to {server}',
          imageUrl: null, dmEnabled: false, dmMessage: null, leaveChannelId: null, leaveMessage: null,
        },
      });
      process.env.DISCORD_TOKEN = 'test-welcome-worker-token';
      let failOnce = true;
      const sends = [];
      global.fetch = async (url, options) => {
        const address = String(url);
        if (options.method === 'GET' && address.endsWith('/channels/123456789012345679') && failOnce) {
          failOnce = false;
          return new Response('{}', { status: 503 });
        }
        if (options.method === 'GET' && address.endsWith('/channels/123456789012345679'))
          return new Response(JSON.stringify({ id: '123456789012345679', guild_id: guildA, type: 0 }), { status: 200 });
        if (options.method === 'POST' && address.endsWith('/channels/123456789012345679/messages')) {
          sends.push(JSON.parse(options.body));
          return new Response(JSON.stringify({ id: 'welcome-message-1' }), { status: 200 });
        }
        throw new Error(`Unexpected mocked Discord request: ${options.method} ${address}`);
      };
      try {
        const [first, duplicate] = await Promise.all([enqueue(), enqueue()]);
        assert.equal(first.count + duplicate.count, 1);
        const job = await prisma.automationExecution.findFirstOrThrow({ where: { guildId: guildA, ruleId: null, action: 'WELCOME_CHANNEL' } });
        assert.equal(job.status, 'PENDING');

        await AutomationExecutionService.processDue({}, new Date(Date.now() + 1000));
        let saved = await prisma.automationExecution.findUniqueOrThrow({ where: { id: job.id } });
        assert.equal(saved.status, 'PENDING');
        assert.equal(saved.attempts, 1);
        assert.equal(saved.lastError, 'DiscordApiError');

        assert.equal((await enqueue()).count, 0);
        await AutomationExecutionService.processDue({}, new Date(Date.now() + 60_000));
        saved = await prisma.automationExecution.findUniqueOrThrow({ where: { id: job.id } });
        assert.equal(saved.status, 'COMPLETED');
        assert.equal(sends.length, 1);
        assert.equal(sends[0].content, `Welcome <@${event.userId}> to Test Guild`);
        assert.deepEqual(sends[0].allowed_mentions, { parse: [], users: [event.userId] });
        assert.equal(sends[0].nonce, job.idempotencyKey.slice(0, 25));
        assert.equal(sends[0].enforce_nonce, true);
        assert.ok(await prisma.auditLog.findFirst({ where: { guildId: guildA, action: 'WELCOME_DELIVERY', targetId: event.userId } }));

        await prisma.guildModule.create({ data: { guildId: guildA, module: 'welcome', enabled: false } });
        const disabledEvent = await AutomationExecutionService.enqueueWelcomeMemberEvent({
          ...event, eventType: 'MEMBER_JOIN', eventId: 'welcome-member:joined-at-disabled',
          config: { enabled: true, channelId: '123456789012345679', message: 'No send', imageUrl: null,
            dmEnabled: false, dmMessage: null, leaveChannelId: null, leaveMessage: null },
        });
        assert.equal(disabledEvent.count, 1);
        await AutomationExecutionService.processDue({}, new Date(Date.now() + 60_000));
        const disabledJob = await prisma.automationExecution.findFirstOrThrow({ where: { guildId: guildA, eventId: { contains: 'welcome-member:joined-at-disabled' } } });
        assert.equal(disabledJob.status, 'FAILED');
        assert.equal(sends.length, 1);
      } finally {
        global.fetch = oldFetch;
        if (oldToken === undefined) delete process.env.DISCORD_TOKEN;
        else process.env.DISCORD_TOKEN = oldToken;
      }
    });

    await t.test('T. concurrent moderation case allocation is unique and ordered per guild', async () => {
      const input = {
        guildId: guildA,
        targetId: '123456789012345678',
        moderatorId: 'integration-test-actor',
        moderatorTag: 'integration-test',
        action: 'WARN',
        reason: 'concurrency test',
        evidence: null,
        durationSeconds: null,
      };
      const [batchOne, batchTwo] = await Promise.all([
        Promise.all(Array.from({ length: 8 }, () => createCase(input))),
        Promise.all(Array.from({ length: 8 }, () => createCase(input))),
      ]);
      const cases = [...batchOne, ...batchTwo];
      const numbers = cases.map((item) => item.caseNumber).sort((a, b) => a - b);
      assert.deepEqual(numbers, Array.from({ length: 16 }, (_, index) => index + 1));
      assert.equal(await prisma.moderationCase.count({ where: { guildId: guildA } }), 16);
    });

    await t.test('U. evidence metadata is guild validated and persisted with moderation case', async () => {
      const link = `https://discord.com/channels/${guildA}/123456789012345679/123456789012345680`;
      assert.deepEqual(validateModerationEvidence(guildA, [link]), [link]);
      assert.throws(() => validateModerationEvidence(guildA, [`https://discord.com/channels/${guildB}/123456789012345679/123456789012345680`]));
      assert.throws(() => validateModerationEvidence(guildA, ['https://example.org/evidence']));
      const caseItem = await createCase({
        guildId: guildA,
        targetId: '123456789012345678',
        moderatorId: 'integration-test-actor',
        moderatorTag: 'integration-test',
        action: 'WARN',
        reason: 'evidence test',
        evidence: JSON.stringify(validateModerationEvidence(guildA, [link])),
        durationSeconds: null,
      });
      assert.deepEqual(JSON.parse(caseItem.evidence), [link]);
    });

    await t.test('V. bot moderation repository allocates case numbers safely under concurrency', async () => {
      const { runModeration } = module.require('../src/services/moderation.service.ts');
      const cases = await Promise.all(Array.from({ length: 8 }, (_, index) => runModeration(
        prisma,
        {
          authorize: async () => ({}),
          prepare: async () => ({ details: {}, perform: async () => {} }),
        },
        {
          guildId: guildB,
          targetId: String(123456789012345678n + BigInt(index)),
          action: 'WARN',
          reason: 'service concurrency test',
          requestKey: randomUUID(),
        },
        '666666666666666666',
        'BOT',
      )));
      const numbers = cases.map((item) => item.caseNumber).sort((a, b) => a - b);
      assert.deepEqual(numbers, Array.from({ length: 8 }, (_, index) => index + 1));
      assert.equal(await prisma.moderationCase.count({ where: { guildId: guildB } }), 8);
    });

    await t.test('W. allocations for different guilds do not wait on each other\'s transaction lock', async () => {
      let signalAcquired;
      let releaseHeldLock;
      const acquired = new Promise((resolve) => { signalAcquired = resolve; });
      const hold = new Promise((resolve) => { releaseHeldLock = resolve; });
      const heldTransaction = prisma.$transaction(async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${guildA}, 0))`;
        signalAcquired();
        await hold;
      });
      await acquired;
      try {
        const result = await Promise.race([
          createCase({ guildId: guildB, targetId: '123456789012345678', moderatorId: 'integration-test-actor', action: 'WARN' }).then(() => 'completed'),
          new Promise((resolve) => setTimeout(() => resolve('blocked'), 1000)),
        ]);
        assert.equal(result, 'completed');
      } finally {
        releaseHeldLock();
        await heldTransaction;
      }
    });

    await t.test('X. a transaction rollback removes its case and releases its guild lock', async () => {
      const before = await prisma.moderationCase.count({ where: { guildId: guildA } });
      await assert.rejects(prisma.$transaction(async (transaction) => {
        await createNumberedModerationCase(transaction, {
          guildId: guildA, targetId: '123456789012345678', moderatorId: 'integration-test-actor', action: 'WARN',
        });
        throw new Error('force rollback after case creation');
      }), /force rollback/);
      assert.equal(await prisma.moderationCase.count({ where: { guildId: guildA } }), before);
      const next = await createCase({ guildId: guildA, targetId: '123456789012345678', moderatorId: 'integration-test-actor', action: 'WARN' });
      assert.equal(next.caseNumber, before + 1);
    });

    await t.test('Y. a database case-creation failure after lock acquisition rolls back and releases the lock', async () => {
      const orphanGuild = testSnowflake();
      await assert.rejects(createCase({
        guildId: orphanGuild, targetId: '123456789012345678', moderatorId: 'integration-test-actor', action: 'WARN',
      }));
      await makeGuild(orphanGuild);
      try {
        const caseItem = await createCase({
          guildId: orphanGuild, targetId: '123456789012345678', moderatorId: 'integration-test-actor', action: 'WARN',
        });
        assert.equal(caseItem.caseNumber, 1);
      } finally {
        await prisma.guild.delete({ where: { id: orphanGuild } });
      }
    });

    await t.test('Z. moderation duration preserves zero and normal values and rejects invalid values', async () => {
      assert.equal(normalizeModerationDuration(undefined), null);
      assert.equal(normalizeModerationDuration(null), null);
      assert.equal(normalizeModerationDuration(0), 0);
      assert.equal(normalizeModerationDuration(3600), 3600);
      for (const invalid of [-1, 1.5, Number.NaN, 2_419_201, '60']) {
        assert.throws(() => normalizeModerationDuration(invalid));
      }
      const zeroCase = await createCase({
        guildId: guildB, targetId: '123456789012345678', moderatorId: 'integration-test-actor', action: 'TIMEOUT', durationSeconds: 0,
      });
      const normalCase = await createCase({
        guildId: guildB, targetId: '123456789012345678', moderatorId: 'integration-test-actor', action: 'TIMEOUT', durationSeconds: 3600,
      });
      assert.equal(zeroCase.durationSeconds, 0);
      assert.equal(normalCase.durationSeconds, 3600);
    });
  });
}
