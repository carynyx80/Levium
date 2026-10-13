import { create } from "zustand";

// ---------------------------------------------------------------- types
export type SpotStatus = "SPOT_LIVE";
export type PerpsStatus = "PERPS_PENDING" | "PERPS_LIVE" | "PERPS_PAUSED";

export interface Market {
  tokenAddress: string;
  name: string;
  symbol: string;
  logo?: string;
  price: number;
  change1h: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  liquidity: number;
  longOI: number;
  shortOI: number;
  perpsStatus: PerpsStatus;
  launchedAt: number;
  graduated: boolean;
  // --- ADDITIVE (optional: unknown until the indexer/contract reports them) ---
  /** Fixed total supply in whole tokens (1M / 10M / 100M / 1B). */
  totalSupply?: number;
  /** Per-token trade fees in bps (0–1000). Absent = legacy/unreported. */
  buyFeeBps?: number;
  sellFeeBps?: number;
  creatorFeeBps?: number;
}

export interface SimPosition {
  id: string;
  tokenAddress: string;
  symbol: string;
  side: "long" | "short";
  leverage: number;
  sizeTokens: number;
  entryPrice: number;
  collateralUsd: number;
  openedAt: number;
}

export type TxState =
  | { stage: "idle" }
  | { stage: "awaiting-wallet" }
  | { stage: "submitted"; hash: string }
  | { stage: "pending"; hash: string }
  | { stage: "confirmed"; hash: string }
  | { stage: "failed"; reason: string };

interface LeviumState {
  markets: Market[];
  simPositions: SimPosition[];
  tx: TxState;
  setMarkets: (m: Market[]) => void;
  openSimPosition: (p: Omit<SimPosition, "id" | "openedAt">) => void;
  closeSimPosition: (id: string) => void;
  setTx: (t: TxState) => void;
}

// Zero-state default: no fabricated stats. The store ships empty; the
// data layer (lib/market-data.ts) fills it from the indexer, or from
// clearly-labeled demo data only when NEXT_PUBLIC_DEMO=1.
export const useLevium = create<LeviumState>((set) => ({
  markets: [],
  simPositions: [],
  tx: { stage: "idle" },
  setMarkets: (markets) => set({ markets }),
  openSimPosition: (p) =>
    set((s) => ({
      simPositions: [
        ...s.simPositions,
        { ...p, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, openedAt: Date.now() },
      ],
    })),
  closeSimPosition: (id) => set((s) => ({ simPositions: s.simPositions.filter((p) => p.id !== id) })),
  setTx: (tx) => set({ tx }),
}));
