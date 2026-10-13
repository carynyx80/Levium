// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LeviumPerpRegistry
 * @notice Lifecycle registry for perpetual markets:
 * REGISTERED -> OBSERVING -> ELIGIBLE -> ACTIVE, plus PAUSED / CLOSE_ONLY / DISABLED.
 *
 * This contract is REGISTRY + RISK GATING ONLY. It holds no trader collateral
 * and executes no leveraged fills. Collateral vault / position accounting /
 * funding / liquidation contracts are separate and stay undeployed with real
 * funds until independent audits + explicit authorization.
 */
contract LeviumPerpRegistry is AccessControl, Pausable {
    bytes32 public constant RISK_ADMIN = keccak256("RISK_ADMIN");

    enum Status { REGISTERED, OBSERVING, ELIGIBLE, ACTIVE, PAUSED, CLOSE_ONLY, DISABLED }

    struct RiskParams {
        uint256 minLiquidity;
        uint256 minObservationSecs;
        uint256 maxDeviationBps;
        uint256 maxOpenInterest;
        uint256 maxPositionSize;
        uint8 maxLeverage;
        uint16 mmrBps;
    }

    mapping(address => Status) public marketStatus;
    mapping(address => RiskParams) public riskParams;
    mapping(address => uint256) public registeredAt;

    event MarketRegistered(address indexed token);
    event MarketStatusChanged(address indexed token, Status prevStatus, Status newStatus);
    event RiskParamsUpdated(address indexed token);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RISK_ADMIN, admin);
    }

    /// @notice Called by the token factory at launch: markets are born REGISTERED (pending).
    function registerMarket(address token) external {
        require(marketStatus[token] == Status.REGISTERED && registeredAt[token] == 0, "exists");
        marketStatus[token] = Status.REGISTERED;
        registeredAt[token] = block.timestamp;
        emit MarketRegistered(token);
    }

    function setRiskParams(address token, RiskParams calldata p) external onlyRole(RISK_ADMIN) {
        require(registeredAt[token] != 0, "unknown market");
        require(p.maxLeverage >= 2 && p.maxLeverage <= 10, "leverage 2-10");
        riskParams[token] = p;
        emit RiskParamsUpdated(token);
    }

    /// @notice Forward-only activation: REGISTERED -> OBSERVING -> ELIGIBLE -> ACTIVE.
    /// PAUSED / CLOSE_ONLY / DISABLED reachable from any state by risk admin.
    function setMarketStatus(address token, Status next) external onlyRole(RISK_ADMIN) {
        Status prev = marketStatus[token];
        require(registeredAt[token] != 0, "unknown market");
        if (next == Status.OBSERVING) require(prev == Status.REGISTERED, "bad transition");
        else if (next == Status.ELIGIBLE) require(prev == Status.OBSERVING, "bad transition");
        else if (next == Status.ACTIVE) require(prev == Status.ELIGIBLE, "bad transition");
        else require(
            next == Status.PAUSED || next == Status.CLOSE_ONLY || next == Status.DISABLED,
            "bad transition"
        );
        marketStatus[token] = next;
        emit MarketStatusChanged(token, prev, next);
    }

    function pause() external onlyRole(RISK_ADMIN) { _pause(); }
    function unpause() external onlyRole(RISK_ADMIN) { _unpause(); }
}
