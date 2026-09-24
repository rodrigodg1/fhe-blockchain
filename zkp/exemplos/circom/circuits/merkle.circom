pragma circom 2.2.3;
include "common.circom";

template HealthcareBatchMembership() {
    signal input root;
    signal input min;
    signal input max;
    signal input value;
    signal input salt;
    signal input siblings[2];
    signal input directions[2];

    component interval = Interval();
    interval.value <== value;
    interval.min <== min;
    interval.max <== max;
    component leaf = MeasurementCommitment();
    leaf.value <== value;
    leaf.salt <== salt;
    signal current[3];
    signal left[2];
    signal right[2];
    component nodes[2];
    current[0] <== leaf.commitment;
    for (var i = 0; i < 2; i++) {
        // 0: current fica à esquerda; 1: current fica à direita.
        directions[i] * (directions[i] - 1) === 0;
        left[i] <== current[i] + directions[i] * (siblings[i] - current[i]);
        right[i] <== siblings[i] + directions[i] * (current[i] - siblings[i]);
        nodes[i] = Poseidon(3);
        nodes[i].inputs[0] <== 103;
        nodes[i].inputs[1] <== left[i];
        nodes[i].inputs[2] <== right[i];
        current[i + 1] <== nodes[i].out;
    }
    current[2] === root;
}

component main {public [root, min, max]} = HealthcareBatchMembership();
