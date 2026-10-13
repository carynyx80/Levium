import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "LEVIUM — Launch it. Long it. Short it.",
  description:
    "Launch tokens, trade spot markets, and access perpetual futures on Robinhood Chain. One platform for creators, traders, bulls, and bears.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0C0D10",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Critical typefaces preloaded to prevent layout shift (self-hosted). */}
        <link rel="preload" href="/fonts/satoshi-700.woff" as="font" type="font/woff" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/satoshi-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/jetbrains-mono-variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>
          <Navbar />
          <main className="mx-auto min-h-dvh w-full max-w-[1600px] px-4 pb-[max(6rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 lg:px-8">
            {children}
          </main>
          <footer className="border-t border-forest-700 py-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-sm text-sage sm:px-6">
              <span className="font-display font-bold text-ivory">
                LEVIUM <span className="text-gold">·</span>{" "}
                <span className="font-normal text-sage">Launch it. Long it. Short it.</span>
              </span>
              <span>Built on Robinhood Chain · levium.world · Perpetuals: simulation only until audited.</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
