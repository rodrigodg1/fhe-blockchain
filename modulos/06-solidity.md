# Módulo 6 — Os cálculos em um contrato Solidity

[Percurso](../README.md) · [Instalação](../INSTALACAO.md)


## Recursos usados

| Recurso | O que é | Por que usar |
|---|---|---|
| Solidity 0.8.27 | Linguagem de contratos inteligentes | Escrever as operações executadas pela EVM |
| EVM | Máquina virtual do Ethereum | Executar o código compilado do contrato |
| Hardhat 2 | Ambiente de desenvolvimento | Compilar, implantar e testar sem rede externa |
| ethers 6 | Biblioteca de interação com contratos | Usar contas e chamar funções a partir do TypeScript |
| TypeScript | JavaScript com tipos | Escrever scripts e testes com verificação de tipos |

## 1. Entenda contrato, compilação e implantação

Um contrato contém funções e pode conter estado persistente. Seu código Solidity
é compilado em bytecode para a EVM e em uma **ABI**, que descreve como chamar as
funções e interpretar os resultados.

**Implantar** significa criar uma instância do contrato na rede. Ela recebe um
endereço. O Hardhat gerencia a rede local; ethers usa a ABI para chamar a instância.
Neste primeiro contrato, todas as operações são sobre números em claro.

## 2. Confira a configuração

A instalação está em [INSTALACAO.md](../INSTALACAO.md). Os arquivos completos
`package.json`, `hardhat.config.ts` e `tsconfig.json`, com a explicação de cada
biblioteca, estão em [CONFIGURACAO.md](../CONFIGURACAO.md).

```bash
cd "$FHE_ROADMAP_ROOT/exemplos/fhevm"
nvm use
npm install
npx hardhat compile
```

Depois de existir um `package-lock.json`, use `npm ci` para reinstalar.
Não inicialize outro projeto dentro desta pasta.

## 3. Contrato completo: HealthPlain.sol

<!-- codigo: exemplos/fhevm/contracts/HealthPlain.sol -->
Arquivo: [`exemplos/fhevm/contracts/HealthPlain.sol`](../exemplos/fhevm/contracts/HealthPlain.sol).

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @notice Calcula quatro estatisticas sobre quatro valores em claro.
contract HealthPlain {
    function calculate(uint8[4] calldata values, uint8 threshold)
        external
        pure
        returns (
            uint32 sum,
            uint32 sumSquares,
            uint32 countAbove,
            uint32 sumAbove
        )
    {
        for (uint256 i = 0; i < values.length; i++) {
            // Amplie o tipo antes de multiplicar.
            uint32 value = uint32(values[i]);
            sum += value;
            sumSquares += value * value;

            if (value > threshold) {
                countAbove += 1;
                sumAbove += value;
            }
        }
    }
}
```
<!-- /codigo -->

### Entenda a estrutura

`pragma solidity ^0.8.27` aceita compiladores a partir de 0.8.27 e abaixo de 0.9.0.
O projeto fixa 0.8.27 na configuração. O comentário SPDX identifica a licença.

`contract HealthPlain` define o contrato. `uint8[4]` é um vetor de exatamente
quatro inteiros de 8 bits. `calldata` indica dados de entrada somente para leitura.
O limiar também é um `uint8`.

`external` expõe a função na interface do contrato. `pure` indica que ela não lê
nem modifica o estado da blockchain. A função retorna quatro `uint32` nomeados;
esses acumuladores começam em zero e são retornados ao final.

O laço percorre os quatro valores. A conversão para `uint32` acontece **antes**
da multiplicação. O `if` funciona aqui porque compara números em claro. Cada
chamada começa do zero; o contrato não acumula resultados de chamadas anteriores.

O tipo `uint8` comporta `0..255`. O carregador do exemplo exige percentuais em
`0..100`, mas o contrato não valida a origem clínica nem esse intervalo menor.
Mesmo para quatro valores iguais a 255, a soma dos quadrados, `260.100`, cabe em `uint32`.

## 4. Código completo: leitura dos dados

Os scripts e testes usam o mesmo arquivo abaixo. Ele verifica o JSON produzido
no módulo 1 e calcula a resposta em claro para comparação.

<!-- codigo: exemplos/fhevm/scripts/dataset.ts -->
Arquivo: [`exemplos/fhevm/scripts/dataset.ts`](../exemplos/fhevm/scripts/dataset.ts).

```typescript
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type QuatroValores = [number, number, number, number];

export interface Amostra {
  dataset_id: number;
  variable: string;
  values: QuatroValores;
  source_rows: number[];
  count: number;
  sum: number;
  mean: number;
}

export function carregarAmostra(): Amostra {
  const path = process.env.HEALTHCARE_DATASET ??
    resolve(__dirname, "../../../dados/processado/amostra.json");
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (typeof raw !== "object" || raw === null) throw new Error("Amostra invalida");
  const item = raw as Amostra;
  if (item.dataset_id !== 519 || item.variable !== "ejection_fraction") {
    throw new Error("Use o dataset UCI 519 e a coluna ejection_fraction");
  }
  if (!Array.isArray(item.values) || item.values.length !== 4 ||
      !item.values.every(v => Number.isInteger(v) && v >= 0 && v <= 100)) {
    throw new Error("O contrato usa quatro percentuais inteiros em 0..100");
  }
  if (!Array.isArray(item.source_rows) || item.source_rows.length !== 4 ||
      !item.source_rows.every(v => Number.isInteger(v) && v >= 1 && v <= 299) ||
      new Set(item.source_rows).size !== 4) throw new Error("Linhas invalidas");
  const sum = item.values.reduce((a, b) => a + b, 0);
  if (item.count !== 4 || item.sum !== sum || item.mean !== sum / 4) {
    throw new Error("Resultados de referencia inconsistentes");
  }
  return item;
}

export function referencia(values: number[], threshold: number): bigint[] {
  return [
    BigInt(values.reduce((a, b) => a + b, 0)),
    BigInt(values.reduce((a, b) => a + b * b, 0)),
    BigInt(values.filter(v => v > threshold).length),
    BigInt(values.filter(v => v > threshold).reduce((a, b) => a + b, 0)),
  ];
}
```
<!-- /codigo -->

`interface Amostra` descreve o formato esperado. `QuatroValores` é uma tupla com
quatro posições, compatível com o vetor fixo do contrato. As verificações no corpo
da função validam o conteúdo; uma declaração de tipo sozinha não valida um JSON.

`referencia` usa operações JavaScript e converte os resultados para `bigint`,
o tipo usado por ethers para os inteiros devolvidos pelo contrato.

## 5. Código completo: demonstração em claro

<!-- codigo: exemplos/fhevm/scripts/demo-plain.ts -->
Arquivo: [`exemplos/fhevm/scripts/demo-plain.ts`](../exemplos/fhevm/scripts/demo-plain.ts).

```typescript
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
```
<!-- /codigo -->

`getContractFactory` usa os artefatos compilados. `deploy` envia a implantação;
`waitForDeployment` aguarda sua conclusão. `contract.calculate` consulta a função
`pure`. Nessa forma de chamada, ethers usa uma simulação de leitura e não envia
uma nova transação para o cálculo.

`async` permite usar `await`. Cada `await` espera a conclusão da operação seguinte.
O bloco final `catch` mostra um erro e define um código de saída diferente de zero.

Execute:

```bash
cd "$FHE_ROADMAP_ROOT/exemplos/fhevm"
npm run demo:plain
```

Saída esperada:

```text
Soma: 98
Soma dos quadrados: 2644
Media (%): 24.50
Variancia populacional (p.p.^2): 60.75
Quantidade acima de 30: 1
Soma acima de 30: 38
```

## 6. Código completo: teste do contrato

<!-- codigo: exemplos/fhevm/test/HealthPlain.ts -->
Arquivo: [`exemplos/fhevm/test/HealthPlain.ts`](../exemplos/fhevm/test/HealthPlain.ts).

```typescript
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
```
<!-- /codigo -->

`describe` agrupa os testes. `it` define um caso. Para cada limiar, o teste implanta
uma instância e compara o retorno com a referência em claro.

```bash
npm run test:plain
```

A suíte contém três casos: limiares 20, 30 e 100. Ela verifica o cálculo Solidity;
não usa criptografia FHE.

## Referências

[Solidity — contratos](https://docs.soliditylang.org/en/latest/contracts.html) · [Hardhat 2](https://v2.hardhat.org/hardhat-runner/docs/getting-started) · [Ethers](https://docs.ethers.org/v6/)
