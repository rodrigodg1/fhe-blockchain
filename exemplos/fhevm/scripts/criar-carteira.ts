import { Wallet } from "ethers";

// Gera uma carteira local. Nao envia transacoes nem faz chamadas de rede.
const wallet = Wallet.createRandom();
const phrase = wallet.mnemonic?.phrase;
if (!phrase) {
  throw new Error("Nao foi possivel gerar a frase-semente");
}

console.log("Use esta carteira somente em redes de teste.");
console.log(`Endereco: ${wallet.address}`);
console.log(`Frase-semente: ${phrase}`);
console.log("Guarde a frase fora do repositorio. Nao compartilhe esta saida.");
