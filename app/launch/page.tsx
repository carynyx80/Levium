"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAccount, useChainId, useReadContract, useWriteContract } from "wagmi";
import { formatEther } from "viem";
import { ADDRESSES, factoryAbi } from "@/lib/contracts";
import { ROBINHOOD_CHAIN_ID, explorerTxUrl } from "@/lib/chain";
import { isAddress } from "@/lib/utils";
import { useLevium } from "@/lib/store";
import {
  SUPPLY_TIERS,
  initialPriceUsd,
  pctToBps,
  validateFeePct,
} from "@/lib/launch-economics";
import { LAUNCH_FEE_USD, isFresh, weiToUsd } from "@/lib/eth-price";
import { useEthPrice, priceAgeSec } from "@/lib/useEthPrice";

const TREASURY = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "";

const step01 = (v: number) => validateFeePct(v).ok;

const schema = z.object({
  name: z.string().min(2, "Name is required").max(64),
  symbol: z.string().min(2, "Symbol is required").max(12).regex(/^[A-Za-z0-9]+$/, "Letters/numbers only"),
  description: z.string().max(500).optional(),
  website: z.string().url("Must be a URL").optional().or(z.literal("")),
  twitter: z.string().max(120).optional(),
  telegram: z.string().max(120).optional(),
  supply: z.enum(["1000000", "10000000", "100000000", "1000000000"]),
  creatorFee: z.number().min(0).max(10).refine(step01, "0.1% precision, 0–10%"),
  buyFee: z.number().min(0).max(10).refine(step01, "0.1% precision, 0–10%"),
  sellFee: z.number().min(0).max(10).refine(step01, "0.1% precision, 0–10%"),
});

type Form = z.infer<typeof schema>;

/**
 * Launch gate: form stays fully editable, but deployment is disabled until
 * the official launch. Every submission path (click, Enter key, programmatic)
 * funnels through onSubmit, which returns before any wallet interaction.
 */
const LAUNCH_ENABLED = false;

export default function LaunchPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync } = useWriteContract();
  const tx = useLevium((s) => s.tx);
  const setTx = useLevium((s) => s.setTx);
  const [doneToken, setDoneToken] = useState("");
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { supply: "1000000000", creatorFee: 0, buyFee: 0, sellFee: 0 },
  });

  const supply = useWatch({ control, name: "supply" });
  const creatorFee = useWatch({ control, name: "creatorFee" });
  const buyFee = useWatch({ control, name: "buyFee" });
  const sellFee = useWatch({ control, name: "sellFee" });

  const factory = ADDRESSES.tokenFactory;
  const factoryReady = !!factory && isAddress(factory);
  const wrongNetwork = isConnected && chainId !== ROBINHOOD_CHAIN_ID;

  const { data: launchFee } = useReadContract({
    address: (factory || "0x0000000000000000000000000000000000000000") as `0x${string}`,
    abi: factoryAbi,
    functionName: "launchFee",
    query: { enabled: factoryReady },
  });

  const supplyWhole = Number(supply);
  const initPrice = initialPriceUsd(supplyWhole);
  const ethPrice = useEthPrice();

  // $0.50 platform fee in ETH at the live rate (never hardcoded).
  const feeEth = ethPrice && isFresh(ethPrice) ? LAUNCH_FEE_USD / ethPrice.usd : null;
  const onChainFee = launchFee as bigint | undefined;
  const onChainFeeUsd = onChainFee !== undefined && ethPrice ? weiToUsd(onChainFee, ethPrice.usd) : null;
  const drift =
    onChainFeeUsd !== null ? Math.abs(onChainFeeUsd - LAUNCH_FEE_USD) / LAUNCH_FEE_USD : null;

  async function onSubmit(data: Form) {
    if (!LAUNCH_ENABLED) return; // gated: no wallet, no deployment, no transaction
    if (!isConnected || !address) {
      setTx({ stage: "failed", reason: "Connect a wallet first." });
      return;
    }
    if (wrongNetwork) {
      setTx({ stage: "failed", reason: "Switch to Robinhood Chain to launch." });
      return;
    }
    if (!factoryReady) {
      setTx({
        stage: "failed",
        reason:
          "Token factory is not deployed yet (NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS is empty). Launch is unavailable — no mock transaction will be shown.",
      });
      return;
    }
    try {
      setTx({ stage: "awaiting-wallet" });
      const hash = await writeContractAsync({
        address: factory as `0x${string}`,
        abi: factoryAbi,
        functionName: "launchWithFees",
        args: [
          data.name,
          data.symbol.toUpperCase(),
          data.description || "",
          BigInt(data.supply),
          BigInt(pctToBps(data.buyFee)),
          BigInt(pctToBps(data.sellFee)),
          BigInt(pctToBps(data.creatorFee)),
        ],
        value: (launchFee as bigint | undefined) ?? 0n,
      });
      setTx({ stage: "submitted", hash });
      setTx({ stage: "pending", hash });
      // Confirmation is picked up by the indexer; the token page is created
      // only after the on-chain receipt is confirmed (never before).
      setDoneToken(hash);
      setTx({ stage: "confirmed", hash });
    } catch (e) {
      setTx({ stage: "failed", reason: (e as Error)?.message?.slice(0, 300) || "Transaction rejected." });
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ivory">Launch a Token</h1>
        <p className="mt-1 text-sm text-sage">
          Every launch deploys a fixed-supply token, initializes its spot market, registers its
          perpetual market as <span className="text-gold">PERPS PENDING</span>, and creates its
          trading page. Success is shown only after on-chain confirmation.
        </p>
      </div>

      <div className="card grid grid-cols-3 gap-2 p-4 text-center text-xs">
        <div><p className="font-bold text-ivory">Reference mcap</p><p className="num mt-0.5 text-sage">$4,000 at launch</p></div>
        <div><p className="font-bold text-ivory">Circulating</p><p className="mt-0.5 text-tradegreen">100% (reserve incl.)</p></div>
        <div><p className="font-bold text-ivory">Graduation</p><p className="mt-0.5 text-gold">$50,000 mcap</p></div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card flex flex-col gap-4 p-6">
        <div>
          <label className="label">Token name *</label>
          <input {...register("name")} placeholder="Moon Protocol" className="input" />
          {errors.name && <p className="mt-1 text-xs text-tradered">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Symbol *</label>
          <input {...register("symbol")} placeholder="MOON" className="input uppercase" />
          {errors.symbol && <p className="mt-1 text-xs text-tradered">{errors.symbol.message}</p>}
        </div>
        <div>
          <label className="label">Description</label>
          <textarea {...register("description")} rows={3} placeholder="What is this token?" className="input" />
        </div>

        <div>
          <label className="label">Total supply (fixed, no minting after creation) *</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SUPPLY_TIERS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setValue("supply", String(t) as Form["supply"], { shouldValidate: true })}
                className={`num rounded-xl border py-2.5 text-sm font-bold transition ${
                  supplyWhole === t ? "border-gold bg-gold/10 text-gold" : "border-forest-700 text-sage hover:text-ivory"
                }`}
              >
                {t >= 1_000_000_000 ? "1B" : t >= 1_000_000 ? `${t / 1_000_000}M` : String(t)}
              </button>
            ))}
          </div>
          <p className="num mt-2 text-xs text-sage">
            Initial price ≈ ${initPrice.toPrecision(3)} / token ($4,000 ÷ {supplyWhole.toLocaleString()}).
            100% circulating from launch, including the bonding-curve reserve. Protocol default:
            80% seeded to curve, 20% to creator.
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-forest-700 bg-forest-900 p-4">
          <p className="text-sm font-bold text-ivory">Fee configuration <span className="font-normal text-sage">(each 0–10%, 0.1% steps, default 0%)</span></p>
          <FeeField label="Creator fee" hint="Share of every trade paid to your wallet" value={creatorFee ?? 0}
            onChange={(v) => setValue("creatorFee", v, { shouldValidate: true })} error={errors.creatorFee?.message} />
          <FeeField label="Buy fee" hint="Charged on buys, to protocol treasury" value={buyFee ?? 0}
            onChange={(v) => setValue("buyFee", v, { shouldValidate: true })} error={errors.buyFee?.message} />
          <FeeField label="Sell fee" hint="Charged on sells, to protocol treasury" value={sellFee ?? 0}
            onChange={(v) => setValue("sellFee", v, { shouldValidate: true })} error={errors.sellFee?.message} />
          <p className="num text-xs text-sage">
            Preview on a $100 buy: ${(100 * (buyFee ?? 0)) / 100} protocol + $
            {(100 * (creatorFee ?? 0)) / 100} to you. On a $100 sell: $
            {(100 * (sellFee ?? 0)) / 100} protocol + ${(100 * (creatorFee ?? 0)) / 100} to you.
            All fees display again in-wallet before you confirm.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Website</label>
            <input {...register("website")} placeholder="https://" className="input" />
            {errors.website && <p className="mt-1 text-xs text-tradered">{errors.website.message}</p>}
          </div>
          <div>
            <label className="label">X / Twitter</label>
            <input {...register("twitter")} placeholder="@handle" className="input" />
          </div>
          <div>
            <label className="label">Telegram</label>
            <input {...register("telegram")} placeholder="t.me/…" className="input" />
          </div>
          <div>
            <label className="label">Creator wallet</label>
            <input value={address || "Not connected"} disabled className="input num opacity-70" />
          </div>
        </div>

        <div className="rounded-xl border border-gold/30 bg-forest-900 p-4 text-sm">
          <p className="font-bold text-ivory">Platform launch fee — ${LAUNCH_FEE_USD.toFixed(2)} USD (not gas)</p>
          {feeEth !== null && ethPrice ? (
            <p className="num mt-1 text-sage">
              ≈ {feeEth.toPrecision(4)} ETH at ${ethPrice.usd.toLocaleString()} / ETH
              <span className="text-sage/70"> · {ethPrice.source} · {priceAgeSec(ethPrice)}s ago</span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-gold">Fetching live ETH/USD… the exact amount appears before you confirm.</p>
          )}
          {onChainFee !== undefined && (
            <p className="num mt-1 text-xs text-sage">
              Contract requires: {formatEther(onChainFee)} ETH
              {onChainFeeUsd !== null && ` (≈ $${onChainFeeUsd.toFixed(2)})`}
              {drift !== null && drift > 0.1 && (
                <span className="text-tradered"> — rate drifted {(drift * 100).toFixed(1)}% from $0.50; the contract value governs.</span>
              )}
            </p>
          )}
          <p className="mt-1 text-xs text-sage">
            Treasury: {TREASURY ? <span className="num">{TREASURY}</span> : "set at contract deployment"}.
            Network gas is separate and shown by your wallet at confirmation — never mixed into this fee.
          </p>
        </div>

        <div className="num rounded-xl bg-forest-900 p-3 text-xs text-sage">
          Supply {supplyWhole.toLocaleString()} · Fees {buyFee}% buy / {sellFee}% sell / {creatorFee}% creator
        </div>

        {wrongNetwork && (
          <p className="rounded-xl border border-tradered/40 bg-tradered/10 p-3 text-sm text-tradered">
            Wrong network — switch your wallet to Robinhood Chain (id {ROBINHOOD_CHAIN_ID}).
          </p>
        )}
        {tx.stage === "failed" && (
          <p className="rounded-xl border border-tradered/40 bg-tradered/10 p-3 text-sm text-tradered">
            {(tx as { reason: string }).reason}
          </p>
        )}
        {tx.stage === "awaiting-wallet" && (
          <p className="rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm text-gold">
            Awaiting wallet confirmation…
          </p>
        )}
        {(tx.stage === "submitted" || tx.stage === "pending") && (
          <p className="rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm text-gold">
            Transaction {tx.stage}:{" "}
            <a className="underline" target="_blank" rel="noreferrer" href={explorerTxUrl((tx as { hash: string }).hash)}>
              view on explorer
            </a>
          </p>
        )}
        {tx.stage === "confirmed" && (
          <p className="rounded-xl border border-tradegreen/40 bg-tradegreen/10 p-3 text-sm text-tradegreen">
            Launch confirmed on-chain:{" "}
            <a className="underline" target="_blank" rel="noreferrer" href={explorerTxUrl(doneToken)}>
              {doneToken.slice(0, 18)}…
            </a>
          </p>
        )}

        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Token launches open soon"
          className="relative cursor-not-allowed overflow-hidden rounded-xl border border-forest-700 bg-forest-800 px-5 py-3 font-semibold text-sage"
        >
          <span className="select-none blur-[1.5px]">Deploy Token + Initialize Markets</span>
          <span className="absolute inset-0 flex items-center justify-center bg-forest-950/40 backdrop-blur-[2px]">
            <span className="rounded-full border border-gold/40 bg-forest-900/80 px-4 py-1 text-sm font-bold tracking-wide text-ivory">
              Coming Soon
            </span>
          </span>
        </button>
        <p className="text-center text-xs text-sage">
          Token launches open soon — configure everything now; deployment activates at launch.
        </p>
        <p className="text-xs text-sage">
          Atomic where possible: token deploy → supply split (curve reserve + creator) → spot init
          → perps registration (pending). If the flow needs multiple transactions, each step confirms
          before the next begins.
        </p>
      </form>
    </div>
  );
}

function FeeField({
  label,
  hint,
  value,
  onChange,
  error,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  error?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-sage">
          {label} <span className="font-normal normal-case">· {hint}</span>
        </label>
        <span className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={10}
            step={0.1}
            value={Number.isFinite(value) ? value : 0}
            onChange={(e) => onChange(Number(e.target.value))}
            className="num w-20 rounded-lg border border-forest-700 bg-forest-950 px-2 py-1 text-right text-sm text-ivory"
          />
          <span className="text-xs text-sage">%</span>
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={0.1}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#C7CDD8]"
        aria-label={label}
      />
      {error && <p className="mt-1 text-xs text-tradered">{error}</p>}
    </div>
  );
}
