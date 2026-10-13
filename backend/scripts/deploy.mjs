/**
 * LEVIUM deployment script (viem, no forge needed — uses contracts/out artifacts).
 *
 *   1. node backend/scripts/compile.mjs
 *   2. PRIVATE_KEY=0x... RPC_URL=... TREASURY=0x... node backend/scripts/deploy.mjs [--mainnet-ok]
 *
 * What it does:
 *  - reads live ETH/USD (no hardcoded rates), computes the $0.50 launch fee in wei
 *  - deploys LeviumPerpRegistry -> LeviumBondingCurve -> LeviumTokenFactory
 *  - wires: factory.bondingCurve + factory.perpRegistry, curve.tokenFactory +
 *    curve.quoteUsd (same feed), registry admin = deployer
 *  - prints contract addresses, tx hashes, and the exact .env values to set
 *
 * SAFETY: deploys to whatever RPC_URL points at. Mainnet (chain 4663) is
 * REFUSED unless --mainnet-ok is passed AND CONFIRM_MAINNET=I_APPROVE_SPEND.
 * Never run with a production key without explicit user approval.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const load = (n) => JSON.parse(fs.readFileSync(path.join(root, "contracts", "out", `${n}.json`), "utf8"));

const RPC = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
const PK = process.env.PRIVATE_KEY;
const TREASURY = process.env.TREASURY;
const MAINNET_ID = 4663;

if (!PK) {
  console.error("DEPLOY_ABORT: set PRIVATE_KEY (deployer key — never commit it).");
  process.exit(1);
}
if (!TREASURY || !/^0x[a-fA-F0-9]{40}$/.test(TREASURY)) {
  console.error("DEPLOY_ABORT: set TREASURY=0x... (receives the $0.50 launch fee).");
  process.exit(1);
}

// --- live $0.50 fee (same sources as the frontend; never hardcoded) ---
async function ethUsd() {
  try {
    const r = await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot");
    const j = await r.json();
    const v = Number(j?.data?.amount);
    if (Number.isFinite(v) && v > 0) return { v, src: "coinbase" };
  } catch {}
  const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
  const j = await r.json();
  const v = Number(j?.ethereum?.usd);
  if (!(Number.isFinite(v) && v > 0)) throw new Error("no usable ETH/USD feed");
  return { v, src: "coingecko" };
}

const account = privateKeyToAccount(PK);
const publicClient = createPublicClient({ transport: http(RPC, { timeout: 20000 }) });
const wallet = createWalletClient({ account, transport: http(RPC, { timeout: 20000 }) });

const chainId = await publicClient.getChainId();
const isMainnet = chainId === MAINNET_ID;
if (isMainnet && (process.argv[2] !== "--mainnet-ok" || process.env.CONFIRM_MAINNET !== "I_APPROVE_SPEND")) {
  console.error("DEPLOY_ABORT: mainnet target requires --mainnet-ok + CONFIRM_MAINNET=I_APPROVE_SPEND (explicit user approval).");
  process.exit(1);
}

const { v: rate, src } = await ethUsd();
const launchFeeWei = BigInt(Math.round((0.5 / rate) * 1e18));
const quoteUsd1e18 = BigInt(Math.round(rate * 1e18));
console.log(`RATE: $${rate} (${src}) -> launch fee $0.50 = ${launchFeeWei} wei`);

async function deploy(name, args) {
  const { abi, bytecode } = load(name);
  const hash = await wallet.deployContract({ abi, bytecode, args });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`${name}: ${receipt.contractAddress} (tx ${hash})`);
  return receipt.contractAddress;
}

// Curve constructor: basePrice (legacy default), slope (>0), buyFee, sellFee, graduationThreshold, feeRecipient.
// Per-token base prices/fees are set at launch via initMarket; constructor values cover legacy paths.
const SLOPE_WEI = 1_000_000_000n; // 1 gwei per token sold — MUST be > 0 (integral solver divides by slope)
const GRADUATION_RESERVE_WEI = 10n ** 18n; // 1 native unit reserve (legacy trigger; $50k mcap trigger is additional)

const registry = await deploy("LeviumPerpRegistry", [account.address]);
const curve = await deploy("LeviumBondingCurve", [1n, SLOPE_WEI, 0n, 0n, GRADUATION_RESERVE_WEI, TREASURY]);
const factory = await deploy("LeviumTokenFactory", [launchFeeWei, 1_000_000_000n * 10n ** 18n, TREASURY]);

async function call(abi, address, functionName, args) {
  const hash = await wallet.writeContract({ abi, address, functionName, args });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`wired ${functionName} (tx ${hash})`);
}
const factoryArt = load("LeviumTokenFactory");
const curveArt = load("LeviumBondingCurve");
await call(factoryArt.abi, factory, "setBondingCurve", [curve]);
await call(factoryArt.abi, factory, "setPerpRegistry", [registry]);
await call(curveArt.abi, curve, "setTokenFactory", [factory]);
await call(curveArt.abi, curve, "setQuoteUsdPerNative", [quoteUsd1e18]);

const block = await publicClient.getBlockNumber();
console.log("\n--- set these in levium/.env.local ---");
console.log(`NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=${factory}`);
console.log(`NEXT_PUBLIC_BONDING_CURVE_ADDRESS=${curve}`);
console.log(`NEXT_PUBLIC_PERP_REGISTRY_ADDRESS=${registry}`);
console.log(`NEXT_PUBLIC_TREASURY_ADDRESS=${TREASURY}`);
console.log(`NEXT_PUBLIC_FACTORY_DEPLOY_BLOCK=${block}`);
console.log("--- verify: launchFee() == " + launchFeeWei.toString() + " wei ---");
