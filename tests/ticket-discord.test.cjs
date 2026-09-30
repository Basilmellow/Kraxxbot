const { test } = module.require('node:test');
const assert = module.require('node:assert/strict');
module.require('ts-node/register/transpile-only');
const { createGuildTextChannel, deleteGuildChannel } = module.require('../dashboard/src/lib/discord.ts');

const guildId = '111111111111111111';
const channelId = '222222222222222222';

test('ticket channel REST adapter scopes creation to the requested guild and text type', async () => {
  const oldFetch = global.fetch;
  const oldToken = process.env.DISCORD_BOT_TOKEN;
  const calls = [];
  process.env.DISCORD_BOT_TOKEN = 'local-test-token';
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify({ id: channelId, guild_id: guildId, type: 0 }), { status: 200 });
  };
  try {
    const channel = await createGuildTextChannel(guildId, {
      name: 'ticket-0001', topic: 'ticket',
      permission_overwrites: [{ id: guildId, type: 0, allow: '0', deny: '1024' }],
    });
    assert.equal(channel.id, channelId);
    assert.match(calls[0].url, new RegExp(`/guilds/${guildId}/channels$`));
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(JSON.parse(calls[0].options.body).type, 0);
  } finally {
    global.fetch = oldFetch;
    if (oldToken === undefined) delete process.env.DISCORD_BOT_TOKEN;
    else process.env.DISCORD_BOT_TOKEN = oldToken;
  }
});

test('ticket cleanup refuses to delete a channel owned by another guild', async () => {
  const oldFetch = global.fetch;
  const oldToken = process.env.DISCORD_BOT_TOKEN;
  const calls = [];
  process.env.DISCORD_BOT_TOKEN = 'local-test-token';
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), method: options.method || 'GET' });
    return new Response(JSON.stringify({ id: channelId, guild_id: '333333333333333333', type: 0 }), { status: 200 });
  };
  try {
    await assert.rejects(deleteGuildChannel(guildId, channelId), /does not belong to this guild/);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'GET');
  } finally {
    global.fetch = oldFetch;
    if (oldToken === undefined) delete process.env.DISCORD_BOT_TOKEN;
    else process.env.DISCORD_BOT_TOKEN = oldToken;
  }
});
