// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title LeviumBondingCurve
 * @notice Configurable bonding-curve launch market (linear price in
 * cumulative supply). Buy/sell with fees, slippage protection via minOut,
 * graduation threshold + liquidity migration hook.
 *
 * Pricing: price(supply) = basePrice + slope * supply (per-token, 1e18).
 * Invariants: reserve accounting checked on every trade; users can never
 * withdraw more quote than the market holds.
 *
 * Do NOT deploy with real funds until audited + graduation/migration path
 * is tested on testnet.
 */
contract LeviumBondingCurve is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint256 public basePrice;
    uint256 public slope;
    uint256 public buyFeeBps;
    uint256 public sellFeeBps;
    uint256 public graduationThreshold;
    address public feeRecipient;

    struct Market {
        uint256 supply;
        uint256 reserve;
        bool graduated;
    }
    mapping(address => Market) public markets;

    event Buy(address indexed trader, address indexed token, uint256 quoteIn, uint256 tokensOut, uint256 price);
    event Sell(address indexed trader, address indexed token, uint256 tokensIn, uint256 quoteOut, uint256 price);
    event Graduated(address indexed token, uint256 reserveMigrated);

    constructor(uint256 _basePrice, uint256 _slope, uint256 _buyFeeBps, uint256 _sellFeeBps, uint256 _graduationThreshold, address _feeRecipient)
        Ownable(msg.sender)
    {
        basePrice = _basePrice;
        slope = _slope;
        buyFeeBps = _buyFeeBps;
        sellFeeBps = _sellFeeBps;
        graduationThreshold = _graduationThreshold;
        feeRecipient = _feeRecipient;
    }

    function priceOf(address token) public view returns (uint256) {
        return basePrice + slope * markets[token].supply;
    }

    /// @notice Quote tokensOut for quoteIn (linear curve integral, fee-exclusive math done in buy()).
    function getQuoteOut(address token, uint256 quoteIn) external view returns (uint256 tokensOut, uint256 fee, uint256 price) {
        Market memory m = markets[token];
        price = basePrice + slope * m.supply;
        fee = (quoteIn * buyFeeBps) / BPS;
        uint256 net = quoteIn - fee;
        // Linear-curve approx: tokensOut = net / avgPrice; avgPrice from integral.
        // Solve slope/2 * x^2 + p0*x - net = 0 for x = tokensOut.
        uint256 p0 = price;
        uint256 a = slope;
        uint256 b = 2 * p0;
        uint256 disc = b * b + 8 * a * net;
        uint256 sqrtDisc = _sqrt(disc);
        tokensOut = (sqrtDisc - b) / (2 * a);
    }

    function buy(address token, uint256 minOut) external payable nonReentrant {
        Market storage m = markets[token];
        require(!m.graduated, "graduated");
        uint256 fee = (msg.value * buyFeeBps) / BPS;
        uint256 net = msg.value - fee;
        uint256 p0 = basePrice + slope * m.supply;
        uint256 a = slope;
        uint256 b = 2 * p0;
        uint256 tokensOut = ((_sqrt(b * b + 8 * a * net)) - b) / (2 * a);
        require(tokensOut >= minOut, "slippage");
        m.supply += tokensOut;
        m.reserve += net;
        (bool ok, ) = feeRecipient.call{value: fee}("");
        require(ok, "fee failed");
        IERC20(token).safeTransfer(msg.sender, tokensOut);
        emit Buy(msg.sender, token, msg.value, tokensOut, p0);
        if (m.reserve >= graduationThreshold) _graduate(token);
    }

    function sell(address token, uint256 tokensIn, uint256 minOut) external nonReentrant {
        Market storage m = markets[token];
        require(!m.graduated, "graduated");
        uint256 p0 = basePrice + slope * m.supply;
        // Integral payout for removing tokensIn from supply.
        uint256 gross = p0 * tokensIn - (slope * tokensIn * tokensIn) / 2;
        uint256 fee = (gross * sellFeeBps) / BPS;
        uint256 payout = gross - fee;
        require(payout >= minOut, "slippage");
        require(payout <= address(this).balance, "insolvent");
        m.supply -= tokensIn;
        m.reserve -= payout;
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokensIn);
        (bool ok, ) = payable(msg.sender).call{value: payout}("");
        require(ok, "payout failed");
        emit Sell(msg.sender, token, tokensIn, payout, p0);
    }

    function _graduate(address token) internal {
        markets[token].graduated = true;
        emit Graduated(token, markets[token].reserve);
        // Migration (destination pool init + reserve move) is executed by the
        // migration module post-audit; spot trading resumes after migration.
    }

    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) { y = z; z = (x / z + z) / 2; }
    }

    receive() external payable {}
}
