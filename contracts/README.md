# LEVIUM Contracts (development drafts — NOT audited)

Solidity 0.8.24 + OpenZeppelin. Foundry test layout expected at `contracts/` root
(`forge test`) in Phase 5; until then, review + Vitest parity tests for the math.

| Contract | Role |
|---|---|
| `LeviumTokenFactory.sol` | Fixed-supply ERC-20 deploys (CREATE2 salt), launch fees, spot init hook, perp registration (pending). |
| `LeviumBondingCurve.sol` | Linear-curve launch market: `price = basePrice + slope * supply`. Fees, `minOut` slippage guard, reserve invariants, graduation threshold + migration hook. |
| `LeviumPerpRegistry.sol` | Perp lifecycle `REGISTERED → OBSERVING → ELIGIBLE → ACTIVE` (+ `PAUSED`/`CLOSE_ONLY`/`DISABLED`), per-market risk params, RISK_ADMIN gating. Holds NO collateral, executes NO fills. |

**Bonding-curve math** (documented, no arbitrary formulas): linear price in
cumulative supply; buy size solved from the curve integral
`slope/2·x² + p0·x − net = 0`; sell payout is the integral over removed supply.
Fees in BPS, exact revert conditions, `graduationThreshold` on quote reserves.

## Fee + supply upgrade (additive, backward-compatible)

- **Supply tiers**: 1M / 10M / 100M / 1B whole tokens (`isValidSupply`). No minting
  after creation (fixed supply at deploy, no mint authority).
- **Circulating convention**: circulating = 100% of total from launch, INCLUDING
  the bonding-curve reserve (reserve tokens are unlocked and tradable).
  Protocol default split: 80% seeded to curve (`curveAllocationBps`), 20% to creator.
- **Reference pricing**: every market initializes at a $4,000 market cap
  (`INITIAL_MCAP_USD1E18`); base price = $4,000 ÷ supply, converted via the
  owner-set `quoteUsdPerNative1e18` until a decentralized oracle/TWAP lands.
- **Independent fees** (each 0–1000 bps / 0–10%, 0.1% steps, default 0%):
  buys deduct `buyFee → feeRecipient` + `creatorFee → creator`;
  sells deduct `sellFee → feeRecipient` + `creatorFee → creator`.
  Uninitialized (legacy) tokens keep exact legacy behavior (global fees, zero creator cut).
- **Graduation**: legacy reserve-threshold trigger preserved; initialized markets
  additionally graduate when verified market cap (price × total) reaches $50,000
  (`GRADUATION_MCAP_USD1E18`). New `TradeFees` / `MarketInitialized` /
  `TokenLaunchedWithFees` events are additive — existing events and the legacy
  `launch()` path are byte-for-byte preserved for current indexers.
- **Accounting fix**: sells now decrement reserves by the full gross outflow
  (previously only the payout, overstating reserves by cumulative sell fees).
- All math in 1e18 fixed point; tokens use 18 decimals throughout.

**Not yet built (Phase 5, testnet only)**: collateral vault, position
accounting, funding module, oracle/TWAP integration, liquidation engine,
insurance fund. Real-money perps stay disabled until audits + authorization.
