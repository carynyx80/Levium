"use client";

import { useEffect, useState } from "react";
import { getEthUsd, type EthPrice } from "./eth-price";

/** Live ETH/USD with 60s polling. Returns null until the first fetch resolves. */
export function useEthPrice(pollMs = 60_000): EthPrice | null {
  const [price, setPrice] = useState<EthPrice | null>(null);
  useEffect(() => {
    let alive = true;
    getEthUsd()
      .then((p) => alive && setPrice(p))
      .catch(() => {});
    const t = setInterval(() => {
      getEthUsd(true)
        .then((p) => alive && setPrice(p))
        .catch(() => {});
    }, pollMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [pollMs]);
  return price;
}

export function priceAgeSec(p: EthPrice | null): number | null {
  if (!p) return null;
  return Math.round((Date.now() - p.fetchedAt) / 1000);
}
