// RALD PayRald API — Alias resolution proxy
// Passes user JWT to routing.rald.cloud/resolve
// LILCKY STUDIO LIMITED

import { Hono }                    from "hono";
import type { Bindings, Variables } from "../index";
import { authRequired }            from "../middleware/auth";
import { rateLimit }               from "../middleware/rate-limit";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.post("/resolve",
  authRequired(),
  rateLimit(60, 60),
  async (c) => {
    const body   = await c.req.json<{ alias: string; amount?: number; currency?: string }>();
    const rawJwt = c.get("rawJwt")!;
    const url    = (c.env.ROUTING_URL ?? "https://routing.rald.cloud").replace(/\/$/, "");
    const txRef  = `pay_resolve_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

    const res = await fetch(`${url}/resolve`, {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "Authorization":     `Bearer ${rawJwt}`,
        "X-Source-Service":  "payrald-api",
        "X-Transaction-Ref": txRef,
      },
      body: JSON.stringify({ alias: body.alias, purpose: "payment", currency: body.currency ?? "NGN", amount: body.amount }),
    });

    const data = await res.json();
    return c.json(data, res.status as any);
  }
);

export default app;
