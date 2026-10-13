/**
 * Live ETH/USD reference for the $0.50 platform launch fee.
 *
 * Sources (no keys, CORS-enabled): Coinbase spot API primary, CoinGecko
 * public API fallback. NEVER hardcoded: every value carries its source +
 * fetch timestamp, and callers must refuse data older than STALE_AFTER_MS.
 * This feed prices the PLATFORM fee only — network gas is separate and is
 * always reported by the wallet/chain, never derived here.
 */

export const LAUNCH_FEE_USD = 0.5;
const STALE_AFTER_MS = 120_000;
const CACHE_MS = 30_000;

export interface EthPrice {
  usd: number;
  source: "coinbase" | "coingecko";
  fetchedAt: number;
}

let cache: EthPrice | null = null;
let inflight: Promise<EthPrice> | null = null;

async function fromCoinbase(): Promise<EthPrice> {
  const r = await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot");
  if (!r.ok) throw new Error(`coinbase ${r.status}`);
  const j = await r.json();
  const usd = Number(j?.data?.amount);
  if (!Number.isFinite(usd) || usd <= 0) throw new Error("coinbase bad payload");
  return { usd, source: "coinbase", fetchedAt: Date.now() };
}

async function fromCoinGecko(): Promise<EthPrice> {
  const r = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
  );
  if (!r.ok) throw new Error(`coingecko ${r.status}`);
  const j = await r.json();
  const usd = Number(j?.ethereum?.usd);
  if (!Number.isFinite(usd) || usd <= 0) throw new Error("coingecko bad payload");
  return { usd, source: "coingecko", fetchedAt: Date.now() };
}

export async function getEthUsd(force = false): Promise<EthPrice> {
  if (!force && cache && Date.now() - cache.fetchedAt < CACHE_MS) return cache;
  if (!inflight) {
    inflight = (async () => {
      try {
        cache = await fromCoinbase();
      } catch {
        cache = await fromCoinGecko();
      }
      return cache;
    })().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

/** Freshness guard: refuse to price the fee on stale data. */
export function isFresh(p: EthPrice, now = Date.now()): boolean {
  return now - p.fetchedAt < STALE_AFTER_MS;
}

/** Exact native-ETH amount for a USD value (float; converted to wei by caller). */
export function usdToEth(usd: number, ethUsd: number): number {
  return usd / ethUsd;
}

/** Whole-wei BigInt for a USD value at the given rate (never hardcoded). */
export function usdToWei(usd: number, ethUsd: number): bigint {
  return BigInt(Math.round((usd / ethUsd) * 1e18));
}

/** USD value of a wei amount at the given rate (display only). */
export function weiToUsd(wei: bigint, ethUsd: number): number {
  return (Number(wei) / 1e18) * ethUsd;
}
