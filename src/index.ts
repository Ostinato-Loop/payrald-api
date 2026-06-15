// RALD PayRald API — Cloudflare Worker
// Public-facing API gateway: JWT auth + rate limiting + delegation to payrald-core
// Deployed at: pay.rald.cloud
// LILCKY STUDIO LIMITED

import { Hono }                      from "hono";
import { cors }                      from "hono/cors";
import type { JwtPayload }           from "./lib/auth";
import type { KVNamespace }          from "./lib/rate-limit";
import { requestLogger }             from "./lib/logger";
import transfersRoutes               from "./routes/transfers";
import withdrawalsRoutes             from "./routes/withdrawals";
import walletRoutes                  from "./routes/wallet";
import resolveRoutes                 from "./routes/resolve";
import paymentsRoutes                from "./routes/payments";

export type Bindings = {
  SUPABASE_URL:              string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RALD_JWT_SECRET:           string;
  MACHINE_IDENTITY_SECRET:   string;
  PAYRALD_CORE_URL:          string;
  ROUTING_URL?:              string;
  RATE_LIMIT_KV?:            KVNamespace;
  ENVIRONMENT?:              string;
};

export type Variables = {
  user?:   JwtPayload;
  rawJwt?: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const VERSION = "1.0.0";

// Health — before all middleware
app.get("/health",  (c) => c.json({ status: "ok", service: "payrald-api", version: VERSION, environment: c.env.ENVIRONMENT ?? "production", timestamp: new Date().toISOString() }));
app.get("/healthz", (c) => c.json({ status: "ok" }));
app.get("/readyz",  (c) => c.json({ ready: !!(c.env.RALD_JWT_SECRET && c.env.PAYRALD_CORE_URL && c.env.SUPABASE_URL) }));

// Security headers
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  c.header("X-RALD-Service",  "payrald-api");
  c.header("X-RALD-Version",  VERSION);
  c.header("X-RALD-Owner",    "LILCKY STUDIO LIMITED");
});

// Logger
app.use("*", requestLogger("payrald-api"));

// CORS — pay.rald.cloud + mobile apps + local dev
app.use("*", cors({
  origin: (origin) => {
    if (!origin) return null;
    const allowed = new Set([
      "https://pay.rald.cloud", "https://payrald.rald.cloud",
      "https://app.rald.cloud", "https://rald.cloud",
      "https://auth.rald.cloud", "https://loop.rald.cloud",
      "http://localhost:3000", "http://localhost:5173", "http://localhost:8080",
    ]);
    if (allowed.has(origin)) return origin;
    if (/^https:\/\/[a-z0-9-]+\.(replit\.(app|dev)|pages\.dev)$/.test(origin)) return origin;
    return null;
  },
  allowMethods:  ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders:  ["Content-Type", "Authorization", "X-Request-ID"],
  exposeHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
  credentials:   true,
}));

// Boot validation
app.use("*", async (c, next) => {
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RALD_JWT_SECRET", "PAYRALD_CORE_URL"];
  for (const k of required) {
    if (!c.env[k as keyof Bindings]) return c.json({ error: `Service misconfigured: missing ${k}`, service: "payrald-api" }, 503);
  }
  await next();
});

// Routes
app.route("/v1", transfersRoutes);
app.route("/v1", withdrawalsRoutes);
app.route("/v1", walletRoutes);
app.route("/v1", resolveRoutes);
app.route("/v1", paymentsRoutes);

// Root manifest
app.get("/", (c) => c.json({
  service: "payrald-api", version: VERSION,
  endpoints: {
    health:           "GET /health",
    wallet:           "GET /v1/wallet",
    transactions:     "GET /v1/wallet/transactions",
    banks:            "GET /v1/banks",
    resolve:          "POST /v1/resolve",
    transfers:        "POST /v1/transfers | GET /v1/transfers | GET /v1/transfers/:id",
    withdrawals:      "POST /v1/withdrawals | GET /v1/withdrawals | POST /v1/withdrawals/verify-account",
    preview:          "GET /v1/transfers/preview?alias=<alias>",
    payments_merchant:"POST /v1/payments/merchant",
    payments:         "GET /v1/payments | GET /v1/payments/:id",
    merchants:        "GET /v1/merchants | GET /v1/merchants/:alias",
    vouchers:         "GET /v1/vouchers/products | GET /v1/vouchers/products/:slug",
    voucher_purchase: "POST /v1/vouchers/purchase",
    voucher_history:  "GET /v1/vouchers/purchases | GET /v1/vouchers/purchases/:id",
  },
  timestamp: new Date().toISOString(),
}));

app.notFound((c) => c.json({ error: "Not found", path: c.req.path }, 404));
app.onError((err, c) => {
  console.error("[payrald-api]", err.message ?? err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
