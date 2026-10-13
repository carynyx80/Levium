"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Rocket, LineChart, Zap } from "lucide-react";
import { fetchMarkets, platformStats } from "@/lib/market-data";
import type { Market } from "@/lib/store";
import { MarketTable } from "@/components/MarketTable";
import { formatUsd } from "@/lib/utils";

export default function HomePage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets().then((r) => {
      setMarkets(r.markets);
      setDemo(r.demo);
      setLoading(false);
    });
  }, []);

  const stats = platformStats(markets);

  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="card relative overflow-hidden p-8 sm:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: "#A66BFF" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full opacity-10 blur-3xl"
          style={{ background: "#BD91FF" }}
        />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">
            Launch it. Long it. Short it.
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-ivory sm:text-6xl">
            Every Token Deserves Leverage.
          </h1>
          <p className="mt-4 max-w-xl text-sage">
            Launch tokens, trade spot markets, and access perpetual futures on Robinhood Chain.
            One platform built for creators, traders, bulls, and bears.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/launch" className="btn-gold inline-flex items-center gap-2">
              <Rocket size={18} /> Launch a Token
            </Link>
            <Link href="/explore" className="btn-ghost inline-flex items-center gap-2">
              Explore Markets <ArrowRight size={18} />
            </Link>
          </div>
          {/* launch -> spot -> perps relationship visual */}
          <div className="mt-8 flex flex-wrap items-center gap-2 text-sm">
            {["Launch token", "Spot market opens", "Perps registered (pending)", "Perps activate on risk checks"].map(
              (s, i, a) => (
                <span key={s} className="flex items-center gap-2">
                  <span className="rounded-full border border-forest-700 bg-forest-900 px-3 py-1 text-sage">
                    <span className="mr-1.5 text-gold">{i + 1}</span>
                    {s}
                  </span>
                  {i < a.length - 1 && <ArrowRight size={14} className="text-sage/50" />}
                </span>
              ),
            )}
          </div>
        </motion.div>
      </section>

      {/* Market overview */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-ivory">Market Overview</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {[
              ["Tokens Launched", markets.length === 0 ? "0" : String(stats.totalLaunched)],
              ["Spot Vol 24H", formatUsd(stats.spotVolume24h, 0)],
              ["Perp Vol 24H", formatUsd(stats.perpVolume24h, 0)],
              ["Open Interest", formatUsd(stats.openInterest, 0)],
              ["TVL", formatUsd(stats.tvl, 0)],
              ["Perps Live", String(markets.filter((m) => m.perpsStatus === "PERPS_LIVE").length)],
            ].map(([label, value]) => (
              <div key={label} className="card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-sage">{label}</p>
                <p className="num mt-1 font-display text-xl font-bold text-ivory">{value}</p>
              </div>
            ))}
          </div>
        )}
        {markets.length === 0 && !loading && (
          <p className="mt-2 text-xs text-sage">
            Zero state — figures come from real indexed data. No activity indexed yet.
          </p>
        )}
      </section>

      {/* Trending */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ivory">
            <LineChart size={18} className="text-gold" /> Trending Tokens
          </h2>
          <Link href="/explore" className="text-sm font-semibold text-gold hover:underline">
            View all
          </Link>
        </div>
        {loading ? <div className="skeleton h-48" /> : <MarketTable markets={markets} demo={demo} />}
      </section>

      {/* Perps notice */}
      <section className="card flex items-start gap-3 border-gold/30 p-5">
        <Zap size={18} className="mt-0.5 shrink-0 text-gold" />
        <p className="text-sm text-sage">
          <span className="font-semibold text-ivory">Perpetuals run in simulation mode. </span>
          New markets start as <span className="text-gold">PERPS PENDING</span> and only become{" "}
          <span className="text-tradegreen">PERPS LIVE</span> after liquidity, pricing, collateral,
          and risk checks pass. Real-money perps stay disabled until independent audits and explicit
          authorization are complete.
        </p>
      </section>
    </div>
  );
}
