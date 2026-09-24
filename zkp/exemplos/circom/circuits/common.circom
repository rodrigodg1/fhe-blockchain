pragma circom 2.2.3;
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

// A fração de ejeção é representada como inteiro de 0 a 100.
// Num2Bits impede que um elemento arbitrário do campo finito vire um "inteiro".
template Percent() {
    signal input value;
    component bits = Num2Bits(7);
    bits.in <== value;
    component upper = LessEqThan(7);
    upper.in[0] <== value;
    upper.in[1] <== 100;
    upper.out === 1;
}

template Interval() {
    signal input value;
    signal input min;
    signal input max;
    component v = Percent();
    component lo = Percent();
    component hi = Percent();
    v.value <== value;
    lo.value <== min;
    hi.value <== max;
    component ge = GreaterEqThan(7);
    component le = LessEqThan(7);
    ge.in[0] <== value;
    ge.in[1] <== min;
    le.in[0] <== value;
    le.in[1] <== max;
    ge.out === 1;
    le.out === 1;
}

// 101 separa o compromisso de uma medida dos hashes de outros objetos.
template MeasurementCommitment() {
    signal input value;
    signal input salt;
    signal output commitment;
    component v = Percent();
    v.value <== value;
    component saltBits = Num2Bits(128);
    saltBits.in <== salt;
    component hash = Poseidon(3);
    hash.inputs[0] <== 101;
    hash.inputs[1] <== value;
    hash.inputs[2] <== salt;
    commitment <== hash.out;
}

// A ordem dos quatro valores faz parte do compromisso.
template CohortCommitment(n) {
    signal input values[n];
    signal input salt;
    signal output commitment;
    component limits[n];
    component saltBits = Num2Bits(128);
    saltBits.in <== salt;
    component hash = Poseidon(n + 2);
    hash.inputs[0] <== 102;
    hash.inputs[1] <== salt;
    for (var i = 0; i < n; i++) {
        limits[i] = Percent();
        limits[i].value <== values[i];
        hash.inputs[i + 2] <== values[i];
    }
    commitment <== hash.out;
}
