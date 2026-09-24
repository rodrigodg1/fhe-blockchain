pragma circom 2.2.3;
include "common.circom";

template HealthcareCount() {
    signal input commitment;
    signal input threshold;
    signal input count;
    signal input values[4];
    signal input salt;

    component thresholdLimit = Percent();
    thresholdLimit.value <== threshold;
    component committed = CohortCommitment(4);
    committed.salt <== salt;
    component above[4];
    signal acc[5];
    acc[0] <== 0;
    for (var i = 0; i < 4; i++) {
        committed.values[i] <== values[i];
        above[i] = GreaterThan(7);
        above[i].in[0] <== values[i];
        above[i].in[1] <== threshold;
        acc[i + 1] <== acc[i] + above[i].out;
    }
    committed.commitment === commitment;
    count === acc[4];
}

component main {public [commitment, threshold, count]} = HealthcareCount();
