"use strict";
const { randomBytes } = require("node:crypto");
const { cohort, statistics, countAbove, publicSignals, PUBLIC_ORDER } = require("./model.cjs");
const salt128 = () => BigInt("0x" + randomBytes(16).toString("hex"));

async function createInputs(values) {
  const { buildPoseidon } = require("circomlibjs");
  const poseidon = await buildPoseidon();
  const hash = xs => BigInt(poseidon.F.toString(poseidon(xs)));
  const xs = cohort(values);
  const salt = salt128();
  const commitment = hash([102n, salt, ...xs]);
  const leafSalts = xs.map(salt128);
  const leaves = xs.map((x, i) => hash([101n, x, leafSalts[i]]));
  const parents = [hash([103n, leaves[0], leaves[1]]), hash([103n, leaves[2], leaves[3]])];
  const root = hash([103n, parents[0], parents[1]]);
  // O segundo registro é 38 na amostra original. Limites apenas didáticos.
  const cases = {
    intervalo: { commitment: leaves[1], min: 30n, max: 45n, value: xs[1], salt: leafSalts[1] },
    estatisticas: { commitment, ...statistics(values), values: xs, salt },
    contagem: { commitment, threshold: 30n, count: countAbove(values, 30), values: xs, salt },
    media_limiar: { commitment, threshold: 24n, values: xs, salt },
    merkle: { root, min: 30n, max: 45n, value: xs[1], salt: leafSalts[1],
      siblings: [leaves[0], parents[1]], directions: [1n, 0n] },
  };
  const statements = Object.fromEntries(Object.entries(cases).map(([name, input]) => [name, {
    circuit: name, publicOrder: PUBLIC_ORDER[name], publicSignals: publicSignals(name, input),
  }]));
  return { cases, statements, hash };
}
module.exports = { createInputs, salt128 };
