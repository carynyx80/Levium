import { Coins } from "lucide-react";

/**
 * $LEV staking — COMING SOON.
 * Placeholder surface only: no staking logic, no contracts, no transactions.
 * Planned utility (fee discounts, rewards) activates with the audited staking
 * module + explicitly authorized $LEV deployment.
 */
export default function StakePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="card relative overflow-hidden p-8 text-center sm:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-10 blur-3xl"
          style={{ background: "#C7CDD8" }}
        />
        <Coins size={36} className="mx-auto text-gold" />
        <p className="mt-4 inline-block rounded-full border border-gold/40 bg-gold/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-gold">
          Coming Soon
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ivory sm:text-4xl">
          Stake $LEV
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-sage">
          A place to stake $LEV tokens for fee discounts, rewards, and premium
          analytics. Staking opens with the audited staking module — nothing to
          deposit yet, and this page will never ask for funds before then.
        </p>
        <div className="mx-auto mt-6 flex max-w-sm flex-col gap-3">
          <input disabled placeholder="Amount of $LEV" className="input cursor-not-allowed opacity-50" />
          <button type="button" disabled className="btn-gold cursor-not-allowed opacity-50">
            Stake — Coming Soon
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ["Fee discounts", "Reduced trading fees for stakers"],
          ["Rewards", "Clearly defined reward campaigns"],
          ["Analytics", "Premium market insights"],
        ].map(([t, d]) => (
          <div key={t} className="card p-4 text-center">
            <p className="font-display font-bold text-ivory">{t}</p>
            <p className="mt-1 text-xs text-sage">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
