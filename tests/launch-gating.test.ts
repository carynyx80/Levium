import { describe, expect, it } from "vitest";
import fs from "node:fs";

const page = () => fs.readFileSync("app/launch/page.tsx", "utf8");

describe("launch gating (coming soon)", () => {
  it("keeps deployment disabled behind an explicit flag", () => {
    expect(page()).toContain("LAUNCH_ENABLED = false");
    expect(page()).toContain("if (!LAUNCH_ENABLED) return;");
  });

  it("renders an unclickable Coming Soon button, not a submit", () => {
    const src = page();
    expect(src).toContain("Coming Soon");
    expect(src).not.toContain('type="submit"');
    // frosted-glass inactive treatment
    expect(src).toContain("backdrop-blur");
    expect(src).toContain("cursor-not-allowed");
  });

  it("keeps the full creation form editable", () => {
    const src = page();
    for (const field of ["name", "symbol", "description", "supply", "creatorFee", "buyFee", "sellFee"]) {
      expect(src, field).toContain(field);
    }
    // creation logic itself is untouched (still present, gated at entry)
    expect(src).toContain("launchWithFees");
  });
});
