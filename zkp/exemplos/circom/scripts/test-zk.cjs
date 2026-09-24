"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { ROOT, FIELD, PUBLIC_ORDER, statistics, readDataset } = require("../lib/model.cjs");
const { directory, read, write } = require("../lib/files.cjs");
const { command, snark } = require("../lib/commands.cjs");
let checks = 0, serial = 0;

function witnessCheck(name, input, shouldPass) {
  const d = directory(name), id = ++serial;
  const f = path.join(d, "test-" + id + ".private.json"), w = path.join(d, "test-" + id + ".wtns");
  write(f, input, true);
  try {
    const result = snark(["wtns", "calculate", path.join(d, name + "_js", name + ".wasm"), f, w],
      { capture: true, allowFailure: true });
    if (shouldPass) {
      assert.equal(result.status, 0, result.stderr || result.stdout);
      snark(["wtns", "check", path.join(d, name + ".r1cs"), w], { capture: true });
    } else {
      assert.notEqual(result.status, 0, "Witness inválido foi aceito: " + name);
      assert.match(result.stderr + result.stdout, /Assert Failed|Error in template|constraint/i,
        "A falha deve vir das restrições, não de arquivo ausente ou dependência quebrada.");
    }
    checks++;
  } finally {
    fs.rmSync(f, { force: true }); fs.rmSync(w, { force: true });
  }
}
function rejectProof(name, proof, signals) {
  const d = directory(name), id = ++serial;
  const p = path.join(d, "test-proof-" + id + ".json"), s = path.join(d, "test-public-" + id + ".json");
  write(p, proof); write(s, signals);
  try {
    const result = command(process.execPath, [path.join(ROOT, "scripts", "verify.cjs"), "groth16",
      path.join(d, "groth16.vkey.json"), s, p], { capture: true, allowFailure: true });
    assert.equal(result.status, 1, "Esperada rejeição criptográfica, não falha de infraestrutura. " + result.stderr);
    assert.match(result.stdout, /PROVA INVALIDA/);
    checks++;
  } finally { fs.rmSync(p, { force: true }); fs.rmSync(s, { force: true }); }
}
async function main() {
  assert.deepEqual(readDataset().values, [20, 38, 20, 20], "Os testes de regressão usam a amostra original de quatro linhas.");
  command(process.execPath, [path.join(ROOT, "scripts", "zk.cjs"), "demo", "all"]);
  const { buildPoseidon } = require("circomlibjs");
  const poseidon = await buildPoseidon();
  const hash = xs => BigInt(poseidon.F.toString(poseidon(xs)));
  const originals = Object.fromEntries(Object.keys(PUBLIC_ORDER).map(n => [n, read(path.join(directory(n), "input.private.json"))]));
  const clone = n => structuredClone(originals[n]);
  const leafCommit = x => { x.commitment = hash([101n, BigInt(x.value), BigInt(x.salt)]).toString(); return x; };
  const cohortCommit = x => { x.commitment = hash([102n, BigInt(x.salt), ...x.values.map(BigInt)]).toString(); return x; };

  for (const name of Object.keys(PUBLIC_ORDER)) {
    witnessCheck(name, clone(name), true);
    const d = directory(name), proof = read(path.join(d, "groth16.proof.json"));
    const signals = read(path.join(d, "groth16.public.json"));
    assert.equal(signals.length, PUBLIC_ORDER[name].length);
    for (let i = 0; i < signals.length; i++) {
      const changed = [...signals]; changed[i] = ((BigInt(changed[i]) + 1n) % FIELD).toString();
      rejectProof(name, proof, changed);
    }
    const badProof = structuredClone(proof); badProof.pi_c = badProof.pi_a;
    rejectProof(name, badProof, signals);
  }
  for (const value of [30, 45]) {
    const x = clone("intervalo"); x.value = String(value); witnessCheck("intervalo", leafCommit(x), true);
  }
  for (const value of [0, 100]) {
    const x = clone("intervalo"); x.value = x.min = x.max = String(value); witnessCheck("intervalo", leafCommit(x), true);
  }
  for (const value of [29, 46, 101]) {
    const x = clone("intervalo"); x.value = String(value); witnessCheck("intervalo", leafCommit(x), false);
  }
  { const x = clone("intervalo"); x.value = "39"; witnessCheck("intervalo", x, false); }
  { const x = clone("intervalo"); x.salt = (BigInt(x.salt) + 1n).toString(); witnessCheck("intervalo", x, false); }
  { const x = clone("intervalo"); x.min = "46"; x.max = "45"; witnessCheck("intervalo", x, false); }
  { const x = clone("intervalo"); x.max = "101"; witnessCheck("intervalo", x, false); }
  { const x = clone("intervalo"); x.salt = (1n << 128n).toString(); witnessCheck("intervalo", leafCommit(x), false); }
  for (const field of ["sum", "sumSquares", "meanScaled", "varianceScaled"]) {
    const x = clone("estatisticas"); x[field] = (BigInt(x[field]) + 1n).toString(); witnessCheck("estatisticas", x, false);
  }
  for (const values of [[0, 0, 0, 0], [100, 100, 100, 100], [0, 100, 0, 100], [20, 38, 20, 21]]) {
    const x = clone("estatisticas"); x.values = values.map(String);
    Object.assign(x, statistics(values)); witnessCheck("estatisticas", cohortCommit(x), true);
  }
  { const x = clone("contagem"); x.count = "2"; witnessCheck("contagem", x, false); }
  for (const [t, count] of [[20, 1], [100, 0], [0, 4]]) {
    const x = clone("contagem"); x.threshold = String(t); x.count = String(count); witnessCheck("contagem", x, true);
  }
  { const x = clone("media_limiar"); x.threshold = "25"; witnessCheck("media_limiar", x, false); }
  { const x = clone("merkle"); x.directions[0] = "2"; witnessCheck("merkle", x, false); }
  { const x = clone("merkle"); x.directions[0] = "0"; witnessCheck("merkle", x, false); }
  { const x = clone("merkle"); x.siblings[0] = ((BigInt(x.siblings[0]) + 1n) % FIELD).toString(); witnessCheck("merkle", x, false); }
  { const x = clone("merkle"); x.root = ((BigInt(x.root) + 1n) % FIELD).toString(); witnessCheck("merkle", x, false); }
  console.log("Verificações criptográficas e de restrições aprovadas:", checks);
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
