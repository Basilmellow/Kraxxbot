const { test } = module.require('node:test');
const assert = module.require('node:assert/strict');
module.require('ts-node/register/transpile-only');
const { canExecuteCustomCommand, validateCustomCommand, renderCustomCommand } = module.require('../src/services/custom-command.service.ts');

test('custom command definition enforces tenant, trigger, response, cooldown, and literal-variable contracts', () => {
  assert.deepEqual(validateCustomCommand({ guildId: '12345678901234567', trigger: 'Rules_1', response: 'Hello {user}', cooldownSeconds: 30 }), {
    guildId: '12345678901234567', trigger: 'Rules_1', normalizedTrigger: 'rules_1', response: 'Hello {user}', cooldownSeconds: 30,
  });
  for (const trigger of ['', 'has spaces', 'x'.repeat(33), 'bad/trigger']) assert.throws(() => validateCustomCommand({ guildId: '12345678901234567', trigger, response: 'ok' }), /INVALID_TRIGGER/);
  assert.throws(() => validateCustomCommand({ guildId: 'bad', trigger: 'rules', response: 'ok' }), /INVALID_GUILD/);
  assert.throws(() => validateCustomCommand({ guildId: '12345678901234567', trigger: 'rules', response: 'x'.repeat(1801) }), /INVALID_RESPONSE/);
  assert.throws(() => validateCustomCommand({ guildId: '12345678901234567', trigger: 'rules', response: 'hello {user.constructor}' }), /INVALID_TEMPLATE_VARIABLE/);
  assert.throws(() => validateCustomCommand({ guildId: '12345678901234567', trigger: 'rules', response: 'x', cooldownSeconds: 4 }), /INVALID_COOLDOWN/);
  assert.equal(renderCustomCommand('{user}|{mention}|{guild}|{channel}', { user: 'A', mention: '<@12345678901234567>', guild: 'G', channel: 'C' }), 'A|<@12345678901234567>|G|C');
  assert.throws(() => renderCustomCommand('{env.SECRET}', { user: '', mention: '', guild: '', channel: '' }), /UNKNOWN_TEMPLATE_VARIABLE/);
  assert.throws(() => renderCustomCommand('{user'.repeat(401), { user: 'x', mention: '', guild: '', channel: '' }), /INVALID_RENDERED_RESPONSE/);
  assert.throws(() => renderCustomCommand('{user}', { user: 'x'.repeat(2001), mention: '', guild: '', channel: '' }), /INVALID_RENDERED_RESPONSE/);
  assert.equal(renderCustomCommand('@everyone @here {mention}', { user: '', mention: '<@12345678901234567>', guild: '', channel: '' }), '@everyone @here <@12345678901234567>');
  assert.equal(canExecuteCustomCommand(true, false), true);
  assert.equal(canExecuteCustomCommand(true, true), false);
  assert.equal(canExecuteCustomCommand(false, false), false);
});
