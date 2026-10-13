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
}
