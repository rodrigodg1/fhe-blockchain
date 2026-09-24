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

## 2. Contrato introdutório cifrado: SimpleAdd.sol

Em contrapartida direta a `SimplePlain.sol` do módulo 6, este contrato realiza
a mesma soma elementar de dois números (`20 + 38 = 58`), mas operando exclusivamente
sobre dados cifrados com a biblioteca FHEVM. O contrato nunca tem acesso aos valores
em claro.

<!-- codigo: exemplos/fhevm/contracts/SimpleAdd.sol -->
Arquivo: [`exemplos/fhevm/contracts/SimpleAdd.sol`](../exemplos/fhevm/contracts/SimpleAdd.sol).

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint32, externalEuint32}
    from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig}
    from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Exemplo introdutorio: soma simples de dois valores cifrados.
contract SimpleAdd is ZamaEthereumConfig {
    event Result(bytes32 sumHandle);

    function add(
        externalEuint32 inputA,
        externalEuint32 inputB,
        bytes calldata inputProof
    ) external {
        // 1. Carrega e valida as entradas cifradas com a prova criptografica.
        euint32 a = FHE.fromExternal(inputA, inputProof);
        euint32 b = FHE.fromExternal(inputB, inputProof);

        // 2. Executa a adicao homomorfica diretamente sobre os ciphertexts.
        euint32 sum = FHE.add(a, b);

        // 3. Libera o resultado cifrado para decifracao publica.
        FHE.makePubliclyDecryptable(sum);

        // 4. Emite o handle do resultado para o cliente solicitar a decifracao.
        emit Result(FHE.toBytes32(sum));
    }
}
```
<!-- /codigo -->

### Como o fluxo funciona

1. **Entradas externas**: `inputA` e `inputB` recebem handles cifrados produzidos
   no cliente (`externalEuint32`).
2. **Prova de entrada**: `inputProof` comprova criptograficamente que as entradas
   foram cifradas para o endereço deste contrato e assinadas pelo remetente.
3. **Conversão FHE**: `FHE.fromExternal` valida a prova e instancia os tipos
   cifrados internos `euint32`.
4. **Cálculo homomórfico**: `FHE.add(a, b)` calcula a soma diretamente sobre
   os ciphertexts.
5. **Permissão de decifração**: `FHE.makePubliclyDecryptable(sum)` autoriza que
   o handle resultante seja decifrado publicamente.
6. **Emissão do handle**: `emit Result(FHE.toBytes32(sum))` publica o handle
   de 32 bytes no recibo da transação.

### Teste do contrato introdutório cifrado

O teste a seguir demonstra o ciclo FHEVM completo: geração da entrada cifrada
no cliente com o plugin do Hardhat, envio da transação, captura do handle
emitido no evento e decifração pública com `fhevm.publicDecrypt`.

<!-- codigo: exemplos/fhevm/test/SimpleAdd.ts -->
Arquivo: [`exemplos/fhevm/test/SimpleAdd.ts`](../exemplos/fhevm/test/SimpleAdd.ts).

```typescript
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
```
<!-- /codigo -->

## 3. Contrato completo com estatísticas: HealthStats.sol

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

## 4. Código completo: enviar entradas e ler resultados

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

## 5. Código completo: demonstração FHEVM

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

## 6. Execute localmente

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
