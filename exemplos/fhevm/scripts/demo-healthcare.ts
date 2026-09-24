import { strict as assert } from "node:assert";
import { ethers, fhevm, network } from "hardhat";
import type { HealthStats } from "../types";
import { carregarAmostra, referencia } from "./dataset";
import { calcular } from "./calculo";

async function main() {
  if (!["hardhat", "sepolia"].includes(network.name)) throw new Error("Use hardhat ou sepolia");
  const data = carregarAmostra();
  const threshold = Number(process.env.HEALTHCARE_THRESHOLD ?? "30");
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 100) {
    throw new Error("Use um limiar inteiro em 0..100");
  }
  if (network.name === "sepolia") {
    await fhevm.initializeCLIApi();
  } else {
    const env = (fhevm as any)._fhevmEnv;
    if (env && !env.isDeployed) {
      env.setRunningInHHTest();
      await env.deploy();
    }
  }
  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error("Configure a carteira de teste");
  if (!fhevm.isMock && await ethers.provider.getBalance(signer.address) === 0n) {
    throw new Error(`Conta sem ETH de Sepolia: ${signer.address}`);
  }
  const factory = await ethers.getContractFactory("HealthStats");
  const contract = (await factory.deploy()) as HealthStats;
  console.log(`Implantacao: ${contract.deploymentTransaction()?.hash}`);
  await contract.waitForDeployment();
  console.log(`Contrato: ${await contract.getAddress()}`);
  console.log(`Rede: ${network.name}; FHE simulado: ${fhevm.isMock}`);
  const result = await calcular(contract, signer, data.values, threshold);
  assert.deepEqual(result.values, referencia(data.values, threshold));
  const [sum, squares, above, selectedSum] = result.values;
  const mean = Number(sum) / data.count;
  const variance = Number(squares) / data.count - mean * mean;
  console.log(`Soma: ${sum}`);
  console.log(`Soma dos quadrados: ${squares}`);
  console.log(`Media (%): ${mean.toFixed(2)}`);
  console.log(`Variancia populacional (p.p.^2): ${variance.toFixed(2)}`);
  console.log(`Quantidade acima de ${threshold}: ${above}`);
  console.log(`Soma acima de ${threshold}: ${selectedSum}`);
  console.log(`Gas da chamada calculate: ${result.gasUsed}`);
  console.log(`Entrada (ms): ${result.inputMs.toFixed(1)}`);
  console.log(`Envio e recibo (ms): ${result.txMs.toFixed(1)}`);
  console.log(`Recuperacao (ms): ${result.readMs.toFixed(1)}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
