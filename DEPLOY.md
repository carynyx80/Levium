# LEVIUM Deployment

- **Frontend**: Vercel (or equivalent). Env: `NEXT_PUBLIC_*` only. Set `NEXT_PUBLIC_DEMO` unset in production.
- **Backend**: persistent host (Railway/Render/Fly or VPS). Env: `DATABASE_URL`, `REDIS_URL`, `SUPABASE_*` (if used), `RPC_URL_FALLBACK`, `PERPS_MODE=simulation`, `ADMIN_WALLETS`.
- **Postgres**: managed (Supabase/Neon/RDS). Apply `backend/prisma/schema.prisma` via `prisma db push` (dev) or migrations (prod).
- **Redis**: managed (Upstash/ElastiCache). Channels per WS topic.
- **Workers**: dedicated indexer process with checkpoint persistence; separate WS broadcaster.
- **RPC**: secure endpoint(s) for Robinhood Chain with fallback URL configured; alert on outage (no chain substitution).
- **Monitoring**: error tracking (Sentry), uptime, RPC latency, indexer lag vs head, OI/exposure dashboards.

No secrets in git. No mainnet contract deployment without the SECURITY.md audit gates.
