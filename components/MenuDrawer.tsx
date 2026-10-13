"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useAccount } from "wagmi";
import { NAV_ITEMS } from "./menu-items";
import { cn } from "@/lib/utils";

/**
 * Slide-out navigation drawer (Midnight Purple x Electric Lavender).
 * - Opens/closes with spring slide animation.
 * - Closes on: item select, Escape, overlay click, close button.
 * - Keyboard accessible: dialog semantics, initial focus on close, focus
 *   restored to the trigger on close, body scroll locked while open.
 * - /admin is never listed (restricted).
 */
export function MenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname();
  const { address, isConnected } = useAccount();
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  const hrefFor = (href: string) =>
    href === "dynamic:profile"
      ? isConnected && address
        ? `/profile/${address}`
        : "/portfolio"
      : href;

  const isActive = (href: string) => {
    if (href === "dynamic:profile") return path.startsWith("/profile/");
    if (href === "/") return path === "/";
    return path === href || path.startsWith(href + "/");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            id="levium-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            className="fixed left-0 top-0 z-50 flex h-full w-80 max-w-[85vw] flex-col border-r border-forest-700 bg-forest-900"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            <div className="flex items-center justify-between border-b border-forest-700 p-4">
              <span className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/levium-logo.svg" alt="LEVIUM" className="h-7 w-7" />
                <span className="font-display text-base font-bold tracking-wide text-ivory">
                  LEVIUM
                </span>
              </span>
              <button
                ref={closeRef}
                onClick={onClose}
                aria-label="Close navigation menu"
                className="rounded-lg border border-forest-700 p-2 text-sage transition hover:border-gold hover:text-gold"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 overflow-y-auto p-3" aria-label="Sections">
              {NAV_ITEMS.map((item) => {
                const href = hrefFor(item.href);
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
                      active
                        ? "glow-lavender bg-gold/15 text-gold"
                        : "text-sage hover:bg-forest-800 hover:text-ivory",
                    )}
                  >
                    <Icon
                      size={18}
                      className={active ? "text-gold" : "text-sage/70 group-hover:text-gold"}
                    />
                    {item.label}
                    {item.href === "dynamic:profile" && !isConnected && (
                      <span className="ml-auto text-[10px] uppercase tracking-wider text-sage/60">
                        connect wallet
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto border-t border-forest-700 p-4 text-xs text-sage">
              Launch it. Long it. Short it.
              <span className="mt-0.5 block text-sage/60">Perps in simulation mode.</span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
