const { test } = module.require('node:test');
const assert = module.require('node:assert/strict');
module.require('ts-node/register/transpile-only');
const { parsePollOptions, pollResults, pollComponents, pollEmbed, pollInteractionMatches, validatePollDefinition } = module.require('../src/services/poll.service.ts');

test('poll definition validation bounds title/options/expiry and supports no expiry', () => {
  assert.deepEqual(validatePollDefinition('  Choose  ', [' First ', 'Second'], null), {
    question: 'Choose', options: ['First', 'Second'], durationHours: null,
  });
  assert.throws(() => validatePollDefinition('', ['A', 'B'], 24), /INVALID_POLL_QUESTION/);
  assert.throws(() => validatePollDefinition('Q', ['A'], 24), /INVALID_POLL_OPTIONS/);
  assert.throws(() => validatePollDefinition('Q', ['A', 'a'], 24), /DUPLICATE_POLL_OPTIONS/);
  assert.throws(() => validatePollDefinition('Q', ['A', 'B'], 169), /INVALID_POLL_EXPIRY/);
});

test('poll result formatting is based on recorded option counts and handles zero votes', () => {
  const options = parsePollOptions(JSON.stringify(['Alpha', 'Beta']));
  assert.deepEqual(pollResults(options, [0, 0]), { totalVotes: 0, results: [
    { option: 'Alpha', votes: 0, percentage: 0 }, { option: 'Beta', votes: 0, percentage: 0 },
  ] });
  assert.deepEqual(pollResults(options, [2, 1]), { totalVotes: 3, results: [
    { option: 'Alpha', votes: 2, percentage: 66.7 }, { option: 'Beta', votes: 1, percentage: 33.3 },
  ] });
});

test('legacy option JSON remains readable without trusting its embedded counters', () => {
  assert.deepEqual(parsePollOptions(JSON.stringify([{ text: 'Legacy', votes: 999 }])), [{ text: 'Legacy', votes: 0 }]);
  assert.deepEqual(parsePollOptions('{broken'), []);
});

test('poll buttons are bounded, tenant-resource-specific, and disabled after close', () => {
  const pollId = '123e4567-e89b-12d3-a456-426614174000';
  const options = parsePollOptions(JSON.stringify(['A', 'B', 'C', 'D', 'E']));
  const rows = pollComponents(pollId, options, false);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].components.length, 5);
  assert.ok(rows[0].components.every(button => button.custom_id.startsWith(`kraxx_poll:${pollId}:`) && !button.disabled));
  assert.ok(pollComponents(pollId, options, true)[0].components.every(button => button.disabled));
  assert.match(pollEmbed('Question', options, [0, 0, 0, 0, 0], true).footer.text, /0 total votes/);
});

test('interaction context must match the poll guild, channel, message, and valid option', () => {
  const poll = { id: 'poll-id', guildId: 'guild-a', channelId: 'channel-a', messageId: 'message-a' };
  const interaction = { pollId: 'poll-id', guildId: 'guild-a', channelId: 'channel-a', messageId: 'message-a', optionIndex: 1 };
  assert.equal(pollInteractionMatches(poll, interaction, 2), true);
  for (const override of [{ guildId: 'guild-b' }, { channelId: 'channel-b' }, { messageId: 'message-b' }, { pollId: 'poll-b' }, { optionIndex: 2 }])
    assert.equal(pollInteractionMatches(poll, { ...interaction, ...override }, 2), false);
  assert.equal(pollInteractionMatches({ ...poll, messageId: null }, interaction, 2), false);
});
