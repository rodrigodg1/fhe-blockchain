// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @notice Exemplo introdutorio: soma simples de dois valores em claro.
contract SimplePlain {
    function add(uint32 a, uint32 b) external pure returns (uint32) {
        return a + b;
    }
}
