import { describe, expect, it } from "vitest";
import {
  FEE_STEP_BPS,
  GRADUATION_MCAP_USD,
  INITIAL_REFERENCE_MCAP_USD,
  MAX_FEE_BPS,
  SUPPLY_TIERS,
  bpsToPct,
  circulatingSupply,
  fdvUsd,
  graduationReached,
  initialPriceUsd,
  isValidSupplyTier,
  marketCapUsd,
  pctToBps,
  validateFeePct,
} from "@/lib/launch-economics";

/**
 * Parity tests for the launch-economics rules (mirrors contracts/).
 * The existing perps-math suite is untouched.
 */
describe("supply tiers", () => {
  it("accepts exactly 1M / 10M / 100M / 1B", () => {
    expect(SUPPLY_TIERS).toEqual([1_000_000, 10_000_000, 100_000_000, 1_000_000_000]);
    for (const t of SUPPLY_TIERS) expect(isValidSupplyTier(t)).toBe(true);
  });

  it("rejects anything else", () => {
    for (const bad of [0, 500_000, 5_000_000, 2_000_000_000, -1_000_000, 1.5]) {
      expect(isValidSupplyTier(bad)).toBe(false);
    }
  });
});

describe("initial pricing ($4,000 reference mcap)", () => {
  it("prices as 4000 / total supply for every tier", () => {
    expect(initialPriceUsd(1_000_000)).toBeCloseTo(0.004, 12);
    expect(initialPriceUsd(10_000_000)).toBeCloseTo(0.0004, 12);
    expect(initialPriceUsd(100_000_000)).toBeCloseTo(0.00004, 12);
    expect(initialPriceUsd(1_000_000_000)).toBeCloseTo(0.000004, 12);
  });

  it("every tier launches at exactly $4,000 mcap", () => {
    for (const t of SUPPLY_TIERS) {
      const p = initialPriceUsd(t);
      expect(marketCapUsd(p, circulatingSupply(t))).toBeCloseTo(INITIAL_REFERENCE_MCAP_USD, 6);
      expect(fdvUsd(p, t)).toBeCloseTo(INITIAL_REFERENCE_MCAP_USD, 6);
    }
  });
});

describe("circulating convention", () => {
  it("circulating == total (100%, reserve included)", () => {
    for (const t of SUPPLY_TIERS) expect(circulatingSupply(t)).toBe(t);
  });

  it("mcap == FDV at any price under the convention", () => {
    for (const price of [0.000004, 0.01, 2.5]) {
      expect(marketCapUsd(price, circulatingSupply(1_000_000_000))).toBe(
        fdvUsd(price, 1_000_000_000),
      );
    }
  });
});

describe("graduation ($50,000 mcap)", () => {
  it("triggers at or above $50k only", () => {
    expect(graduationReached(49_999.99)).toBe(false);
    expect(graduationReached(GRADUATION_MCAP_USD)).toBe(true);
    expect(graduationReached(120_000)).toBe(true);
  });
});

describe("fee configuration (0–10%, 0.1% precision)", () => {
  it("accepts the full range at 0.1% steps", () => {
    expect(validateFeePct(0).ok).toBe(true);
    expect(validateFeePct(10).ok).toBe(true);
    expect(validateFeePct(2.5).ok).toBe(true);
    expect(pctToBps(2.5)).toBe(250);
    expect(pctToBps(0.1)).toBe(FEE_STEP_BPS);
    expect(pctToBps(10)).toBe(MAX_FEE_BPS);
    expect(bpsToPct(250)).toBe(2.5);
  });

  it("rejects out-of-range and over-precise values", () => {
    expect(validateFeePct(-0.1).ok).toBe(false);
    expect(validateFeePct(10.1).ok).toBe(false);
    expect(validateFeePct(2.55).ok).toBe(false);
    expect(validateFeePct(NaN).ok).toBe(false);
  });

  it("each fee is independently configurable (no coupling)", () => {
    const creator = validateFeePct(7.5);
    const buy = validateFeePct(0);
    const sell = validateFeePct(3.3);
    expect(creator.ok && buy.ok && sell.ok).toBe(true);
    expect(pctToBps(7.5)).not.toBe(pctToBps(3.3));
  });
});
