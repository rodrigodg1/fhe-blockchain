import { strict as assert } from "node:assert";
import { ethers, fhevm } from "hardhat";
import type { HealthStats } from "../types";
import { carregarAmostra, referencia } from "../scripts/dataset";
import { calcular } from "../scripts/calculo";

describe("HealthStats", function () {
  before(function () {
    if (!fhevm.isMock) throw new Error("Use a rede hardhat para esta suite");
  });
  for (const threshold of [20, 30, 100]) {
    it(`calcula a amostra cifrada com limiar ${threshold}`, async function () {
      const values = carregarAmostra().values;
      const [signer] = await ethers.getSigners();
      const factory = await ethers.getContractFactory("HealthStats");
      const contract = (await factory.deploy()) as HealthStats;
      await contract.waitForDeployment();
      const result = await calcular(contract, signer, values, threshold);
      assert.deepEqual(result.values, referencia(values, threshold));
    });
  }
  it("calcula duas vezes sem acumular os resultados", async function () {
    const values = carregarAmostra().values;
    const [signer] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("HealthStats");
    const contract = (await factory.deploy()) as HealthStats;
    await contract.waitForDeployment();
    const first = await calcular(contract, signer, values, 30);
    const second = await calcular(contract, signer, values, 30);
    assert.deepEqual(first.values, second.values);
    assert.deepEqual(second.values, referencia(values, 30));
  });
});
