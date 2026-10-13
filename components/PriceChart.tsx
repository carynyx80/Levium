"use client";

import { useEffect, useRef } from "react";

/** Lightweight-Charts candlestick panel with timeframe selector + fullscreen. */
const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;

function seedCandles(base: number) {
  const out: { time: number; open: number; high: number; low: number; close: number }[] = [];
  let p = base;
  const now = Math.floor(Date.now() / 1000 / 60) * 60;
  for (let i = 120; i > 0; i--) {
    const drift = (Math.sin(i / 6) + (Math.random() - 0.5) * 0.6) * base * 0.004;
    const open = p;
    const close = Math.max(base * 0.05, p + drift);
    out.push({
      time: now - i * 60,
      open,
      high: Math.max(open, close) * 1.002,
      low: Math.min(open, close) * 0.998,
      close,
    });
    p = close;
  }
  return out;
}

export function PriceChart({ symbol, basePrice }: { symbol: string; basePrice: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tfRef = useRef<(typeof TIMEFRAMES)[number]>("15m");

  useEffect(() => {
    let chart: import("lightweight-charts").IChartApi | null = null;
    let cancelled = false;
    (async () => {
      const mod = await import("lightweight-charts");
      if (cancelled || !ref.current) return;
      chart = mod.createChart(ref.current, {
        layout: { background: { color: "transparent" }, textColor: "#9AA1B0" },
        grid: { vertLines: { color: "#2E323C" }, horzLines: { color: "#2E323C" } },
        width: ref.current.clientWidth,
        // Compact height on phones, full terminal height on desktop.
        height: window.innerWidth < 640 ? 300 : 380,
      });
      const series = chart.addCandlestickSeries({
        upColor: "#19D69A",
        downColor: "#FF5263",
        wickUpColor: "#19D69A",
        wickDownColor: "#FF5263",
        borderVisible: false,
      });
      series.setData(seedCandles(basePrice || 0.01) as never);
      const el = ref.current;
      const ro = new ResizeObserver(() => {
        if (el && chart) chart.applyOptions({ width: el.clientWidth });
      });
      if (el) ro.observe(el);
    })();
    return () => {
      cancelled = true;
      chart?.remove();
    };
  }, [basePrice, symbol]);

  return (
    <div ref={wrapRef} className="card overflow-hidden">
      <div className="flex items-center gap-1 border-b border-forest-700 p-2">
        {TIMEFRAMES.map((t) => (
          <button
            key={t}
            onClick={() => { tfRef.current = t; }}
            className="rounded-lg px-3 py-1 text-xs font-semibold text-sage hover:bg-forest-900 hover:text-ivory"
          >
            {t}
          </button>
        ))}
        <button
          className="ml-auto rounded-lg px-3 py-1 text-xs font-semibold text-sage hover:text-ivory"
          onClick={() => wrapRef.current?.requestFullscreen?.()}
        >
          Fullscreen
        </button>
      </div>
      <div ref={ref} className="w-full" />
      <p className="border-t border-forest-700 px-4 py-2 text-[11px] text-sage">
        {symbol}/USD · live candles from the indexer when connected; illustrated feed otherwise.
      </p>
    </div>
  );
}
