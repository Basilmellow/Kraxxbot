const { test } = module.require('node:test');
const assert = module.require('node:assert/strict');
module.require('ts-node/register/transpile-only');
const { validateSuggestion, suggestionEmbed, suggestionPanel, suggestionPanelMatches, SUGGESTION_STATUSES } = module.require('../src/services/suggestion.service.ts');

test('suggestion submission content is trimmed and bounded', () => {
  assert.deepEqual(validateSuggestion('  Idea  ', '  Make this better  '), { title: 'Idea', content: 'Make this better' });
  for (const title of ['', '  ', 'x'.repeat(101), 42]) assert.throws(() => validateSuggestion(title, 'body'), /INVALID_SUGGESTION_TITLE/);
  for (const content of ['', '  ', 'x'.repeat(3001), null]) assert.throws(() => validateSuggestion('title', content), /INVALID_SUGGESTION_CONTENT/);
});

test('suggestion panel interaction is bound to the configured guild, channel, message, and enabled module', () => {
  const configured = { enabled: true, guildId: 'guild-a', channelId: 'channel-a', messageId: 'message-a' };
  const valid = { guildId: 'guild-a', channelId: 'channel-a', messageId: 'message-a' };
  assert.equal(suggestionPanelMatches(configured, valid), true);
  for (const changed of [{ guildId: 'guild-b' }, { channelId: 'channel-b' }, { messageId: 'message-b' }, { guildId: null }, { messageId: null }])
    assert.equal(suggestionPanelMatches(configured, { ...valid, ...changed }), false);
  assert.equal(suggestionPanelMatches({ ...configured, enabled: false }, valid), false);
});

test('suggestions preserve established states and expose a submit-only Discord panel', () => {
  assert.deepEqual(SUGGESTION_STATUSES, ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTED']);
  const panel = suggestionPanel('suggestion_panel_key');
  assert.equal(panel.components[0].components[0].custom_id, 'kraxx_suggestion_submit');
  assert.equal(panel.embeds[0].footer.text, 'Suggestion panel • suggestion_panel_key');
  const embed = suggestionEmbed({ id: 'id', title: 'title', content: 'text', authorId: '123', status: 'APPROVED' });
  assert.match(embed.footer.text, /id/);
  assert.equal(embed.fields[0].value, 'APPROVED');
});
