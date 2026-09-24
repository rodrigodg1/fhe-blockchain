"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { FIELD, statistics, countAbove, cohort, scalar, publicSignals, g2, solidityProof, solidityKey } = require("../lib/model.cjs");

test("estatísticas da amostra pública do repositório", () => {
  assert.deepEqual(statistics([20, 38, 20, 20]), {
    sum: 98n, sumSquares: 2644n, meanScaled: 245000n, varianceScaled: 607500n,
  });
});
test("escala preserva quatro casas decimais sem arredondamento", () => {
  assert.equal(statistics([20, 38, 20, 21]).varianceScaled, 586875n);
});
test("limites zero, cem e variância máxima do exemplo", () => {
  assert.equal(statistics([0, 0, 0, 0]).varianceScaled, 0n);
  assert.equal(statistics([100, 100, 100, 100]).meanScaled, 1000000n);
  assert.equal(statistics([0, 100, 0, 100]).varianceScaled, 25000000n);
});
test("contagem é estritamente maior, não maior ou igual", () => {
  assert.equal(countAbove([20, 38, 20, 20], 20), 1n);
  assert.equal(countAbove([20, 38, 20, 20], 30), 1n);
  assert.equal(countAbove([20, 38, 20, 20], 100), 0n);
  assert.equal(countAbove([20, 38, 20, 20], 0), 4n);
});
test("rejeita dados fora do domínio", () => {
  for (const v of [-1, 101, 20.5, "20", null, NaN, true]) assert.throws(() => cohort([v, 20, 20, 20]));
});
test("coorte tem tamanho fixo", () => {
  assert.throws(() => cohort([]));
  assert.throws(() => cohort([20, 38, 20, 20, 20]));
});
test("campo escalar e sua representação canônica", () => {
  assert.equal(scalar((FIELD - 1n).toString()), FIELD - 1n);
  for (const x of [FIELD.toString(), "-1", "01", "1.0", "0x01", 1, ""]) assert.throws(() => scalar(x));
});
test("ordem das entradas públicas corresponde ao componente main", () => {
  assert.deepEqual(publicSignals("intervalo", { max: "45", commitment: "9", min: "30" }), ["9", "30", "45"]);
  assert.throws(() => publicSignals("nao_existe", {}));
});
test("conversão de G2 inverte coeficientes uma única vez", () => {
  assert.deepEqual(g2([["11", "12"], ["21", "22"], ["1", "0"]]), [["12", "11"], ["22", "21"]]);
  assert.throws(() => g2([]));
});
test("conversão ABI mantém sinais e troca a ordem de G2", () => {
  const proof = { protocol: "groth16", curve: "bn128", pi_a: ["1", "2", "1"],
    pi_b: [["11", "12"], ["21", "22"], ["1", "0"]], pi_c: ["3", "4", "1"] };
  assert.deepEqual(solidityProof(proof, ["9", "30", "45"]),
    [["1", "2"], [["12", "11"], ["22", "21"]], ["3", "4"], ["9", "30", "45"]]);
  assert.throws(() => solidityProof({ ...proof, protocol: "plonk" }, ["9", "30", "45"]));
});
test("chave de outro circuito é recusada pelo adaptador", () => {
  assert.throws(() => solidityKey({ protocol: "groth16", curve: "bn128", nPublic: 5, IC: [] }));
});
