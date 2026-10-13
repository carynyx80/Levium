import { describe, expect, it } from "vitest";
import { KNOWN_ROUTES, NAV_ITEMS } from "@/components/menu-items";
import tailwindConfig from "@/tailwind.config";

describe("drawer navigation config", () => {
  it("covers every requested section exactly once", () => {
    const labels = NAV_ITEMS.map((i) => i.label);
    for (const required of [
      "Home",
      "Explore Tokens",
      "Launch Token",
      "Spot Trading",
      "Perpetual Futures",
      "Portfolio",
      "Leaderboard",
      "Creator Dashboard",
      "My Profile",
      "Settings",
    ]) {
      expect(labels.filter((l) => l === required)).toHaveLength(1);
    }
  });

  it("links every item to a known route (profile resolves at runtime)", () => {
    for (const item of NAV_ITEMS) {
      expect(item.icon, `${item.label} icon`).toBeDefined();
      if (item.href === "dynamic:profile") continue;
      expect(KNOWN_ROUTES, item.label).toContain(item.href);
    }
  });

  it("never advertises restricted admin pages", () => {
    const all = [...NAV_ITEMS.map((i) => i.href), ...KNOWN_ROUTES];
    expect(all.some((h) => h.includes("admin"))).toBe(false);
  });
});

describe("midnight purple x electric lavender theme", () => {
  it("uses the official palette tokens", () => {
    const c = tailwindConfig.theme!.extend!.colors as Record<string, unknown>;
    const forest = c.forest as Record<string, string>;
    const gold = c.gold as Record<string, string>;
    expect(forest["950"]).toBe("#100A1E");
    expect(forest["900"]).toBe("#1A102D");
    expect(forest["800"]).toBe("#241638");
    expect(forest["700"]).toBe("#3C235D");
    expect(gold.DEFAULT).toBe("#A66BFF");
    expect(gold.bright).toBe("#BD91FF");
    expect(c.ivory).toBe("#F4EFFF");
    expect(c.sage).toBe("#B5A5CC");
  });

  it("preserves green/red trading indicators", () => {
    const c = tailwindConfig.theme!.extend!.colors as Record<string, unknown>;
    expect(c.tradegreen).toBe("#19D69A");
    expect(c.tradered).toBe("#FF5263");
  });
});
