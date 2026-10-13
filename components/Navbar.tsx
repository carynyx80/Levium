"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuDrawer } from "./MenuDrawer";

const LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/launch", label: "Launch" },
  { href: "/perps", label: "Perps" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/portfolio", label: "Portfolio" },
];

export function Navbar() {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-forest-700 bg-forest-900/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-2 px-3 sm:gap-4 sm:px-6">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          aria-controls="levium-nav-drawer"
          className="rounded-lg border border-forest-700 p-2 text-sage transition hover:border-gold hover:text-gold"
        >
          <Menu size={20} />
        </button>
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/levium-logo.svg" alt="LEVIUM" className="h-8 w-8 shrink-0" />
          <span className="hidden font-display text-lg font-bold tracking-wide text-ivory min-[400px]:inline">
            LEVIUM
          </span>
        </Link>
        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-sage transition hover:text-ivory",
                (path === l.href || path.startsWith(l.href + "/")) &&
                  "bg-forest-800 text-gold",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-forest-700 px-3 py-1 text-xs text-sage sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-tradegreen" />
            Robinhood Chain
          </span>
          <ConnectButton showBalance={false} chainStatus="icon" />
        </div>
      </div>
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <nav className="flex gap-1 overflow-x-auto border-t border-forest-700/60 px-4 py-2 lg:hidden">
        <Link href="/" className="rounded-lg px-3 py-1.5 text-sm text-sage">Trade</Link>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 text-sm text-sage">
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
