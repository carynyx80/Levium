# LEVIUM Architecture

## Components

- **Frontend** (`app/`, `components/`): Next.js 14 App Router + TypeScript + Tailwind + RainbowKit/wagmi/viem. Reads market data from the backend read cache; writes go straight to chain via wallet signing.
- **Smart contracts** (`contracts/`): `LeviumTokenFactory` (deterministic ERC-20 deploys, launch fees, perps registration), `LeviumBondingCurve` (linear-curve launch market, fees, slippage guards, graduation), `LeviumPerpRegistry` (market lifecycle + risk params; NO collateral, NO fills).
- **Indexer** (`backend/indexer.config.ts` → Phase 2 worker): subscribes to factory/curve/registry events, upserts Postgres, publishes Redis updates, checkpoints blocks, reconciles vs on-chain.
- **Database** (`backend/prisma/schema.prisma`): users, wallets, tokens, spot/perp markets, risk params, trades, sim positions + events, funding, liquidations, creator fees, candles, checkpoints, admin audit log.
- **Realtime** (`backend/ws-server.ts` → Phase 3): Redis → WebSocket broadcast with per-channel sequence numbers, client resume, (txHash, logIndex) dedupe, reorg-aware finality.
- **Risk engine** (Phase 4/5): mark-price methodology (liquidity-weighted + TWAP, multi-input index price, confidence gating), activation state machine REGISTERED → OBSERVING → ELIGIBLE → ACTIVE (+ PAUSED / CLOSE_ONLY / DISABLED), OI/position/leverage caps, circuit breakers, insurance fund accounting.

## Market lifecycle

1. Launch tx confirms → token contract live.
2. Spot market initializes → `SPOT LIVE`, trading page + chart + analytics go live.
3. Perp market registers as `PERPS PENDING` — exists but rejects real-money leverage.
4. Risk engine observes (liquidity, TWAP stability, deviation, oracle freshness) → ELIGIBLE → ACTIVE (`PERPS LIVE`) only when all checks pass.
5. Risk admin can PAUSE / CLOSE_ONLY / DISABLE at any time.

## Liquidity architecture (decision for Phase 5)

Candidate models documented for the audit gate: peer-to-peer matching, liquidity-pool counterparty, or hybrid. Selection criteria: execution reliability under imbalance, liquidation robustness, bad-debt containment, insurance funding, withdrawal safety, shutdown path. No model may assume unlimited counterparty liquidity; a market without viable execution liquidity stays inactive.

## Funding

Deterministic, auditable 8h funding (rate formula, caps, abnormal-market handling finalized in Phase 5 contracts). UI shows current rate, next timestamp, estimated payment, history. No fabricated rates — simulation uses a documented placeholder until the on-chain formula ships.
