// RALD PayRald API — Rate limiting middleware
// LILCKY STUDIO LIMITED

import type { MiddlewareHandler } from "hono";
import { checkRateLimit, type KVNamespace } from "../lib/rate-limit";
import type { Bindings, Variables } from "../index";

export function rateLimit(
  limit: number,
  windowS = 60,
  keyFn?: (c: any) => string
): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  return async (c, next) => {
    const kv = c.env.RATE_LIMIT_KV as KVNamespace | undefined;
    if (!kv) { await next(); return; }

    const user  = c.get("user");
    const key   = keyFn
      ? keyFn(c)
      : `rl:payrald-api:${c.req.path}:${user?.id ?? c.req.header("CF-Connecting-IP") ?? "anon"}`;

    const result = await checkRateLimit(kv, key, limit, windowS);

    c.header("X-RateLimit-Limit",     String(limit));
    c.header("X-RateLimit-Remaining", String(result.remaining));
    c.header("X-RateLimit-Reset",     String(result.reset));

    if (!result.allowed) {
      return c.json({ error: "Too many requests", code: "RATE_LIMITED", retry_after: result.reset - Math.floor(Date.now() / 1000) }, 429);
    }

    await next();
  };
}
