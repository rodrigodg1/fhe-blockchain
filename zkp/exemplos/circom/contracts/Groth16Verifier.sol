// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Verificador didático Groth16/BN254 com exatamente três entradas públicas.
/// @dev A chave vem de snarkjs zkey export verificationkey. Não há setter de chave.
///      Código educacional, sem auditoria. Não é o verificador otimizado do snarkjs.
contract Groth16Verifier {
    uint256 public constant SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 private constant BASE_FIELD =
        21888242871839275222246405745257275088696311157297823662689037894645226208583;

    uint256[2] private alpha;
    uint256[2][2] private beta;
    uint256[2][2] private gamma;
    uint256[2][2] private delta;
    uint256[2][4] private ic;
    bytes32 public immutable verificationKeyHash;

    constructor(
        uint256[2] memory alpha_,
        uint256[2][2] memory beta_,
        uint256[2][2] memory gamma_,
        uint256[2][2] memory delta_,
        uint256[2][4] memory ic_
    ) {
        require(boundedG1(alpha_) && boundedG2(beta_) && boundedG2(gamma_) && boundedG2(delta_), "Invalid key encoding");
        for (uint256 i = 0; i < 4; i++) {
            require(boundedG1(ic_[i]), "Invalid IC encoding");
            ic[i] = ic_[i];
        }
        alpha = alpha_;
        beta = beta_;
        gamma = gamma_;
        delta = delta_;
        verificationKeyHash = keccak256(abi.encode(alpha_, beta_, gamma_, delta_, ic_));
    }

    function boundedG1(uint256[2] memory p) private pure returns (bool) {
        return p[0] < BASE_FIELD && p[1] < BASE_FIELD;
    }

    function boundedG2(uint256[2][2] memory p) private pure returns (bool) {
        return p[0][0] < BASE_FIELD && p[0][1] < BASE_FIELD
            && p[1][0] < BASE_FIELD && p[1][1] < BASE_FIELD;
    }

    function ecAdd(uint256[2] memory a, uint256[2] memory b)
        private view returns (bool success, uint256[2] memory result)
    {
        uint256[4] memory data = [a[0], a[1], b[0], b[1]];
        assembly ("memory-safe") {
            success := staticcall(gas(), 6, data, 0x80, result, 0x40)
            success := and(success, eq(returndatasize(), 0x40))
        }
    }

    function ecMul(uint256[2] memory point, uint256 scalar)
        private view returns (bool success, uint256[2] memory result)
    {
        uint256[3] memory data = [point[0], point[1], scalar];
        assembly ("memory-safe") {
            success := staticcall(gas(), 7, data, 0x60, result, 0x40)
            success := and(success, eq(returndatasize(), 0x40))
        }
    }

    function setPair(
        uint256[24] memory data, uint256 offset,
        uint256[2] memory p, uint256[2][2] memory q
    ) private pure {
        data[offset] = p[0];
        data[offset + 1] = p[1];
        // G2 já está na ordem [imaginário, real] exigida pela EIP-197.
        data[offset + 2] = q[0][0];
        data[offset + 3] = q[0][1];
        data[offset + 4] = q[1][0];
        data[offset + 5] = q[1][1];
    }

    function pairing(
        uint256[2] memory a, uint256[2][2] memory b,
        uint256[2] memory c, uint256[2] memory vkx
    ) private view returns (bool) {
        uint256[24] memory data;
        uint256[2] memory negativeA = [a[0], a[1] == 0 ? 0 : BASE_FIELD - a[1]];
        setPair(data, 0, negativeA, b);
        setPair(data, 6, alpha, beta);
        setPair(data, 12, vkx, gamma);
        setPair(data, 18, c, delta);
        uint256[1] memory result;
        bool success;
        assembly ("memory-safe") {
            success := staticcall(gas(), 8, data, 0x300, result, 0x20)
            success := and(success, eq(returndatasize(), 0x20))
        }
        return success && result[0] == 1;
    }

    function verifyProof(
        uint256[2] calldata a, uint256[2][2] calldata b,
        uint256[2] calldata c, uint256[3] calldata publicSignals
    ) external view returns (bool) {
        if (!boundedG1(a) || !boundedG2(b) || !boundedG1(c)) return false;
        uint256[2] memory vkx = ic[0];
        for (uint256 i = 0; i < 3; i++) {
            // Sem esta checagem, x e x + SCALAR_FIELD poderiam ser confundidos.
            if (publicSignals[i] >= SCALAR_FIELD) return false;
            (bool ok, uint256[2] memory term) = ecMul(ic[i + 1], publicSignals[i]);
            if (!ok) return false;
            (ok, vkx) = ecAdd(vkx, term);
            if (!ok) return false;
        }
        // e(-A,B) * e(alpha,beta) * e(vkx,gamma) * e(C,delta) == 1.
        // As precompiladas também validam os pontos e o subgrupo G2.
        return pairing(a, b, c, vkx);
    }
}
