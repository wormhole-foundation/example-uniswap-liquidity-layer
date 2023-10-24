// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.9;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool success);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool success);
}