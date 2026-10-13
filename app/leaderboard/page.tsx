"use client";

import { useState } from "react";
import { shortAddress } from "@/lib/utils";

const CATS = ["Realized PnL", "ROI", "Volume", "Top Long", "Top Short", "Top Creators"] as const;
const RANGES = ["24H", "7D", "30D", "All"] as const;

export default function LeaderboardPage() {
  const [cat, setCat] = useState<(typeof CATS)[number]>("Realized PnL");
  const [range, setRange] = useState<(typeof RANGES)[number]>("7D");
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-ivory">Leaderboard</h1>
        <p className="mt-1 text-sm text-sage">
          Rankings from correctly calculated, eligible on-chain activity. Manipulated activity is
          excluded where detected. No private data is exposed.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${cat === c ? "border-gold bg-gold/10 text-gold" : "border-forest-700 text-sage"}`}>
            {c}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button key={r} onClick={() => setRange(r)} className={`rounded-lg px-3 py-1 text-xs font-bold ${range === r ? "bg-forest-800 text-gold" : "text-sage"}`}>
            {r}
          </button>
        ))}
      </div>
      <div className="card p-10 text-center text-sm text-sage">
        No ranked traders in this window yet ({cat} · {range}). Rankings populate from indexed
        trades once activity begins. Example row shape: rank ·{" "}
        <span className="num">{shortAddress("0x0000000000000000000000000000000000000000")}</span> ·
        PnL · volume.
      </div>
    </div>
  );
}
