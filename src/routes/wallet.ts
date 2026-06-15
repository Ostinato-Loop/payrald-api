// RALD PayRald API — Wallet routes (balance, virtual account)
// Reads from Supabase directly (no core delegation needed for reads)
// LILCKY STUDIO LIMITED

import { Hono }                    from "hono";
import { createClient }            from "@supabase/supabase-js";
import type { Bindings, Variables } from "../index";
import { authRequired }            from "../middleware/auth";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.get("/wallet", authRequired(), async (c) => {
  const user = c.get("user")!;
  const db   = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await db.from("payrald_wallets").select("*").eq("user_id", user.id).maybeSingle();
  if (error) return c.json({ error: "Failed to fetch wallet" }, 500);
  if (!data) return c.json({ error: "Wallet not found. Please provision your wallet.", code: "WALLET_NOT_FOUND" }, 404);
  return c.json(data);
});

app.get("/wallet/transactions", authRequired(), async (c) => {
  const user   = c.get("user")!;
  const limit  = Math.min(parseInt(c.req.query("limit") ?? "30"), 100);
  const cursor = c.req.query("cursor");
  const type   = c.req.query("type");
  const db     = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  let q = db.from("payrald_transactions")
    .select("id,type,direction,amount,fee,currency,status,provider_ref,recipient_alias,recipient_name,narration,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) q = q.lt("created_at", cursor);
  if (type)   q = q.eq("type", type);

  const { data, error } = await q;
  if (error) return c.json({ error: "Failed to fetch transactions" }, 500);
  const hasMore = data.length > limit;
  const rows    = hasMore ? data.slice(0, limit) : data;
  return c.json({ data: rows, next_cursor: hasMore ? rows[rows.length - 1]?.created_at ?? null : null });
});

app.get("/banks", async (c) => {
  const db = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await db.from("payrald_banks").select("code,name,short_name").eq("active", true).order("name");
  if (error) return c.json({ error: "Failed to fetch banks" }, 500);
  return c.json({ data });
});

export default app;
