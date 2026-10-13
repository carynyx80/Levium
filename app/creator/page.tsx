"use client";

import { useAccount } from "wagmi";

export default function CreatorPage() {
  const { isConnected } = useAccount();
  if (!isConnected) {
    return (
      <div className="card mx-auto mt-10 max-w-md p-10 text-center">
        <p className="font-display text-lg font-bold text-ivory">Connect your wallet</p>
        <p className="mt-1 text-sm text-sage">Creators manage launches, fees, and claims here.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-ivory">Creator Dashboard</h1>
        <p className="mt-1 text-sm text-sage">
          Tokens created, market caps, volumes, holders, and fee sharing — computed from actual
          eligible trading activity. No guaranteed earnings are advertised.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Tokens created", "0"],
          ["Creator fees earned", "$0.00"],
          ["Claimable", "$0.00"],
          ["Claimed", "$0.00"],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sage">{k}</p>
            <p className="num mt-1 font-display text-xl font-bold text-ivory">{v}</p>
          </div>
        ))}
      </div>
      <div className="card p-5 text-sm text-sage">
        Fee claims go through audited on-chain transactions with wash-trading safeguards. The claim
        flow activates with the fee-sharing contract deployment.
      </div>
    </div>
  );
}
