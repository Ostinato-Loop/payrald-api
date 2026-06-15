// RALD PayRald API — Payments & Vouchers gateway
// JWT auth + rate limiting → delegates to payrald-core
// LILCKY STUDIO LIMITED

import { Hono }                    from "hono";
import type { Bindings, Variables } from "../index";
import { authRequired }            from "../middleware/auth";
import { rateLimit }               from "../middleware/rate-limit";
import { coreClient }              from "../lib/core";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ── Merchant payments ─────────────────────────────────────────────────────────
app.post("/payments/merchant",
  authRequired(),
  rateLimit(20, 60),
  async (c) => {
    const rawJwt = c.get("rawJwt")!;
    const body   = await c.req.json();
    const res    = await fetch(`${c.env.PAYRALD_CORE_URL.replace(/\/$/, "")}/v1/payments/merchant`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${rawJwt}`, "X-Source-Service": "payrald-api" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return c.json(data, res.status as any);
  }
);

app.get("/payments", authRequired(), async (c) => {
  const rawJwt = c.get("rawJwt")!;
  const res    = await fetch(`${c.env.PAYRALD_CORE_URL.replace(/\/$/, "")}/v1/payments?${new URL(c.req.url).searchParams}`, {
    headers: { "Authorization": `Bearer ${rawJwt}`, "X-Source-Service": "payrald-api" },
  });
  return c.json(await res.json(), res.status as any);
});

app.get("/payments/:id", authRequired(), async (c) => {
  const rawJwt = c.get("rawJwt")!;
  const res    = await fetch(`${c.env.PAYRALD_CORE_URL.replace(/\/$/, "")}/v1/payments/${c.req.param("id")}`, {
    headers: { "Authorization": `Bearer ${rawJwt}`, "X-Source-Service": "payrald-api" },
  });
  return c.json(await res.json(), res.status as any);
});

// ── Merchants ─────────────────────────────────────────────────────────────────
app.get("/merchants", async (c) => {
  const res = await fetch(`${c.env.PAYRALD_CORE_URL.replace(/\/$/, "")}/v1/merchants?${new URL(c.req.url).searchParams}`, {
    headers: { "X-Source-Service": "payrald-api" },
  });
  return c.json(await res.json(), res.status as any);
});

app.get("/merchants/:alias", async (c) => {
  const res = await fetch(`${c.env.PAYRALD_CORE_URL.replace(/\/$/, "")}/v1/merchants/${c.req.param("alias")}`, {
    headers: { "X-Source-Service": "payrald-api" },
  });
  return c.json(await res.json(), res.status as any);
});

// ── Vouchers ──────────────────────────────────────────────────────────────────
app.get("/vouchers/products", async (c) => {
  const res = await fetch(`${c.env.PAYRALD_CORE_URL.replace(/\/$/, "")}/v1/vouchers/products?${new URL(c.req.url).searchParams}`, {
    headers: { "X-Source-Service": "payrald-api" },
  });
  return c.json(await res.json(), res.status as any);
});

app.get("/vouchers/products/:slug", async (c) => {
  const res = await fetch(`${c.env.PAYRALD_CORE_URL.replace(/\/$/, "")}/v1/vouchers/products/${c.req.param("slug")}`, {
    headers: { "X-Source-Service": "payrald-api" },
  });
  return c.json(await res.json(), res.status as any);
});

app.post("/vouchers/purchase",
  authRequired(),
  rateLimit(10, 60),
  async (c) => {
    const rawJwt = c.get("rawJwt")!;
    const body   = await c.req.json();
    const res    = await fetch(`${c.env.PAYRALD_CORE_URL.replace(/\/$/, "")}/v1/vouchers/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${rawJwt}`, "X-Source-Service": "payrald-api" },
      body: JSON.stringify(body),
    });
    return c.json(await res.json(), res.status as any);
  }
);

app.get("/vouchers/purchases", authRequired(), async (c) => {
  const rawJwt = c.get("rawJwt")!;
  const res    = await fetch(`${c.env.PAYRALD_CORE_URL.replace(/\/$/, "")}/v1/vouchers/purchases?${new URL(c.req.url).searchParams}`, {
    headers: { "Authorization": `Bearer ${rawJwt}`, "X-Source-Service": "payrald-api" },
  });
  return c.json(await res.json(), res.status as any);
});

app.get("/vouchers/purchases/:id", authRequired(), async (c) => {
  const rawJwt = c.get("rawJwt")!;
  const res    = await fetch(`${c.env.PAYRALD_CORE_URL.replace(/\/$/, "")}/v1/vouchers/purchases/${c.req.param("id")}`, {
    headers: { "Authorization": `Bearer ${rawJwt}`, "X-Source-Service": "payrald-api" },
  });
  return c.json(await res.json(), res.status as any);
});

export default app;
