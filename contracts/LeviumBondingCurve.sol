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

    // --- ADDITIVE: per-token fee/supply config. Legacy globals above unchanged. ---
    /// @notice Reference launch market cap ($4,000) and graduation market cap ($50,000), 1e18-scaled USD.
    uint256 public constant INITIAL_MCAP_USD1E18 = 4_000e18;
    uint256 public constant GRADUATION_MCAP_USD1E18 = 50_000e18;
    uint256 public constant MAX_FEE_BPS = 1000; // 10% per fee
    /// @notice USD per 1 native quote token, 1e18-scaled. Owner-set until a
    /// decentralized oracle/TWAP feed lands (Phase 5). Required before initMarket.
    uint256 public quoteUsdPerNative1e18;
    /// @notice Token factory authorized to init markets (owner can also init).
    address public tokenFactory;

    struct TokenConfig {
        uint256 totalSupplyWei; // fixed at launch; no minting after
        uint256 buyFeeBps;
        uint256 sellFeeBps;
        uint256 creatorFeeBps;
        address creator; // receives creator-fee revenue directly
        uint256 basePrice; // wei per token == $4,000 / totalSupply at launch
        uint256 seededReserve; // curve token inventory recorded at launch
        bool initialized;
    }
    mapping(address => TokenConfig) public tokenConfigs;

    event Buy(address indexed trader, address indexed token, uint256 quoteIn, uint256 tokensOut, uint256 price);
    event Sell(address indexed trader, address indexed token, uint256 tokensIn, uint256 quoteOut, uint256 price);
    event Graduated(address indexed token, uint256 reserveMigrated);
    // --- ADDITIVE events (existing events unchanged for indexer compat) ---
    /// @notice Fee split applied on a trade: protocolFee -> feeRecipient, creatorFee -> creator.
    event TradeFees(address indexed token, address indexed trader, uint256 protocolFee, uint256 creatorFee, address indexed creator);
    event MarketInitialized(address indexed token, uint256 totalSupplyWei, uint256 buyFeeBps, uint256 sellFeeBps, uint256 creatorFeeBps, address creator, uint256 basePrice);
    event QuoteUsdUpdated(uint256 prevUsd, uint256 newUsd);
    event TokenFactoryUpdated(address prevFactory, address newFactory);

    constructor(uint256 _basePrice, uint256 _slope, uint256 _buyFeeBps, uint256 _sellFeeBps, uint256 _graduationThreshold, address _feeRecipient)
        Ownable(msg.sender)
    {
        require(_slope > 0, "slope must be > 0"); // integral solver divides by slope
        basePrice = _basePrice;
        slope = _slope;
        buyFeeBps = _buyFeeBps;
        sellFeeBps = _sellFeeBps;
        graduationThreshold = _graduationThreshold;
        feeRecipient = _feeRecipient;
    }

    function priceOf(address token) public view returns (uint256) {
        return _basePriceOf(token) + slope * markets[token].supply;
    }

    // --- ADDITIVE: market init + pricing helpers. Existing functions below
    // keep exact legacy behavior for uninitialized (legacy) tokens. ---

    modifier onlyFactoryOrOwner() {
        require(msg.sender == tokenFactory || msg.sender == owner(), "not factory/owner");
        _;
    }

    function setQuoteUsdPerNative(uint256 _quoteUsd) external onlyOwner {
        emit QuoteUsdUpdated(quoteUsdPerNative1e18, _quoteUsd);
        quoteUsdPerNative1e18 = _quoteUsd;
    }

    function setTokenFactory(address _factory) external onlyOwner {
        emit TokenFactoryUpdated(tokenFactory, _factory);
        tokenFactory = _factory;
    }

    function _basePriceOf(address token) internal view returns (uint256) {
        TokenConfig storage c = tokenConfigs[token];
        return c.initialized ? c.basePrice : basePrice;
    }

    function _buyFeeOf(address token) internal view returns (uint256) {
        TokenConfig storage c = tokenConfigs[token];
        return c.initialized ? c.buyFeeBps : buyFeeBps;
    }

    function _sellFeeOf(address token) internal view returns (uint256) {
        TokenConfig storage c = tokenConfigs[token];
        return c.initialized ? c.sellFeeBps : sellFeeBps;
    }

    function _creatorFeeOf(address token) internal view returns (uint256) {
        TokenConfig storage c = tokenConfigs[token];
        return c.initialized ? c.creatorFeeBps : 0;
    }

    /**
     * @notice Initialize a token's curve market (called by the factory at launch).
     * Sets fixed supply, per-token fees, creator recipient, and the $4,000
     * reference base price. Verifies the seeded reserve is actually held.
     */
    function initMarket(
        address token,
        uint256 totalSupplyWei,
        uint256 buyFeeBps_,
        uint256 sellFeeBps_,
        uint256 creatorFeeBps_,
        address creator,
        uint256 seededReserve
    ) external onlyFactoryOrOwner {
        require(!tokenConfigs[token].initialized, "already initialized");
        require(totalSupplyWei % 1e18 == 0, "supply must be whole tokens");
        uint256 supplyWhole = totalSupplyWei / 1e18;
        require(
            supplyWhole == 1_000_000 || supplyWhole == 10_000_000 ||
            supplyWhole == 100_000_000 || supplyWhole == 1_000_000_000,
            "invalid supply tier"
        );
        require(buyFeeBps_ <= MAX_FEE_BPS && sellFeeBps_ <= MAX_FEE_BPS && creatorFeeBps_ <= MAX_FEE_BPS, "fee > 10%");
        require(creator != address(0), "creator required");
        require(quoteUsdPerNative1e18 > 0, "quote USD unset");
        require(seededReserve > 0, "no seeded reserve");
        require(IERC20(token).balanceOf(address(this)) >= seededReserve, "reserve not seeded");

        // basePrice (wei/token) = ($4,000 / supply) / quoteUsdPerNative.
        uint256 base = (INITIAL_MCAP_USD1E18 * 1e18) / (supplyWhole * quoteUsdPerNative1e18);
        require(base > 0, "base price underflow");

        tokenConfigs[token] = TokenConfig({
            totalSupplyWei: totalSupplyWei,
            buyFeeBps: buyFeeBps_,
            sellFeeBps: sellFeeBps_,
            creatorFeeBps: creatorFeeBps_,
            creator: creator,
            basePrice: base,
            seededReserve: seededReserve,
            initialized: true
        });
        emit MarketInitialized(token, totalSupplyWei, buyFeeBps_, sellFeeBps_, creatorFeeBps_, creator, base);
    }

    /**
     * @notice Verified market cap in USD (1e18): price x total supply.
     * Circulating == total under the LEVIUM convention, so this is both
     * market cap and FDV.
     */
    function marketCapUsd1e18(address token) public view returns (uint256) {
        TokenConfig storage c = tokenConfigs[token];
        require(c.initialized, "not initialized");
        uint256 totalWeiValue = (priceOf(token) * c.totalSupplyWei) / 1e18;
        return (totalWeiValue * quoteUsdPerNative1e18) / 1e18;
    }

    /// @notice Quote tokensOut for quoteIn (linear curve integral, fee-exclusive math done in buy()).
    function getQuoteOut(address token, uint256 quoteIn) external view returns (uint256 tokensOut, uint256 fee, uint256 price) {
        Market memory m = markets[token];
        price = _basePriceOf(token) + slope * m.supply;
        // fee = protocol buy fee + creator fee (both deducted pre-trade).
        fee = (quoteIn * (_buyFeeOf(token) + _creatorFeeOf(token))) / BPS;
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
        // Per-token fees when initialized; legacy global buy fee otherwise.
        // Creator fee is additional and goes straight to the token creator.
        uint256 fee = (msg.value * _buyFeeOf(token)) / BPS;
        uint256 creatorCut = (msg.value * _creatorFeeOf(token)) / BPS;
        uint256 net = msg.value - fee - creatorCut;
        uint256 p0 = _basePriceOf(token) + slope * m.supply;
        uint256 a = slope;
        uint256 b = 2 * p0;
        uint256 tokensOut = ((_sqrt(b * b + 8 * a * net)) - b) / (2 * a);
        require(tokensOut >= minOut, "slippage");
        m.supply += tokensOut;
        m.reserve += net;
        if (fee > 0) {
            (bool feeOk, ) = feeRecipient.call{value: fee}("");
            require(feeOk, "fee failed");
        }
        TokenConfig storage c = tokenConfigs[token];
        if (creatorCut > 0) {
            (bool creatorOk, ) = c.creator.call{value: creatorCut}("");
            require(creatorOk, "creator fee failed");
            emit TradeFees(token, msg.sender, fee, creatorCut, c.creator);
        }
        IERC20(token).safeTransfer(msg.sender, tokensOut);
        emit Buy(msg.sender, token, msg.value, tokensOut, p0);
        if (m.reserve >= graduationThreshold) {
            _graduate(token);
        } else if (c.initialized && marketCapUsd1e18(token) >= GRADUATION_MCAP_USD1E18) {
            // $50k verified-mcap graduation (initialized markets only: seeded
            // reserve + owner-set quote USD + fixed supply are the safety basis;
            // migration itself still runs the existing safety checks).
            _graduate(token);
        }
    }

    function sell(address token, uint256 tokensIn, uint256 minOut) external nonReentrant {
        Market storage m = markets[token];
        require(!m.graduated, "graduated");
        uint256 p0 = _basePriceOf(token) + slope * m.supply;
        // Integral payout for removing tokensIn from supply.
        uint256 gross = p0 * tokensIn - (slope * tokensIn * tokensIn) / 2;
        // Per-token fees when initialized; legacy global sell fee otherwise.
        uint256 fee = (gross * _sellFeeOf(token)) / BPS;
        uint256 creatorCut = (gross * _creatorFeeOf(token)) / BPS;
        uint256 payout = gross - fee - creatorCut;
        require(payout >= minOut, "slippage");
        require(payout <= address(this).balance, "insolvent");
        m.supply -= tokensIn;
        // Subtract the full gross outflow (payout + both fees all leave the
        // contract) so reserve tracks the actual balance. (Previously only the
        // payout was subtracted, overstating reserves by cumulative sell fees.)
        m.reserve -= gross;
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokensIn);
        if (fee > 0) {
            (bool feeOk, ) = feeRecipient.call{value: fee}("");
            require(feeOk, "fee payout failed");
        }
        TokenConfig storage c = tokenConfigs[token];
        if (creatorCut > 0) {
            (bool creatorOk, ) = c.creator.call{value: creatorCut}("");
            require(creatorOk, "creator fee failed");
            emit TradeFees(token, msg.sender, fee, creatorCut, c.creator);
        }
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
