"use strict";
const assert = require("node:assert/strict");
const hre = require("hardhat");
const { deploy } = require("../../lib/deploy.cjs");
const { FIELD } = require("../../lib/model.cjs");

describe("Groth16 em healthcare — prova real, sem mock de verificação", function () {
  let verifier, registry, args, expected;
  before(async function () { ({ verifier, registry, args, expected } = await deploy(hre)); });

  it("aceita a prova gerada para o circuito intervalo", async function () {
    assert.equal(await verifier.verifyProof(...args), true);
  });
  it("rejeita cada sinal público adulterado", async function () {
    for (let i = 0; i < 3; i++) {
      const bad = structuredClone(args);
      bad[3][i] = (BigInt(bad[3][i]) + 1n).toString();
      assert.equal(await verifier.verifyProof(...bad), false);
    }
  });
  it("rejeita codificação não canônica do campo escalar", async function () {
    const bad = structuredClone(args);
    bad[3][0] = (BigInt(bad[3][0]) + FIELD).toString();
    assert.equal(await verifier.verifyProof(...bad), false);
  });
  it("rejeita uma prova com C trocado por A", async function () {
    const bad = structuredClone(args);
    bad[2] = bad[0];
    assert.equal(await verifier.verifyProof(...bad), false);
  });
  it("rejeita coordenada fora do campo base", async function () {
    const bad = structuredClone(args);
    bad[0][0] = "21888242871839275222246405745257275088696311157297823662689037894645226208583";
    assert.equal(await verifier.verifyProof(...bad), false);
  });
  it("uma prova válida não vale para outro compromisso esperado", async function () {
    const other = await hre.ethers.deployContract("HealthRangeRegistry", [await verifier.getAddress(),
      (BigInt(expected[0]) + 1n) % FIELD, expected[1], expected[2]]);
    await other.waitForDeployment();
    await assert.rejects(other.submitProof(...args));
    assert.equal(await other.verified(), false);
  });
  it("não registra prova inválida mesmo com sinais públicos corretos", async function () {
    const bad = structuredClone(args);
    bad[2] = bad[0];
    await assert.rejects(registry.submitProof(...bad));
    assert.equal(await registry.verified(), false);
  });
  it("registra uma prova válida e emite o evento", async function () {
    const receipt = await (await registry.submitProof(...args)).wait();
    assert.equal(await registry.verified(), true);
    const events = receipt.logs.map(log => { try { return registry.interface.parseLog(log); } catch { return null; } });
    const event = events.find(e => e && e.name === "RangeVerified");
    assert.ok(event);
    assert.equal(event.args.commitment.toString(), expected[0]);
  });
  it("não registra duas vezes a mesma declaração", async function () {
    await assert.rejects(registry.submitProof(...args));
  });
});
