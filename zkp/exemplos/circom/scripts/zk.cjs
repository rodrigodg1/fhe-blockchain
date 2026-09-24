"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const assert = require("node:assert/strict");
const { ROOT, PUBLIC_ORDER, readDataset } = require("../lib/model.cjs");
const { directory, read, write, digest, sourcesDigest, compiled, prepared } = require("../lib/files.cjs");
const { command, snark } = require("../lib/commands.cjs");
const ALL = Object.keys(PUBLIC_ORDER);

function select(name = "intervalo") {
  if (name === "all") return ALL;
  if (!ALL.includes(name)) throw new Error("Circuito desconhecido. Use: " + ALL.join(", "));
  return [name];
}
function compile(name) {
  const version = command("circom", ["--version"], { capture: true }).stdout.trim();
  if (!/\b2\.2\.3\b/.test(version)) throw new Error("Este exemplo fixa Circom 2.2.3. Encontrado: " + version);
  const d = directory(name);
  fs.mkdirSync(d, { recursive: true });
  command("circom", [path.join(ROOT, "circuits", name + ".circom"), "--r1cs", "--wasm", "--sym",
    "--inspect", "--O1", "-l", path.join(ROOT, "node_modules"), "-o", d]);
  snark(["r1cs", "info", path.join(d, name + ".r1cs")]);
  write(path.join(d, "compiled.json"), { version, sources: sourcesDigest(),
    r1cs: digest(path.join(d, name + ".r1cs")), wasm: digest(path.join(d, name + "_js", name + ".wasm")) });
}
function tau() {
  const d = path.join(ROOT, "build", "setup-local");
  const final = path.join(d, "pot14_final.ptau");
  fs.mkdirSync(d, { recursive: true });
  if (!fs.existsSync(final)) {
    console.warn("SETUP LOCAL DIDATICO. Não é uma cerimônia multi-institucional auditada. Não use em produção.");
    const first = path.join(d, "pot14_0000.ptau"), second = path.join(d, "pot14_0001.ptau");
    snark(["powersoftau", "new", "bn128", "14", first]);
    snark(["powersoftau", "contribute", first, second, "--name=contribuicao-local",
      "-e=" + randomBytes(64).toString("hex")]);
    snark(["powersoftau", "prepare", "phase2", second, final]);
  }
  snark(["powersoftau", "verify", final]);
  return final;
}
function setup(name, ptau, protocol = "groth16") {
  const d = directory(name), current = compiled(name);
  const meta = path.join(d, protocol + ".meta.json");
  if (fs.existsSync(meta)) {
    const saved = prepared(name, protocol);
    if (saved.ptau !== digest(ptau)) throw new Error("Powers of Tau alterado. Limpe o build e refaça o setup.");
    console.log("Setup existente e compatível:", name, protocol);
    return;
  }
  const r1cs = path.join(d, name + ".r1cs"), key = path.join(d, protocol + ".zkey");
  if (protocol === "groth16") {
    const initial = path.join(d, "groth16_initial.zkey");
    snark(["groth16", "setup", r1cs, ptau, initial]);
    snark(["zkey", "contribute", initial, key, "--name=circuito-local-" + name,
      "-e=" + randomBytes(64).toString("hex")]);
    snark(["zkey", "verify", r1cs, ptau, key]);
  } else {
    snark(["plonk", "setup", r1cs, ptau, key]);
  }
  const vkey = path.join(d, protocol + ".vkey.json");
  snark(["zkey", "export", "verificationkey", key, vkey]);
  write(meta, { ...current, protocol, ptau: digest(ptau), zkey: digest(key), vkey: digest(vkey), localTeachingSetup: true });
}
async function inputs(force = false) {
  const available = ALL.every(name => ["input.private.json", "statement.json"].every(file =>
    fs.existsSync(path.join(directory(name), file))));
  if (available && !force) {
    console.log("Reutilizando as entradas locais. npm run dados cria novos salts e invalida as provas anteriores.");
    return;
  }
  const { createInputs } = require("../lib/inputs.cjs");
  const { values, source } = readDataset();
  const data = await createInputs(values);
  for (const name of ALL) {
    const d = directory(name);
    write(path.join(d, "input.private.json"), data.cases[name], true);
    write(path.join(d, "statement.json"), { ...data.statements[name], source,
      warning: "Referência local do exemplo, não assinatura de hospital nem certificação dos dados." });
    // Uma nova entrada não reutiliza a prova anterior por acidente.
    for (const protocol of ["groth16", "plonk"]) {
      for (const suffix of [".proof.json", ".public.json"]) fs.rmSync(path.join(d, protocol + suffix), { force: true });
    }
  }
  console.log("Entradas locais criadas a partir de", source, values);
  console.log("Salt e witness são privados. Os dados desta demonstração já são públicos.");
}
function witness(name, inputFile) {
  compiled(name);
  const d = directory(name);
  const source = inputFile ? path.resolve(process.cwd(), inputFile) : path.join(d, "input.private.json");
  const out = path.join(d, "witness.wtns");
  snark(["wtns", "calculate", path.join(d, name + "_js", name + ".wasm"), source, out]);
  fs.chmodSync(out, 0o600);
  snark(["wtns", "check", path.join(d, name + ".r1cs"), out]);
}
function verify(name, protocol = "groth16") {
  prepared(name, protocol);
  const d = directory(name);
  const pub = path.join(d, protocol + ".public.json");
  assert.deepEqual(read(pub), read(path.join(d, "statement.json")).publicSignals,
    "A prova não corresponde à declaração pública esperada.");
  command(process.execPath, [path.join(ROOT, "scripts", "verify.cjs"), protocol,
    path.join(d, protocol + ".vkey.json"), pub, path.join(d, protocol + ".proof.json")]);
  console.log(name, "sinais públicos:", read(pub));
}
function prove(name, protocol = "groth16") {
  prepared(name, protocol);
  witness(name);
  const d = directory(name);
  snark([protocol, "prove", path.join(d, protocol + ".zkey"), path.join(d, "witness.wtns"),
    path.join(d, protocol + ".proof.json"), path.join(d, protocol + ".public.json")]);
  verify(name, protocol);
}
function doctor() {
  if (Number(process.versions.node.split(".")[0]) !== 22) throw new Error("Use Node.js 22 neste projeto isolado.");
  console.log("Node:", process.version);
  console.log(command("circom", ["--version"], { capture: true }).stdout.trim());
  for (const pkg of ["circomlib", "circomlibjs", "snarkjs", "hardhat", "ethers", "solc"]) {
    console.log(pkg + ":", read(path.join(ROOT, "node_modules", pkg, "package.json")).version);
  }
  console.log("Dataset:", readDataset().values);
}
async function main() {
  const [action = "help", name = "intervalo", extra] = process.argv.slice(2);
  if (action === "doctor") return doctor();
  if (action === "inputs") return inputs(true);
  if (action === "clean") {
    for (const dir of ["build", "artifacts", "cache"]) fs.rmSync(path.join(ROOT, dir), { recursive: true, force: true });
    console.log("Somente os artefatos do projeto zkp/exemplos/circom foram removidos.");
    return;
  }
  const names = select(name);
  if (action === "compile") return names.forEach(compile);
  if (action === "setup") { const ptau = tau(); return names.forEach(n => setup(n, ptau)); }
  if (action === "witness") return names.forEach(n => witness(n, extra));
  if (action === "prove") return names.forEach(n => prove(n));
  if (action === "verify") return names.forEach(n => verify(n));
  if (action === "demo" || action === "plonk") {
    names.forEach(compile);
    const protocol = action === "plonk" ? "plonk" : "groth16";
    const ptau = tau();
    names.forEach(n => setup(n, ptau, protocol));
    await inputs();
    names.forEach(n => prove(n, protocol));
    return;
  }
  if (action === "export") {
    prepared(name);
    const d = directory(name);
    snark(["zkey", "export", "solidityverifier", path.join(d, "groth16.zkey"), path.join(d, "VerifierGenerated.sol")]);
    const source = fs.readFileSync(path.join(d, "VerifierGenerated.sol"), "utf8");
    fs.writeFileSync(path.join(d, "VERIFICADOR-GERADO.md"), "# Verificador gerado pelo snarkjs\n\n```solidity\n" + source + "\n```\n");
    return;
  }
  if (action !== "help") throw new Error("Comando desconhecido: " + action);
  console.log("Uso: node scripts/zk.cjs <comando> [circuito|all]\n" +
    "Comandos: doctor, compile, setup, inputs, witness, prove, verify, demo, plonk, export, clean\nCircuitos: " + ALL.join(", "));
}
main().then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });
