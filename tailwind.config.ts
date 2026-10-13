import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Silver x Ash theme. Token names are kept stable so every existing
        // className resolves to the new palette. No purple remains.
        forest: {
          950: "#0C0D10", // primary background — Ash Black
          900: "#14161B", // secondary background — Ash
          800: "#1D2027", // card background — Silver Ash
          700: "#2E323C", // borders — Ash Border
        },
        gold: {
          DEFAULT: "#C7CDD8", // primary accent — Silver
          bright: "#F1F4F9", // hover/glow — Bright Silver
        },
        emeraldbrand: "#087F5B", // status surfaces (unchanged)
        ivory: "#F4F6FA", // primary text — Silver White
        sage: "#9AA1B0", // secondary text — Ash Gray
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
