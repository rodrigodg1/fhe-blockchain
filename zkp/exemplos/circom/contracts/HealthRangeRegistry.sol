// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IRangeVerifier {
    function verifyProof(
        uint256[2] calldata a, uint256[2][2] calldata b,
        uint256[2] calldata c, uint256[3] calldata publicSignals
    ) external view returns (bool);
}

/// @notice Registra uma prova sobre um compromisso e intervalo definidos antes da submissão.
/// @dev Não contém prontuários, papéis de usuário, recompensas ou listas de permissão.
contract HealthRangeRegistry {
    uint256 private constant SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;
    IRangeVerifier public immutable verifier;
    uint256 public immutable commitment;
    uint256 public immutable minimum;
    uint256 public immutable maximum;
    bool public verified;

    error StatementMismatch();
    error InvalidProof();
    error AlreadyVerified();
    event RangeVerified(uint256 commitment, uint256 minimum, uint256 maximum);

    constructor(address verifier_, uint256 commitment_, uint256 minimum_, uint256 maximum_) {
        require(verifier_.code.length > 0, "Verifier must be a contract");
        require(commitment_ < SCALAR_FIELD, "Non-canonical commitment");
        require(minimum_ <= maximum_ && maximum_ <= 100, "Invalid interval");
        verifier = IRangeVerifier(verifier_);
        commitment = commitment_;
        minimum = minimum_;
        maximum = maximum_;
    }

    function submitProof(
        uint256[2] calldata a, uint256[2][2] calldata b,
        uint256[2] calldata c, uint256[3] calldata publicSignals
    ) external {
        if (verified) revert AlreadyVerified();
        if (publicSignals[0] != commitment || publicSignals[1] != minimum || publicSignals[2] != maximum) {
            revert StatementMismatch();
        }
        if (!verifier.verifyProof(a, b, c, publicSignals)) revert InvalidProof();
        verified = true;
        emit RangeVerified(commitment, minimum, maximum);
    }
}
