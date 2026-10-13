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

**Not yet built (Phase 5, testnet only)**: collateral vault, position
accounting, funding module, oracle/TWAP integration, liquidation engine,
insurance fund. Real-money perps stay disabled until audits + authorization.
