// RALD PayRald API — Withdrawals gateway
// Auth gate + rate limiting → delegates to payrald-core
// LILCKY STUDIO LIMITED

import { Hono }                    from "hono";
import type { Bindings, Variables } from "../index";
import { authRequired }            from "../middleware/auth";
import { rateLimit }               from "../middleware/rate-limit";
import { coreClient }              from "../lib/core";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Initiate withdrawal — 10/min per user
app.post("/withdrawals",
  authRequired(),
  rateLimit(10, 60),
  async (c) => {
    const body   = await c.req.json();
    const rawJwt = c.get("rawJwt")!;
    const core   = coreClient(c.env);
    const { data, status } = await core.initiateWithdrawal(rawJwt, body);
    return c.json(data, status as any);
  }
);

// List withdrawals
app.get("/withdrawals", authRequired(), async (c) => {
  const rawJwt = c.get("rawJwt")!;
  const core   = coreClient(c.env);
  const { data, status } = await core.listWithdrawals(rawJwt, new URL(c.req.url).searchParams.toString());
  return c.json(data, status as any);
});

// Verify bank account
app.post("/withdrawals/verify-account",
  authRequired(),
  rateLimit(20, 60),
  async (c) => {
    const body   = await c.req.json();
    const rawJwt = c.get("rawJwt")!;
    const core   = coreClient(c.env);
    const { data, status } = await core.verifyAccount(rawJwt, body);
    return c.json(data, status as any);
  }
);

export default app;
