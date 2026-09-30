import { KraxxAiRepository, type AiReservation } from '../database/repositories/kraxx-ai.repository';
import { getModuleDefinition } from '../config/modules';
import { logger } from '../utils/logger';
import { kraxxAiSettingsSchema, normalizeAiOutput } from './kraxx-ai-contract';
import { AIProvider, AiProviderError, userSafeAiError } from './kraxx-ai-provider';
import { GeminiProvider } from './gemini.provider';

export type KraxxAiInput = { guildId: string; userId: string; channelId: string; requestId: string; prompt: string; verifyMembership: () => Promise<boolean>; verifyChannel: () => Promise<boolean> };
export type KraxxAiDelivery = (input: { guildId: string; userId: string; channelId: string; requestId: string; content: string }) => Promise<'SUCCESS' | 'FAILURE' | 'UNKNOWN'>;
export interface KraxxAiDependencies {
  policy(guildId: string): Promise<{ enabled: boolean; settings: ReturnType<typeof kraxxAiSettingsSchema.parse> } | null>;
  reserve(input: { guildId: string; userId: string; channelId: string; requestId: string; settings: ReturnType<typeof kraxxAiSettingsSchema.parse> }): Promise<AiReservation>;
  finish(id: string, data: { status: 'SUCCESS' | 'PROVIDER_ERROR' | 'PROVIDER_UNKNOWN' | 'DELIVERY_UNKNOWN' | 'FAILURE'; model?: string; latencyMs: number; inputTokens?: number; outputTokens?: number; errorCode?: string }): Promise<void>;
  provider: AIProvider;
  deliver: KraxxAiDelivery;
}

const defaultDependencies: Omit<KraxxAiDependencies, 'deliver'> = { ...KraxxAiRepository, provider: new GeminiProvider() };

export class KraxxAiError extends Error {
  constructor(public readonly code: 'SERVER_ONLY' | 'INVALID_CONTEXT' | 'NOT_A_MEMBER' | 'INVALID_CHANNEL' | 'MODULE_UNAVAILABLE' | 'DISABLED' | 'MISCONFIGURED' | 'CHANNEL_NOT_ALLOWED' | 'EMPTY_PROMPT' | 'PROMPT_TOO_LONG' | 'DUPLICATE' | 'RATE_LIMITED' | 'AI_UNAVAILABLE', public readonly retryAfterSeconds?: number) { super(code); this.name = 'KraxxAiError'; }
}

export async function executeKraxxAi(input: KraxxAiInput, deliver: KraxxAiDelivery, overrides: Partial<Omit<KraxxAiDependencies, 'deliver'>> = {}) {
  if (!/^\d{17,20}$/.test(input.guildId) || !/^\d{17,20}$/.test(input.userId) || !/^\d{17,20}$/.test(input.channelId) || !/^[A-Za-z0-9_-]{16,128}$/.test(input.requestId)) throw new KraxxAiError('INVALID_CONTEXT');
  if (!input.prompt.trim()) throw new KraxxAiError('EMPTY_PROMPT');
  const deps: KraxxAiDependencies = { ...defaultDependencies, ...overrides, deliver };
  if (!(await input.verifyMembership())) throw new KraxxAiError('NOT_A_MEMBER');
  if (!(await input.verifyChannel())) throw new KraxxAiError('INVALID_CHANNEL');
  const policy = await deps.policy(input.guildId);
  if (!policy) throw new KraxxAiError('MISCONFIGURED');
  if (getModuleDefinition('kraxx-ai')?.runtimeImplemented !== true) throw new KraxxAiError('MODULE_UNAVAILABLE');
  if (!policy.enabled) throw new KraxxAiError('DISABLED');
  const settings = kraxxAiSettingsSchema.parse(policy.settings);
  if (settings.allowedChannels.length && !settings.allowedChannels.includes(input.channelId)) throw new KraxxAiError('CHANNEL_NOT_ALLOWED');
  if (input.prompt.trim().length > settings.maxInputLength) throw new KraxxAiError('PROMPT_TOO_LONG');

  const reservation = await deps.reserve({ guildId: input.guildId, userId: input.userId, channelId: input.channelId, requestId: input.requestId, settings });
  if (reservation.kind === 'DUPLICATE') throw new KraxxAiError('DUPLICATE');
  if (reservation.kind === 'RATE_LIMITED') throw new KraxxAiError('RATE_LIMITED', reservation.reason === 'USER_COOLDOWN' ? settings.userCooldownSeconds : 60);
  const started = Date.now();
  let text: string;
  let model = 'gemini-3.8-flash';
  let usage: { inputTokens?: number; outputTokens?: number } = {};
  try {
    const result = await deps.provider.generate({ prompt: input.prompt.trim(), style: settings.responseStyle, timeoutMs: 12_000, maxOutputTokens: 650 });
    text = normalizeAiOutput(result.text, settings.maxOutputLength);
    model = result.model;
    usage = { inputTokens: result.inputTokens, outputTokens: result.outputTokens };
  } catch (error) {
    const errorCode = error instanceof AiProviderError ? error.code : 'UNAVAILABLE';
    const providerStatus = errorCode === 'TIMEOUT' || errorCode === 'SERVER' || errorCode === 'UNAVAILABLE' ? 'PROVIDER_UNKNOWN' : 'PROVIDER_ERROR';
    await deps.finish(reservation.rowId, { status: providerStatus, model, latencyMs: Date.now() - started, errorCode }).catch(() => undefined);
    logger.warn({ guildId: input.guildId, userId: input.userId, requestId: input.requestId, provider: 'GEMINI', status: errorCode }, 'Kraxx AI provider failed');
    const delivery = await deliver({ ...input, content: userSafeAiError(error) }).catch(() => 'UNKNOWN' as const);
    if (delivery === 'UNKNOWN') await deps.finish(reservation.rowId, { status: 'DELIVERY_UNKNOWN', model, latencyMs: Date.now() - started, errorCode: 'DELIVERY_UNKNOWN' }).catch(() => undefined);
    return { status: delivery, error: errorCode };
  }

  const delivered = await deliver({ ...input, content: text }).catch(() => 'UNKNOWN' as const);
  const status = delivered === 'SUCCESS' ? 'SUCCESS' : delivered === 'UNKNOWN' ? 'DELIVERY_UNKNOWN' : 'FAILURE';
  await deps.finish(reservation.rowId, { status, model, latencyMs: Date.now() - started, ...usage,
    ...(delivered === 'FAILURE' ? { errorCode: 'DISCORD_DELIVERY_FAILED' } : delivered === 'UNKNOWN' ? { errorCode: 'DELIVERY_UNKNOWN' } : {}) });
  logger.info({ guildId: input.guildId, userId: input.userId, requestId: input.requestId, provider: 'GEMINI', model, status,
    latencyMs: Date.now() - started, ...usage }, 'Kraxx AI request completed');
  return { status: delivered };
}
