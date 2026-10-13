"use client";

import { useAccount } from "wagmi";
import { useState } from "react";

/**
 * Admin dashboard — SERVER-side wallet allowlist + on-chain role checks are
 * the real gate (see backend). This page additionally hides itself when the
 * connected wallet is not in NEXT_PUBLIC_ADMIN_PREVIEW, but hiding is NOT
 * the access control; every admin API re-verifies.
 */
const PREVIEW = (process.env.NEXT_PUBLIC_ADMIN_PREVIEW || "").toLowerCase();

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const [audit] = useState([
    { wallet: "0x…", action: "—", detail: "Audit log streams from the backend. Every admin action records wallet, action, prev/new values, timestamp, tx hash." },
  ]);

  if (!isConnected || (PREVIEW && (address || "").toLowerCase() !== PREVIEW)) {
    return (
      <div className="card mx-auto mt-10 max-w-md p-10 text-center">
        <p className="font-display text-lg font-bold text-ivory">Restricted</p>
        <p className="mt-1 text-sm text-sage">
          Admin access requires wallet authentication plus server-side role verification.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-3xl font-bold text-ivory">Admin & Risk</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Launches", "0"], ["Active markets", "0"], ["Open interest", "$0"], ["Insurance fund", "$0"]].map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sage">{k}</p>
            <p className="num mt-1 font-display text-xl font-bold text-ivory">{v}</p>
          </div>
        ))}
      </div>
      <div className="card p-5">
        <h2 className="font-display font-bold text-ivory">Perpetual market controls</h2>
        <p className="mt-1 text-sm text-sage">
          Review eligibility → configure leverage / position / OI caps → pause or set close-only →
          review oracle health. Sensitive operations require multisig + timelock.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Pause market", "Set close-only", "Resume", "Update risk params"].map((a) => (
            <button key={a} className="btn-ghost !px-4 !py-2 text-sm" disabled title="Enabled with the PerpRegistry deployment + multisig">
              {a}
            </button>
          ))}
        </div>
      </div>
      <div className="card p-5">
        <h2 className="font-display font-bold text-ivory">Audit log</h2>
        {audit.map((a, i) => (
          <p key={i} className="mt-2 text-sm text-sage">
            <span className="num text-ivory">{a.wallet}</span> · {a.action} · {a.detail}
          </p>
        ))}
      </div>
    </div>
  );
}
