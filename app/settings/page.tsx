import {
  GAS_TOKEN_SYMBOL,
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_EXPLORER_URL,
  ROBINHOOD_RPC_URL,
} from "@/lib/chain";
import { ADDRESSES, PERPS_MODE } from "@/lib/contracts";
import { LAUNCH_FEE_USD } from "@/lib/eth-price";

/**
 * Read-only settings & network reference page. No preferences are written
 * anywhere — this surface only reports current configuration.
 */
export default function SettingsPage() {
  const contracts: [string, string][] = [
    ["Token factory", ADDRESSES.tokenFactory || "Not deployed"],
    ["Bonding curve", ADDRESSES.bondingCurve || "Not deployed"],
    ["Perp registry", ADDRESSES.perpRegistry || "Not deployed"],
    ["Treasury", process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "Set at deployment"],
  ];
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-ivory">Settings</h1>
        <p className="mt-1 text-sm text-sage">Network reference and platform configuration (read-only).</p>
      </div>
      <div className="card p-5">
        <h2 className="font-display font-bold text-ivory">Network</h2>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <Row k="Chain" v={`Robinhood Chain (id ${ROBINHOOD_CHAIN_ID})`} />
          <Row k="RPC" v={ROBINHOOD_RPC_URL} mono />
          <Row k="Explorer" v={ROBINHOOD_EXPLORER_URL} mono />
          <Row k="Gas token" v={GAS_TOKEN_SYMBOL} />
        </div>
      </div>
      <div className="card p-5">
        <h2 className="font-display font-bold text-ivory">Platform</h2>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <Row k="Launch fee" v={`$${LAUNCH_FEE_USD.toFixed(2)} USD in native ETH (live rate)`} />
          <Row k="Perpetuals" v={PERPS_MODE === "simulation" ? "Simulation only" : PERPS_MODE} />
          <Row k="Demo data" v={process.env.NEXT_PUBLIC_DEMO === "1" ? "On (labeled)" : "Off"} />
        </div>
      </div>
      <div className="card p-5">
        <h2 className="font-display font-bold text-ivory">Contracts</h2>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          {contracts.map(([k, v]) => (
            <Row key={k} k={k} v={v} mono />
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="shrink-0 text-sage">{k}</span>
      <span className={`break-all text-right text-ivory ${mono ? "num text-xs" : ""}`}>{v}</span>
    </div>
  );
}
