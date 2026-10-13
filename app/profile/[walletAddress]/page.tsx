"use client";

import { use } from "react";
import { shortAddress } from "@/lib/utils";
import { explorerAddressUrl } from "@/lib/chain";

export default function ProfilePage({ params }: { params: Promise<{ walletAddress: string }> }) {
  const { walletAddress } = use(params);
  return (
    <div className="flex flex-col gap-5">
      <div className="card flex items-center gap-4 p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-900 font-display text-xl font-bold text-gold">
          {walletAddress.slice(2, 4).toUpperCase()}
        </div>
        <div>
          <h1 className="num font-display text-xl font-bold text-ivory">{shortAddress(walletAddress, 6)}</h1>
          <a href={explorerAddressUrl(walletAddress)} target="_blank" rel="noreferrer" className="text-xs text-sage hover:text-gold">
            View on explorer
          </a>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Volume", "—"], ["Launches", "—"], ["Realized PnL", "—"], ["Rank", "—"]].map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sage">{k}</p>
            <p className="num mt-1 font-display text-xl font-bold text-ivory">{v}</p>
          </div>
        ))}
      </div>
      <div className="card p-5 text-sm text-sage">
        Public trading history streams from the indexer. Display names/avatars are optional and
        set via signed messages (nonce-based, replay-protected) — no traditional account needed.
      </div>
    </div>
  );
}
