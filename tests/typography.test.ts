import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import tailwindConfig from "@/tailwind.config";

const ROOT = process.cwd();

describe("self-hosted typefaces", () => {
  it("ships real Satoshi + JetBrains Mono font files (no external requests)", () => {
    for (const f of [
      "satoshi-400.woff2",
      "satoshi-500.woff2",
      "satoshi-700.woff",
      "jetbrains-mono-variable.woff2",
    ]) {
      const p = path.join(ROOT, "public", "fonts", f);
      expect(fs.existsSync(p), f).toBe(true);
      expect(fs.statSync(p).size, `${f} non-trivial`).toBeGreaterThan(10_000);
    }
  });

  it("declares @font-face locally and loads nothing from Google Fonts", () => {
    const css = fs.readFileSync(path.join(ROOT, "app", "globals.css"), "utf8");
    expect(css).toContain('font-family: "Satoshi"');
    expect(css).toContain('font-family: "JetBrains Mono"');
    expect(css).toContain("font-display: swap");
    expect(css).not.toContain("fonts.googleapis.com");
    expect(css).toContain("tabular-nums");
  });
});

describe("centralized typography tokens", () => {
  it("maps display/sans to Satoshi and mono to JetBrains Mono", () => {
    const fonts = tailwindConfig.theme!.extend!.fontFamily as Record<string, string[]>;
    expect(fonts.display[0]).toBe("Satoshi");
    expect(fonts.sans[0]).toBe("Satoshi");
    expect(fonts.mono[0]).toBe("JetBrains Mono");
  });
});
