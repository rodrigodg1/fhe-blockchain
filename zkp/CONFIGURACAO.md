# Configuração e código de apoio completos

Os arquivos abaixo pertencem somente a `zkp/exemplos/circom`. Os circuitos e
contratos estão completos nos módulos correspondentes. Estes arquivos cuidam da
instalação local, geração de dados, processos, artefatos e testes.

`package.json` fixa as dependências diretas. `hardhat.config.cjs` usa o solc local,
sem buscar binários durante a compilação. `lib/model.cjs` define o domínio, as
estatísticas em claro e as conversões ABI. `lib/files.cjs` detecta artefatos locais
incompatíveis. `scripts/zk.cjs` implementa todo o fluxo descrito na instalação.

Os checksums de build detectam mudanças acidentais; não são uma assinatura de
origem. A rotina de setup continua sendo local e didática. Os testes de integração
exigem dependências instaladas e não são substituídos pelos testes unitários.
[Estado de validação](VALIDACAO.md).

## `package.json`

<!-- codigo: zkp/exemplos/circom/package.json -->
```json
{
  "name": "fhe-blockchain-zkp-healthcare",
  "version": "1.0.0",
  "private": true,
  "description": "Exemplos isolados de ZKP em healthcare: Circom, Groth16, PLONK e Solidity",
  "engines": {
    "node": ">=22 <23"
  },
  "scripts": {
    "doctor": "node scripts/zk.cjs doctor",
    "compilar": "node scripts/zk.cjs compile all",
    "preparar": "node scripts/zk.cjs setup all",
    "dados": "node scripts/zk.cjs inputs",
    "witness": "node scripts/zk.cjs witness",
    "provar": "node scripts/zk.cjs prove",
    "verificar": "node scripts/zk.cjs verify",
    "demo": "node scripts/zk.cjs demo",
    "demo:todos": "node scripts/zk.cjs demo all",
    "demo:plonk": "node scripts/zk.cjs plonk intervalo",
    "test": "npm run test:unit && npm run test:zk && npm run test:contratos",
    "test:unit": "node --test test/unit.test.cjs",
    "test:zk": "node scripts/test-zk.cjs",
    "test:contratos": "hardhat test --network hardhat",
    "compile:solidity": "hardhat compile",
    "demo:contrato": "hardhat run scripts/onchain.cjs --network hardhat",
    "exportar:verificador": "node scripts/zk.cjs export intervalo",
    "limpar": "node scripts/zk.cjs clean"
  },
  "dependencies": {
    "circomlib": "2.0.5",
    "circomlibjs": "0.1.7",
    "snarkjs": "0.7.6"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-ethers": "3.1.3",
    "ethers": "6.16.0",
    "hardhat": "2.28.6",
    "solc": "0.8.24"
  }
}
```
<!-- fim-codigo -->

## `hardhat.config.cjs`

<!-- codigo: zkp/exemplos/circom/hardhat.config.cjs -->
```javascript
require("@nomicfoundation/hardhat-ethers");
const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

// Usa o solc instalado neste projeto. Não baixa outro compilador durante o teste.
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(
  async ({ solcVersion }, _hre, runSuper) => {
    if (solcVersion !== "0.8.24") return runSuper();
    return {
      compilerPath: require.resolve("solc/soljson.js"),
      isSolcJs: true,
      version: "0.8.24",
      longVersion: require("solc").version(),
    };
  }
);
module.exports = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: { hardhat: { chainId: 31337 } },
  paths: { tests: "./test/contracts" },
  mocha: { timeout: 120000 },
};
```
<!-- fim-codigo -->

## `lib/model.cjs`

<!-- codigo: zkp/exemplos/circom/lib/model.cjs -->
```javascript
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
```
<!-- fim-codigo -->

## `lib/commands.cjs`

<!-- codigo: zkp/exemplos/circom/lib/commands.cjs -->
```javascript
"use strict";
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { ROOT } = require("./model.cjs");
function command(executable, args, { capture = false, allowFailure = false } = {}) {
  const result = spawnSync(executable, args, {
    cwd: ROOT, encoding: "utf8", stdio: capture ? "pipe" : "inherit", maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw new Error("Não foi possível executar " + executable + ": " + result.error.message);
  if (result.signal) throw new Error("Processo interrompido por " + result.signal);
  if (result.status !== 0 && !allowFailure) {
    throw new Error("Falha em " + path.basename(executable) + " (código " + result.status + "). " +
      (capture ? (result.stderr || result.stdout || "") : "Consulte a saída acima."));
  }
  return result;
}
function snark(args, options) {
  // Resolve a CLI da dependência local. Não usa instalações globais nem npx remoto.
  const cli = path.join(path.dirname(require.resolve("snarkjs")), "cli.cjs");
  return command(process.execPath, [cli, ...args], options);
}
module.exports = { command, snark };
```
<!-- fim-codigo -->

## `lib/files.cjs`

<!-- codigo: zkp/exemplos/circom/lib/files.cjs -->
```javascript
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { ROOT, PUBLIC_ORDER, json } = require("./model.cjs");
function directory(name) {
  if (!Object.hasOwn(PUBLIC_ORDER, name)) throw new Error("Circuito desconhecido: " + name);
  return path.join(ROOT, "build", name);
}
function read(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function write(file, object, privateFile = false) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, json(object), { mode: privateFile ? 0o600 : 0o644 });
  if (privateFile) fs.chmodSync(file, 0o600);
}
function digest(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function sourcesDigest() {
  const hash = crypto.createHash("sha256");
  const visit = dir => {
    for (const name of fs.readdirSync(dir).sort()) {
      const f = path.join(dir, name);
      if (fs.statSync(f).isDirectory()) visit(f);
      else if (f.endsWith(".circom")) hash.update(path.relative(ROOT, f)).update(fs.readFileSync(f));
    }
  };
  visit(path.join(ROOT, "circuits"));
  visit(path.join(ROOT, "node_modules", "circomlib", "circuits"));
  hash.update(fs.readFileSync(path.join(ROOT, "package.json")));
  return hash.digest("hex");
}
function compiled(name) {
  const d = directory(name);
  const manifest = read(path.join(d, "compiled.json"));
  const expected = {
    sources: sourcesDigest(),
    r1cs: digest(path.join(d, name + ".r1cs")),
    wasm: digest(path.join(d, name + "_js", name + ".wasm")),
  };
  for (const key of Object.keys(expected)) {
    if (manifest[key] !== expected[key]) throw new Error("Circuito alterado: execute compilar e refaça o setup. " + name);
  }
  return expected;
}
function prepared(name, protocol = "groth16") {
  const d = directory(name);
  const manifest = read(path.join(d, protocol + ".meta.json"));
  const current = compiled(name);
  for (const key of Object.keys(current)) {
    if (manifest[key] !== current[key]) throw new Error("Setup incompatível. Execute npm run limpar e gere novamente.");
  }
  for (const [key, file] of [["zkey", protocol + ".zkey"], ["vkey", protocol + ".vkey.json"]]) {
    if (manifest[key] !== digest(path.join(d, file))) throw new Error("Artefato de setup alterado: " + file);
  }
  return manifest;
}
module.exports = { directory, read, write, digest, sourcesDigest, compiled, prepared };
```
<!-- fim-codigo -->

## `scripts/zk.cjs`

<!-- codigo: zkp/exemplos/circom/scripts/zk.cjs -->
```javascript
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
```
<!-- fim-codigo -->

## `scripts/verify.cjs`

<!-- codigo: zkp/exemplos/circom/scripts/verify.cjs -->
```javascript
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
```
<!-- fim-codigo -->

## `test/unit.test.cjs`

<!-- codigo: zkp/exemplos/circom/test/unit.test.cjs -->
```javascript
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
```
<!-- fim-codigo -->

## `scripts/test-zk.cjs`

<!-- codigo: zkp/exemplos/circom/scripts/test-zk.cjs -->
```javascript
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
```
<!-- fim-codigo -->

[Voltar ao índice](README.md)
