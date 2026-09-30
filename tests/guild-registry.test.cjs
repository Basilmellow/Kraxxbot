/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function load(file, mocks = {}) {
  const filename = path.resolve(root, file);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  const localRequire = id => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), `${id}.ts`)), mocks);
    throw new Error(`Unmocked dependency ${id}`);
  };
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(localRequire, module, module.exports);
  return module.exports;
}

function repositoryHarness() {
  const guilds = new Map(); const moduleRows = new Map(); const settings = new Map(); const updates = [];
  const prisma = {
    guild: {
      upsert: async ({ where, create, update }) => {
        const current = guilds.get(where.id);
        if (current) Object.assign(current, Object.fromEntries(Object.entries(update).filter(([, value]) => value !== undefined)));
        else guilds.set(where.id, { ...create, joinedAt: new Date('2026-01-01T00:00:00Z') });
        return guilds.get(where.id);
      },
      updateMany: async ({ where, data }) => {
        updates.push({ where, data });
        for (const [id, row] of guilds) {
          const included = where.id?.notIn ? !where.id.notIn.includes(id) : !where.id || where.id === id;
          if (included && (!where.botInstalled || row.botInstalled)) Object.assign(row, data);
        }
      },
    },
    guildSettings: { upsert: async ({ where, create }) => settings.set(where.guildId, settings.get(where.guildId) || create) },
    guildModule: { upsert: async ({ where, create }) => moduleRows.set(`${where.guildId_module.guildId}:${where.guildId_module.module}`, moduleRows.get(`${where.guildId_module.guildId}:${where.guildId_module.module}`) || create) },
  };
  const repository = load('src/database/repositories/guild.repository.ts', {
    '../client': { prisma }, '@prisma/client': {},
    '../../config/modules': { MODULE_CATALOG: [{ key: 'kraxx-ai' }, { key: 'tickets' }], assertModuleKey() {}, getModuleState() {}, ModuleOperationalState: {} },
    '../../config/settings': { settingsContract: {} },
  }).GuildRepository;
  return { repository, guilds, settings, moduleRows, updates };
}

test('guild upsert is idempotent and preserves the first-seen timestamp', async () => {
  const h = repositoryHarness();
  const data = { id: '12345678901234567', name: 'Guild A', icon: null, ownerId: '22345678901234567', memberCount: 12 };
  await h.repository.upsertGuild(data);
  const firstSeen = h.guilds.get(data.id).joinedAt;
  await h.repository.upsertGuild({ ...data, name: 'Guild A renamed', memberCount: 14 });
  assert.equal(h.guilds.size, 1);
  assert.equal(h.guilds.get(data.id).joinedAt, firstSeen);
  assert.equal(h.guilds.get(data.id).name, 'Guild A renamed');
  assert.equal(h.guilds.get(data.id).memberCount, 14);
  assert.equal(h.guilds.get(data.id).connectionStatus, 'CONNECTED');
  assert.equal(h.moduleRows.size, 2);
});

test('guild removal preserves the registry and records a left state', async () => {
  const h = repositoryHarness(); const id = '12345678901234567';
  await h.repository.upsertGuild({ id, name: 'Guild A', icon: null, ownerId: '22345678901234567' });
  await h.repository.markBotRemoved(id);
  assert.equal(h.guilds.size, 1);
  assert.equal(h.guilds.get(id).botInstalled, false);
  assert.equal(h.guilds.get(id).connectionStatus, 'LEFT');
  assert.ok(h.guilds.get(id).leftAt instanceof Date);
});

test('unavailable state and startup reconciliation never infer that a guild left', async () => {
  const h = repositoryHarness(); const connected = '12345678901234567'; const missing = '22345678901234567';
  await h.repository.upsertGuild({ id: connected, name: 'A', icon: null, ownerId: '32345678901234567' });
  await h.repository.upsertGuild({ id: missing, name: 'B', icon: null, ownerId: '42345678901234567' });
  await h.repository.markGuildUnavailable(connected);
  await h.repository.markMissingGatewayGuildsUnavailable([connected]);
  assert.equal(h.guilds.get(connected).connectionStatus, 'UNAVAILABLE');
  assert.equal(h.guilds.get(connected).botInstalled, true);
  assert.equal(h.guilds.get(missing).connectionStatus, 'UNAVAILABLE');
  assert.equal(h.guilds.get(missing).botInstalled, true);
  await h.repository.upsertGuild({ id: missing, name: 'B', icon: null, ownerId: '42345678901234567' });
  await h.repository.markMissingGatewayGuildsUnavailable([]);
  assert.equal(h.guilds.get(missing).connectionStatus, 'UNAVAILABLE');
  assert.equal(h.updates.length, 3);
});

test('guildDelete distinguishes an outage from an actual bot removal', async () => {
  const calls = [];
  const event = load('src/events/guildDelete.ts', { '../utils/logger': { logger: { info() {}, warn() {}, error() {} } },
    '../database/repositories/guild.repository': { GuildRepository: { markBotRemoved: async id => calls.push(['left', id]), markGuildUnavailable: async id => calls.push(['unavailable', id]) } } });
  await event.onGuildDelete({ id: '12345678901234567', available: false });
  await event.onGuildDelete({ id: '22345678901234567', available: true });
  assert.deepEqual(calls, [['unavailable', '12345678901234567'], ['left', '22345678901234567']]);
});

test('Gateway READY reconciles current guilds only after ready and marks absent guilds unavailable', async () => {
  const calls = [];
  const ready = load('src/events/ready.ts', {
    'discord.js': {}, '../utils/logger': { logger: { info() {}, error() {} } },
    '../services/scheduler.service': { SchedulerService: { start() {}, health: () => 'OPERATIONAL' } },
    '../services/heartbeat.service': { HeartbeatService: { start() {} } },
    '../database/repositories/guild.repository': { GuildRepository: {
      upsertGuild: async guild => calls.push(['upsert', guild.id]), markGuildUnavailable: async id => calls.push(['unavailable', id]),
      markMissingGatewayGuildsUnavailable: async ids => calls.push(['reconcile', ids]),
    } }, '../config/environment': { env: { NODE_ENV: 'test' } },
  });
  const a = { id: '12345678901234567', name: 'A', icon: null, ownerId: '32345678901234567', memberCount: 2, available: true };
  const b = { id: '22345678901234567', name: 'B', icon: null, ownerId: '42345678901234567', memberCount: 1, available: false };
  await ready.onReady({ user: { tag: 'bot', id: '1', setPresence() {} }, guilds: { cache: new Map([[a.id, a], [b.id, b]]) } });
  assert.deepEqual(calls, [['upsert', a.id], ['upsert', b.id], ['unavailable', b.id], ['reconcile', [a.id, b.id]]]);
});
