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

describe("silver x ash theme", () => {
  it("uses the official palette tokens", () => {
    const c = tailwindConfig.theme!.extend!.colors as Record<string, unknown>;
    const forest = c.forest as Record<string, string>;
    const gold = c.gold as Record<string, string>;
    expect(forest["950"]).toBe("#0C0D10");
    expect(forest["900"]).toBe("#14161B");
    expect(forest["800"]).toBe("#1D2027");
    expect(forest["700"]).toBe("#2E323C");
    expect(gold.DEFAULT).toBe("#C7CDD8");
    expect(gold.bright).toBe("#F1F4F9");
    expect(c.ivory).toBe("#F4F6FA");
    expect(c.sage).toBe("#9AA1B0");
  });

  it("keeps no purple or lavender styling", async () => {
    const fs = await import("node:fs");
    const css = fs.readFileSync("app/globals.css", "utf8");
    expect(css.toLowerCase()).not.toContain("lavender");
    expect(css.toLowerCase()).not.toContain("purple");
  });

  it("preserves green/red trading indicators", () => {
    const c = tailwindConfig.theme!.extend!.colors as Record<string, unknown>;
    expect(c.tradegreen).toBe("#19D69A");
    expect(c.tradered).toBe("#FF5263");
  });
});
