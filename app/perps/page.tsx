"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMarkets } from "@/lib/market-data";
import type { Market } from "@/lib/store";
import { StatusBadge } from "@/components/StatusBadge";
import { formatUsd } from "@/lib/utils";

export default function PerpsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  useEffect(() => {
    fetchMarkets().then((r) => setMarkets(r.markets));
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-ivory">Perpetual Futures</h1>
        <p className="mt-1 max-w-2xl text-sm text-sage">
          <span className="font-bold text-gold">Simulation only.</span> Longs and shorts with 2x–10x
          isolated margin, mark-price risk checks, funding, and liquidations — all simulated against
          live-indexed spot prices. Real-money perps remain disabled until audits + authorization.
        </p>
      </div>
      {markets.length === 0 ? (
        <div className="card p-10 text-center text-sm text-sage">
          No perpetual markets indexed yet. New launches register here as PERPS PENDING.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {markets.map((m) => (
            <Link key={m.tokenAddress} href={`/trade/${m.tokenAddress}`} className="card p-5 transition hover:border-gold/50">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-ivory">{m.symbol}</span>
                <StatusBadge status={m.perpsStatus} />
              </div>
              <p className="num mt-2 text-xl font-bold text-ivory">{formatUsd(m.price, 4)}</p>
              <p className="num mt-1 text-xs text-sage">
                Long OI {formatUsd(m.longOI, 0)} · Short OI {formatUsd(m.shortOI, 0)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
