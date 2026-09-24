pragma circom 2.2.3;
include "common.circom";

template HealthcareMeanThreshold() {
    signal input commitment;
    signal input threshold;
    signal input values[4];
    signal input salt;

    component thresholdLimit = Percent();
    thresholdLimit.value <== threshold;
    component committed = CohortCommitment(4);
    committed.salt <== salt;
    signal acc[5];
    acc[0] <== 0;
    for (var i = 0; i < 4; i++) {
        committed.values[i] <== values[i];
        acc[i + 1] <== acc[i] + values[i];
    }
    committed.commitment === commitment;
    // Ambos os lados estão em 0..400 e cabem em 9 bits.
    component enough = GreaterEqThan(9);
    enough.in[0] <== acc[4];
    enough.in[1] <== 4 * threshold;
    enough.out === 1;
}

component main {public [commitment, threshold]} = HealthcareMeanThreshold();
