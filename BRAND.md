# PayRald API

**Service:** `payrald-api`  
**Runtime:** Cloudflare Worker  
**Deployed at:** `pay.rald.cloud`

## Purpose

Public-facing API gateway for the PayRald product.

- JWT authentication (RALD_JWT_SECRET)
- KV-backed rate limiting
- Delegates to `core.pay.rald.cloud` for all payment operations
- Reads wallet/transaction data directly from Supabase for low-latency responses
- Proxies alias resolution to `routing.rald.cloud`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/wallet | Balance + virtual account info |
| GET | /v1/wallet/transactions | Transaction history |
| GET | /v1/banks | Nigerian bank list |
| POST | /v1/resolve | Resolve alias → routing metadata |
| POST | /v1/transfers | Send money to alias |
| GET | /v1/transfers | List transfers |
| POST | /v1/withdrawals | Withdraw to bank account |
| POST | /v1/withdrawals/verify-account | Verify bank account name |

**Operated by LILCKY STUDIO LIMITED**
