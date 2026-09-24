import { strict as assert } from "node:assert";
import { ethers } from "hardhat";
import type { SimplePlain } from "../types";

describe("SimplePlain", function () {
  it("soma dois valores em claro (20 + 38 = 58)", async function () {
    const factory = await ethers.getContractFactory("SimplePlain");
    const contract = (await factory.deploy()) as SimplePlain;
    await contract.waitForDeployment();

    const sum = await contract.add(20, 38);
    assert.equal(sum, 58n);
  });
});
