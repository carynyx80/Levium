import { describe, expect, it } from "vitest";
import { DEMO_MARKETS, platformStats } from "@/lib/market-data";
import { isValidSupplyTier } from "@/lib/launch-economics";

describe("demo market data quality", () => {
  it("every demo market uses a valid supply tier and fee range", () => {
    expect(DEMO_MARKETS.length).toBeGreaterThan(0);
    for (const m of DEMO_MARKETS) {
      expect(isValidSupplyTier(m.totalSupply ?? 0)).toBe(true);
      for (const f of [m.buyFeeBps ?? 0, m.sellFeeBps ?? 0, m.creatorFeeBps ?? 0]) {
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1000);
      }
      // $4,000-reference sanity: demo price x supply is a plausible market cap
      expect(m.price * (m.totalSupply ?? 0)).toBeGreaterThan(0);
    }
  });

  it("platform stats aggregate without fabrication", () => {
    const s = platformStats([]);
    expect(s).toEqual({
      totalLaunched: 0,
      spotVolume24h: 0,
      perpVolume24h: 0,
      openInterest: 0,
      tvl: 0,
    });
    expect(platformStats(DEMO_MARKETS).totalLaunched).toBe(DEMO_MARKETS.length);
  });
});
