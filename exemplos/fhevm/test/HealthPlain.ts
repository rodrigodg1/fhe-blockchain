import { strict as assert } from "node:assert";
import { ethers } from "hardhat";
import { carregarAmostra, referencia } from "../scripts/dataset";

describe("HealthPlain", function () {
  for (const threshold of [20, 30, 100]) {
    it(`calcula a amostra com limiar ${threshold}`, async function () {
      const values = carregarAmostra().values;
      const factory = await ethers.getContractFactory("HealthPlain");
      const contract = await factory.deploy();
      await contract.waitForDeployment();
      const result = await contract.calculate(values, threshold);
      assert.deepEqual(Array.from(result), referencia(values, threshold));
    });
  }
});
