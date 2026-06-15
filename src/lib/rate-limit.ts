// RALD PayRald API — KV-backed rate limiter
// Same pattern as rald-auth-core. Window: 60s.
// LILCKY STUDIO LIMITED

export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export async function checkRateLimit(
  kv:      KVNamespace,
  key:     string,
  limit:   number,
  windowS: number
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const existing = await kv.get(key);
  const now   = Math.floor(Date.now() / 1000);
  const reset = now + windowS;

  if (!existing) {
    await kv.put(key, JSON.stringify({ count: 1, reset }), { expirationTtl: windowS });
    return { allowed: true, remaining: limit - 1, reset };
  }

  const stored = JSON.parse(existing) as { count: number; reset: number };
  if (stored.count >= limit) {
    return { allowed: false, remaining: 0, reset: stored.reset };
  }

  stored.count += 1;
  const ttl = Math.max(1, stored.reset - now);
  await kv.put(key, JSON.stringify(stored), { expirationTtl: ttl });
  return { allowed: true, remaining: limit - stored.count, reset: stored.reset };
}
