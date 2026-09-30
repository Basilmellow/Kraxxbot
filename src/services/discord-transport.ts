export class DiscordApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly retryAfter: number | null = null
  ) {
    super(status === 408 ? 'Discord request timed out.' : `Discord request failed (${status}).`);
    this.name = 'DiscordApiError';
  }
}

// A single deadline includes rate-limit waits and response body consumption.
// Retry only explicit 429 rejection; never replay an ambiguous mutation.
export async function discordRequest(url: string, options: RequestInit): Promise<Response> {
  const deadline = Date.now() + 12_000;
  const signal = AbortSignal.timeout(12_000);
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const requestOptions: RequestInit & { cache: 'no-store' } = {
        ...options,
        signal,
        cache: 'no-store',
      };
      const response = await fetch(url, requestOptions);
      const text = await response.text();
      if (response.ok)
        return new Response(response.status === 204 ? null : text, {
          status: response.status,
          headers: response.headers,
        });
      let retryAfter: number | null = null;
      if (response.status === 429) {
        const value = Number(
          response.headers.get('retry-after') ??
            (() => {
              try {
                return JSON.parse(text).retry_after;
              } catch {
                return NaN;
              }
            })()
        );
        if (Number.isFinite(value) && value >= 0) retryAfter = value;
        if (retryAfter !== null && attempt < 2 && Date.now() + retryAfter * 1000 < deadline) {
          await new Promise(resolve => setTimeout(resolve, value * 1000));
          continue;
        }
      }
      throw new DiscordApiError(response.status, retryAfter);
    }
    throw new DiscordApiError(429);
  } catch (error) {
    if (error instanceof DiscordApiError) throw error;
    throw new DiscordApiError(signal.aborted ? 408 : 502);
  }
}
