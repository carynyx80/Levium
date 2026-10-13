# LEVIUM Security

## Invariants

- Reentrancy guards on all payable/state-changing contract paths; CEI ordering.
- Role-based access: factory owner, curve owner, registry RISK_ADMIN; no hidden withdrawal functions.
- Fixed-supply tokens; no post-deploy mint authority.
- Bonding-curve reserve accounting: payouts bounded by held reserves; slippage (`minOut`) enforced.
- Perps: isolated margin, fixed-point (1e18) accounting, position/OI/leverage caps, oracle freshness + deviation checks, pause/close-only rails.
- Frontend: no floating-point for authoritative money math (display only), allowance handling, tx simulation where supported, explicit tx lifecycle states.
- Backend: nonce-based wallet auth with replay protection, server-side admin allowlist + on-chain role verification, rate limiting, full admin audit log.

## Audit gates

Real-money perps MUST NOT activate until ALL hold:

1. Independent smart-contract audit(s) of factory, curve, vault, position, funding, liquidation, insurance modules — findings remediated.
2. Testnet soak: full flow (launch → spot → registration → eligibility → leveraged trade → close/liquidate) plus chaos cases (price gaps, congestion, oracle failure).
3. Verified liquidity arrangements + insurance fund capitalization.
4. Monitoring/alerting + incident runbooks + multisig/timelock admin live.
5. Explicit launch authorization recorded (tx + admin audit entry).

## Never

- Never store user private keys or request seed phrases.
- Never present simulations as confirmed on-chain activity.
- Never deploy production financial contracts or issue $LEV without explicit authorization ($LEV supply/allocation/emissions stay configurable; no production token planned in this release).
