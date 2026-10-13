import { describe, expect, it } from "vitest";
import {
  evaluatePosition,
  liquidationPrice,
  maintenanceMargin,
  notional,
  toScaled,
  unrealizedPnl,
  fromScaled,
} from "@/lib/perps-math";

describe("perps-math (isolated margin)", () => {
  it("computes notional and maintenance margin", () => {
    const n = notional(toScaled(100), toScaled(2)); // 100 tokens @ $2
    expect(fromScaled(n)).toBeCloseTo(200, 6);
    expect(fromScaled(maintenanceMargin(n, 50))).toBeCloseTo(1, 6); // 0.5%
  });

  it("computes long/short uPnl with correct sign", () => {
    const size = toScaled(10);
    const long = unrealizedPnl("long", size, toScaled(100), toScaled(110));
    const short = unrealizedPnl("short", size, toScaled(100), toScaled(110));
    expect(fromScaled(long)).toBeCloseTo(100, 6);
    expect(fromScaled(short)).toBeCloseTo(-100, 6);
  });

  it("matches the $100 / 5x / +10% example (~$50 before fees)", () => {
    // $100 collateral, 5x => $500 notional => 5 tokens @ $100; +10% => +$50
    const ev = evaluatePosition({
      side: "long",
      leverage: 5,
      sizeTokens: 5,
      entryPrice: 100,
      markPrice: 110,
      collateralUsd: 100,
    });
    expect(ev.notionalUsd).toBeCloseTo(550, 6);
    expect(ev.uPnlUsd).toBeCloseTo(50, 6);
    expect(ev.healthy).toBe(true);
    expect(ev.liqPrice).not.toBeNull();
    expect(ev.liqPrice!).toBeLessThan(100); // long liq below entry
  });

  it("flags underwater positions unhealthy", () => {
    const ev = evaluatePosition({
      side: "long",
      leverage: 10,
      sizeTokens: 10,
      entryPrice: 100,
      markPrice: 80,
      collateralUsd: 100,
    });
    expect(ev.uPnlUsd).toBeCloseTo(-200, 6);
    expect(ev.healthy).toBe(false);
  });

  it("rejects invalid leverage for liquidation price", () => {
    expect(liquidationPrice("long", toScaled(100), 0, 50)).toBeNull();
  });
});
