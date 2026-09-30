export function validMutationOrigin(origin: string | null, host: string | null, expected: string): boolean {
  try { const url = new URL(expected); return !!origin && origin === url.origin && host === url.host; }
  catch { return false; }
}
// Bounded per-process protection. Deployment-wide quotas remain a later concern.
export class MutationLimiter {
  private entries = new Map<string, { count: number; until: number }>();
  allow(key: string, now = Date.now()): boolean {
    for (const [id, entry] of this.entries) if (entry.until <= now) this.entries.delete(id);
    let entry = this.entries.get(key);
    if (!entry) {
      if (this.entries.size >= 10000) return false;
      entry = { count: 0, until: now + 60000 }; this.entries.set(key, entry);
    }
    return ++entry.count <= 30;
  }
}
