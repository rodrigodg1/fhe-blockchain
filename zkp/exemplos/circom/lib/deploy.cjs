"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const { directory, read, prepared } = require("./files.cjs");
const { solidityKey, solidityProof } = require("./model.cjs");
async function deploy(hre) {
  prepared("intervalo");
  const d = directory("intervalo");
  const key = read(path.join(d, "groth16.vkey.json"));
  const proof = read(path.join(d, "groth16.proof.json"));
  const signals = read(path.join(d, "groth16.public.json"));
  // Referência escolhida antes da prova; não aceita uma declaração qualquer do provador.
  const expected = read(path.join(d, "statement.json")).publicSignals;
  assert.deepEqual(signals, expected);
  const verifier = await hre.ethers.deployContract("Groth16Verifier", solidityKey(key));
  await verifier.waitForDeployment();
  const registry = await hre.ethers.deployContract("HealthRangeRegistry", [await verifier.getAddress(), ...expected]);
  await registry.waitForDeployment();
  return { verifier, registry, args: solidityProof(proof, signals), key, expected };
}
module.exports = { deploy };
