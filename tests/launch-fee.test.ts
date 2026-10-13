import { describe, expect, it } from "vitest";
import {
  LAUNCH_FEE_USD,
  isFresh,
  usdToEth,
  usdToWei,
  weiToUsd,
} from "@/lib/eth-price";

describe("launch fee ($0.50, never hardcoded)", () => {
  it("targets exactly $0.50", () => {
    expect(LAUNCH_FEE_USD).toBe(0.5);
  });

  it("converts $0.50 to wei at any live rate", () => {
    // At $2,500/ETH, $0.50 = 0.0002 ETH = 2e14 wei.
    expect(usdToWei(0.5, 2500)).toBe(200_000_000_000_000n);
    expect(usdToEth(0.5, 2500)).toBeCloseTo(0.0002, 12);
    // Rate moves -> amount moves (no pinned rate).
    expect(usdToWei(0.5, 5000)).toBe(100_000_000_000_000n);
  });

  it("round-trips wei back to USD for display", () => {
    expect(weiToUsd(200_000_000_000_000n, 2500)).toBeCloseTo(0.5, 9);
  });

  it("refuses stale feeds for fee pricing", () => {
    const fresh = { usd: 2500, source: "coinbase" as const, fetchedAt: Date.now() };
    const stale = { usd: 2500, source: "coinbase" as const, fetchedAt: Date.now() - 600_000 };
    expect(isFresh(fresh)).toBe(true);
    expect(isFresh(stale)).toBe(false);
  });

  it("flags drift between on-chain fee and $0.50 target", () => {
    const onChainUsd = weiToUsd(200_000_000_000_000n, 2000); // rate moved to $2k
    const drift = Math.abs(onChainUsd - LAUNCH_FEE_USD) / LAUNCH_FEE_USD;
    expect(drift).toBeGreaterThan(0.1); // UI must warn above 10%
  });
});
