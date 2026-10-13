/**
 * On-chain discovery: token list, prices, and trade history read DIRECTLY
 * from deployed LEVIUM contracts via getLogs + reads. No mocks, no invented
 * data — if the factory is undeployed, every consumer gets an empty list
 * with an explicit reason.
 */
import { createPublicClient, http, parseAbiItem, type Address } from "viem";
import { ROBINHOOD_RPC_URL } from "./chain";
import { ADDRESSES } from "./contracts";
import { isAddress } from "./utils";

const client = createPublicClient({ transport: http(ROBINHOOD_RPC_URL, { retryCount: 3 }) });

/** Shared read client for live on-chain data (prices, quotes, allowances). */
export const publicClient = client;

const FACTORY_DEPLOY_BLOCK = process.env.NEXT_PUBLIC_FACTORY_DEPLOY_BLOCK
  ? BigInt(process.env.NEXT_PUBLIC_FACTORY_DEPLOY_BLOCK)
  : null;

const launchedEvent = parseAbiItem(
  "event TokenLaunched(address indexed token, address indexed creator, uint256 supply, uint256 launchFee, uint256 timestamp)",
);
const launchedWithFeesEvent = parseAbiItem(
  "event TokenLaunchedWithFees(address indexed token, address indexed creator, uint256 supplyWhole, uint256 buyFeeBps, uint256 sellFeeBps, uint256 creatorFeeBps, uint256 timestamp)",
);
const buyEvent = parseAbiItem(
  "event Buy(address indexed trader, address indexed token, uint256 quoteIn, uint256 tokensOut, uint256 price)",
);
const sellEvent = parseAbiItem(
  "event Sell(address indexed trader, address indexed token, uint256 tokensIn, uint256 quoteOut, uint256 price)",
);

const erc20Abi = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
] as const;

const curveAbiPrice = ["function priceOf(address token) view returns (uint256)"] as const;

export interface DiscoveredToken {
  tokenAddress: string;
  creator: string;
  supplyWei: bigint;
  totalSupplyWhole: number;
  launchTxHash: string;
  launchBlock: bigint;
  buyFeeBps: number;
  sellFeeBps: number;
  creatorFeeBps: number;
  name: string;
  symbol: string;
}

export interface TokenTrade {
  txHash: string;
  trader: string;
  side: "BUY" | "SELL";
  quoteWei: bigint;
  tokenWei: bigint;
  priceWei: bigint;
  block: bigint;
}

function factory(): Address | null {
  const a = ADDRESSES.tokenFactory;
  return a && isAddress(a) ? (a as Address) : null;
}

/** All tokens ever launched through the factory (newest last). */
export async function discoverTokens(): Promise<{ tokens: DiscoveredToken[]; reason: string | null }> {
  const f = factory();
  if (!f) return { tokens: [], reason: "Token factory is not deployed yet." };
  const fromBlock = FACTORY_DEPLOY_BLOCK ?? 0n;
  const [base, withFees] = await Promise.all([
    client.getLogs({ address: f, event: launchedEvent, fromBlock, toBlock: "latest" }),
    client.getLogs({ address: f, event: launchedWithFeesEvent, fromBlock, toBlock: "latest" }),
  ]);
  const feeByToken = new Map<string, { buy: number; sell: number; creator: number; whole: number }>();
  for (const l of withFees) {
    feeByToken.set(l.args.token!.toLowerCase(), {
      buy: Number(l.args.buyFeeBps),
      sell: Number(l.args.sellFeeBps),
      creator: Number(l.args.creatorFeeBps),
      whole: Number(l.args.supplyWhole),
    });
  }
  const tokens: DiscoveredToken[] = [];
  for (const l of base) {
    const addr = l.args.token!;
    const meta = await readTokenMeta(addr).catch(() => ({ name: "Unknown", symbol: "UNK" }));
    const extra = feeByToken.get(addr.toLowerCase());
    tokens.push({
      tokenAddress: addr,
      creator: l.args.creator!,
      supplyWei: l.args.supply!,
      totalSupplyWhole: extra?.whole ?? Number(l.args.supply! / 10n ** 18n),
      launchTxHash: l.transactionHash!,
      launchBlock: l.blockNumber!,
      buyFeeBps: extra?.buy ?? 0,
      sellFeeBps: extra?.sell ?? 0,
      creatorFeeBps: extra?.creator ?? 0,
      name: meta.name,
      symbol: meta.symbol,
    });
  }
  return { tokens, reason: null };
}

export async function readTokenMeta(token: string): Promise<{ name: string; symbol: string }> {
  const [name, symbol] = await Promise.all([
    client.readContract({ address: token as Address, abi: erc20Abi, functionName: "name" }),
    client.readContract({ address: token as Address, abi: erc20Abi, functionName: "symbol" }),
  ]);
  return { name: name as string, symbol: symbol as string };
}

/** Current bonding-curve price in native wei per token (on-chain read). */
export async function readSpotPrice(token: string): Promise<bigint | null> {
  const curve = ADDRESSES.bondingCurve;
  if (!curve || !isAddress(curve)) return null;
  try {
    const price = await client.readContract({
      address: curve as Address,
      abi: curveAbiPrice,
      functionName: "priceOf",
      args: [token as Address],
    });
    return price as bigint;
  } catch {
    return null;
  }
}

/** Recent on-chain trades for a token (newest last, capped). */
export async function readTradeHistory(token: string, limit = 50): Promise<TokenTrade[]> {
  const curve = ADDRESSES.bondingCurve;
  if (!curve || !isAddress(curve)) return [];
  const [buys, sells] = await Promise.all([
    client.getLogs({ address: curve as Address, event: buyEvent, args: { token: token as Address }, fromBlock: 0n, toBlock: "latest" }),
    client.getLogs({ address: curve as Address, event: sellEvent, args: { token: token as Address }, fromBlock: 0n, toBlock: "latest" }),
  ]);
  const all: TokenTrade[] = [
    ...buys.map((l) => ({
      txHash: l.transactionHash!,
      trader: l.args.trader!,
      side: "BUY" as const,
      quoteWei: l.args.quoteIn!,
      tokenWei: l.args.tokensOut!,
      priceWei: l.args.price!,
      block: l.blockNumber!,
    })),
    ...sells.map((l) => ({
      txHash: l.transactionHash!,
      trader: l.args.trader!,
      side: "SELL" as const,
      quoteWei: l.args.quoteOut!,
      tokenWei: l.args.tokensIn!,
      priceWei: l.args.price!,
      block: l.blockNumber!,
    })),
  ];
  return all.sort((a, b) => (a.block < b.block ? 1 : -1)).slice(0, limit);
}

export { erc20Abi };
