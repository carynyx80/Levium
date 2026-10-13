"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchMarkets } from "@/lib/market-data";
import type { Market } from "@/lib/store";
import { MarketTable } from "@/components/MarketTable";

const FILTERS = [
  "Trending",
  "New Launches",
  "Highest Volume",
  "Biggest Gainers",
  "Biggest Losers",
  "Most Longed",
  "Most Shorted",
  "Perps Live",
] as const;

export default function ExplorePage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [demo, setDemo] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Trending");

  useEffect(() => {
    fetchMarkets().then((r) => {
      setMarkets(r.markets);
      setDemo(r.demo);
    });
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = markets.filter(
      (m) =>
        !query ||
        m.name.toLowerCase().includes(query) ||
        m.symbol.toLowerCase().includes(query) ||
        m.tokenAddress.toLowerCase().includes(query),
    );
    switch (filter) {
      case "New Launches":
        list = [...list].sort((a, b) => b.launchedAt - a.launchedAt);
        break;
      case "Highest Volume":
        list = [...list].sort((a, b) => b.volume24h - a.volume24h);
        break;
      case "Biggest Gainers":
        list = [...list].sort((a, b) => b.change24h - a.change24h);
        break;
      case "Biggest Losers":
        list = [...list].sort((a, b) => a.change24h - b.change24h);
        break;
      case "Most Longed":
        list = [...list].sort((a, b) => b.longOI - a.longOI);
        break;
      case "Most Shorted":
        list = [...list].sort((a, b) => b.shortOI - a.shortOI);
        break;
      case "Perps Live":
        list = list.filter((m) => m.perpsStatus === "PERPS_LIVE");
        break;
      default:
        list = [...list].sort((a, b) => b.volume24h - a.volume24h);
    }
    return list;
  }, [markets, q, filter]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-ivory">Explore Markets</h1>
        <p className="mt-1 text-sm text-sage">
          Every token launched through LEVIUM is born with a spot market and a registered (pending)
          perpetual market.
        </p>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, symbol, or contract address…"
        className="input"
      />
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              filter === f
                ? "border-gold bg-gold/10 text-gold"
                : "border-forest-700 text-sage hover:text-ivory"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <MarketTable markets={filtered} demo={demo} />
    </div>
  );
}
