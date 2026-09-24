"use strict";
const hre = require("hardhat");
const assert = require("node:assert/strict");
const { deploy } = require("../lib/deploy.cjs");
async function main() {
  const { verifier, registry, args } = await deploy(hre);
  assert.equal(await verifier.verifyProof(...args), true, "Verificador rejeitou a prova.");
  const receipt = await (await registry.submitProof(...args)).wait();
  assert.equal(await registry.verified(), true);
  console.log("Verificador:", await verifier.getAddress());
  console.log("Registro:", await registry.getAddress());
  console.log("Hash da chave de verificação:", await verifier.verificationKeyHash());
  console.log("Prova aceita:", await registry.verified());
  console.log("Gas da submissão medido nesta execução:", receipt.gasUsed.toString());
  console.log("Rede Hardhat local. Não foi enviada transação a uma rede pública.");
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
