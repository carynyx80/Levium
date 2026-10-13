"use client";

import { useMemo, useState } from "react";
import { evaluatePosition } from "@/lib/perps-math";
import { useLevium, type PerpsStatus } from "@/lib/store";
import { formatUsd, cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

const LEVERAGE = [2, 3, 5, 10] as const;

/**
 * Perpetual futures panel — SIMULATION ONLY.
 * Every element is labeled simulated; real-money perps are gated behind
 * audits + explicit authorization (see PERPS_MODE / contracts).
 */
export function PerpsPanel({
  tokenAddress,
  symbol,
  markPrice,
  perpsStatus,
  maxLeverage,
}: {
  tokenAddress: string;
  symbol: string;
  markPrice: number;
  perpsStatus: PerpsStatus;
  maxLeverage: number;
}) {
  const [side, setSide] = useState<"long" | "short">("long");
  const [leverage, setLeverage] = useState<number>(5);
  const [collateral, setCollateral] = useState("100");
  const openSim = useLevium((s) => s.openSimPosition);
  const positions = useLevium((s) => s.simPositions.filter((p) => p.tokenAddress === tokenAddress));
  const closeSim = useLevium((s) => s.closeSimPosition);
  const [funding] = useState({ rateBps: 12, nextTs: Date.now() + 8 * 3_600_000 });

  const live = perpsStatus === "PERPS_LIVE";
  const coll = parseFloat(collateral) || 0;
  const sizeTokens = coll > 0 && markPrice > 0 ? (coll * leverage) / markPrice : 0;

  const preview = useMemo(
    () =>
      evaluatePosition({
        side,
        leverage,
        sizeTokens,
        entryPrice: markPrice,
        markPrice,
        collateralUsd: coll,
        mmrBps: 50,
      }),
    [side, leverage, sizeTokens, markPrice, coll],
  );

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-gold">
          SIMULATED — NOT ON-CHAIN
        </span>
        <StatusBadge status={perpsStatus} />
      </div>

      {!live && (
        <p className="rounded-xl border border-gold/30 bg-gold/5 p-3 text-xs text-sage">
          {perpsStatus === "PERPS_PENDING"
            ? "Market registered but pending risk checks (liquidity, TWAP confidence, collateral). Simulated positions allowed; real-money perps disabled."
            : "Market paused for safety (close-only in simulation). New positions are restricted."}
        </p>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-forest-900 p-1">
        {(["long", "short"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={cn(
              "rounded-lg py-2 text-sm font-bold uppercase",
              side === s ? (s === "long" ? "bg-tradegreen/20 text-tradegreen" : "bg-tradered/20 text-tradered") : "text-sage",
            )}
          >
            {s === "long" ? "Long" : "Short"}
          </button>
        ))}
      </div>

      <div>
        <label className="label">Leverage (max {maxLeverage}x for this market)</label>
        <div className="flex gap-2">
          {LEVERAGE.filter((l) => l <= maxLeverage).map((l) => (
            <button
              key={l}
              onClick={() => setLeverage(l)}
              className={cn(
                "num flex-1 rounded-lg border py-1.5 text-sm font-bold",
                leverage === l ? "border-gold bg-gold/10 text-gold" : "border-forest-700 text-sage",
              )}
            >
              {l}x
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Collateral (USD, isolated)</label>
        <input value={collateral} onChange={(e) => setCollateral(e.target.value)} inputMode="decimal" className="input num" />
      </div>

      <div className="flex flex-col gap-1.5 rounded-xl bg-forest-900 p-3 text-sm">
        <Row k="Exposure" v={formatUsd(preview.notionalUsd, 0)} />
        <Row k="Entry ≈ mark" v={formatUsd(markPrice, 4)} />
        <Row k="Est. liq. price" v={preview.liqPrice ? formatUsd(preview.liqPrice, 4) : "—"} />
        <Row k="Funding rate" v={`${(funding.rateBps / 100).toFixed(2)}% / 8h`} />
        <p className="mt-1 text-xs text-sage">
          Example: $100 at 5x = $500 exposure; a +10% move ≈ +$50 before fees/funding. Losses and
          liquidation risk scale identically.
        </p>
      </div>

      <button
        onClick={() =>
          coll > 0 &&
          openSim({ tokenAddress, symbol, side, leverage, sizeTokens, entryPrice: markPrice, collateralUsd: coll })
        }
        className="btn-gold"
        disabled={perpsStatus === "PERPS_PAUSED" || coll <= 0}
      >
        Open Simulated {side === "long" ? "Long" : "Short"} {leverage}x
      </button>

      {positions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="label !mb-0">Open simulated positions</p>
          {positions.map((p) => {
            const ev = evaluatePosition({
              side: p.side,
              leverage: p.leverage,
              sizeTokens: p.sizeTokens,
              entryPrice: p.entryPrice,
              markPrice,
              collateralUsd: p.collateralUsd,
            });
            return (
              <div key={p.id} className="rounded-xl border border-forest-700 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className={cn("font-bold uppercase", p.side === "long" ? "text-tradegreen" : "text-tradered")}>
                    {p.side} {p.leverage}x
                  </span>
                  <span className={cn("num font-bold", ev.uPnlUsd >= 0 ? "text-tradegreen" : "text-tradered")}>
                    {ev.uPnlUsd >= 0 ? "+" : ""}{formatUsd(ev.uPnlUsd)}
                  </span>
                </div>
                <div className="num mt-1 text-xs text-sage">
                  Entry {formatUsd(p.entryPrice, 4)} → Mark {formatUsd(markPrice, 4)} · Liq{" "}
                  {ev.liqPrice ? formatUsd(ev.liqPrice, 4) : "—"} · Margin{" "}
                  {ev.marginRatioPct?.toFixed(1)}%
                </div>
                <button onClick={() => closeSim(p.id)} className="mt-2 text-xs font-semibold text-gold hover:underline">
                  Close position
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sage">{k}</span>
      <span className="num text-ivory">{v}</span>
    </div>
  );
}
