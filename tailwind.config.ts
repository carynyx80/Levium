import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Midnight Purple x Electric Lavender theme. Token names are kept
        // stable so every existing className resolves to the new palette.
        forest: {
          950: "#100A1E", // primary background — Midnight Purple
          900: "#1A102D", // secondary background — Deep Purple
          800: "#241638", // card background — Rich Purple
          700: "#3C235D", // borders — Muted Purple
        },
        gold: {
          DEFAULT: "#A66BFF", // primary accent — Electric Lavender
          bright: "#BD91FF", // hover/glow — Bright Lavender
        },
        emeraldbrand: "#087F5B", // status surfaces (unchanged)
        ivory: "#F4EFFF", // primary text — Soft White
        sage: "#B5A5CC", // secondary text — Muted Lavender
        tradegreen: "#19D69A", // trading indicators (preserved)
        tradered: "#FF5263", // trading indicators (preserved)
      },
      fontFamily: {
        display: ["Satoshi", "system-ui", "-apple-system", "sans-serif"],
        sans: ["Satoshi", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
