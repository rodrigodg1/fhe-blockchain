"use strict";
const fs = require("node:fs");
const path = require("node:path");
const FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_ORDER = Object.freeze({
  intervalo: ["commitment", "min", "max"],
  estatisticas: ["commitment", "sum", "sumSquares", "meanScaled", "varianceScaled"],
  contagem: ["commitment", "threshold", "count"],
  media_limiar: ["commitment", "threshold"],
  merkle: ["root", "min", "max"],
});
function percent(value) {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error("Esperado inteiro de 0 a 100, sem casas decimais.");
  }
  return BigInt(value);
}
function cohort(values) {
  if (!Array.isArray(values) || values.length !== 4) throw new Error("Esperados exatamente 4 valores.");
  return values.map(percent);
}
function statistics(values) {
  const xs = cohort(values);
  const sum = xs.reduce((s, x) => s + x, 0n);
  const sumSquares = xs.reduce((s, x) => s + x * x, 0n);
  return {
    sum, sumSquares,
    meanScaled: 10000n * sum / 4n,
    varianceScaled: 10000n * (4n * sumSquares - sum * sum) / 16n,
  };
}
function countAbove(values, threshold) {
  const t = percent(threshold);
  return cohort(values).reduce((n, x) => n + (x > t ? 1n : 0n), 0n);
}
function scalar(value) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value) || value.length > 77) {
    throw new Error("Elemento do campo deve ser string decimal canônica.");
  }
  const n = BigInt(value);
  if (n >= FIELD) throw new Error("Elemento fora do campo escalar BN254.");
  return n;
}
function publicSignals(name, input) {
  if (!Object.hasOwn(PUBLIC_ORDER, name)) throw new Error("Circuito desconhecido: " + name);
  return PUBLIC_ORDER[name].map((key) => scalar(String(input[key])).toString());
}
function readDataset() {
  // ROOT = repositorio/zkp/exemplos/circom. Não altera os dados existentes.
  const file = path.resolve(ROOT, "../../../dados/processado/amostra.json");
  if (!fs.existsSync(file)) throw new Error("Dados ausentes: " + file + ". Copie o incremento para o repositório existente.");
  const dataset = JSON.parse(fs.readFileSync(file, "utf8"));
  if (dataset.variable !== "ejection_fraction" || dataset.public_reference_only !== true) {
    throw new Error("Use somente a amostra pública ejection_fraction do repositório.");
  }
  cohort(dataset.values);
  return { values: dataset.values, source: "dados/processado/amostra.json", dataset };
}
function json(value) {
  return JSON.stringify(value, (_key, x) => typeof x === "bigint" ? x.toString() : x, 2) + "\n";
}
// snarkjs usa coeficientes [real, imaginário]; EIP-197 exige [imaginário, real].
function g1(point) {
  if (!Array.isArray(point) || point.length < 2) throw new Error("Ponto G1 inválido.");
  return [String(point[0]), String(point[1])];
}
function g2(point) {
  if (!Array.isArray(point) || point.length < 2 || point.slice(0, 2).some(x => !Array.isArray(x) || x.length < 2)) {
    throw new Error("Ponto G2 inválido.");
  }
  return [[String(point[0][1]), String(point[0][0])], [String(point[1][1]), String(point[1][0])]];
}
function solidityProof(proof, signals) {
  if (proof.protocol !== "groth16" || proof.curve !== "bn128" || signals.length !== 3) {
    throw new Error("O contrato deste exemplo aceita Groth16/BN254 com 3 sinais públicos.");
  }
  signals.forEach(scalar);
  return [g1(proof.pi_a), g2(proof.pi_b), g1(proof.pi_c), signals];
}
function solidityKey(vkey) {
  if (vkey.protocol !== "groth16" || vkey.curve !== "bn128" || Number(vkey.nPublic) !== 3 || vkey.IC.length !== 4) {
    throw new Error("Chave incompatível com o circuito intervalo.");
  }
  return [g1(vkey.vk_alpha_1), g2(vkey.vk_beta_2), g2(vkey.vk_gamma_2), g2(vkey.vk_delta_2), vkey.IC.map(g1)];
}
module.exports = { FIELD, ROOT, PUBLIC_ORDER, percent, cohort, statistics, countAbove, scalar,
  publicSignals, readDataset, json, g1, g2, solidityProof, solidityKey };
