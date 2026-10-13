"use client";

import Link from "next/link";
import type { Market } from "@/lib/store";
import { formatPct, formatUsd, cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

export function MarketTable({ markets, demo }: { markets: Market[]; demo: boolean }) {
  if (markets.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="font-display text-lg font-bold text-ivory">No tokens yet</p>
        <p className="mt-1 text-sm text-sage">
          Platform statistics come from real indexed data. Nothing has launched yet —{" "}
          <Link href="/launch" className="text-gold underline underline-offset-4">
            launch the first token
          </Link>
          .
        </p>
      </div>
    );
  }
  return (
    <div className="card overflow-hidden">
      {demo && (
        <p className="border-b border-forest-700 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold">
          Demo data — indexer not connected. Production shows real indexed markets only.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-forest-700 text-xs uppercase tracking-wider text-sage">
              {["Token", "Price", "1H", "24H", "Mkt Cap", "Volume 24H", "Perps Status"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {markets.map((m) => (
              <tr key={m.tokenAddress} className="border-b border-forest-700/50 last:border-0 hover:bg-forest-900/60">
                <td className="px-4 py-3">
                  <Link href={`/trade/${m.tokenAddress}`} className="font-semibold text-ivory hover:text-gold">
                    {m.name} <span className="num text-sage">{m.symbol}</span>
                  </Link>
                </td>
                <td className="num px-4 py-3">{formatUsd(m.price, 4)}</td>
                <td className={cn("num px-4 py-3", m.change1h >= 0 ? "text-tradegreen" : "text-tradered")}>
                  {formatPct(m.change1h)}
                </td>
                <td className={cn("num px-4 py-3", m.change24h >= 0 ? "text-tradegreen" : "text-tradered")}>
                  {formatPct(m.change24h)}
                </td>
                <td className="num px-4 py-3">{formatUsd(m.marketCap, 0)}</td>
                <td className="num px-4 py-3">{formatUsd(m.volume24h, 0)}</td>
                <td className="px-4 py-3"><StatusBadge status={m.perpsStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
