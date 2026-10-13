import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          950: "#071C16", // primary background — Deep Forest Green
          900: "#0B2920", // secondary background — Dark Emerald
          800: "#123B2F", // card background — Forest Surface
          700: "#254A3C", // borders — Subtle Forest Border
        },
        gold: {
          DEFAULT: "#F5CA65", // Vibrant Champagne Gold
          bright: "#FFD84D", // Electric Gold (sparingly)
        },
        emeraldbrand: "#087F5B", // Vibrant Emerald
        ivory: "#F8F6EA",
        sage: "#A5B9AC",
        tradegreen: "#19D69A",
        tradered: "#FF5263",
      },
      fontFamily: {
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
