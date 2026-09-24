import { ethers, network } from "hardhat";

async function main() {
  const [account] = await ethers.getSigners();
  if (!account) throw new Error("Configure a carteira de teste");
  const balance = await ethers.provider.getBalance(account.address);
  console.log(`Rede: ${network.name}`);
  console.log(`Endereco: ${account.address}`);
  console.log(`Saldo (ETH): ${ethers.formatEther(balance)}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
