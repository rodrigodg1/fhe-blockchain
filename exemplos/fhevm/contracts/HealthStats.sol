// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint8, euint32, externalEuint8}
    from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig}
    from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Calcula quatro estatisticas cifradas e publica os agregados.
contract HealthStats is ZamaEthereumConfig {
    event Results(
        bytes32 sum,
        bytes32 sumSquares,
        bytes32 countAbove,
        bytes32 sumAbove
    );

    function calculate(
        externalEuint8[4] calldata inputs,
        bytes calldata inputProof,
        uint8 threshold
    ) external {
        euint32 zero = FHE.asEuint32(0);
        euint32 one = FHE.asEuint32(1);
        euint32 sum = zero;
        euint32 sumSquares = zero;
        euint32 countAbove = zero;
        euint32 sumAbove = zero;

        for (uint256 i = 0; i < inputs.length; i++) {
            euint8 input = FHE.fromExternal(inputs[i], inputProof);
            euint32 value = FHE.asEuint32(input);

            sum = FHE.add(sum, value);
            sumSquares = FHE.add(sumSquares, FHE.mul(value, value));

            ebool above = FHE.gt(value, uint32(threshold));
            countAbove = FHE.add(countAbove, FHE.select(above, one, zero));
            sumAbove = FHE.add(sumAbove, FHE.select(above, value, zero));
        }

        // O cliente recupera os agregados para conferir os calculos.
        FHE.makePubliclyDecryptable(sum);
        FHE.makePubliclyDecryptable(sumSquares);
        FHE.makePubliclyDecryptable(countAbove);
        FHE.makePubliclyDecryptable(sumAbove);

        emit Results(
            FHE.toBytes32(sum),
            FHE.toBytes32(sumSquares),
            FHE.toBytes32(countAbove),
            FHE.toBytes32(sumAbove)
        );
    }
}
