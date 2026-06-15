// RALD PayRald API — Transfers gateway
// Auth gate + rate limiting → delegates to payrald-core
// LILCKY STUDIO LIMITED

import { Hono }                    from "hono";
import type { Bindings, Variables } from "../index";
import { authRequired }            from "../middleware/auth";
import { rateLimit }               from "../middleware/rate-limit";
import { coreClient }              from "../lib/core";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Initiate transfer — 30/min per user
app.post("/transfers",
  authRequired(),
  rateLimit(30, 60),
  async (c) => {
    const body   = await c.req.json();
    const rawJwt = c.get("rawJwt")!;
    const core   = coreClient(c.env);
    const { data, status } = await core.initiateTransfer(rawJwt, body);
    return c.json(data, status as 200 | 201 | 400 | 401 | 402 | 422 | 429 | 500 | 502 | 503);
  }
);

// List transfers
app.get("/transfers", authRequired(), async (c) => {
  const rawJwt = c.get("rawJwt")!;
  const core   = coreClient(c.env);
  const { data, status } = await core.listTransfers(rawJwt, new URL(c.req.url).searchParams.toString());
  return c.json(data, status as any);
});

// Get transfer
app.get("/transfers/:id", authRequired(), async (c) => {
  const rawJwt = c.get("rawJwt")!;
  const core   = coreClient(c.env);
  const { data, status } = await core.getTransfer(rawJwt, c.req.param("id"));
  return c.json(data, status as any);
});

// Preview alias — no auth, light rate limit
app.get("/transfers/preview",
  rateLimit(60, 60),
  async (c) => {
    const alias = c.req.query("alias") ?? "";
    if (!alias) return c.json({ error: "alias query param required" }, 400);
    const core  = coreClient(c.env);
    const { data, status } = await core.previewAlias(alias);
    return c.json(data, status as any);
  }
);

export default app;
