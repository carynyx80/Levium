# LEVIUM Deployment

- **Frontend**: Vercel (or equivalent). Env: `NEXT_PUBLIC_*` only. Set `NEXT_PUBLIC_DEMO` unset in production.
- **Backend**: persistent host (Railway/Render/Fly or VPS). Env: `DATABASE_URL`, `REDIS_URL`, `SUPABASE_*` (if used), `RPC_URL_FALLBACK`, `PERPS_MODE=simulation`, `ADMIN_WALLETS`.
- **Postgres**: managed (Supabase/Neon/RDS). Apply `backend/prisma/schema.prisma` via `prisma db push` (dev) or migrations (prod).
- **Redis**: managed (Upstash/ElastiCache). Channels per WS topic.
- **Workers**: dedicated indexer process with checkpoint persistence; separate WS broadcaster.
- **RPC**: secure endpoint(s) for Robinhood Chain with fallback URL configured; alert on outage (no chain substitution).
- **Monitoring**: error tracking (Sentry), uptime, RPC latency, indexer lag vs head, OI/exposure dashboards.

No secrets in git. No mainnet contract deployment without the SECURITY.md audit gates.

## Go-live runbook: first real token launch (Robinhood Chain)

> Perps stay in `PERPS_MODE=simulation`. Nothing below deploys mainnet
> contracts or spends real funds without explicit user approval.

1. **Compile**: `npm run compile` — all four contracts must print `COMPILE_OK`.
2. **RPC check**: `npm run rpc:check` — expect `chainId: 4663, chainIdMatch: true`.
3. **Fund the deployer**: a wallet holding Robinhood Chain native ETH for gas
   (deploying 3 contracts + 4 wiring txs; at ~0.02 gwei gas this is cents).
4. **Deploy (test first)**: point `RPC_URL` at the supported Robinhood test
   environment if one is published; otherwise deploy mainnet ONLY after explicit
   approval:
   `PRIVATE_KEY=0x... TREASURY=0xYourTreasury RPC_URL=... node backend/scripts/deploy.mjs`
   The script reads live ETH/USD (Coinbase -> CoinGecko), sets the $0.50 launch
   fee in wei, wires factory/curve/registry, and prints the five
   `NEXT_PUBLIC_*` values plus the factory deploy block.
5. **Configure the app**: paste those values into `levium/.env.local`
   (never commit), `npm run dev`, open `/launch`.
6. **Launch the token**: connect wallet (Robinhood Chain id 4663) -> pick supply
   tier (1M/10M/100M/1B) -> set creator/buy/sell fees -> confirm the $0.50 fee +
   gas as two SEPARATE lines in the wallet -> verify the explorer link, the new
   `/trade/<address>` page (LIVE ON-CHAIN price), and creator-fee receipt.
7. **Trade check**: buy once (minOut enforced), sell once (approve + sell),
   confirm balances, history, and $50k graduation monitoring.
8. **Record**: save deployed addresses + tx links; they are the production
   references. Re-peg the on-chain $0.50 fee via `setLaunchFee` whenever the
   rate drifts >10% (owner tx, recorded in the admin audit log).
