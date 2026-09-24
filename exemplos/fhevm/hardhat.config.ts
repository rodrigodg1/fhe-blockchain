import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-ethers";
import "@typechain/hardhat";
import { vars, type HardhatUserConfig } from "hardhat/config";

// A rede local nao precisa destas variaveis.
const rpc = vars.get("SEPOLIA_RPC_URL", "");
const mnemonic = vars.get("MNEMONIC", "");

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: { chainId: 31337 },
    ...(rpc && mnemonic
      ? {
          sepolia: {
            chainId: 11155111,
            url: rpc,
            accounts: { mnemonic, count: 1 },
          },
        }
      : {}),
  },
  solidity: {
    version: "0.8.27",
    settings: {
      viaIR: true,
      optimizer: { enabled: true, runs: 800 },
      evmVersion: "cancun",
    },
  },
  typechain: { outDir: "types", target: "ethers-v6" },
  mocha: { timeout: 120000 },
};

export default config;
