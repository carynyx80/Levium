# LEVIUM — Launch it. Long it. Short it.

Token launchpad + spot DEX + perpetual futures DEX, exclusively on **Robinhood Chain**.
Every token launched through LEVIUM is born with a spot market and a registered
(perps-pending) perpetual market.

## Quickstart

```bash
cp .env.example .env.local   # fill RPC, contract addresses when deployed
npm install
npm run dev                  # http://localhost:3000
```

Demo mode (clearly labeled demo data, indexer bypassed):

```bash
NEXT_PUBLIC_DEMO=1 npm run dev
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (perps-math + future suites) |

## Project layout

- `app/` — Next.js App Router pages (`/`, `/explore`, `/launch`, `/trade/[tokenAddress]`, `/perps`, `/portfolio`, `/creator`, `/leaderboard`, `/profile/[walletAddress]`, `/admin`)
- `components/` — Navbar, Providers (wagmi/RainbowKit), MarketTable, StatusBadge, TradePanel, PerpsPanel (sim), PriceChart
- `lib/` — chain config, contract ABIs, fixed-point perps math, zustand store, market-data layer
- `contracts/` — Solidity: TokenFactory, BondingCurve, PerpRegistry (dev only, unaudited)
- `backend/` — Prisma schema, indexer + WebSocket skeletons
- `tests/` — Vitest suites

## Safety gates (non-negotiable)

1. **Real-money perps are DISABLED** (`PERPS_MODE=simulation`). The UI labels every perp element simulated.
2. **No fabricated stats.** Without indexer data the app shows zero-states (or labeled demo data with `NEXT_PUBLIC_DEMO=1`).
3. **No fake confirmations.** Success surfaces only after on-chain receipt; simulations are labeled.
4. **Robinhood Chain exclusive.** If its RPC is unreachable, the app reports the outage — never substitutes another chain.
5. **Contracts are unaudited dev drafts.** No production deployment, no real funds, without audit + explicit authorization.

## Docs

- `ARCHITECTURE.md` — system design, data flow, perps risk architecture
- `contracts/README.md` — contract docs (in contracts folder)
- `SECURITY.md` — threat model, audit gates, operational runbooks pointer
- `DEPLOY.md` — environment + hosting guide
