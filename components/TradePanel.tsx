"use client";

import { useState } from "react";
import { useAccount, useBalance, useChainId, useReadContract, useWriteContract } from "wagmi";
import { formatEther, formatUnits, parseUnits, type Address } from "viem";
import { ADDRESSES, bondingCurveAbi } from "@/lib/contracts";
import { ROBINHOOD_CHAIN_ID, explorerTxUrl } from "@/lib/chain";
import { isAddress, formatUsd } from "@/lib/utils";
import { useLevium } from "@/lib/store";
import { erc20Abi, publicClient } from "@/lib/discovery";
import { isFresh, usdToWei, type EthPrice } from "@/lib/eth-price";

export interface TokenFees {
  buyFeeBps: number;
  sellFeeBps: number;
  creatorFeeBps: number;
}

/**
 * Spot buy/sell panel — REAL on-chain execution only.
 * - Buys: USD -> native wei at the live rate, minOut quoted on-chain via
 *   getQuoteOut, then buy{value} with slippage protection.
 * - Sells: allowance check -> approve when needed -> sell with minOut.
 * - Every state (quoting, approving, submitted, confirmed, failed) is shown
 *   with explorer links. Nothing is ever presented as filled before receipt.
 */
export function TradePanel({
  tokenAddress,
  price,
  fees,
  livePriceWei,
  ethPrice,
}: {
  tokenAddress: string;
  /** Last-known USD price (display fallback). */
  price: number;
  /** Per-token on-chain fees (bps). Absent = legacy 1% assumption, labeled. */
  fees?: TokenFees;
  /** Live on-chain price (native wei / token). Null = not loaded. */
  livePriceWei: bigint | null;
  /** Live ETH/USD reference. Null/stale = orders disabled. */
  ethPrice: EthPrice | null;
}) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("1");
  const [busy, setBusy] = useState<string | null>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [gasEst, setGasEst] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync } = useWriteContract();
  const setTx = useLevium((s) => s.setTx);

  const curve = ADDRESSES.bondingCurve;
  const curveReady = !!curve && isAddress(curve);
  const curveAddr = curve as Address;
  const token = tokenAddress as Address;
  const wrongNetwork = isConnected && chainId !== ROBINHOOD_CHAIN_ID;

  const priceFresh = ethPrice !== null && isFresh(ethPrice);
  const live = livePriceWei !== null && livePriceWei > 0n && priceFresh;
  const priceUsd = live ? (Number(livePriceWei) / 1e18) * (ethPrice as EthPrice).usd : price;

  const { data: nativeBal, refetch: refetchNative } = useBalance({ address });
  const { data: tokenBal, refetch: refetchToken } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isAddress(tokenAddress) },
  });

  const amt = parseFloat(amount) || 0;
  const buyBps = fees ? fees.buyFeeBps + fees.creatorFeeBps : 100;
  const sellBps = fees ? fees.sellFeeBps + fees.creatorFeeBps : 100;
  const activeBps = side === "buy" ? buyBps : sellBps;
  const fee = (amt * activeBps) / 10_000;
  const estOut = side === "buy" ? (amt - fee) / (priceUsd || 1) : (amt - fee) * (priceUsd || 0);
  const minReceived = estOut * (1 - (parseFloat(slippage) || 0) / 100);

  function fail(reason: string) {
    setLocalErr(reason);
    setTx({ stage: "failed", reason });
    setBusy(null);
  }

  async function submit() {
    setLocalErr(null);
    setGasEst(null);
    if (!isConnected || !address) return fail("Connect a wallet to trade.");
    if (wrongNetwork) return fail("Switch to Robinhood Chain.");
    if (!curveReady) return fail("Spot market contract is not deployed yet. Order not submitted — nothing was signed.");
    if (!live) return fail("Live market data is not available yet (price feed or chain read pending). Order not submitted.");
    if (!(amt > 0)) return fail("Enter an amount greater than zero.");
    const slip = parseFloat(slippage) || 0;
    if (slip < 0 || slip > 50) return fail("Slippage must be between 0% and 50%.");

    try {
      if (side === "buy") {
        setBusy("Quoting on-chain…");
        const valueWei = usdToWei(amt, (ethPrice as EthPrice).usd);
        if (nativeBal && valueWei > nativeBal.value) return fail("Insufficient native balance for this buy (amount + gas).");
        const quote = await publicClient.readContract({
          address: curveAddr,
          abi: bondingCurveAbi,
          functionName: "getQuoteOut",
          args: [token, valueWei],
        });
        const tokensOut = (quote as unknown as [bigint, bigint, bigint])[0];
        const minOut = (tokensOut * BigInt(Math.round((100 - slip) * 100))) / 10_000n;
        try {
          const gas = await publicClient.estimateContractGas({
            account: address,
            address: curveAddr,
            abi: bondingCurveAbi,
            functionName: "buy",
            args: [token, minOut],
            value: valueWei,
          });
          setGasEst(`≈ ${formatEther(gas * 20_000_000n)} ETH network gas (estimate only — wallet shows the actual fee)`);
        } catch {
          /* estimate is best-effort */
        }
        setBusy("Awaiting wallet confirmation…");
        setTx({ stage: "awaiting-wallet" });
        const hash = await writeContractAsync({
          address: curveAddr,
          abi: bondingCurveAbi,
          functionName: "buy",
          args: [token, minOut],
          value: valueWei,
        });
        setTx({ stage: "submitted", hash });
        setBusy("Confirming on-chain…");
        setTx({ stage: "pending", hash });
        await publicClient.waitForTransactionReceipt({ hash });
        setTx({ stage: "confirmed", hash });
        setBusy(null);
        refetchNative();
        refetchToken();
      } else {
        setBusy("Checking allowance…");
        const tokensIn = parseUnits((amt / priceUsd).toFixed(18), 18);
        if (typeof tokenBal === "bigint" && tokensIn > tokenBal)
          return fail("Insufficient token balance for this sell.");
        const allowance = (await publicClient.readContract({
          address: token,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, curveAddr],
        })) as bigint;
        if (allowance < tokensIn) {
          setBusy("Approval needed — confirm in wallet…");
          setTx({ stage: "awaiting-wallet" });
          const approveHash = await writeContractAsync({
            address: token,
            abi: erc20Abi,
            functionName: "approve",
            args: [curveAddr, tokensIn],
          });
          setTx({ stage: "pending", hash: approveHash });
          setBusy("Confirming approval…");
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
        // Conservative minOut from current on-chain price + slippage + 2% curve-move buffer.
        const px = await publicClient.readContract({
          address: curveAddr,
          abi: bondingCurveAbi,
          functionName: "priceOf",
          args: [token],
        });
        const expected = (tokensIn * (px as bigint)) / 10n ** 18n;
        const minOut = (expected * BigInt(Math.round((100 - slip - 2) * 100))) / 10_000n;
        setBusy("Awaiting wallet confirmation…");
        setTx({ stage: "awaiting-wallet" });
        const hash = await writeContractAsync({
          address: curveAddr,
          abi: bondingCurveAbi,
          functionName: "sell",
          args: [token, tokensIn, minOut],
        });
        setTx({ stage: "submitted", hash });
        setBusy("Confirming on-chain…");
        setTx({ stage: "pending", hash });
        await publicClient.waitForTransactionReceipt({ hash });
        setTx({ stage: "confirmed", hash });
        setBusy(null);
        refetchNative();
        refetchToken();
      }
    } catch (e) {
      fail((e as Error)?.message?.slice(0, 300) || "Transaction failed.");
    }
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
      <div className="num flex justify-between text-xs text-sage">
        <span>Native: {nativeBal ? `${Number(formatEther(nativeBal.value)).toFixed(5)} ETH` : "—"}</span>
        <span>Token: {typeof tokenBal === "bigint" ? Number(formatUnits(tokenBal, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"}</span>
      </div>
      <div>
        <label className="label">Amount (USD)</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" className="input num" />
      </div>
      <div className="flex flex-col gap-1.5 text-sm">
        <Row k="Estimated output" v={`${estOut.toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens`} />
        {fees ? (
          <>
            <Row k={`Protocol fee (${((side === "buy" ? fees.buyFeeBps : fees.sellFeeBps) / 100).toFixed(1)}%)`} v={formatUsd((amt * (side === "buy" ? fees.buyFeeBps : fees.sellFeeBps)) / 10_000)} />
            <Row k={`Creator fee (${(fees.creatorFeeBps / 100).toFixed(1)}%)`} v={formatUsd((amt * fees.creatorFeeBps) / 10_000)} />
          </>
        ) : (
          <Row k="Trading fee (legacy 1% assumption)" v={formatUsd(fee)} />
        )}
        <div className="flex items-center justify-between">
          <span className="text-sage">Slippage %</span>
          <input value={slippage} onChange={(e) => setSlippage(e.target.value)} className="num w-20 rounded-lg border border-forest-700 bg-forest-900 px-2 py-1 text-right" />
        </div>
        <Row k="Minimum received" v={`${minReceived.toLocaleString(undefined, { maximumFractionDigits: 4 })}`} />
        {gasEst && <p className="text-xs text-sage">{gasEst}</p>}
      </div>
      {busy && <p className="rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm text-gold">{busy}</p>}
      {localErr && <p className="rounded-xl border border-tradered/40 bg-tradered/10 p-3 text-sm text-tradered">{localErr}</p>}
      <TxState />
      <button onClick={submit} disabled={!!busy} className={side === "buy" ? "btn-gold" : "btn-gold !bg-tradered !text-ivory"}>
        {busy || (side === "buy" ? "Buy" : "Sell")}
      </button>
      {!curveReady && (
        <p className="text-xs text-sage">
          Spot contract not deployed — orders are disabled. No simulated fills are presented as real trades.
        </p>
      )}
      {curveReady && !live && (
        <p className="text-xs text-sage">Waiting on live price data — orders stay disabled until the chain read succeeds.</p>
      )}
    </div>
  );
}

function TxState() {
  const tx = useLevium((s) => s.tx);
  if (tx.stage === "submitted" || tx.stage === "pending" || tx.stage === "confirmed") {
    const hash = (tx as { hash: string }).hash;
    return (
      <p className="rounded-xl border border-tradegreen/30 bg-tradegreen/5 p-3 text-xs text-sage">
        {tx.stage === "confirmed" ? "Confirmed on-chain: " : "Transaction: "}
        <a className="num text-gold underline" target="_blank" rel="noreferrer" href={explorerTxUrl(hash)}>
          {hash.slice(0, 20)}…
        </a>
      </p>
    );
  }
  return null;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sage">{k}</span>
      <span className="num text-ivory">{v}</span>
    </div>
  );
}
