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
