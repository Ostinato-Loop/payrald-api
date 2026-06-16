import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHmac } from "crypto";

const CORE_URL = process.env.PAYRALD_CORE_URL ?? "https://core.pay.rald.cloud";
const RALD_JWT_SECRET = process.env.RALD_JWT_SECRET ?? "";

const router: IRouter = Router();

function getUserId(req: any): string | null {
  return req.headers.authorization?.replace("Bearer ", "") ?? null;
}

function base64url(input: string | Buffer): string {
  const b = typeof input === "string" ? Buffer.from(input) : input;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function signRaldJwt(userId: string, raldId: string, kycTier: number): Promise<string> {
  const header  = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now     = Math.floor(Date.now() / 1000);
  const payload = base64url(JSON.stringify({ sub: userId, raldId, kycTier, iat: now, exp: now + 3600 }));
  const signing = `${header}.${payload}`;
  const sig     = base64url(createHmac("sha256", RALD_JWT_SECRET).update(signing).digest());
  return `${signing}.${sig}`;
}

router.get("/vouchers/products", async (req, res) => {
  const category = req.query.category as string | undefined;
  const url = `${CORE_URL}/v1/vouchers/products${category ? `?category=${encodeURIComponent(category)}` : ""}`;
  try {
    const upstream = await fetch(url, { headers: { "Accept": "application/json" } });
    const body = await upstream.json();
    return res.status(upstream.status).json(body);
  } catch (err) {
    return res.status(502).json({ error: "Failed to reach product catalog" });
  }
});

router.get("/vouchers/products/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    const upstream = await fetch(`${CORE_URL}/v1/vouchers/products/${encodeURIComponent(slug)}`);
    const body = await upstream.json();
    return res.status(upstream.status).json(body);
  } catch {
    return res.status(502).json({ error: "Failed to reach product catalog" });
  }
});

router.post("/vouchers/purchase", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users.length) return res.status(401).json({ error: "User not found" });

  const user = users[0];

  if (!RALD_JWT_SECRET) {
    return res.status(503).json({ error: "Voucher purchases unavailable (service misconfigured)", code: "NO_JWT_SECRET" });
  }

  let jwt: string;
  try {
    jwt = await signRaldJwt(user.id, user.raldId, user.kycTier ?? 1);
  } catch {
    return res.status(500).json({ error: "Failed to issue auth token" });
  }

  try {
    const upstream = await fetch(`${CORE_URL}/v1/vouchers/purchase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwt}`,
      },
      body: JSON.stringify(req.body),
    });
    const body = await upstream.json();
    return res.status(upstream.status).json(body);
  } catch {
    return res.status(502).json({ error: "Failed to process purchase" });
  }
});

router.get("/vouchers/purchases", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users.length) return res.status(401).json({ error: "User not found" });

  const user = users[0];

  if (!RALD_JWT_SECRET) return res.status(503).json({ error: "Service unavailable" });

  const jwt = await signRaldJwt(user.id, user.raldId, user.kycTier ?? 1).catch(() => null);
  if (!jwt) return res.status(500).json({ error: "Auth error" });

  try {
    const upstream = await fetch(`${CORE_URL}/v1/vouchers/purchases`, {
      headers: { "Authorization": `Bearer ${jwt}`, "Accept": "application/json" },
    });
    const body = await upstream.json();
    return res.status(upstream.status).json(body);
  } catch {
    return res.status(502).json({ error: "Failed to fetch purchase history" });
  }
});

export default router;
