const { test } = module.require('node:test');
const assert = module.require('node:assert/strict');
const fs = module.require('node:fs');
const path = module.require('node:path');
const vm = module.require('node:vm');
const ts = module.require('typescript');

const source = path.resolve(__dirname, '../src/services/selfrole.service.ts');
const code = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const G = '111111111111111111';
const U = '222222222222222222';
const A = '333333333333333333';
const B = '444444444444444444';

function fixture({ enabled = true, initial = [], failAdd = null, failAudit = false } = {}) {
  const roles = new Set(initial);
  const audits = [];
  const replies = [];
  let adds = 0;
  const member = {
    id: U,
    guild: { id: G },
    roles: {
      cache: { has: (id) => roles.has(id) },
      add: async (id) => {
        adds += 1;
        if (failAdd === adds) throw new Error('DiscordApiError');
        roles.add(id);
      },
      remove: async (id) => { roles.delete(id); },
    },
    fetch: async () => member,
  };
  const configured = [A, B].map((roleId) => ({ roleId, name: roleId === A ? 'A' : 'B' }));
  const guild = {
    id: G,
    members: { fetchMe: async () => ({ permissions: { bitfield: 1n << 28n }, roles: { highest: { position: 100 } } }) },
    roles: { fetch: async (id) => ({ id, managed: false, position: 1, permissions: { bitfield: 0n } }) },
  };
  const interaction = {
    guild, guildId: G, member, user: { id: U }, values: [A],
    reply: async (payload) => replies.push(payload),
  };
  const mocks = {
    'discord.js': { ChannelType: { GuildText: 0 } },
    '../database/repositories/selfrole.repository': { SelfRoleRepository: {
      listByGuild: async () => configured,
    } },
    '../embeds/kraxxEmbedBuilder': { KRAXX_COLORS: { BRAND: 1 }, KraxxEmbedBuilder: {
      error: (title, description) => ({ title, description }), success: (title, description) => ({ title, description }),
    } },
    '../security/policy': { assertRolePolicy: () => {} },
    '../database/repositories/guild.repository': { GuildRepository: { isModuleEnabled: async () => enabled } },
    '../database/repositories/audit.repository': { AuditRepository: { create: async (entry) => {
      if (failAudit) throw new Error('audit unavailable');
      audits.push(entry);
    } } },
    './audit-event': { createAuditDetails: (data) => JSON.stringify(data) },
    '../utils/logger': { logger: { error: () => {} } },
  };
  const mod = { exports: {} };
  const localRequire = (id) => {
    if (id in mocks) return mocks[id];
    throw new Error(`Unmocked self-role dependency: ${id}`);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: source })(localRequire, mod, mod.exports);
  return { service: mod.exports.SelfRoleService, interaction, roles, audits, replies };
}

test('self-role selection assigns configured roles and writes canonical audit', async () => {
  const f = fixture();
  await f.service.handleRoleSelection(f.interaction);
  assert.deepEqual([...f.roles], [A]);
  assert.equal(f.audits[0].action, 'SELF_ROLE_UPDATE');
  assert.equal(JSON.parse(f.audits[0].details).outcome, 'SUCCESS');
  assert.equal(f.replies[0].embeds[0].title, 'Roles Updated');
});

test('self-role selection removes an existing configured role and is repeatable', async () => {
  const f = fixture({ initial: [A] });
  f.interaction.values = [];
  await f.service.handleRoleSelection(f.interaction);
  assert.deepEqual([...f.roles], []);
  assert.deepEqual(JSON.parse(f.audits[0].details).metadata.removed, ['A']);
  await f.service.handleRoleSelection(f.interaction);
  assert.equal(f.audits.length, 2);
  assert.match(f.replies[1].embeds[0].description, /No changes/);
});

test('disabled module and cross-guild member context fail before any role mutation', async () => {
  const disabled = fixture({ enabled: false });
  await disabled.service.handleRoleSelection(disabled.interaction);
  assert.deepEqual([...disabled.roles], []);
  assert.equal(disabled.audits.length, 0);
  const foreign = fixture();
  foreign.interaction.member.guild.id = '999999999999999999';
  await foreign.service.handleRoleSelection(foreign.interaction);
  assert.deepEqual([...foreign.roles], []);
  assert.equal(foreign.audits.length, 0);
});

test('partial Discord failure rolls back prior self-role changes and records failure', async () => {
  const f = fixture({ failAdd: 2 });
  f.interaction.values = [A, B];
  await f.service.handleRoleSelection(f.interaction);
  assert.deepEqual([...f.roles], []);
  assert.equal(JSON.parse(f.audits[0].details).outcome, 'FAILURE');
  assert.equal(f.replies[0].embeds[0].title, 'Role Update Failed');
});

test('audit failure triggers rollback and does not report success', async () => {
  const f = fixture({ failAudit: true });
  await f.service.handleRoleSelection(f.interaction);
  assert.deepEqual([...f.roles], []);
  assert.equal(f.replies[0].embeds[0].title, 'Role Update Failed');
});
