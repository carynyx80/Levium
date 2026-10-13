// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LeviumToken
 * @notice Standardized ERC-20 launched through the factory. Fixed supply at
 * deploy; no mint authority post-deploy (prevents unexpected supply changes).
 */
contract LeviumToken is ERC20 {
    constructor(string memory name_, string memory symbol_, uint256 supply_, address to_)
        ERC20(name_, symbol_)
    {
        _mint(to_, supply_);
    }
}

/**
 * @title LeviumTokenFactory
 * @notice Deterministic, auditable token deployment with configurable launch
 * fees. Emits events for the indexer. Do NOT deploy to production or route
 * real funds until an independent audit is complete.
 */
contract LeviumTokenFactory is Ownable, ReentrancyGuard {
    uint256 public launchFee;
    uint256 public defaultSupply;
    address public feeRecipient;
    address public perpRegistry;

    // --- ADDITIVE: fee/supply upgrade. Legacy launch() below is untouched. ---
    /// @notice Max per-fee: 10% (0.1% precision = 10 bps steps).
    uint256 public constant MAX_FEE_BPS = 1000;
    /// @notice Share of minted supply seeded into the bonding-curve reserve (80%).
    /// Remainder goes to the creator. Circulating = 100% of total (reserve counts).
    uint256 public curveAllocationBps = 8000;
    address public bondingCurve;

    /// @notice Minimal interface used to initialize the token's curve market.
    /// Full signature lives in LeviumBondingCurve.initMarket.
    event TokenLaunchedWithFees(
        address indexed token,
        address indexed creator,
        uint256 supplyWhole,
        uint256 buyFeeBps,
        uint256 sellFeeBps,
        uint256 creatorFeeBps,
        uint256 timestamp
    );
    event BondingCurveUpdated(address prevCurve, address newCurve);
    event CurveAllocationUpdated(uint256 prevBps, uint256 newBps);

    event TokenLaunched(
        address indexed token,
        address indexed creator,
        uint256 supply,
        uint256 launchFeePaid,
        uint256 timestamp
    );
    event LaunchFeeUpdated(uint256 prevFee, uint256 newFee);
    event PerpRegistryUpdated(address prevRegistry, address newRegistry);

    error IncorrectFee();
    error RegistryNotSet();
    // --- ADDITIVE errors (legacy errors above unchanged) ---
    error InvalidFee();
    error InvalidSupply();
    error CurveNotSet();

    constructor(uint256 _launchFee, uint256 _defaultSupply, address _feeRecipient)
        Ownable(msg.sender)
    {
        launchFee = _launchFee;
        defaultSupply = _defaultSupply;
        feeRecipient = _feeRecipient;
    }

    function setLaunchFee(uint256 _fee) external onlyOwner {
        emit LaunchFeeUpdated(launchFee, _fee);
        launchFee = _fee;
    }

    function setPerpRegistry(address _registry) external onlyOwner {
        emit PerpRegistryUpdated(perpRegistry, _registry);
        perpRegistry = _registry;
    }

    // --- ADDITIVE setters (existing setters unchanged) ---
    function setBondingCurve(address _curve) external onlyOwner {
        emit BondingCurveUpdated(bondingCurve, _curve);
        bondingCurve = _curve;
    }

    function setCurveAllocationBps(uint256 _bps) external onlyOwner {
        require(_bps <= 10_000, "allocation > 100%");
        emit CurveAllocationUpdated(curveAllocationBps, _bps);
        curveAllocationBps = _bps;
    }

    /// @notice Fixed supply tiers (whole tokens): 1M / 10M / 100M / 1B.
    function isValidSupply(uint256 supplyWhole) public pure returns (bool) {
        return
            supplyWhole == 1_000_000 ||
            supplyWhole == 10_000_000 ||
            supplyWhole == 100_000_000 ||
            supplyWhole == 1_000_000_000;
    }

    /**
     * @notice Deploy a token, forward fees, register spot + perps-pending.
     * Frontend treats this as one atomic launch step; if registry wiring
     * requires a second tx, the UI shows explicit intermediate state.
     */
    function launch(string calldata name_, string calldata symbol_, string calldata /*metadataURI*/)
        external
        payable
        nonReentrant
        returns (address token)
    {
        if (msg.value != launchFee) revert IncorrectFee();
        if (perpRegistry == address(0)) revert RegistryNotSet();

        bytes32 salt = keccak256(abi.encodePacked(msg.sender, name_, symbol_, block.timestamp));
        LeviumToken t = new LeviumToken{salt: salt}(name_, symbol_, defaultSupply, msg.sender);
        token = address(t);

        (bool ok, ) = feeRecipient.call{value: msg.value}("");
        require(ok, "fee transfer failed");

        // Register perpetual market in PENDING status (never active at birth).
        (bool reg, ) = perpRegistry.call(abi.encodeWithSignature("registerMarket(address)", token));
        require(reg, "perp registration failed");

        emit TokenLaunched(token, msg.sender, defaultSupply, msg.value, block.timestamp);
    }

    /**
     * @notice ADDITIVE: launch with fixed supply tier + independent fees.
     * - supplyWhole must be 1M / 10M / 100M / 1B (whole tokens, 18 decimals).
     * - buyFeeBps / sellFeeBps / creatorFeeBps each 0–1000 bps (0–10%), default 0.
     * - Mints total supply to the factory, seeds curveAllocationBps into the
     *   bonding curve, sends the remainder to the creator. Circulating = 100%
     *   of total from launch (reserve counts as circulating, unlocked).
     * - Initializes the curve market (per-token fees + $4,000 reference price),
     *   registers perps as pending. Emits the legacy TokenLaunched event too so
     *   existing indexers keep working.
     * Legacy launch() above is preserved byte-for-byte in behavior.
     */
    function launchWithFees(
        string calldata name_,
        string calldata symbol_,
        string calldata /*metadataURI*/,
        uint256 supplyWhole,
        uint256 buyFeeBps,
        uint256 sellFeeBps,
        uint256 creatorFeeBps
    ) external payable nonReentrant returns (address token) {
        if (msg.value != launchFee) revert IncorrectFee();
        if (perpRegistry == address(0)) revert RegistryNotSet();
        if (bondingCurve == address(0)) revert CurveNotSet();
        if (!isValidSupply(supplyWhole)) revert InvalidSupply();
        if (buyFeeBps > MAX_FEE_BPS || sellFeeBps > MAX_FEE_BPS || creatorFeeBps > MAX_FEE_BPS)
            revert InvalidFee();

        uint256 totalSupplyWei = supplyWhole * 1e18;
        bytes32 salt = keccak256(abi.encodePacked(msg.sender, name_, symbol_, block.timestamp, supplyWhole));
        LeviumToken t = new LeviumToken{salt: salt}(name_, symbol_, totalSupplyWei, address(this));
        token = address(t);

        uint256 curveShare = (totalSupplyWei * curveAllocationBps) / 10_000;
        uint256 creatorShare = totalSupplyWei - curveShare;
        LeviumToken(token).transfer(bondingCurve, curveShare);
        LeviumToken(token).transfer(msg.sender, creatorShare);

        (bool feeOk, ) = feeRecipient.call{value: msg.value}("");
        require(feeOk, "fee transfer failed");

        // Initialize curve market (also verifies the seeded reserve balance).
        (bool initOk, ) = bondingCurve.call(
            abi.encodeWithSignature(
                "initMarket(address,uint256,uint256,uint256,uint256,address,uint256)",
                token, totalSupplyWei, buyFeeBps, sellFeeBps, creatorFeeBps, msg.sender, curveShare
            )
        );
        require(initOk, "curve init failed");

        // Register perpetual market in PENDING status (never active at birth).
        (bool reg, ) = perpRegistry.call(abi.encodeWithSignature("registerMarket(address)", token));
        require(reg, "perp registration failed");

        emit TokenLaunched(token, msg.sender, totalSupplyWei, msg.value, block.timestamp);
        emit TokenLaunchedWithFees(token, msg.sender, supplyWhole, buyFeeBps, sellFeeBps, creatorFeeBps, block.timestamp);
    }
}
