"use client";

import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { ADDRESSES } from "@/lib/contracts";
import { ROBINHOOD_CHAIN_ID } from "@/lib/chain";
import { isAddress, formatUsd } from "@/lib/utils";
import { useLevium } from "@/lib/store";

/**
 * Spot buy/sell panel. Real contract calls only — no success is shown
 * before blockchain confirmation. Until the bonding-curve contract is
 * deployed, the panel explains unavailability instead of faking a trade.
 */
export function TradePanel({ tokenAddress, price }: { tokenAddress: string; price: number }) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("1");
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const setTx = useLevium((s) => s.setTx);

  const curve = ADDRESSES.bondingCurve;
  const notDeployed = !curve || !isAddress(curve);
  const wrongNetwork = isConnected && chainId !== ROBINHOOD_CHAIN_ID;

  const amt = parseFloat(amount) || 0;
  const feeBps = 100; // 1% — must match on-chain fee; read from contract when deployed
  const fee = (amt * feeBps) / 10_000;
  const estOut = side === "buy" ? (amt - fee) / (price || 1) : (amt - fee) * (price || 0);
  const minReceived = estOut * (1 - (parseFloat(slippage) || 0) / 100);

  function submit() {
    if (!isConnected) return setTx({ stage: "failed", reason: "Connect a wallet to trade." });
    if (wrongNetwork) return setTx({ stage: "failed", reason: "Switch to Robinhood Chain." });
    if (notDeployed)
      return setTx({
        stage: "failed",
        reason: "Spot market contract is not deployed yet. Order not submitted — nothing was signed.",
      });
    setTx({ stage: "awaiting-wallet" });
    // Real writeContract call lands here once the curve address is set.
  }

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-forest-900 p-1">
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`rounded-lg py-2 text-sm font-bold uppercase tracking-wide ${
              side === s
                ? s === "buy" ? "bg-tradegreen/20 text-tradegreen" : "bg-tradered/20 text-tradered"
                : "text-sage"
            }`}
          >
            {s === "buy" ? "Buy" : "Sell"}
          </button>
        ))}
      </div>
      <div>
        <label className="label">Amount (USD)</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" className="input num" />
      </div>
      <div className="flex flex-col gap-1.5 text-sm">
        <Row k="Estimated output" v={`${estOut.toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens`} />
        <Row k="Trading fee (1%)" v={formatUsd(fee)} />
        <Row k="Price impact" v="— (computed pre-trade on-chain)" />
        <div className="flex items-center justify-between">
          <span className="text-sage">Slippage %</span>
          <input value={slippage} onChange={(e) => setSlippage(e.target.value)} className="num w-20 rounded-lg border border-forest-700 bg-forest-900 px-2 py-1 text-right" />
        </div>
        <Row k="Minimum received" v={`${minReceived.toLocaleString(undefined, { maximumFractionDigits: 4 })}`} />
      </div>
      <button onClick={submit} className={side === "buy" ? "btn-gold" : "btn-gold !bg-tradered !text-ivory"}>
        {side === "buy" ? "Buy" : "Sell"}
      </button>
      {notDeployed && (
        <p className="text-xs text-sage">
          Spot contract not deployed — orders are disabled. No simulated fills are presented as real trades.
        </p>
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
