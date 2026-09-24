"use strict";
const fs = require("node:fs");
async function main() {
  const [protocol, keyFile, publicFile, proofFile] = process.argv.slice(2);
  if (!["groth16", "plonk"].includes(protocol) || !proofFile) throw new Error("Uso: verify.cjs protocolo vkey public proof");
  const snarkjs = require("snarkjs");
  const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
  const valid = await snarkjs[protocol].verify(read(keyFile), read(publicFile), read(proofFile));
  console.log(valid ? "PROVA VALIDA" : "PROVA INVALIDA");
  return valid ? 0 : 1;
}
main().then(code => process.exit(code)).catch(error => { console.error(error.message); process.exit(2); });
