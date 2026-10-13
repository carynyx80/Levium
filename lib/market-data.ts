/**
 * Market data layer.
 *
 * Priority: live indexer (Supabase/Postgres read cache) -> empty zero-state.
 * Demo data is ONLY used when NEXT_PUBLIC_DEMO=1 and is always labeled
 * "demo data" in the UI. Production never fabricates platform statistics.
 */
import type { Market } from "./store";

const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

export const DEMO_MARKETS: Market[] = [
  {
    tokenAddress: "0x1111111111111111111111111111111111111111",
    name: "Emerald Protocol",
    symbol: "EMR",
    price: 0.0421,
    change1h: 2.4,
    change24h: 18.7,
    marketCap: 4_210_000,
    volume24h: 312_000,
    liquidity: 188_000,
    longOI: 42_000,
    shortOI: 18_000,
    perpsStatus: "PERPS_LIVE",
    launchedAt: Date.now() - 6 * 86_400_000,
    graduated: true,
    totalSupply: 1_000_000_000,
    buyFeeBps: 100,
    sellFeeBps: 100,
    creatorFeeBps: 50,
  },
  {
    tokenAddress: "0x2222222222222222222222222222222222222222",
    name: "GoldfinchX",
    symbol: "GLDX",
    price: 0.0118,
    change1h: -1.2,
    change24h: -6.3,
    marketCap: 1_180_000,
    volume24h: 96_000,
    liquidity: 54_000,
    longOI: 9_000,
    shortOI: 21_000,
    perpsStatus: "PERPS_PENDING",
    launchedAt: Date.now() - 26 * 3_600_000,
    graduated: false,
    totalSupply: 100_000_000,
    buyFeeBps: 0,
    sellFeeBps: 0,
    creatorFeeBps: 0,
  },
  {
    tokenAddress: "0x3333333333333333333333333333333333333333",
    name: "Forest Reserve",
    symbol: "FRSV",
    price: 0.0873,
    change1h: 0.6,
    change24h: 4.1,
    marketCap: 8_730_000,
    volume24h: 501_000,
    liquidity: 402_000,
    longOI: 120_000,
    shortOI: 64_000,
    perpsStatus: "PERPS_PAUSED",
    launchedAt: Date.now() - 21 * 86_400_000,
    graduated: true,
    totalSupply: 10_000_000,
    buyFeeBps: 200,
    sellFeeBps: 200,
    creatorFeeBps: 100,
  },
];

/** Fetch markets: indexer first, demo fallback only when explicitly enabled. */
export async function fetchMarkets(): Promise<{ markets: Market[]; demo: boolean }> {
  // TODO(PHASE-3): query the backend indexer (Supabase token_stats join).
  // Until the indexer URL is configured, return zero-state (or demo).
  if (DEMO) return { markets: DEMO_MARKETS, demo: true };
  return { markets: [], demo: false };
}

export function platformStats(markets: Market[]) {
  return {
    totalLaunched: markets.length,
    spotVolume24h: markets.reduce((a, m) => a + m.volume24h, 0),
    perpVolume24h: 0, // sim-only; real perps volume gated behind audit
    openInterest: markets.reduce((a, m) => a + m.longOI + m.shortOI, 0),
    tvl: markets.reduce((a, m) => a + m.liquidity, 0),
  };
}
