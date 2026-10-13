/**
 * LEVIUM launch economics — shared by the launch UI, trade UI, and tests.
 *
 * Conventions (mirror the on-chain rules in contracts/):
 * - Fixed supply tiers (whole tokens): 1M, 10M, 100M, 1B. No other supply.
 * - Circulating supply = 100% of total from launch, INCLUDING tokens held in
 *   the bonding-curve trading reserve (reserve tokens are unlocked and
 *   available for trade, so they count as circulating).
 * - No minting after creation (fixed supply at deploy, no mint authority).
 * - Initial reference market cap: $4,000 => initialPrice = 4000 / totalSupply.
 * - MarketCap = price x circulating. FDV = price x total.
 * - Graduation: verified market cap >= $50,000 (plus existing liquidity /
 *   migration safety checks on-chain).
 * - Fees: creator / buy / sell, each 0–10% (0–1000 bps), 0.1% (= 10 bps)
 *   precision, default 0%. Buy tx deducts buyFee -> protocol + creatorFee ->
 *   creator; sell tx deducts sellFee -> protocol + creatorFee -> creator.
 * - All tokens use 18 decimals; USD math here is display-level, on-chain
 *   accounting stays in 1e18 fixed point.
 */

export const SUPPLY_TIERS = [1_000_000, 10_000_000, 100_000_000, 1_000_000_000] as const;
export type SupplyTier = (typeof SUPPLY_TIERS)[number];

export const INITIAL_REFERENCE_MCAP_USD = 4_000;
export const GRADUATION_MCAP_USD = 50_000;

export const MAX_FEE_BPS = 1000; // 10%
export const FEE_STEP_BPS = 10; // 0.1% precision
export const TOKEN_DECIMALS = 18;

export function isValidSupplyTier(s: number): s is SupplyTier {
  return (SUPPLY_TIERS as readonly number[]).includes(s);
}

/** Percent (e.g. 2.5) -> bps, snapped to 0.1% precision. */
export function pctToBps(pct: number): number {
  return Math.round((pct * 100) / FEE_STEP_BPS) * FEE_STEP_BPS;
}

export function bpsToPct(bps: number): number {
  return bps / 100;
}

/** Fee input validation: 0–10%, 0.1% precision. */
export function validateFeePct(pct: number): { ok: boolean; reason?: string } {
  if (!Number.isFinite(pct)) return { ok: false, reason: "Fee must be a number." };
  if (pct < 0 || pct > 10) return { ok: false, reason: "Fee must be between 0% and 10%." };
  if (Math.abs(pct * 10 - Math.round(pct * 10)) > 1e-9)
    return { ok: false, reason: "Fee precision is 0.1%." };
  return { ok: true };
}

/** Initial reference price in USD: $4,000 / total supply. */
export function initialPriceUsd(totalSupplyWhole: number): number {
  return INITIAL_REFERENCE_MCAP_USD / totalSupplyWhole;
}

/** Circulating supply under the LEVIUM convention: 100% of total. */
export function circulatingSupply(totalSupplyWhole: number): number {
  return totalSupplyWhole;
}

export function marketCapUsd(priceUsd: number, circulatingWhole: number): number {
  return priceUsd * circulatingWhole;
}

export function fdvUsd(priceUsd: number, totalSupplyWhole: number): number {
  return priceUsd * totalSupplyWhole;
}

export function graduationReached(marketCapUsdValue: number): boolean {
  return marketCapUsdValue >= GRADUATION_MCAP_USD;
}
