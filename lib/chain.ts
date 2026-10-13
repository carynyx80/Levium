/**
 * Robinhood Chain network configuration — EXCLUSIVE chain for LEVIUM.
 *
 * Source of values: verified official Robinhood Chain documentation,
 * mirrored from the workspace `.env.example` / indexer baseline
 * (chain id 4663, rpc https://rpc.mainnet.chain.robinhood.com,
 * verified live on-chain 2026-09-12).
 *
 * Rule: every value is env-configurable. If the Robinhood endpoint is
 * unreachable the app must surface the outage — never substitute
 * Ethereum / Base / BNB or any other chain.
 */
import { defineChain } from "viem";

export const ROBINHOOD_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 4663);
export const ROBINHOOD_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
export const ROBINHOOD_EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL || "https://explorer.chain.robinhood.com";
export const GAS_TOKEN_SYMBOL = process.env.NEXT_PUBLIC_GAS_TOKEN_SYMBOL || "ETH";

export const robinhoodChain = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: GAS_TOKEN_SYMBOL, decimals: 18 },
  rpcUrls: { default: { http: [ROBINHOOD_RPC_URL] } },
  blockExplorers: {
    default: { name: "Robinhood Explorer", url: ROBINHOOD_EXPLORER_URL },
  },
});

export function explorerTxUrl(hash: string): string {
  return `${ROBINHOOD_EXPLORER_URL.replace(/\/$/, "")}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${ROBINHOOD_EXPLORER_URL.replace(/\/$/, "")}/address/${address}`;
}
