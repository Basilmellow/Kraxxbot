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
    if (id === 'zod') return require('zod');
    if (id.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), `${id}.ts`)), mocks);
    throw new Error(`Unmocked dependency ${id}`);
  };
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(localRequire, module, module.exports);
  return module.exports;
}

const goodSettings = { allowedChannels: [], userCooldownSeconds: 10, guildRequestsPerMinute: 5, maxInputLength: 100, maxOutputLength: 100, responseStyle: 'BALANCED' };
function harness({ enabled = true, settings = goodSettings, policyPresent = true, reserve = { kind: 'RESERVED', rowId: 'row-1' }, providerError = null, response = 'answer', delivery = 'SUCCESS', member = true } = {}) {
  let calls = { provider: 0, delivery: 0, finished: [], logs: [] };
  const moduleKey = { getModuleDefinition: () => ({ runtimeImplemented: true }) };
  const errorTypes = class AiProviderError extends Error { constructor(code) { super(code); this.code = code; } };
  const service = load('src/services/kraxx-ai.service.ts', {
    '../database/repositories/kraxx-ai.repository': { KraxxAiRepository: {} },
    '../utils/logger': { logger: { info: (...args) => calls.logs.push(args), warn: (...args) => calls.logs.push(args) } },
    '../config/modules': moduleKey,
    './kraxx-ai-contract': { kraxxAiSettingsSchema: { parse: x => x }, normalizeAiOutput: value => { if (typeof value !== 'string' || !value.trim()) throw new Error('AI_EMPTY_RESPONSE'); return value.slice(0, goodSettings.maxOutputLength); } },
    './kraxx-ai-provider': { AiProviderError: errorTypes, userSafeAiError: () => 'AI is temporarily unavailable. Try again in a moment.' },
    './gemini.provider': { GeminiProvider: class {} },
  });
  const deps = {
    policy: async () => policyPresent ? { enabled, settings } : null,
    reserve: async () => reserve,
    finish: async (_id, data) => calls.finished.push(data),
    provider: { generate: async () => { calls.provider++; if (providerError) throw providerError; return { text: response, provider: 'GEMINI', model: 'gemini-3.8-flash', inputTokens: 3, outputTokens: 4 }; } },
  };
  const deliver = async input => { calls.delivery++; calls.deliveredInput = input; return delivery; };
  const input = { guildId: '12345678901234567', userId: '22345678901234567', channelId: '32345678901234567', requestId: '42345678901234567', prompt: 'hello', verifyMembership: async () => member, verifyChannel: async () => true };
  return { service, deps, deliver, input, calls, errors: service.KraxxAiError, AiProviderError: errorTypes };
}

test('module disabled fails closed before provider or delivery', async () => {
  const h = harness({ enabled: false }); await assert.rejects(h.service.executeKraxxAi(h.input, h.deliver, h.deps), e => e.code === 'DISABLED');
  assert.equal(h.calls.provider, 0); assert.equal(h.calls.delivery, 0);
});
test('unavailable module fails closed before provider', async () => {
  const h = harness(); h.service = load('src/services/kraxx-ai.service.ts', { '../database/repositories/kraxx-ai.repository': { KraxxAiRepository: {} }, '../utils/logger': { logger: { info(){}, warn(){} } }, '../config/modules': { getModuleDefinition: () => ({ runtimeImplemented: false }) }, './kraxx-ai-contract': { kraxxAiSettingsSchema: { parse:x=>x }, normalizeAiOutput:x=>x }, './kraxx-ai-provider': { AiProviderError: class {}, userSafeAiError:()=>'' }, './gemini.provider': { GeminiProvider: class {} } });
  await assert.rejects(h.service.executeKraxxAi(h.input, h.deliver, h.deps), e => e.code === 'MODULE_UNAVAILABLE'); assert.equal(h.calls.provider, 0);
});
test('settings defaults are bounded and reject unknown fields', () => {
  const { kraxxAiSettingsSchema } = load('src/services/kraxx-ai-contract.ts');
  assert.equal(kraxxAiSettingsSchema.parse({}).userCooldownSeconds, 10);
  assert.equal(kraxxAiSettingsSchema.safeParse({ ...goodSettings, userCooldownSeconds: 4 }).success, false);
  assert.equal(kraxxAiSettingsSchema.safeParse({ ...goodSettings, systemPrompt: 'unsafe' }).success, false);
});
test('settings allowed channel identifiers must be snowflakes', () => {
  const { kraxxAiSettingsSchema } = load('src/services/kraxx-ai-contract.ts');
  assert.equal(kraxxAiSettingsSchema.safeParse({ ...goodSettings, allowedChannels: ['not-a-channel'] }).success, false);
});
test('configuration model has one enabled state and separate bounded channel policy', async () => {
  const h = harness(); const result = await h.service.executeKraxxAi(h.input, h.deliver, h.deps);
  assert.equal(result.status, 'SUCCESS'); assert.equal(h.calls.provider, 1);
});
test('non-member is rejected before provider', async () => {
  const h = harness({ member: false }); await assert.rejects(h.service.executeKraxxAi(h.input, h.deliver, h.deps), e => e.code === 'NOT_A_MEMBER'); assert.equal(h.calls.provider, 0);
});
test('invoking channel must belong to the guild before provider invocation', async () => { const h = harness(); h.input.verifyChannel = async () => false; await assert.rejects(h.service.executeKraxxAi(h.input, h.deliver, h.deps), e => e.code === 'INVALID_CHANNEL'); assert.equal(h.calls.provider, 0); });
test('missing guild module configuration fails closed', async () => {
  const h = harness({ policyPresent: false }); await assert.rejects(h.service.executeKraxxAi(h.input, h.deliver, h.deps), e => e.code === 'MISCONFIGURED');
});
test('wrong guild context is rejected before database policy', async () => {
  const h = harness(); h.input.guildId = 'bad'; await assert.rejects(h.service.executeKraxxAi(h.input, h.deliver, h.deps), e => e.code === 'INVALID_CONTEXT');
});
test('wrong channel rejected without provider call', async () => {
  const h = harness({ settings: { ...goodSettings, allowedChannels: ['92345678901234567'] } }); await assert.rejects(h.service.executeKraxxAi(h.input, h.deliver, h.deps), e => e.code === 'CHANNEL_NOT_ALLOWED'); assert.equal(h.calls.provider, 0);
});
test('/ask and explicit mention share the same domain entrypoint', async () => {
  const h = harness(); await h.service.executeKraxxAi(h.input, h.deliver, h.deps); h.input.requestId = '52345678901234567'; await h.service.executeKraxxAi(h.input, h.deliver, h.deps); assert.equal(h.calls.provider, 2);
});
test('empty prompt is rejected', async () => { const h = harness(); h.input.prompt = '  '; await assert.rejects(h.service.executeKraxxAi(h.input, h.deliver, h.deps), e => e.code === 'EMPTY_PROMPT'); });
test('oversized prompt is rejected before provider invocation', async () => { const h = harness(); h.input.prompt = 'x'.repeat(101); await assert.rejects(h.service.executeKraxxAi(h.input, h.deliver, h.deps), e => e.code === 'PROMPT_TOO_LONG'); assert.equal(h.calls.provider, 0); });
test('empty provider response is recorded without exposing provider details', async () => { const h = harness({ response: ' ' }); h.deps.provider.generate = async () => { h.calls.provider++; throw new h.AiProviderError('EMPTY'); }; await h.service.executeKraxxAi(h.input, h.deliver, h.deps); assert.equal(h.calls.finished[0].status, 'PROVIDER_ERROR'); assert.equal(h.calls.deliveredInput.content, 'AI is temporarily unavailable. Try again in a moment.'); });
test('malformed provider response is handled as safe failure', async () => { const h = harness(); h.deps.provider.generate = async () => { h.calls.provider++; throw new h.AiProviderError('MALFORMED'); }; await h.service.executeKraxxAi(h.input, h.deliver, h.deps); assert.equal(h.calls.finished[0].status, 'PROVIDER_ERROR'); });
test('provider timeout maps to generic response and explicit ambiguous provider state', async () => { const h = harness({ providerError: Object.assign(new Error('timeout'), { name: 'TimeoutError' }) }); await h.service.executeKraxxAi(h.input, h.deliver, h.deps); assert.equal(h.calls.deliveredInput.content, 'AI is temporarily unavailable. Try again in a moment.'); assert.equal(h.calls.finished[0].status, 'PROVIDER_UNKNOWN'); });
test('provider 429 maps to safe response', async () => { const h = harness({ providerError: new (class extends Error { constructor(){ super('rate'); this.code = 'RATE_LIMITED'; } })() }); await h.service.executeKraxxAi(h.input, h.deliver, h.deps); assert.equal(h.calls.delivery, 1); });
test('provider 5xx does not leak exception', async () => { const secret = 'AIza-secret-example'; const h = harness({ providerError: Object.assign(new Error(secret), { status: 503 }) }); await h.service.executeKraxxAi(h.input, h.deliver, h.deps); assert.equal(JSON.stringify(h.calls).includes(secret), false); });
test('provider auth/config failure remains generic and never returns key', async () => { const secret = 'AIza-secret-example'; const h = harness({ providerError: Object.assign(new Error(secret), { code: 'AUTH' }) }); await h.service.executeKraxxAi(h.input, h.deliver, h.deps); assert.equal(JSON.stringify(h.calls).includes(secret), false); });
test('provider error does not persist prompt or response', async () => { const h = harness({ providerError: new Error('provider stack') }); await h.service.executeKraxxAi(h.input, h.deliver, h.deps); assert.equal(JSON.stringify(h.calls.finished).includes(h.input.prompt), false); });
test('user cooldown rejection does not invoke provider', async () => { const h = harness({ reserve: { kind: 'RATE_LIMITED', reason: 'USER_COOLDOWN' } }); await assert.rejects(h.service.executeKraxxAi(h.input, h.deliver, h.deps), e => e.code === 'RATE_LIMITED'); assert.equal(h.calls.provider, 0); });
test('guild request limit rejection does not invoke provider', async () => { const h = harness({ reserve: { kind: 'RATE_LIMITED', reason: 'GUILD_LIMIT' } }); await assert.rejects(h.service.executeKraxxAi(h.input, h.deliver, h.deps), e => e.code === 'RATE_LIMITED'); assert.equal(h.calls.provider, 0); });
test('simultaneous requests rely on atomic repository admission', async () => { let admitted = false; const h = harness(); h.deps.reserve = async () => admitted ? { kind: 'RATE_LIMITED', reason: 'USER_COOLDOWN' } : (admitted = true, { kind: 'RESERVED', rowId: 'row' }); h.input.requestId = '123456789012345678'; const second = { ...h.input, requestId: '223456789012345678' }; const result = await Promise.allSettled([h.service.executeKraxxAi(h.input, h.deliver, h.deps), h.service.executeKraxxAi(second, h.deliver, h.deps)]); assert.equal(result.filter(x => x.status === 'fulfilled').length, 1); });
test('repeated request identity skips provider and delivery', async () => { const h = harness({ reserve: { kind: 'DUPLICATE', status: 'SUCCESS' } }); await assert.rejects(h.service.executeKraxxAi(h.input, h.deliver, h.deps), e => e.code === 'DUPLICATE'); assert.equal(h.calls.provider, 0); assert.equal(h.calls.delivery, 0); });
test('delivery ambiguity is persisted as UNKNOWN', async () => { const h = harness({ delivery: 'UNKNOWN' }); const result = await h.service.executeKraxxAi(h.input, h.deliver, h.deps); assert.equal(result.status, 'UNKNOWN'); assert.equal(h.calls.finished[0].status, 'DELIVERY_UNKNOWN'); });
test('confirmed delivery is marked success', async () => { const h = harness(); await h.service.executeKraxxAi(h.input, h.deliver, h.deps); assert.equal(h.calls.finished[0].status, 'SUCCESS'); });
test('failed delivery is marked failure', async () => { const h = harness({ delivery: 'FAILURE' }); await h.service.executeKraxxAi(h.input, h.deliver, h.deps); assert.equal(h.calls.finished[0].status, 'FAILURE'); });
test('output safely truncates and neutralizes mentions', () => { const { normalizeAiOutput } = load('src/services/kraxx-ai-contract.ts'); const text = normalizeAiOutput('@everyone <@12345678901234567> ' + 'a'.repeat(200), 100); assert.ok(text.length <= 100); assert.ok(!text.includes('@everyone')); assert.ok(!text.includes('<@12345678901234567>')); });
test('output keeps Unicode surrogate pairs intact at limit', () => { const { normalizeAiOutput } = load('src/services/kraxx-ai-contract.ts'); const text = normalizeAiOutput('😀'.repeat(100), 101); assert.ok(text.length <= 101); assert.equal(/[\uD800-\uDBFF]$/.test(text), false); });
test('delivery request identity is the original interaction identity', async () => { const h = harness(); await h.service.executeKraxxAi(h.input, h.deliver, h.deps); assert.equal(h.calls.deliveredInput.requestId, h.input.requestId); });
test('response telemetry contains metadata but no prompt body', async () => { const h = harness(); await h.service.executeKraxxAi(h.input, h.deliver, h.deps); assert.equal(JSON.stringify(h.calls.finished).includes(h.input.prompt), false); assert.equal(h.calls.finished[0].inputTokens, 3); });
test('configuration routes use the canonical settings capability and audit', () => { const route = fs.readFileSync(path.join(root, 'dashboard/src/app/api/ai/route.ts'), 'utf8'); assert.match(route, /withMutation\('MANAGE_SETTINGS'/); assert.match(route, /logDashboardAction/); assert.match(route, /safeParse/); });
test('AI dashboard remains inside the existing guild route tree', () => { assert.ok(fs.existsSync(path.join(root, 'dashboard/src/app/dashboard/[guildId]/ai/page.tsx'))); assert.ok(fs.existsSync(path.join(root, 'dashboard/src/app/dashboard/[guildId]/layout.tsx'))); });
test('AI gateway event is explicit mention-only and ignores bots and webhooks', () => { const source = fs.readFileSync(path.join(root, 'src/events/messageCreate.ts'), 'utf8'); assert.match(source, /message\.author\.bot/); assert.match(source, /message\.webhookId/); assert.match(source, /message\.mentions\.users\.has/); });
test('mention event ignores bot and webhook messages before invoking the domain service', async () => {
  let executions = 0;
  const event = load('src/events/messageCreate.ts', { '../services/kraxx-ai-discord': { createKraxxAiDelivery: () => async () => 'SUCCESS' }, '../services/kraxx-ai.service': { executeKraxxAi: async () => { executions++; }, KraxxAiError: class extends Error {} }, '../utils/logger': { logger: { warn() {} } } });
  const base = { client: { user: { id: '12345678901234567' } }, guild: {}, guildId: '22345678901234567', channelId: '32345678901234567', content: '<@12345678901234567> hi', mentions: { users: new Map([['12345678901234567', {}]]) }, author: { id: '42345678901234567', bot: false }, webhookId: null };
  await event.onMessageCreate({ ...base, author: { ...base.author, bot: true } });
  await event.onMessageCreate({ ...base, webhookId: 'webhook' });
  assert.equal(executions, 0);
});
test('own bot mention is blocked by the bot-author guard', async () => {
  let executions = 0;
  const event = load('src/events/messageCreate.ts', { '../services/kraxx-ai-discord': { createKraxxAiDelivery: () => async () => 'SUCCESS' }, '../services/kraxx-ai.service': { executeKraxxAi: async () => { executions++; }, KraxxAiError: class extends Error {} }, '../utils/logger': { logger: { warn() {} } } });
  const msg = { client: { user: { id: '12345678901234567' } }, guild: {}, guildId: '22345678901234567', channelId: '32345678901234567', content: '<@12345678901234567> hi', mentions: { users: new Map([['12345678901234567', {}]]) }, author: { id: '12345678901234567', bot: true }, webhookId: null };
  await event.onMessageCreate(msg); assert.equal(executions, 0);
});
test('gateway does not enable MessageContent intent', () => { const source = fs.readFileSync(path.join(root, 'src/index.ts'), 'utf8'); assert.match(source, /GatewayIntentBits\.GuildMessages/); assert.doesNotMatch(source, /GatewayIntentBits\.MessageContent/); });
test('AI output uses MessageOperationService and disables allowed mentions', () => { const source = fs.readFileSync(path.join(root, 'src/services/kraxx-ai-discord.ts'), 'utf8'); assert.match(source, /MessageOperationService\.execute/); assert.match(source, /allowedMentions: \{ parse: \[\] \}/); });
test('Gemini provider sends only prompt and controlled config using official model', async () => {
  let args; const provider = load('src/services/gemini.provider.ts', { '@google/genai': { GoogleGenAI: class { constructor(options) { assert.equal(options.apiKey, 'local-test-key'); this.models = { generateContent: async value => { args = value; return { text: 'hello', responseId: 'provider-id', modelVersion: 'gemini-3.8-flash', usageMetadata: { promptTokenCount: 2, candidatesTokenCount: 3 } }; } }; } } }, './kraxx-ai-provider': { AiProviderError: class AiProviderError extends Error { constructor(code) { super(code); this.code = code; } } } });
  const prior = process.env.GEMINI_API_KEY; process.env.GEMINI_API_KEY = 'local-test-key';
  try { const result = await new provider.GeminiProvider().generate({ prompt: 'explicit prompt', style: 'BALANCED', timeoutMs: 100, maxOutputTokens: 20 });
    assert.equal(args.model, 'gemini-3.8-flash'); assert.equal(args.contents, 'explicit prompt'); assert.equal(args.config.tools, undefined); assert.equal(args.config.httpOptions.timeout, 100); assert.equal(args.config.httpOptions.retryOptions.attempts, 1); assert.equal(result.requestId, 'provider-id'); assert.equal(result.inputTokens, 2);
  } finally { if (prior === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = prior; }
});
test('Gemini provider fails safely when server-only key is absent', async () => {
  let requested = false; const prior = process.env.GEMINI_API_KEY; delete process.env.GEMINI_API_KEY;
  const provider = load('src/services/gemini.provider.ts', { '@google/genai': { GoogleGenAI: class { constructor() { this.models = { generateContent: async () => { requested = true; return { text: 'x' }; } }; } } }, './kraxx-ai-provider': { AiProviderError: class AiProviderError extends Error { constructor(code) { super(code); this.code = code; } } } });
  try { await assert.rejects(new provider.GeminiProvider().generate({ prompt: 'x', style: 'BALANCED', timeoutMs: 10, maxOutputTokens: 2 }), e => e.code === 'AUTH'); assert.equal(requested, false); }
  finally { if (prior !== undefined) process.env.GEMINI_API_KEY = prior; }
});

function geminiProviderHarness(outcomes, { timeoutMs = 12_000, jitter = 0.25, requestTimeMs = 0 } = {}) {
  const calls = [];
  const sleeps = [];
  const logs = [];
  let now = 0;
  const { AiProviderError } = load('src/services/kraxx-ai-provider.ts');
  const providerModule = load('src/services/gemini.provider.ts', {
    '@google/genai': { GoogleGenAI: class {} },
  });
  const provider = new providerModule.GeminiProvider({
    apiKey: () => 'local-test-key',
    clientFactory: () => ({ models: { generateContent: async args => {
      calls.push(args);
      now += requestTimeMs;
      const outcome = outcomes[calls.length - 1];
      if (outcome instanceof Error) throw outcome;
      return outcome;
    } } }),
    now: () => now,
    sleep: async delayMs => { sleeps.push(delayMs); now += delayMs; },
    random: () => jitter,
    log: (level, message, metadata) => logs.push({ level, message, metadata }),
  });
  return { provider, calls, sleeps, logs, AiProviderError, timeoutMs };
}

const geminiSuccess = { text: 'answer', responseId: 'response-1', modelVersion: 'gemini-3.8-flash',
  usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 5 } };
const generateRequest = timeoutMs => ({ prompt: 'private prompt', style: 'BALANCED', timeoutMs, maxOutputTokens: 64 });
const geminiHttpError = status => Object.assign(new Error('private provider detail'), { status });

test('Gemini succeeds immediately with one request and preserves response telemetry', async () => {
  const h = geminiProviderHarness([geminiSuccess]);
  const result = await h.provider.generate(generateRequest(h.timeoutMs));
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.sleeps, []);
  assert.deepEqual(result, { text: 'answer', provider: 'GEMINI', model: 'gemini-3.8-flash',
    requestId: 'response-1', inputTokens: 4, outputTokens: 5 });
});

test('Gemini retries one 503 and returns the subsequent success', async () => {
  const h = geminiProviderHarness([geminiHttpError(503), geminiSuccess]);
  assert.equal((await h.provider.generate(generateRequest(h.timeoutMs))).text, 'answer');
  assert.equal(h.calls.length, 2);
  assert.deepEqual(h.sleeps, [1_250]);
  assert.notEqual(h.calls[0].config.abortSignal, h.calls[1].config.abortSignal);
});

test('Gemini retries two 503 responses with bounded exponential jitter', async () => {
  const h = geminiProviderHarness([geminiHttpError(503), geminiHttpError(503), geminiSuccess]);
  await h.provider.generate(generateRequest(h.timeoutMs));
  assert.equal(h.calls.length, 3);
  assert.deepEqual(h.sleeps, [1_250, 2_500]);
  assert.deepEqual(h.calls.map(call => call.config.httpOptions.timeout), [12_000, 10_750, 8_250]);
});

test('Gemini never exceeds four attempts and returns SERVER after repeated 503s', async () => {
  const h = geminiProviderHarness(Array.from({ length: 4 }, () => geminiHttpError(503)));
  await assert.rejects(h.provider.generate(generateRequest(h.timeoutMs)), error => error.code === 'SERVER');
  assert.equal(h.calls.length, 4);
  assert.deepEqual(h.sleeps, [1_250, 2_500, 5_000]);
  assert.equal(h.logs.at(-1).message, 'Gemini provider retries exhausted');
  assert.deepEqual(h.logs.at(-1).metadata, { model: 'gemini-3.8-flash', status: 503, errorName: 'Error', attempts: 4 });
});

test('Gemini retries 429, 500, 502, and 504 responses', async () => {
  for (const status of [429, 500, 502, 504]) {
    const h = geminiProviderHarness([geminiHttpError(status), geminiSuccess]);
    assert.equal((await h.provider.generate(generateRequest(h.timeoutMs))).text, 'answer');
    assert.equal(h.calls.length, 2, `status ${status} should retry once`);
  }
});

test('Gemini retries a transient network reset', async () => {
  const networkError = Object.assign(new Error('private network detail'), {
    cause: Object.assign(new Error('socket reset'), { code: 'ECONNRESET' }),
  });
  const h = geminiProviderHarness([networkError, geminiSuccess]);
  assert.equal((await h.provider.generate(generateRequest(h.timeoutMs))).text, 'answer');
  assert.equal(h.calls.length, 2);
});

test('Gemini does not retry permanent client errors and classifies authorization errors', async () => {
  for (const [status, expectedCode] of [[401, 'AUTH'], [403, 'AUTH'], [400, 'UNAVAILABLE'], [404, 'UNAVAILABLE']]) {
    const h = geminiProviderHarness([geminiHttpError(status), geminiSuccess]);
    await assert.rejects(h.provider.generate(generateRequest(h.timeoutMs)), error => error.code === expectedCode);
    assert.equal(h.calls.length, 1, `status ${status} must not retry`);
    assert.deepEqual(h.sleeps, []);
  }
});

test('Gemini reports TIMEOUT when a timeout leaves no safe retry budget', async () => {
  const timeoutError = Object.assign(new Error('private timeout detail'), { name: 'TimeoutError' });
  const h = geminiProviderHarness([timeoutError, geminiSuccess], { timeoutMs: 1_200 });
  await assert.rejects(h.provider.generate(generateRequest(h.timeoutMs)), error => error.code === 'TIMEOUT');
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.sleeps, []);
});

test('Gemini retries an early timeout when the request deadline still has room', async () => {
  const timeoutError = Object.assign(new Error('private timeout detail'), { name: 'TimeoutError' });
  const h = geminiProviderHarness([timeoutError, geminiSuccess]);
  assert.equal((await h.provider.generate(generateRequest(h.timeoutMs))).text, 'answer');
  assert.equal(h.calls.length, 2);
  assert.deepEqual(h.sleeps, [1_250]);
});

test('Gemini does not retry empty or malformed successful responses', async () => {
  for (const [response, expectedCode] of [[{ text: '  ' }, 'EMPTY'], [{ text: 42 }, 'MALFORMED']]) {
    const h = geminiProviderHarness([response, geminiSuccess]);
    await assert.rejects(h.provider.generate(generateRequest(h.timeoutMs)), error => error.code === expectedCode);
    assert.equal(h.calls.length, 1);
    assert.deepEqual(h.sleeps, []);
  }
});

test('Gemini retry diagnostics contain metadata but never provider details or prompts', async () => {
  const h = geminiProviderHarness([geminiHttpError(503), geminiSuccess]);
  await h.provider.generate(generateRequest(h.timeoutMs));
  const diagnostic = JSON.stringify(h.logs);
  assert.match(diagnostic, /"status":503/);
  assert.match(diagnostic, /"retryAttempt":1/);
  assert.doesNotMatch(diagnostic, /private provider detail|private prompt|GEMINI_API_KEY|Authorization/);
});
