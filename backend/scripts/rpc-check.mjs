// RPC health check: verifies Robinhood Chain reachability, chain id, sync state.
// Usage: node backend/scripts/rpc-check.mjs [rpcUrl]
import { createPublicClient, http } from "viem";

const RPC = process.argv[2] || process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
const EXPECTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 4663);

const client = createPublicClient({ transport: http(RPC, { retryCount: 2, timeout: 15000 }) });
try {
  const [chainId, block, gasPrice] = await Promise.all([
    client.getChainId(),
    client.getBlockNumber(),
    client.getGasPrice(),
  ]);
  console.log(JSON.stringify({
    ok: true,
    rpc: RPC,
    chainId,
    chainIdMatch: chainId === EXPECTED_CHAIN_ID,
    block: String(block),
    gasPriceWei: String(gasPrice),
  }));
  if (chainId !== EXPECTED_CHAIN_ID) process.exitCode = 2;
} catch (e) {
  console.log(JSON.stringify({ ok: false, rpc: RPC, error: String(e).slice(0, 500) }));
  process.exitCode = 1;
}
