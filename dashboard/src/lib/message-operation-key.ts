'use client';

async function fingerprint(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function messageOperationKey(value: unknown): Promise<string> {
  const storageKey = `kraxx-message-operation:${await fingerprint(value)}`;
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(storageKey, created);
  return created;
}

export async function finishMessageOperationKey(value: unknown, status: unknown): Promise<void> {
  if (status !== 'SUCCESS' && status !== 'FAILURE') return;
  sessionStorage.removeItem(`kraxx-message-operation:${await fingerprint(value)}`);
}
