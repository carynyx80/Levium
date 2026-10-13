/**
 * LEVIUM indexer skeleton (Phase 2/3 implementation target).
 *
 * Event-driven viem watcher -> Postgres upserts -> Redis pub/sub.
 * Watches: TokenLaunched (factory), Buy/Sell/Graduated (bonding curve),
 * MarketRegistered/MarketStatusChanged (perp registry).
 * Includes: checkpoint resume, retry with backoff, reconciliation pass
 * comparing indexed state vs on-chain reads, RPS-safe chunking for the
 * public Robinhood RPC.
 *
 * The proven Pondex indexer pattern in this workspace
 * (indexer-pons-indexer.js: chunked getLogs + checkpoints + enrich) is the
 * reference implementation to port here.
 */
export const LEVIUM_EVENT_TOPICS = {
  TokenLaunched: "TokenLaunched(address,address,uint256,uint256,uint256)",
  Buy: "Buy(address,address,uint256,uint256,uint256)",
  Sell: "Sell(address,address,uint256,uint256,uint256)",
  Graduated: "Graduated(address,uint256)",
  MarketRegistered: "MarketRegistered(address)",
  MarketStatusChanged: "MarketStatusChanged(address,uint8)",
} as const;

// TODO(PHASE-2): implement watcher loop using viem createPublicClient +
// getLogs over ROBINHOOD_RPC_URL with forward/back chunking, checkpoint
// persistence (IndexerCheckpoint), and Redis publish per entity.
export function indexerNotImplemented(): never {
  throw new Error("Indexer worker not yet implemented (Phase 2).");
}
