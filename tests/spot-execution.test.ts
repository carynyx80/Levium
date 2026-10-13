import { describe, expect, it } from "vitest";
import { decodeEventLog, encodeAbiParameters, encodeEventTopics, parseAbi, parseUnits } from "viem";

const factoryEvents = parseAbi([
  "event TokenLaunched(address indexed token, address indexed creator, uint256 supply, uint256 launchFee, uint256 timestamp)",
  "event TokenLaunchedWithFees(address indexed token, address indexed creator, uint256 supplyWhole, uint256 buyFeeBps, uint256 sellFeeBps, uint256 creatorFeeBps, uint256 timestamp)",
]);

describe("spot execution math (mirrors TradePanel)", () => {
  it("derives buy value wei from USD at the live rate", () => {
    const usd = 100;
    const rate = 2500;
    const valueWei = BigInt(Math.round((usd / rate) * 1e18));
    expect(valueWei).toBe(40_000_000_000_000_000n); // 0.04 ETH
  });

  it("applies slippage to on-chain minOut", () => {
    const tokensOut = 1_000_000n * 10n ** 18n;
    const minOut = (tokensOut * BigInt(Math.round((100 - 1) * 100))) / 10_000n;
    expect(minOut).toBe((tokensOut * 99n) / 100n);
  });

  it("converts sell USD to token wei at the live price", () => {
    const tokensIn = parseUnits((100 / 0.004).toFixed(18), 18); // $100 @ $0.004
    expect(tokensIn).toBe(25_000n * 10n ** 18n);
  });

  it("requests approval only when allowance is short", () => {
    const need = (allowance: bigint, tokensIn: bigint) => allowance < tokensIn;
    expect(need(0n, 100n)).toBe(true);
    expect(need(99n, 100n)).toBe(true);
    expect(need(100n, 100n)).toBe(false);
  });
});

describe("launch event round-trip (indexer parsing)", () => {
  it("encodes/decodes TokenLaunchedWithFees losslessly", () => {
    const args = {
      token: "0x1111111111111111111111111111111111111111" as const,
      creator: "0x2222222222222222222222222222222222222222" as const,
      supplyWhole: 1_000_000_000n,
      buyFeeBps: 100n,
      sellFeeBps: 100n,
      creatorFeeBps: 50n,
      timestamp: 1_700_000_000n,
    };
    const [topics, data] = [
      encodeEventTopics({
        abi: factoryEvents,
        eventName: "TokenLaunchedWithFees",
        args: { token: args.token, creator: args.creator },
      }),
      encodeAbiParameters(
        [
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
        ],
        [args.supplyWhole, args.buyFeeBps, args.sellFeeBps, args.creatorFeeBps, args.timestamp],
      ),
    ];
    const decoded = decodeEventLog({
      abi: factoryEvents,
      topics: topics as [`0x${string}`, ...`0x${string}`[]],
      data,
    });
    expect(decoded.eventName).toBe("TokenLaunchedWithFees");
    expect((decoded.args as typeof args).supplyWhole).toBe(1_000_000_000n);
    expect((decoded.args as typeof args).creatorFeeBps).toBe(50n);
  });
});
