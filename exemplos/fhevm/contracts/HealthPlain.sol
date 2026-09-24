// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @notice Calcula quatro estatisticas sobre quatro valores em claro.
contract HealthPlain {
    function calculate(uint8[4] calldata values, uint8 threshold)
        external
        pure
        returns (
            uint32 sum,
            uint32 sumSquares,
            uint32 countAbove,
            uint32 sumAbove
        )
    {
        for (uint256 i = 0; i < values.length; i++) {
            // Amplie o tipo antes de multiplicar.
            uint32 value = uint32(values[i]);
            sum += value;
            sumSquares += value * value;

            if (value > threshold) {
                countAbove += 1;
                sumAbove += value;
            }
        }
    }
}
