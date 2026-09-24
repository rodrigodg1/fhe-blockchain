import { strict as assert } from "node:assert";
import { ethers, network } from "hardhat";
import { carregarAmostra, referencia } from "./dataset";

async function main() {
  if (network.name !== "hardhat") {
    throw new Error("Execute este exemplo na rede hardhat");
  }
  const data = carregarAmostra();
  const threshold = Number(process.env.HEALTHCARE_THRESHOLD ?? "30");
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 100) {
    throw new Error("Use um limiar inteiro em 0..100");
  }

  const factory = await ethers.getContractFactory("HealthPlain");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  // A funcao pure e consultada com uma chamada de leitura.
  const values = Array.from(await contract.calculate(data.values, threshold));
  assert.deepEqual(values, referencia(data.values, threshold));

  const [sum, squares, above, selectedSum] = values;
  const mean = Number(sum) / data.count;
  const variance = Number(squares) / data.count - mean * mean;
  console.log(`Soma: ${sum}`);
  console.log(`Soma dos quadrados: ${squares}`);
  console.log(`Media (%): ${mean.toFixed(2)}`);
  console.log(`Variancia populacional (p.p.^2): ${variance.toFixed(2)}`);
  console.log(`Quantidade acima de ${threshold}: ${above}`);
  console.log(`Soma acima de ${threshold}: ${selectedSum}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
