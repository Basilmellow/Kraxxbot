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

test('/ask defers its Discord reply before membership, database, provider, or delivery work', async () => {
  const calls = [];
  const ask = load('src/commands/utility/ask.ts', {
    'discord.js': require('discord.js'),
    '../../services/kraxx-ai-discord': { createKraxxAiDelivery: () => async () => 'SUCCESS' },
    '../../services/kraxx-ai.service': { executeKraxxAi: async () => { calls.push('execute'); return { status: 'SUCCESS' }; }, KraxxAiError: class extends Error {} },
    '../../utils/logger': { logger: { warn() {} } },
  }).default;
  const interaction = {
    inGuild: () => true, guild: { members: { fetch: async () => { calls.push('member'); return {}; } } },
    guildId: '12345678901234567', channelId: '22345678901234567', user: { id: '32345678901234567' },
    options: { getString: () => 'hello' }, deferReply: async () => calls.push('defer'),
    editReply: async content => calls.push(['edit', content]),
  };
  await ask.execute(interaction);
  assert.equal(calls[0], 'defer');
  assert.ok(calls.indexOf('execute') > calls.indexOf('defer'));
  assert.deepEqual(calls.at(-1), ['edit', 'Your answer was sent in this channel.']);
});

test('/ask converts provider timeout and missing configuration into safe deferred replies', async () => {
  for (const [code, expected] of [['TIMEOUT', 'Kraxx AI timed out. Please try again.'], ['AUTH', 'Kraxx AI is not configured for this server.']]) {
    const ask = load('src/commands/utility/ask.ts', {
      'discord.js': require('discord.js'),
      '../../services/kraxx-ai-discord': { createKraxxAiDelivery: () => async () => 'SUCCESS' },
      '../../services/kraxx-ai.service': { executeKraxxAi: async () => ({ status: 'SUCCESS', error: code }), KraxxAiError: class extends Error {} },
      '../../utils/logger': { logger: { warn() {} } },
    }).default;
    const sequence = [];
    await ask.execute({ inGuild: () => true, guild: { members: { fetch: async () => ({}) } },
      guildId: '12345678901234567', channelId: '22345678901234567', user: { id: '32345678901234567' },
      options: { getString: () => 'question' }, deferReply: async () => sequence.push('defer'),
      editReply: async message => sequence.push(message) });
    assert.equal(sequence[0], 'defer'); assert.equal(sequence[1], expected);
  }
});

test('Gemini timeout and configuration failures map to controlled user-safe messages', () => {
  const exported = load('src/services/kraxx-ai-provider.ts', {});
  const ProviderError = exported.AiProviderError;
  const provider = exported.userSafeAiError;
  assert.equal(provider(new ProviderError('TIMEOUT')), 'Kraxx AI timed out. Please try again.');
  assert.equal(provider(new ProviderError('AUTH')), 'Kraxx AI is not configured for this server.');
  assert.equal(provider(new ProviderError('RATE_LIMITED')), 'Kraxx AI is busy right now. Try again shortly.');
  assert.equal(provider(new Error('secret provider stack')), 'Kraxx AI is temporarily unavailable. Please try again.');
});

test('Gemini provider uses a bounded timeout and does not retry requests', () => {
  const source = fs.readFileSync(path.join(root, 'src/services/gemini.provider.ts'), 'utf8');
  assert.match(source, /AbortSignal\.timeout\(request\.timeoutMs\)/);
  assert.match(source, /httpOptions:\s*\{\s*timeout:\s*request\.timeoutMs,\s*retryOptions:\s*\{\s*attempts:\s*1/);
});

test('AI timeout is represented in safe telemetry without storing prompts or responses', () => {
  const source = fs.readFileSync(path.join(root, 'src/services/kraxx-ai.service.ts'), 'utf8');
  assert.match(source, /const errorCode = error instanceof AiProviderError \? error\.code/);
  assert.match(source, /status: providerStatus/);
  const telemetryWrite = source.match(/await deps\.finish\(reservation\.rowId, \{ status: providerStatus,[^\n]+/);
  assert.ok(telemetryWrite);
  assert.doesNotMatch(telemetryWrite[0], /prompt|response/i);
});
