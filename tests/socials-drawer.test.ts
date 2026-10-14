import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { TELEGRAM_URL, X_URL, isExternalHttp } from "@/lib/socials";

const read = (p: string) => fs.readFileSync(p, "utf8");

describe("social links", () => {
  it("points at Levium's official profiles over https", () => {
    expect(X_URL).toBe("https://x.com/Leviumdotworld");
    expect(TELEGRAM_URL).toBe("https://t.me/Leviumdotworld");
    expect(isExternalHttp(X_URL)).toBe(true);
    expect(isExternalHttp(TELEGRAM_URL)).toBe(true);
    expect(isExternalHttp("http://x.com/Leviumdotworld")).toBe(false);
  });

  it("opens externally in a new hardened tab from footer and drawer", () => {
    const icons = read("components/SocialIcons.tsx");
    expect(icons).toContain('target="_blank"');
    expect(icons).toContain('rel="noopener noreferrer"');
    expect(icons).toContain("aria-label");
    expect(read("app/layout.tsx")).toContain("SocialIcons");
    const drawer = read("components/MenuDrawer.tsx");
    expect(drawer).toContain("SocialIcons");
  });
});

describe("drawer structure (full panel, never a strip)", () => {
  it("is full-height, full-screen on mobile, above all content", () => {
    const drawer = read("components/MenuDrawer.tsx");
    expect(drawer).toContain("h-dvh");
    expect(drawer).toContain("w-full");
    expect(drawer).toContain("sm:w-[320px]");
    expect(drawer).toContain("z-[60]");
    // single vertical column, scrolls only when content exceeds height
    expect(drawer).toContain("flex-col");
    expect(drawer).toContain("flex-1");
    expect(drawer).toContain("min-h-0");
    expect(drawer).toContain("overflow-y-auto");
    // touch-friendly rows + visible close + dismiss paths
    expect(drawer).toContain("min-h-[48px]");
    expect(drawer).toContain('aria-label="Close navigation menu"');
    expect(drawer).toContain("Escape");
    expect(drawer).toContain("overflow");
  });
});
