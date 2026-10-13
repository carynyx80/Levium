/**
 * LEVIUM contract addresses + minimal ABIs.
 * Empty address = not deployed: UI must disable the dependent real-money
 * flow and say so — never mock a confirmation.
 */
export const ADDRESSES = {
  tokenFactory: (process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS || "") as `0x${string}` | "",
  bondingCurve: (process.env.NEXT_PUBLIC_BONDING_CURVE_ADDRESS || "") as `0x${string}` | "",
  perpRegistry: (process.env.NEXT_PUBLIC_PERP_REGISTRY_ADDRESS || "") as `0x${string}` | "",
  collateralVault: (process.env.NEXT_PUBLIC_COLLATERAL_VAULT_ADDRESS || "") as `0x${string}` | "",
  levToken: (process.env.NEXT_PUBLIC_LEV_TOKEN_ADDRESS || "") as `0x${string}` | "",
};

export const factoryAbi = [
  "event TokenLaunched(address indexed token, address indexed creator, uint256 supply, uint256 launchFee, uint256 timestamp)",
  "event TokenLaunchedWithFees(address indexed token, address indexed creator, uint256 supplyWhole, uint256 buyFeeBps, uint256 sellFeeBps, uint256 creatorFeeBps, uint256 timestamp)",
  "function launchFee() view returns (uint256)",
  "function defaultSupply() view returns (uint256)",
  "function launch(string name, string symbol, string metadataURI) payable returns (address token)",
  "function launchWithFees(string name, string symbol, string metadataURI, uint256 supplyWhole, uint256 buyFeeBps, uint256 sellFeeBps, uint256 creatorFeeBps) payable returns (address token)",
  "function isValidSupply(uint256 supplyWhole) view returns (bool)",
  "function getToken(address token) view returns (bool exists, address creator, uint256 supply)",
] as const;

export const bondingCurveAbi = [
  "event Buy(address indexed trader, address indexed token, uint256 quoteIn, uint256 tokensOut, uint256 price)",
  "event Sell(address indexed trader, address indexed token, uint256 tokensIn, uint256 quoteOut, uint256 price)",
  "event Graduated(address indexed token, uint256 liquidityMigrated)",
  "function getPrice(address token) view returns (uint256)",
  "function getQuoteOut(address token, uint256 quoteIn) view returns (uint256 tokensOut, uint256 fee, uint256 priceImpactBps)",
  "function buy(address token, uint256 minOut) payable",
  "function sell(address token, uint256 tokensIn, uint256 minOut)",
] as const;

export const perpRegistryAbi = [
  "event MarketRegistered(address indexed token)",
  "event MarketStatusChanged(address indexed token, uint8 status)",
  "function marketStatus(address token) view returns (uint8)",
  "function setMarketStatus(address token, uint8 status)",
] as const;

/** Perps safety gate: only "simulation" is implemented. Anything else disables. */
export const PERPS_MODE = process.env.PERPS_MODE || "simulation";
export const PERPS_SIMULATION = PERPS_MODE === "simulation";
