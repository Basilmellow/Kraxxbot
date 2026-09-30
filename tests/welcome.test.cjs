const { test } = module.require('node:test');
const assert = module.require('node:assert/strict');
module.require('ts-node/register/transpile-only');
const { DiscordApiError } = module.require('../src/services/discord-transport.ts');
const {
  createWelcomeDeliveryAdapter,
  deliverMemberGoodbye,
  deliverMemberWelcome,
  renderWelcomeText,
} = module.require('../src/services/welcome-delivery.service.ts');
const { parseWelcomeConfig, WelcomeConfigError } = module.require('../src/services/welcome-contract.ts');

const guildId = '111111111111111111';
const userId = '222222222222222222';
const member = {
  guildId,
  guildName: 'Example Guild',
  memberCount: 17,
  userId,
  username: 'member-name',
  userTag: 'member-name#0001',
};
const enabledConfig = {
  enabled: true,
  channelId: '333333333333333333',
  message: 'Hi {user} / {username} in {server} ({memberCount}); {rules}',
  imageUrl: 'https://images.example.test/welcome.png',
  dmEnabled: true,
  dmMessage: 'Hello {username}: {rules}',
  leaveChannelId: '444444444444444444',
  leaveMessage: '{username} left {server}',
};

test('welcome config accepts only bounded, tenant-shaped fields', () => {
  const parsed = parseWelcomeConfig({ guildId, enabled: true, dmEnabled: false, channelId: '333333333333333333' });
  assert.equal(parsed.guildId, guildId);
  assert.equal(parsed.channelId, '333333333333333333');
  assert.equal(parsed.enabled, true);
  assert.throws(() => parseWelcomeConfig({ guildId, enabled: true, dmEnabled: false, ownerId: userId }), WelcomeConfigError);
  assert.throws(() => parseWelcomeConfig({ guildId, enabled: true, dmEnabled: false, roleId: 'not-a-snowflake' }), WelcomeConfigError);
  assert.throws(() => parseWelcomeConfig({ guildId, enabled: true, dmEnabled: false, imageUrl: 'http://images.example.test/x.png' }), WelcomeConfigError);
  assert.throws(() => parseWelcomeConfig({ guildId: '999', enabled: true, dmEnabled: false }), WelcomeConfigError);
});

test('welcome placeholders are rendered without broadening allowed mentions', async () => {
  assert.equal(renderWelcomeText(enabledConfig.message, member), `Hi <@${userId}> / member-name in Example Guild (17); the server rules`);
  const sent = [];
  const adapter = {
    sendGuildMessage: async (g, c, payload) => sent.push({ kind: 'channel', g, c, payload }),
    sendDirectMessage: async (u, payload) => sent.push({ kind: 'dm', u, payload }),
  };
  const results = await deliverMemberWelcome(enabledConfig, member, adapter);
  assert.deepEqual(results.map((result) => result.status), ['SUCCESS', 'SUCCESS']);
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[0].payload.allowed_mentions, { parse: [], users: [userId] });
  assert.equal(sent[0].payload.embeds[0].image.url, enabledConfig.imageUrl);
  assert.match(sent[1].payload.content, /the server rules/);
});

test('goodbye uses its configured guild channel and reports Discord failures', async () => {
  let attemptedGuild;
  const result = await deliverMemberGoodbye(enabledConfig, member, {
    sendGuildMessage: async (g, channelId, payload) => {
      attemptedGuild = g;
      assert.equal(channelId, enabledConfig.leaveChannelId);
      assert.equal(payload.content, 'member-name left Example Guild');
      throw new DiscordApiError(403);
    },
    sendDirectMessage: async () => assert.fail('goodbye must not send a DM'),
  });
  assert.equal(attemptedGuild, guildId);
  assert.deepEqual(result, { target: 'CHANNEL', status: 'FAILURE', errorCode: 'DISCORD_403' });
});

test('REST adapter rejects a cross-guild or unsupported configured destination before posting', async () => {
  const calls = [];
  const adapter = createWelcomeDeliveryAdapter('test-token', async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ id: enabledConfig.channelId, guild_id: '999999999999999999', type: 0 }), { status: 200 });
  });
  await assert.rejects(adapter.sendGuildMessage(guildId, enabledConfig.channelId, {
    content: 'hello', allowed_mentions: { parse: [], users: [userId] },
  }), /WELCOME_CHANNEL_SCOPE_INVALID/);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/channels\//);
});

test('delivery attempts are independent and return a safe failure if Discord denies a DM', async () => {
  const results = await deliverMemberWelcome(enabledConfig, member, {
    sendGuildMessage: async () => {},
    sendDirectMessage: async () => { throw new DiscordApiError(403); },
  });
  assert.deepEqual(results, [
    { target: 'CHANNEL', status: 'SUCCESS' },
    { target: 'DM', status: 'FAILURE', errorCode: 'DISCORD_403' },
  ]);
});
