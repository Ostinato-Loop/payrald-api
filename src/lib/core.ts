// RALD PayRald API — HTTP client for payrald-core and payrald-wallet
// Passes user JWT through to downstream services.
// LILCKY STUDIO LIMITED

import { signMachineJwt } from "./auth";

type CoreEnv = {
  PAYRALD_CORE_URL:  string;
  MACHINE_IDENTITY_SECRET: string;
};

async function coreReq<T>(
  env:     CoreEnv,
  method:  string,
  path:    string,
  userJwt: string,
  body?:   unknown
): Promise<{ data: T; status: number }> {
  const res = await fetch(`${env.PAYRALD_CORE_URL.replace(/\/$/, "")}${path}`, {
    method,
    headers: {
      "Content-Type":     "application/json",
      "Authorization":    `Bearer ${userJwt}`,
      "X-Source-Service": "payrald-api",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json() as T;
  return { data, status: res.status };
}

export function coreClient(env: CoreEnv) {
  return {
    async initiateTransfer(userJwt: string, body: Record<string, unknown>) {
      return coreReq<Record<string, unknown>>(env, "POST", "/v1/transfers", userJwt, body);
    },
    async listTransfers(userJwt: string, query: string) {
      return coreReq<Record<string, unknown>>(env, "GET", `/v1/transfers${query ? `?${query}` : ""}`, userJwt);
    },
    async getTransfer(userJwt: string, id: string) {
      return coreReq<Record<string, unknown>>(env, "GET", `/v1/transfers/${id}`, userJwt);
    },
    async initiateWithdrawal(userJwt: string, body: Record<string, unknown>) {
      return coreReq<Record<string, unknown>>(env, "POST", "/v1/withdrawals", userJwt, body);
    },
    async listWithdrawals(userJwt: string, query: string) {
      return coreReq<Record<string, unknown>>(env, "GET", `/v1/withdrawals${query ? `?${query}` : ""}`, userJwt);
    },
    async verifyAccount(userJwt: string, body: Record<string, unknown>) {
      return coreReq<Record<string, unknown>>(env, "POST", "/v1/withdrawals/verify-account", userJwt, body);
    },
    async previewAlias(alias: string) {
      return coreReq<Record<string, unknown>>(env, "GET", `/v1/transfers/preview?alias=${encodeURIComponent(alias)}`, "");
    },
  };
}
