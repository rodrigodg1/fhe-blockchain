pragma circom 2.2.3;
include "common.circom";

template HealthcareStatistics() {
    signal input commitment;
    signal input sum;
    signal input sumSquares;
    signal input meanScaled;
    signal input varianceScaled;
    signal input values[4];
    signal input salt;

    component committed = CohortCommitment(4);
    committed.salt <== salt;
    signal acc[5];
    signal accSquares[5];
    signal square[4];
    acc[0] <== 0;
    accSquares[0] <== 0;
    for (var i = 0; i < 4; i++) {
        committed.values[i] <== values[i];
        square[i] <== values[i] * values[i];
        acc[i + 1] <== acc[i] + values[i];
        accSquares[i + 1] <== accSquares[i] + square[i];
    }
    committed.commitment === commitment;
    sum === acc[4];
    sumSquares === accSquares[4];

    // 10.000 é divisível por 4 e por 16: não há arredondamento nesta amostra.
    component meanBits = Num2Bits(20);
    component varianceBits = Num2Bits(27);
    meanBits.in <== meanScaled;
    varianceBits.in <== varianceScaled;
    4 * meanScaled === 10000 * sum;
    signal squaredSum;
    squaredSum <== sum * sum;
    16 * varianceScaled === 10000 * (4 * sumSquares - squaredSum);
}

component main {public [commitment, sum, sumSquares, meanScaled, varianceScaled]} = HealthcareStatistics();
