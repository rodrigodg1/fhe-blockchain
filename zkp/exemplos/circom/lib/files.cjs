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
