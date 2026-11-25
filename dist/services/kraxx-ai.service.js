"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KraxxAiError = void 0;
exports.executeKraxxAi = executeKraxxAi;
const kraxx_ai_repository_1 = require("../database/repositories/kraxx-ai.repository");
const modules_1 = require("../config/modules");
const logger_1 = require("../utils/logger");
const kraxx_ai_contract_1 = require("./kraxx-ai-contract");
const kraxx_ai_provider_1 = require("./kraxx-ai-provider");
const gemini_provider_1 = require("./gemini.provider");
const defaultDependencies = { ...kraxx_ai_repository_1.KraxxAiRepository, provider: new gemini_provider_1.GeminiProvider() };
class KraxxAiError extends Error {
    code;
    retryAfterSeconds;
    constructor(code, retryAfterSeconds) {
        super(code);
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
        this.name = 'KraxxAiError';
    }
}
exports.KraxxAiError = KraxxAiError;
async function executeKraxxAi(input, deliver, overrides = {}) {
    if (!/^\d{17,20}$/.test(input.guildId) || !/^\d{17,20}$/.test(input.userId) || !/^\d{17,20}$/.test(input.channelId) || !/^[A-Za-z0-9_-]{16,128}$/.test(input.requestId))
        throw new KraxxAiError('INVALID_CONTEXT');
    if (!input.prompt.trim())
        throw new KraxxAiError('EMPTY_PROMPT');
    const deps = { ...defaultDependencies, ...overrides, deliver };
    if (!(await input.verifyMembership()))
        throw new KraxxAiError('NOT_A_MEMBER');
    if (!(await input.verifyChannel()))
        throw new KraxxAiError('INVALID_CHANNEL');
    const policy = await deps.policy(input.guildId);
    if (!policy)
        throw new KraxxAiError('MISCONFIGURED');
    if ((0, modules_1.getModuleDefinition)('kraxx-ai')?.runtimeImplemented !== true)
        throw new KraxxAiError('MODULE_UNAVAILABLE');
    if (!policy.enabled)
        throw new KraxxAiError('DISABLED');
    const settings = kraxx_ai_contract_1.kraxxAiSettingsSchema.parse(policy.settings);
    if (settings.allowedChannels.length && !settings.allowedChannels.includes(input.channelId))
        throw new KraxxAiError('CHANNEL_NOT_ALLOWED');
    if (input.prompt.trim().length > settings.maxInputLength)
        throw new KraxxAiError('PROMPT_TOO_LONG');
    const reservation = await deps.reserve({ guildId: input.guildId, userId: input.userId, channelId: input.channelId, requestId: input.requestId, settings });
    if (reservation.kind === 'DUPLICATE')
        throw new KraxxAiError('DUPLICATE');
    if (reservation.kind === 'RATE_LIMITED')
        throw new KraxxAiError('RATE_LIMITED', reservation.reason === 'USER_COOLDOWN' ? settings.userCooldownSeconds : 60);
    const started = Date.now();
    const deliveryContext = { guildId: input.guildId, userId: input.userId, channelId: input.channelId, requestId: input.requestId, prompt: input.prompt.trim() };
    let text;
    let model = 'gemini-3.8-flash';
    let usage = {};
    try {
        const result = await deps.provider.generate({ prompt: input.prompt.trim(), style: settings.responseStyle, timeoutMs: 30_000, maxOutputTokens: 650 });
        text = (0, kraxx_ai_contract_1.normalizeAiOutput)(result.text, settings.maxOutputLength);
        model = result.model;
        usage = { inputTokens: result.inputTokens, outputTokens: result.outputTokens };
    }
    catch (error) {
        const errorCode = error instanceof kraxx_ai_provider_1.AiProviderError ? error.code : 'UNAVAILABLE';
        const providerStatus = errorCode === 'TIMEOUT' || errorCode === 'SERVER' || errorCode === 'UNAVAILABLE' ? 'PROVIDER_UNKNOWN' : 'PROVIDER_ERROR';
        await deps.finish(reservation.rowId, { status: providerStatus, model, latencyMs: Date.now() - started, errorCode }).catch(() => undefined);
        logger_1.logger.warn({ guildId: input.guildId, userId: input.userId, requestId: input.requestId, provider: 'GEMINI', status: errorCode }, 'Kraxx AI provider failed');
        const delivery = await deliver({ ...deliveryContext, content: (0, kraxx_ai_provider_1.userSafeAiError)(error) }).catch(() => 'UNKNOWN');
        if (delivery === 'UNKNOWN')
            await deps.finish(reservation.rowId, { status: 'DELIVERY_UNKNOWN', model, latencyMs: Date.now() - started, errorCode: 'DELIVERY_UNKNOWN' }).catch(() => undefined);
        return { status: delivery, error: errorCode };
    }
    const delivered = await deliver({ ...deliveryContext, content: text }).catch(() => 'UNKNOWN');
    const status = delivered === 'SUCCESS' ? 'SUCCESS' : delivered === 'UNKNOWN' ? 'DELIVERY_UNKNOWN' : 'FAILURE';
    await deps.finish(reservation.rowId, { status, model, latencyMs: Date.now() - started, ...usage,
        ...(delivered === 'FAILURE' ? { errorCode: 'DISCORD_DELIVERY_FAILED' } : delivered === 'UNKNOWN' ? { errorCode: 'DELIVERY_UNKNOWN' } : {}) });
    logger_1.logger.info({ guildId: input.guildId, userId: input.userId, requestId: input.requestId, provider: 'GEMINI', model, status,
        latencyMs: Date.now() - started, ...usage }, 'Kraxx AI request completed');
    return { status: delivered };
}
