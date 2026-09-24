import { performance } from "node:perf_hooks";
import { fhevm } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { BytesLike } from "ethers";
import type { HealthStats } from "../types";

export async function calcular(
  contract: HealthStats, signer: HardhatEthersSigner,
  values: number[], threshold: number,
) {
  if (values.length !== 4 || !values.every(v => Number.isInteger(v) && v >= 0 && v <= 100)) {
    throw new Error("Use quatro percentuais inteiros em 0..100");
  }
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 100) {
    throw new Error("Use um limiar inteiro em 0..100");
  }
  const address = await contract.getAddress();
  const startInput = performance.now();
  const builder = fhevm.createEncryptedInput(address, signer.address);
  for (const value of values) builder.add8(value);
  const encrypted = await builder.encrypt();
  const inputMs = performance.now() - startInput;
  if (encrypted.handles.length !== 4) {
    throw new Error("Esperados quatro handles de entrada");
  }
  const handlesIn: [BytesLike, BytesLike, BytesLike, BytesLike] = [
    encrypted.handles[0], encrypted.handles[1], encrypted.handles[2], encrypted.handles[3],
  ];
  const startTx = performance.now();
  const tx = await contract.connect(signer).calculate(handlesIn, encrypted.inputProof, threshold);
  console.log(`Transacao: ${tx.hash}`);
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error(`Transacao sem sucesso: ${tx.hash}`);
  const txMs = performance.now() - startTx;

  // Use o evento desta transacao, nao o estado de outra chamada.
  const events = receipt.logs
    .filter(log => log.address.toLowerCase() === address.toLowerCase())
    .map(log => contract.interface.parseLog(log))
    .filter(log => log?.name === "Results");
  if (events.length !== 1 || !events[0]) throw new Error("Evento Results ausente ou duplicado");
  const handles = [0, 1, 2, 3].map(i => String(events[0]!.args[i]) as `0x${string}`);
  const startRead = performance.now();
  const decrypted = await fhevm.publicDecrypt(handles);
  const valuesOut = handles.map(handle => {
    const value = decrypted.clearValues[handle];
    if (typeof value !== "bigint") throw new Error("Resultado deve ser inteiro");
    return value;
  });
  return {
    values: valuesOut, handles, txHash: tx.hash, gasUsed: receipt.gasUsed,
    inputMs, txMs, readMs: performance.now() - startRead,
  };
}
