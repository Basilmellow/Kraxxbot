const { test } = module.require('node:test');
const assert = module.require('node:assert/strict');
module.require('ts-node/register/transpile-only');
const { createModerationAdapter } = module.require('../src/services/moderation-discord.ts');
const { parseModerationInput } = module.require('../src/services/moderation-contract.ts');
const { DiscordApiError, discordRequest } = module.require('../src/services/discord-transport.ts');
const G = '111111111111111111',
  A = '222222222222222222',
  T = '333333333333333333',
  B = '444444444444444444',
  C = '555555555555555555';
const bit = n => 1n << BigInt(n);
const all = [1, 2, 4, 10, 11, 13, 16, 28, 40].reduce((a, n) => a | bit(n), 0n).toString();
const raw = (action, target = T) =>
  parseModerationInput(
    { guildId: G, targetId: target, action, requestKey: 'test-request-0001', durationSeconds: 60 },
    A,
    'DASHBOARD'
  );
function fixture(options = {}) {
  const calls = [];
  const roles = [
    { id: G, permissions: '0', position: 0 },
    {
      id: 'actor',
      permissions: options.actorPermissions ?? all,
      position: options.actorPosition ?? 10,
    },
    { id: 'bot', permissions: options.botPermissions ?? all, position: options.botPosition ?? 20 },
    {
      id: 'target',
      permissions: options.targetPermissions ?? '0',
      position: options.targetPosition ?? 1,
    },
  ];
  const channel = {
    id: C,
    guild_id: options.channelGuild ?? G,
    type: options.channelType ?? 0,
    permission_overwrites: options.overwrites ?? [],
  };
  const fetch = async (url, init = {}) => {
    const path = new URL(url).pathname.replace('/api/v10', '');
    calls.push({ path, ...init });
    if (init.method !== 'GET') {
      if (options.mutationError === 'network') throw new Error('sensitive network body');
      return new Response(
        options.mutationStatus && options.mutationStatus !== 204 ? 'private failure' : null,
        { status: options.mutationStatus ?? 204 }
      );
    }
    let value;
    if (path === `/guilds/${G}`) value = { id: G, owner_id: options.owner ?? '999999999999999999' };
    else if (path === `/guilds/${G}/roles`) value = roles;
    else if (path === '/users/@me') value = { id: B };
    else if (path === `/guilds/${G}/members/${A}`) value = { user: { id: A }, roles: ['actor'] };
    else if (path === `/guilds/${G}/members/${B}`) value = { user: { id: B }, roles: ['bot'] };
    else if (path === `/guilds/${G}/members/${T}`) {
      if (options.targetMissing) return new Response('{}', { status: 404 });
      value = { user: { id: options.targetId ?? T }, roles: ['target'] };
    } else if (path === `/guilds/${G}/bans/${T}`) value = { user: { id: T } };
    else if (path === `/channels/${C}`) value = channel;
    else if (path === `/channels/${C}/messages`) value = options.messages ?? [];
    else return new Response('{}', { status: 404 });
    return new Response(JSON.stringify(value));
  };
  return { calls, fetch, channel };
}
async function withFixture(options, run) {
  const old = global.fetch;
  const f = fixture(options);
  global.fetch = f.fetch;
  try {
    await run(createModerationAdapter('fake-token'), f);
  } finally {
    global.fetch = old;
  }
}
for (const action of [
  'WARN',
  'TIMEOUT',
  'KICK',
  'BAN',
  'UNBAN',
  'PURGE',
  'SLOWMODE',
  'LOCK',
  'UNLOCK',
]) {
  const channel = ['PURGE', 'SLOWMODE', 'LOCK', 'UNLOCK'].includes(action);
  test(`${action}: actor permission denial prevents mutation`, () =>
    withFixture({ actorPermissions: '0' }, async (adapter, f) => {
      await assert.rejects(adapter.authorize(raw(action, channel ? C : T)));
      assert(f.calls.every(c => c.method === 'GET'));
    }));
  if (action !== 'WARN')
    test(`${action}: bot permission denial prevents mutation`, () =>
      withFixture({ botPermissions: '0' }, async (adapter, f) => {
        await assert.rejects(adapter.authorize(raw(action, channel ? C : T)));
        assert(f.calls.every(c => c.method === 'GET'));
      }));
}
for (const action of ['WARN', 'TIMEOUT', 'KICK', 'BAN']) {
  for (const options of [
    { targetMissing: true },
    { targetId: C },
    { targetPosition: 10 },
    { targetPosition: 21 },
    { owner: T },
  ]) {
    test(`${action}: rejects absent, mismatched, higher or protected target ${JSON.stringify(options)}`, () =>
      withFixture(options, async adapter => {
        await assert.rejects(adapter.authorize(raw(action)));
      }));
  }
}
test('WARN does not require bot permission or hierarchy', () =>
  withFixture({ botPermissions: '0', botPosition: 1, targetPosition: 6 }, async adapter =>
    adapter.authorize(raw('WARN'))
  ));
test('bot hierarchy rejects a target even when actor is above that target', () =>
  withFixture({ actorPosition: 30, botPosition: 5, targetPosition: 6 }, async adapter =>
    assert.rejects(adapter.authorize(raw('BAN')))
  ));
test('TIMEOUT rejects administrator targets', () =>
  withFixture({ targetPermissions: String(bit(3)) }, async adapter =>
    assert.rejects(adapter.authorize(raw('TIMEOUT')))
  ));
test('slowmode rejects announcement channels unsupported by the documented field', () =>
  withFixture({ channelType: 5 }, async adapter =>
    assert.rejects(adapter.authorize(raw('SLOWMODE', C)))
  ));
for (const [action, method, path] of [
  ['TIMEOUT', 'PATCH', `/guilds/${G}/members/${T}`],
  ['KICK', 'DELETE', `/guilds/${G}/members/${T}`],
  ['BAN', 'PUT', `/guilds/${G}/bans/${T}`],
  ['UNBAN', 'DELETE', `/guilds/${G}/bans/${T}`],
]) {
  test(`${action}: successful mutation uses the authorized guild and target`, () =>
    withFixture({}, async (adapter, f) => {
      const input = raw(action);
      await (await adapter.prepare(input, await adapter.authorize(input), null)).perform();
      const writes = f.calls.filter(c => c.method !== 'GET');
      assert.equal(writes.length, 1);
      assert.equal(writes[0].method, method);
      assert.equal(writes[0].path, path);
      assert(decodeURIComponent(writes[0].headers['X-Audit-Log-Reason']).includes(A));
    }));
}
for (const action of ['PURGE', 'SLOWMODE', 'LOCK', 'UNLOCK']) {
  for (const options of [
    { channelGuild: T },
    { channelType: 11 },
    { overwrites: [{ id: A, type: 1, allow: '0', deny: all }] },
  ]) {
    test(`${action}: rejects cross-guild, unsupported or denied channel ${JSON.stringify(options)}`, () =>
      withFixture(options, async adapter => {
        await assert.rejects(adapter.authorize(raw(action, C)));
      }));
  }
}
test('purge deletes only recent unpinned messages in one bulk call', async () => {
  const snowflake = age => String(BigInt(Date.now() - 1420070400000 - age) << 22n);
  const recent = [snowflake(1000), snowflake(2000)];
  await withFixture(
    {
      messages: [
        ...recent.map(id => ({ id })),
        { id: snowflake(3000), pinned: true },
        { id: snowflake(15 * 86400000) },
      ],
    },
    async (adapter, f) => {
      const input = raw('PURGE', C);
      const plan = await adapter.prepare(input, await adapter.authorize(input), null);
      await plan.perform();
      assert.equal(plan.details.deletedCount, 2);
      assert.equal(plan.details.skippedCount, 2);
      const mutations = f.calls.filter(c => c.method !== 'GET');
      assert.equal(mutations.length, 1);
      assert.equal(mutations[0].path, `/channels/${C}/messages/bulk-delete`);
      assert.deepEqual(JSON.parse(mutations[0].body), { messages: recent });
    }
  );
});
test('slowmode sets zero and upper bound; invalid ranges fail before dispatch', async () => {
  for (const seconds of [0, 21600])
    await withFixture({}, async (adapter, f) => {
      const input = { ...raw('SLOWMODE', C), durationSeconds: seconds };
      const plan = await adapter.prepare(input, await adapter.authorize(input), null);
      await plan.perform();
      assert.deepEqual(JSON.parse(f.calls.at(-1).body), { rate_limit_per_user: seconds });
    });
  for (const seconds of [-1, 21601, 1.5, '60'])
    assert.throws(() =>
      parseModerationInput({ ...raw('SLOWMODE', C), durationSeconds: seconds }, A, 'BOT')
    );
});
test('lock/unlock preserves unrelated overwrite bits and restores prior Send Messages', async () => {
  const original = { id: G, type: 0, allow: String(bit(11) | bit(16)), deny: String(bit(13)) };
  let saved;
  await withFixture({ overwrites: [original] }, async (adapter, f) => {
    const input = raw('LOCK', C);
    const plan = await adapter.prepare(input, await adapter.authorize(input), null);
    saved = plan.details;
    await plan.perform();
    const body = JSON.parse(f.calls.at(-1).body);
    assert.equal(body.allow, String(bit(16)));
    assert.equal(body.deny, String(bit(13) | bit(11)));
  });
  await withFixture(
    { overwrites: [{ ...original, allow: String(bit(16)), deny: String(bit(13) | bit(11)) }] },
    async (adapter, f) => {
      const lock = raw('LOCK', C);
      const repeated = await adapter.prepare(lock, await adapter.authorize(lock), saved);
      await repeated.perform();
      assert.equal(f.calls.filter(c => c.method !== 'GET').length, 0);
      const unlock = raw('UNLOCK', C);
      const plan = await adapter.prepare(unlock, await adapter.authorize(unlock), saved);
      await plan.perform();
      const body = JSON.parse(f.calls.at(-1).body);
      assert.equal(body.allow, original.allow);
      assert.equal(body.deny, original.deny);
    }
  );
});
test('unlock without a recorded lock is a no-op and external lock changes fail closed', () =>
  withFixture({}, async (adapter, f) => {
    const input = raw('UNLOCK', C);
    const snapshot = await adapter.authorize(input);
    await (await adapter.prepare(input, snapshot, null)).perform();
    assert(f.calls.every(c => c.method === 'GET'));
    await assert.rejects(
      adapter.prepare(input, snapshot, { previousAllow: '0', previousDeny: '0' })
    );
  }));
for (const action of ['TIMEOUT', 'KICK', 'BAN', 'UNBAN', 'PURGE', 'SLOWMODE', 'LOCK', 'UNLOCK']) {
  for (const status of [403, 404, 429, 500])
    test(`${action}: Discord ${status} never reports mutation success`, () =>
      withFixture(
        {
          mutationStatus: status,
          messages: [{ id: String(BigInt(Date.now() - 1420070400000 - 1000) << 22n) }],
          overwrites:
            action === 'UNLOCK' ? [{ id: G, type: 0, allow: '0', deny: String(bit(11)) }] : [],
        },
        async adapter => {
          const input = raw(
            action,
            ['PURGE', 'SLOWMODE', 'LOCK', 'UNLOCK'].includes(action) ? C : T
          );
          const plan = await adapter.prepare(
            input,
            await adapter.authorize(input),
            action === 'UNLOCK' ? { previousAllow: '0', previousDeny: '0' } : null
          );
          await assert.rejects(
            plan.perform(),
            e =>
              e instanceof DiscordApiError && e.status === status && !e.message.includes('private')
          );
        }
      ));
}
test('transport bounds 429 retries and never replays network-ambiguous mutations', async () => {
  const old = global.fetch;
  let calls = 0;
  try {
    global.fetch = async () => {
      calls++;
      return new Response('{"retry_after":0}', { status: 429 });
    };
    await assert.rejects(
      discordRequest('https://discord.invalid', { method: 'POST' }),
      e => e.status === 429
    );
    assert.equal(calls, 3);
    calls = 0;
    global.fetch = async () => {
      calls++;
      throw new Error('private');
    };
    await assert.rejects(
      discordRequest('https://discord.invalid', { method: 'POST' }),
      e => e.status === 502
    );
    assert.equal(calls, 1);
  } finally {
    global.fetch = old;
  }
});
test('transport timeout returns typed 408 and does not retry a mutation', async () => {
  const oldFetch = global.fetch,
    oldTimeout = AbortSignal.timeout;
  let calls = 0;
  try {
    AbortSignal.timeout = () => AbortSignal.abort();
    global.fetch = async () => {
      calls++;
      throw new Error('private timeout');
    };
    await assert.rejects(
      discordRequest('https://discord.invalid', { method: 'PUT' }),
      e => e.status === 408 && !e.message.includes('private')
    );
    assert.equal(calls, 1);
  } finally {
    global.fetch = oldFetch;
    AbortSignal.timeout = oldTimeout;
  }
});
