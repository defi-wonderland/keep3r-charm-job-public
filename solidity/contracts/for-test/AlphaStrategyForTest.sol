// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4 <0.9.0;

contract AlphaStrategyForTest {
  uint256 public rebalanceTimestamp;

  constructor() {
    rebalanceTimestamp = block.timestamp;
  }

  function setRebalance(uint256 _timedelta) public {
    rebalanceTimestamp = block.timestamp - _timedelta;
  }

  function lastRebalance() external view returns (uint256) {
    return rebalanceTimestamp;
  }
}
