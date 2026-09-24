# Módulo 7 — As mesmas operações com FHEVM

[Percurso](../README.md) · [Instalação](../INSTALACAO.md)


## Recursos usados

| Recurso | O que é | Por que usar |
|---|---|---|
| FHEVM | Integração de operações FHE a contratos EVM | Expressar o cálculo cifrado em Solidity |
| `@fhevm/solidity` | Biblioteca Solidity da Zama | Usar tipos cifrados e operações `FHE.*` |
| `ZamaEthereumConfig` | Configuração de rede do contrato | Conectar o contrato aos componentes FHEVM |
| `@fhevm/hardhat-plugin` | Plugin para Hardhat | Criar entradas cifradas e recuperar resultados |
| `@zama-fhe/relayer-sdk` | Cliente da infraestrutura Zama | Apoiar o fluxo com os serviços da rede |

## 1. Entenda o que muda

No contrato anterior, `+`, `*` e `if` operavam sobre inteiros em claro.
Agora as entradas são cifradas no cliente. O contrato usa tipos e operações FHE;
o cliente recupera os resultados depois da transação.

| Em claro | Com FHEVM |
|---|---|
| `uint8` como entrada | `externalEuint8` e uma prova de entrada |
| `uint32` para calcular | `euint32` |
| `+` e `*` | `FHE.add` e `FHE.mul` |
| Comparação produz `bool` | `FHE.gt` produz `ebool` |
| `if` sobre o valor | `FHE.select` escolhe a parcela cifrada |
| Retorno numérico direto | Evento com handles, seguido de decifração no cliente |

Um **handle** identifica um ciphertext; não é o número em claro. Na arquitetura
Zama, o contrato registra operações e os coprocessadores executam o trabalho FHE.
No Hardhat local, esse comportamento é simulado.

## 2. Contrato completo: HealthStats.sol

<!-- codigo: exemplos/fhevm/contracts/HealthStats.sol -->
Arquivo: [`exemplos/fhevm/contracts/HealthStats.sol`](../exemplos/fhevm/contracts/HealthStats.sol).

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint8, euint32, externalEuint8}
    from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig}
    from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Calcula quatro estatisticas cifradas e publica os agregados.
contract HealthStats is ZamaEthereumConfig {
    event Results(
        bytes32 sum,
        bytes32 sumSquares,
        bytes32 countAbove,
        bytes32 sumAbove
    );

    function calculate(
        externalEuint8[4] calldata inputs,
        bytes calldata inputProof,
        uint8 threshold
    ) external {
        euint32 zero = FHE.asEuint32(0);
        euint32 one = FHE.asEuint32(1);
        euint32 sum = zero;
        euint32 sumSquares = zero;
        euint32 countAbove = zero;
        euint32 sumAbove = zero;

        for (uint256 i = 0; i < inputs.length; i++) {
            euint8 input = FHE.fromExternal(inputs[i], inputProof);
            euint32 value = FHE.asEuint32(input);

            sum = FHE.add(sum, value);
            sumSquares = FHE.add(sumSquares, FHE.mul(value, value));

            ebool above = FHE.gt(value, uint32(threshold));
            countAbove = FHE.add(countAbove, FHE.select(above, one, zero));
            sumAbove = FHE.add(sumAbove, FHE.select(above, value, zero));
        }

        // O cliente recupera os agregados para conferir os calculos.
        FHE.makePubliclyDecryptable(sum);
        FHE.makePubliclyDecryptable(sumSquares);
        FHE.makePubliclyDecryptable(countAbove);
        FHE.makePubliclyDecryptable(sumAbove);

        emit Results(
            FHE.toBytes32(sum),
            FHE.toBytes32(sumSquares),
            FHE.toBytes32(countAbove),
            FHE.toBytes32(sumAbove)
        );
    }
}
```
<!-- /codigo -->

### Entradas e conversões

Os imports trazem a biblioteca e os tipos utilizados. `is ZamaEthereumConfig`
faz o contrato herdar a configuração de rede.

`externalEuint8[4]` recebe quatro referências de entrada. `FHE.fromExternal`
valida a entrada com sua prova e produz um `euint8` usado no cálculo.
A prova não demonstra que o valor é uma medição clínica verdadeira.

`FHE.asEuint32(input)` amplia o tipo antes de multiplicar. Já
`FHE.asEuint32(0)` e `FHE.asEuint32(1)` criam representações cifradas de constantes
públicas. Isso não serve para esconder uma entrada enviada em claro.

### Soma, produto e seleção

Os acumuladores são locais à chamada. `FHE.mul(value, value)` calcula o quadrado;
`FHE.add` acumula as parcelas. `FHE.gt` produz uma condição cifrada.

`FHE.select(above, one, zero)` produz 1 ou 0 para a contagem.
`FHE.select(above, value, zero)` produz a parcela da soma filtrada.
Nenhuma condição é decifrada para decidir um desvio de execução Solidity.

### Resultados

`FHE.makePubliclyDecryptable` marca os quatro agregados para recuperação pública.
A chamada não retorna imediatamente o número em claro. O cliente usa os handles
emitidos no evento `Results` para solicitar a decifração.

`FHE.toBytes32` converte cada handle para o formato de 32 bytes do evento.
`emit` grava o evento no recibo da transação. A ordem é sempre: soma, soma dos
quadrados, contagem e soma filtrada.

Este exemplo publica os agregados para verificar os cálculos. Não adicione dados
clínicos privados. Uma soma filtrada com contagem 1 identifica o valor selecionado.

## 3. Código completo: enviar entradas e ler resultados

Este auxiliar é usado tanto pela demonstração quanto pelos testes.

<!-- codigo: exemplos/fhevm/scripts/calculo.ts -->
Arquivo: [`exemplos/fhevm/scripts/calculo.ts`](../exemplos/fhevm/scripts/calculo.ts).

```typescript
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
```
<!-- /codigo -->

`createEncryptedInput` prepara uma entrada para o endereço do contrato e a conta
que enviará a transação. As quatro chamadas a `add8` correspondem aos quatro
`externalEuint8`. `encrypt` produz os handles e `inputProof`.

`contract.calculate` envia esses dados. `tx.wait()` espera o recibo. O script
lê **o evento dessa transação**, evitando confundir o resultado com outra chamada.

`publicDecrypt` recupera os agregados e disponibiliza também material de prova
no resultado da API. Aqui mostramos os números no cliente e comparamos com a
amostra pública. Não há uma segunda função on-chain que receba esses números.
Se uma aplicação usar o plaintext recebido para alterar estado on-chain, precisará
verificar a prova de decifração; esse fluxo não está implementado neste exemplo.

## 4. Código completo: demonstração FHEVM

<!-- codigo: exemplos/fhevm/scripts/demo-healthcare.ts -->
Arquivo: [`exemplos/fhevm/scripts/demo-healthcare.ts`](../exemplos/fhevm/scripts/demo-healthcare.ts).

```typescript
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
```
<!-- /codigo -->

O script carrega a amostra, inicializa a integração e implanta `HealthStats`.
Depois chama `calcular` e compara a resposta com `referencia`, cujo código completo
está no [módulo 6](06-solidity.md).

`fhevm.isMock` informa se a execução usa a simulação local. A média e a variância
são calculadas no TypeScript, após recuperar os agregados, como no programa Rust.

## 5. Execute localmente

```bash
cd "$FHE_ROADMAP_ROOT/exemplos/fhevm"
npx hardhat compile
npm run typecheck
npm run demo
```

Os quatro resultados devem ser `[98, 2644, 1, 38]` para o limiar 30.
Endereços, hashes, gas e tempos variam. O modo `hardhat` cria uma rede nova a cada
execução; não precisa de carteira externa nem de saldo real.

A implantação e a chamada FHEVM são transações. Isso difere da consulta à função
`pure` do contrato em claro. Não compare seus tempos como se fossem a mesma operação.

## Referências

[Zama — operações](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations) · [Entradas](https://docs.zama.org/protocol/solidity-guides/smart-contract/inputs) · [Conversões](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations/casting) · [Resultados públicos](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle) · [Coprocessor](https://docs.zama.org/protocol/protocol/overview/coprocessor)
