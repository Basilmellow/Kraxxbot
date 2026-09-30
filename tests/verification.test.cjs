const { test } = module.require('node:test');
const assert = module.require('node:assert/strict');
const fs = module.require('node:fs');
const path = module.require('node:path');
const vm = module.require('node:vm');
const ts = module.require('typescript');
const root = path.resolve(__dirname, '..');

function loadVerification(mocks) {
  const file = 'src/services/verification.service.ts';
  const filename = path.resolve(root, file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => {
    if (id in mocks) return mocks[id];
    throw new Error(`Unmocked verification dependency: ${id}`);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(localRequire, module, module.exports);
  return module.exports.VerificationService;
}

const G = '111111111111111111';
const U = '222222222222222222';
const R = '333333333333333333';
const DiscordApiError = class extends Error { constructor(status) { super('safe transport error'); this.status = status; } };

function fixture({ isVerified = false, enabled = true, roleId = R, discordError = null, memberGuildId = G } = {}) {
  const order = [];
  const attempts = [];
  const replies = [];
  const interaction = {
    member: {
      id: U,
      user: { id: U, username: 'member', tag: 'member#0001', avatarURL: () => null },
      displayName: 'Member',
      guild: { id: memberGuildId },
      roles: { cache: { has: () => false } },
    },
    guild: { id: G, name: 'Test Guild' },
    replied: false,
    deferred: false,
    reply: async (payload) => { replies.push(payload); interaction.replied = true; },
    followUp: async (payload) => replies.push(payload),
  };
  const service = loadVerification({
    '../database/repositories/member.repository': {
      MemberRepository: {
        upsertMember: async () => ({ isVerified }),
        markVerified: async () => { order.push('database-success'); },
        logVerificationAttempt: async (_guild, _user, status, note) => attempts.push({ status, note }),
      },
    },
    '../embeds/kraxxEmbedBuilder': {
      KraxxEmbedBuilder: {
        error: (title) => ({ title }),
        success: (title) => ({ title }),
      },
    },
    '../security/automatic-role': {
      validateAutomaticRole: async () => ({ id: R }),
    },
    '../utils/logger': { logger: { error: () => {}, warn: () => {} } },
    './audit.service': { AuditService: { logEvent: async () => { order.push('audit-notification'); } } },
    '../database/repositories/guild.repository': { GuildRepository: { isModuleEnabled: async () => enabled } },
    './discord-transport': {
      DiscordApiError,
      discordRequest: async () => {
        order.push('discord-role');
        if (discordError) throw new DiscordApiError(discordError);
        return new Response(null, { status: 204 });
      },
    },
    '../database/client': { prisma: { welcomeConfig: { findUnique: async () => ({ roleId }) } } },
  });
  return {
    process: async () => {
      const oldToken = process.env.DISCORD_TOKEN;
      process.env.DISCORD_TOKEN = 'test-token';
      try { await service.processVerification(interaction); }
      finally { if (oldToken === undefined) delete process.env.DISCORD_TOKEN; else process.env.DISCORD_TOKEN = oldToken; }
    },
    order,
    attempts,
    replies,
  };
}

test('verification assigns the configured role before committing verified state', async () => {
  const f = fixture();
  await f.process();
  assert.deepEqual(f.order, ['discord-role', 'database-success', 'audit-notification']);
  assert.equal(f.replies[0].embeds[0].title, 'Verification Complete');
});

test('Discord role rejection leaves the member unverified and records a safe failure', async () => {
  const f = fixture({ discordError: 403 });
  await f.process();
  assert.deepEqual(f.order, ['discord-role']);
  assert.deepEqual(f.attempts, [{ status: 'FAILED', note: 'DISCORD_403' }]);
  assert.equal(f.replies[0].embeds[0].title, 'Verification Error');
});

test('verified retries are idempotent and do not repeat a Discord role mutation', async () => {
  const f = fixture({ isVerified: true });
  await f.process();
  assert.deepEqual(f.order, []);
  assert.equal(f.attempts[0].status, 'ALREADY_VERIFIED');
  assert.equal(f.replies[0].embeds[0].title, 'Already Verified');
});

test('disabled module and conflicting guild/member context fail before database or Discord work', async () => {
  const disabled = fixture({ enabled: false });
  await disabled.process();
  assert.deepEqual(disabled.order, []);
  assert.equal(disabled.replies[0].embeds[0].title, 'Verification Unavailable');
  const foreign = fixture({ memberGuildId: '999999999999999999' });
  await foreign.process();
  assert.deepEqual(foreign.order, []);
  assert.equal(foreign.replies[0].embeds[0].title, 'Verification Failed');
});
