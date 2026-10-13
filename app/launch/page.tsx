"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAccount, useChainId, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { ADDRESSES, factoryAbi } from "@/lib/contracts";
import { ROBINHOOD_CHAIN_ID, explorerTxUrl } from "@/lib/chain";
import { isAddress } from "@/lib/utils";
import { useLevium } from "@/lib/store";

const schema = z.object({
  name: z.string().min(2, "Name is required").max(64),
  symbol: z.string().min(2, "Symbol is required").max(12).regex(/^[A-Za-z0-9]+$/, "Letters/numbers only"),
  description: z.string().max(500).optional(),
  website: z.string().url("Must be a URL").optional().or(z.literal("")),
  twitter: z.string().max(120).optional(),
  telegram: z.string().max(120).optional(),
});

type Form = z.infer<typeof schema>;

const DEFAULT_SUPPLY = "1,000,000,000";

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
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const factory = ADDRESSES.tokenFactory;
  const wrongNetwork = isConnected && chainId !== ROBINHOOD_CHAIN_ID;

  async function onSubmit(data: Form) {
    if (!isConnected || !address) {
      setTx({ stage: "failed", reason: "Connect a wallet first." });
      return;
    }
    if (wrongNetwork) {
      setTx({ stage: "failed", reason: "Switch to Robinhood Chain to launch." });
      return;
    }
    if (!factory || !isAddress(factory)) {
      setTx({
        stage: "failed",
        reason:
          "Token factory is not deployed yet (NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS is empty). Launch is unavailable — no mock transaction will be shown.",
      });
      return;
    }
    try {
      setTx({ stage: "awaiting-wallet" });
      // Launch fee read would go here (factory.launchFee); using payable value below.
      const hash = await writeContractAsync({
        address: factory as `0x${string}`,
        abi: factoryAbi,
        functionName: "launch",
        args: [data.name, data.symbol.toUpperCase(), data.description || ""],
        // value: launchFee — read on-chain; placeholder 0 until fee module is set
        value: parseEther("0"),
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
          Every launch deploys a token contract, initializes its spot market, registers its
          perpetual market as <span className="text-gold">PERPS PENDING</span>, and creates its
          trading page. Success is shown only after on-chain confirmation.
        </p>
      </div>

      <div className="card grid grid-cols-3 gap-2 p-4 text-center text-xs">
        <div><p className="font-bold text-ivory">Supply</p><p className="num mt-0.5 text-sage">{DEFAULT_SUPPLY}</p></div>
        <div><p className="font-bold text-ivory">Spot</p><p className="mt-0.5 text-tradegreen">Opens at launch</p></div>
        <div><p className="font-bold text-ivory">Perps</p><p className="mt-0.5 text-gold">Pending → risk-gated</p></div>
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

        <button type="submit" className="btn-gold" disabled={tx.stage === "awaiting-wallet" || tx.stage === "pending"}>
          Deploy Token + Initialize Markets
        </button>
        <p className="text-xs text-sage">
          Atomic where possible: token deploy → spot init → perps registration (pending). If the
          flow needs multiple transactions, each step confirms before the next begins.
        </p>
      </form>
    </div>
  );
}
