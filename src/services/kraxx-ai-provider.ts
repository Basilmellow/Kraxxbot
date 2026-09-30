export type AiGenerateRequest = { prompt: string; style: 'BALANCED' | 'CASUAL' | 'PROFESSIONAL' | 'TECHNICAL'; timeoutMs: number; maxOutputTokens: number };
export type AiGenerateResponse = { text: string; provider: string; model: string; requestId?: string; inputTokens?: number; outputTokens?: number };
export interface AIProvider { generate(request: AiGenerateRequest): Promise<AiGenerateResponse> }

export class AiProviderError extends Error {
  constructor(public readonly code: 'TIMEOUT' | 'RATE_LIMITED' | 'UNAVAILABLE' | 'AUTH' | 'MALFORMED' | 'EMPTY' | 'SERVER') {
    super(code); this.name = 'AiProviderError';
  }
}

export function userSafeAiError(error: unknown): string {
  const code = error instanceof AiProviderError ? error.code : typeof error === 'string' ? error : '';
  if (code === 'AUTH') return 'Kraxx AI is not configured for this server.';
  if (code === 'RATE_LIMITED') return 'Kraxx AI is busy right now. Try again shortly.';
  if (code === 'TIMEOUT') return 'Kraxx AI timed out. Please try again.';
  return 'Kraxx AI is temporarily unavailable. Please try again.';
}
