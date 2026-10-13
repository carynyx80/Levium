import { describe, expect, it } from "vitest";
import fs from "node:fs";

const read = (p: string) => fs.readFileSync(p, "utf8");

describe("responsive + mobile hardening", () => {
  it("locks viewport scaling, safe areas, and dynamic viewport height", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain("viewportFit");
    expect(layout).toContain('"cover"');
    expect(layout).toContain("min-h-dvh");
    expect(layout).toContain("safe-area-inset-bottom");
    expect(layout).toContain("max-w-[1600px]");
  });

  it("prevents iOS zoom, horizontal overflow, and forced fixed heights", () => {
    const css = read("app/globals.css");
    expect(css).toContain("overflow-x: clip");
    expect(css).toContain("min-height: 100dvh");
    expect(css).toContain("font-size: 16px");
    expect(css).toContain("max-width: 100%");
  });

  it("keeps the navbar and drawer safe on 360px viewports", () => {
    const nav = read("components/Navbar.tsx");
    expect(nav).toContain("safe-area-inset-top");
    expect(nav).toContain("min-w-0");
    const drawer = read("components/MenuDrawer.tsx");
    expect(drawer).toContain("max-w-[85vw]");
    expect(drawer).toContain("safe-area-inset-bottom");
  });

  it("collapses secondary info and adapts the chart on mobile", () => {
    const trade = read("app/trade/[tokenAddress]/page.tsx");
    expect(trade).toContain("collapsible");
    expect(trade).toContain("lg:hidden");
    expect(trade).toContain("minmax(0,1fr)");
    const chart = read("components/PriceChart.tsx");
    expect(chart).toContain("innerWidth < 640");
  });
});
