// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint32, externalEuint32}
    from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig}
    from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Exemplo introdutorio: soma simples de dois valores cifrados.
contract SimpleAdd is ZamaEthereumConfig {
    event Result(bytes32 sumHandle);

    function add(
        externalEuint32 inputA,
        externalEuint32 inputB,
        bytes calldata inputProof
    ) external {
        // 1. Carrega e valida as entradas cifradas com a prova criptografica.
        euint32 a = FHE.fromExternal(inputA, inputProof);
        euint32 b = FHE.fromExternal(inputB, inputProof);

        // 2. Executa a adicao homomorfica diretamente sobre os ciphertexts.
        euint32 sum = FHE.add(a, b);

        // 3. Libera o resultado cifrado para decifracao publica.
        FHE.makePubliclyDecryptable(sum);

        // 4. Emite o handle do resultado para o cliente solicitar a decifracao.
        emit Result(FHE.toBytes32(sum));
    }
}
