"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMarkets } from "@/lib/market-data";
import type { Market } from "@/lib/store";
import { PriceChart } from "@/components/PriceChart";
import { TradePanel } from "@/components/TradePanel";
import { PerpsPanel } from "@/components/PerpsPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPct, formatUsd, cn, shortAddress } from "@/lib/utils";
import { explorerAddressUrl } from "@/lib/chain";
import { readSpotPrice } from "@/lib/discovery";
import { useEthPrice } from "@/lib/useEthPrice";

export default function TradePage({ params }: { params: { tokenAddress: string } }) {
  const { tokenAddress } = params;
  const [market, setMarket] = useState<Market | null>(null);
  const [tab, setTab] = useState<"spot" | "perps">("spot");
  const [loading, setLoading] = useState(true);
  const [livePriceWei, setLivePriceWei] = useState<bigint | null>(null);
  const ethPrice = useEthPrice();

  useEffect(() => {
    fetchMarkets().then((r) => {
      setMarket(r.markets.find((m) => m.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()) || null);
      setLoading(false);
    });
  }, [tokenAddress]);

  // Live on-chain price poll (authoritative when available; indexed price otherwise).
  useEffect(() => {
    let alive = true;
    const poll = () =>
      readSpotPrice(tokenAddress)
        .then((p) => alive && p !== null && setLivePriceWei(p))
        .catch(() => {});
    poll();
    const t = setInterval(poll, 12_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [tokenAddress]);

  const livePriceUsd =
    livePriceWei !== null && ethPrice !== null
      ? (Number(livePriceWei) / 1e18) * ethPrice.usd
      : null;

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[280px_1fr_340px]">
        <div className="skeleton h-64" /><div className="skeleton h-64" /><div className="skeleton h-64" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="card p-10 text-center">
        <p className="font-display text-lg font-bold text-ivory">Token not indexed</p>
        <p className="num mt-1 text-sm text-sage">{tokenAddress}</p>
        <Link href="/explore" className="mt-4 inline-block text-sm font-semibold text-gold hover:underline">
          Back to Explore
        </Link>
      </div>
    );
  }

  // Per-token on-chain fees when the indexer reports them.
  const fees =
    market.buyFeeBps !== undefined
      ? {
          buyFeeBps: market.buyFeeBps,
          sellFeeBps: market.sellFeeBps ?? 0,
          creatorFeeBps: market.creatorFeeBps ?? 0,
        }
      : undefined;

  // Display price: live on-chain when available, indexed otherwise (labeled).
  const displayPrice = livePriceUsd ?? market.price;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-ivory">
          {market.name} <span className="text-sage">{market.symbol}</span>
        </h1>
        <StatusBadge status="SPOT_LIVE" />
        <StatusBadge status={market.perpsStatus} />
        <a
          href={explorerAddressUrl(tokenAddress)}
          target="_blank"
          rel="noreferrer"
          className="num text-xs text-sage hover:text-gold"
        >
          {shortAddress(tokenAddress)}
        </a>
        <span className="rounded-full border border-forest-700 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-sage">
          CA · Coming Soon
        </span>
        <span className="num ml-auto font-display text-2xl font-bold text-ivory">
          {formatUsd(displayPrice, 4)}
          <span className={cn("ml-2 text-sm", market.change24h >= 0 ? "text-tradegreen" : "text-tradered")}>
            {formatPct(market.change24h)}
          </span>
          <span className="ml-2 align-middle text-[10px] font-bold text-sage">
            {livePriceUsd !== null ? "● LIVE ON-CHAIN" : "INDEXED"}
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[260px_minmax(0,1fr)_340px] xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        {/* Left: token info (desktop panel / mobile collapsible) */}
        <aside className="card hidden h-fit p-5 text-sm lg:block">
          <p className="label">Market stats</p>
          <MarketStats market={market} displayPrice={displayPrice} />
        </aside>
        <details className="collapsible card p-4 text-sm lg:hidden">
          <summary className="flex items-center justify-between font-semibold text-ivory">
            Market stats
            <span className="num text-xs text-sage">{formatUsd(displayPrice, 4)}</span>
          </summary>
          <div className="mt-3">
            <MarketStats market={market} displayPrice={displayPrice} />
          </div>
        </details>

        {/* Center: chart */}
        <div className="min-w-0">
          <PriceChart symbol={market.symbol} basePrice={displayPrice} />
          {/* Mobile tabs */}
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-forest-900 p-1 lg:hidden">
            {(["spot", "perps"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg py-2 text-sm font-bold uppercase ${tab === t ? "bg-gold/15 text-gold" : "text-sage"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mt-4 lg:hidden">
            {tab === "spot" ? (
              <TradePanel tokenAddress={tokenAddress} price={displayPrice} fees={fees} livePriceWei={livePriceWei} ethPrice={ethPrice} />
            ) : (
              <PerpsPanel
                tokenAddress={tokenAddress}
                symbol={market.symbol}
                markPrice={displayPrice}
                perpsStatus={market.perpsStatus}
                maxLeverage={market.perpsStatus === "PERPS_LIVE" ? 10 : 5}
              />
            )}
          </div>
        </div>

        {/* Right: desktop spot/perps tabs */}
        <aside className="hidden lg:block">
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-forest-900 p-1">
            {(["spot", "perps"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg py-2 text-sm font-bold uppercase ${tab === t ? "bg-gold/15 text-gold" : "text-sage"}`}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === "spot" ? (
            <TradePanel tokenAddress={tokenAddress} price={displayPrice} fees={fees} livePriceWei={livePriceWei} ethPrice={ethPrice} />
          ) : (
            <PerpsPanel
              tokenAddress={tokenAddress}
              symbol={market.symbol}
              markPrice={displayPrice}
              perpsStatus={market.perpsStatus}
              maxLeverage={market.perpsStatus === "PERPS_LIVE" ? 10 : 5}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function MarketStats({ market, displayPrice }: { market: Market; displayPrice: number }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Stat k="Total supply" v={market.totalSupply ? `${market.totalSupply.toLocaleString()}` : "—"} />
        <Stat k="Circulating supply" v={market.totalSupply ? `${market.totalSupply.toLocaleString()}` : "—"} />
        <Stat k="Market cap" v={market.totalSupply ? formatUsd(displayPrice * market.totalSupply, 0) : formatUsd(market.marketCap, 0)} />
        <Stat k="FDV" v={market.totalSupply ? formatUsd(displayPrice * market.totalSupply, 0) : "—"} />
        <Stat k="Liquidity" v={formatUsd(market.liquidity, 0)} />
        <Stat k="Volume 24H" v={formatUsd(market.volume24h, 0)} />
        <Stat k="Long OI" v={formatUsd(market.longOI, 0)} />
        <Stat k="Short OI" v={formatUsd(market.shortOI, 0)} />
        <Stat k="Buy / Sell / Creator fee" v={
          market.buyFeeBps !== undefined
            ? `${(market.buyFeeBps / 100).toFixed(1)}% / ${((market.sellFeeBps ?? 0) / 100).toFixed(1)}% / ${((market.creatorFeeBps ?? 0) / 100).toFixed(1)}%`
            : "—"
        } />
        <Stat k="Graduated" v={market.graduated ? "Yes" : "Bonding curve"} />
      </div>
      <p className="mt-4 border-t border-forest-700 pt-3 text-xs text-sage">
        Circulating = 100% of total (bonding-curve reserve included, unlocked). Market cap =
        price × circulating; FDV = price × total. Graduation at $50,000 mcap.
      </p>
      <p className="mt-4 border-t border-forest-700 pt-3 text-xs text-sage">
        Perps status: <span className="font-bold text-ivory">{market.perpsStatus.replace("_", " ")}</span>.
        Registration ≠ tradability — pending markets cannot accept real-money leverage.
      </p>
    </>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sage">{k}</span>
      <span className="num text-ivory">{v}</span>
    </div>
  );
}
