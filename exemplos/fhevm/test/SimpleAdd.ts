import { strict as assert } from "node:assert";
import { ethers, fhevm } from "hardhat";
import type { SimpleAdd } from "../types";

describe("SimpleAdd", function () {
  before(function () {
    if (!fhevm.isMock) throw new Error("Use a rede hardhat para esta suite");
  });

  it("soma dois valores cifrados (20 + 38 = 58)", async function () {
    const [signer] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("SimpleAdd");
    const contract = (await factory.deploy()) as SimpleAdd;
    await contract.waitForDeployment();
    const address = await contract.getAddress();

    // 1. Cria e cifra as entradas localmente no cliente
    const input = fhevm.createEncryptedInput(address, signer.address);
    input.add32(20);
    input.add32(38);
    const enc = await input.encrypt();

    // 2. Envia a chamada com os handles e a prova de cifracao
    const tx = await contract.connect(signer).add(enc.handles[0], enc.handles[1], enc.inputProof);
    const receipt = await tx.wait();
    assert(receipt && receipt.status === 1);

    // 3. Captura o handle do resultado a partir do evento
    const events = receipt.logs
      .filter(log => log.address.toLowerCase() === address.toLowerCase())
      .map(log => contract.interface.parseLog(log))
      .filter(log => log?.name === "Result");
    assert.equal(events.length, 1);
    const resultHandle = String(events[0]!.args[0]) as `0x${string}`;

    // 4. Decifra publicamente o resultado atraves do servico FHEVM
    const decrypted = await fhevm.publicDecrypt([resultHandle]);
    const clearSum = decrypted.clearValues[resultHandle];

    assert.equal(clearSum, 58n);
  });
});
