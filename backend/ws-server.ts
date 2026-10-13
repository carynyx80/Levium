/**
 * LEVIUM WebSocket feed skeleton (Phase 3 target).
 *
 * Channels: prices, volume, launches, trades, market-status, open-interest,
 * positions (sim), liquidations (sim), leaderboard.
 * Requirements: reconnect handling, sequence numbers for missed-event
 * detection, dedupe by (txHash, logIndex), reorg/finality handling
 * (confirmations before treating index rows as final).
 */

// TODO(PHASE-3): implement with Redis subscriber -> ws broadcast, seq per
// channel, client resume via last-seen-seq.
export function wsServerNotImplemented(): never {
  throw new Error("WS server not yet implemented (Phase 3).");
}
