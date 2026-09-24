pragma circom 2.2.3;
include "common.circom";

template HealthcareRange() {
    signal input commitment;
    signal input min;
    signal input max;
    signal input value;
    signal input salt;

    component interval = Interval();
    interval.value <== value;
    interval.min <== min;
    interval.max <== max;
    component committed = MeasurementCommitment();
    committed.value <== value;
    committed.salt <== salt;
    committed.commitment === commitment;
}

component main {public [commitment, min, max]} = HealthcareRange();
