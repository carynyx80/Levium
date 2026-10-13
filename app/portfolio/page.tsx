"use client";

import { useAccount } from "wagmi";
import { useLevium } from "@/lib/store";
import { evaluatePosition } from "@/lib/perps-math";
import { formatUsd, cn, shortAddress } from "@/lib/utils";
import { explorerAddressUrl } from "@/lib/chain";

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const positions = useLevium((s) => s.simPositions);
  const closeSim = useLevium((s) => s.closeSimPosition);
  const tx = useLevium((s) => s.tx);

  if (!isConnected) {
    return (
      <div className="card mx-auto mt-10 max-w-md p-10 text-center">
        <p className="font-display text-lg font-bold text-ivory">Connect your wallet</p>
        <p className="mt-1 text-sm text-sage">Your portfolio, positions, and history live here.</p>
      </div>
    );
  }

  const totalUPnl = positions.reduce(
    (a, p) =>
      a +
      evaluatePosition({
        side: p.side,
        leverage: p.leverage,
        sizeTokens: p.sizeTokens,
        entryPrice: p.entryPrice,
        markPrice: p.entryPrice, // re-marked live on the trade page; flat here until WS feed lands
        collateralUsd: p.collateralUsd,
      }).uPnlUsd,
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-ivory">Portfolio</h1>
        <a
          href={explorerAddressUrl(address || "")}
          target="_blank"
          rel="noreferrer"
          className="num text-sm text-sage hover:text-gold"
        >
          {shortAddress(address || "")}
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Spot value", formatUsd(0)],
          ["Perp collateral (sim)", formatUsd(positions.reduce((a, p) => a + p.collateralUsd, 0))],
          ["Unrealized PnL (sim)", `${totalUPnl >= 0 ? "+" : ""}${formatUsd(totalUPnl)}`],
          ["Open positions (sim)", String(positions.length)],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sage">{k}</p>
            <p className="num mt-1 font-display text-xl font-bold text-ivory">{v}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-display font-bold text-ivory">Perpetual positions (simulated)</h2>
        {positions.length === 0 ? (
          <p className="mt-2 text-sm text-sage">No open simulated positions.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {positions.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-forest-700 p-3 text-sm">
                <span>
                  <span className={cn("font-bold uppercase", p.side === "long" ? "text-tradegreen" : "text-tradered")}>
                    {p.side} {p.leverage}x
                  </span>{" "}
                  <span className="text-sage">{p.symbol}</span>
                </span>
                <button onClick={() => closeSim(p.id)} className="text-xs font-semibold text-gold hover:underline">
                  Close
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-display font-bold text-ivory">History</h2>
        <p className="mt-2 text-sm text-sage">
          Spot trades, perp trades, funding, liquidations, deposits, and launches stream from the
          indexer here. Every on-chain entry links to the Robinhood explorer.
        </p>
        {tx.stage !== "idle" && (
          <p className="mt-2 text-xs text-sage">Last session tx state: {tx.stage}</p>
        )}
      </div>
    </div>
  );
}
