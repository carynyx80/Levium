/**
 * Perpetual futures math — isolated margin.
 *
 * Precision rule: authoritative calculations use integer fixed-point
 * (scaled by 1e18, bigint). This module exposes both the bigint core
 * (for contracts/backend parity) and a float convenience layer that is
 * DISPLAY ONLY and must never be treated as authoritative.
 */

// ---------------------------------------------------------------- core (bigint, 1e18 fixed point)
export const SCALE = 10n ** 18n;

export function toScaled(x: number): bigint {
  return BigInt(Math.round(x * 1e18));
}

export function fromScaled(x: bigint): number {
  return Number(x) / 1e18;
}

/** Position notional = size * price (both scaled). */
export function notional(sizeScaled: bigint, priceScaled: bigint): bigint {
  return (sizeScaled * priceScaled) / SCALE;
}

/** Initial margin required = notional / leverage. */
export function initialMargin(notionalScaled: bigint, leverage: number): bigint {
  return notionalScaled / BigInt(leverage);
}

/** Maintenance margin = notional * mmrBps / 10_000. */
export function maintenanceMargin(notionalScaled: bigint, mmrBps: number): bigint {
  return (notionalScaled * BigInt(mmrBps)) / 10_000n;
}

/**
 * Unrealized PnL (scaled USD): long => (mark - entry) * size,
 * short => (entry - mark) * size.
 */
export function unrealizedPnl(
  side: "long" | "short",
  sizeScaled: bigint,
  entryScaled: bigint,
  markScaled: bigint,
): bigint {
  const diff = side === "long" ? markScaled - entryScaled : entryScaled - markScaled;
  return (diff * sizeScaled) / SCALE;
}

/**
 * Approximate liquidation price for isolated margin, ignoring funding/fees:
 * long:  entry * (1 - (1/leverage - mmr)); short: entry * (1 + (1/leverage - mmr)).
 * Returns scaled price, or null when leverage/margin invalid (position would
 * already be undercollateralized).
 */
export function liquidationPrice(
  side: "long" | "short",
  entryScaled: bigint,
  leverage: number,
  mmrBps: number,
): bigint | null {
  if (leverage <= 0) return null;
  const cushion = 1e6 / leverage - (mmrBps / 10_000) * 1e6; // ppm of entry
  if (cushion <= 0) return null;
  const entry = Number(entryScaled) / 1e18;
  const liq = side === "long" ? entry * (1 - cushion / 1e6) : entry * (1 + cushion / 1e6);
  return toScaled(liq);
}

/** Margin ratio = (collateral + uPnl) / notional (float, display only). */
export function marginRatioDisplay(
  collateral: number,
  uPnl: number,
  notionalValue: number,
): number | null {
  if (!notionalValue) return null;
  return ((collateral + uPnl) / notionalValue) * 100;
}

/** Max position size for a market cap: cap / price. */
export function maxSizeForCap(openInterestCapUsd: number, price: number): number {
  if (!price) return 0;
  return openInterestCapUsd / price;
}

// ---------------------------------------------------------------- display helpers
export interface PositionInput {
  side: "long" | "short";
  leverage: number;
  sizeTokens: number;
  entryPrice: number;
  markPrice: number;
  collateralUsd: number;
  mmrBps?: number;
}

export interface PositionView extends PositionInput {
  notionalUsd: number;
  uPnlUsd: number;
  liqPrice: number | null;
  marginRatioPct: number | null;
  healthy: boolean;
}

export function evaluatePosition(p: PositionInput): PositionView {
  const size = toScaled(p.sizeTokens);
  const entry = toScaled(p.entryPrice);
  const mark = toScaled(p.markPrice);
  const n = fromScaled(notional(size, mark));
  const uPnl = fromScaled(unrealizedPnl(p.side, size, entry, mark));
  const liq = liquidationPrice(p.side, entry, p.leverage, p.mmrBps ?? 50);
  const mr = marginRatioDisplay(p.collateralUsd, uPnl, n);
  const mmrPct = (p.mmrBps ?? 50) / 100;
  return {
    ...p,
    notionalUsd: n,
    uPnlUsd: uPnl,
    liqPrice: liq === null ? null : fromScaled(liq),
    marginRatioPct: mr,
    healthy: mr === null ? false : mr > mmrPct,
  };
}
