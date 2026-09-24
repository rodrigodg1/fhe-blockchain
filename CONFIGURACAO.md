# Configuração dos projetos

[Instalação](INSTALACAO.md) · [Solidity](modulos/06-solidity.md) · [FHEVM](modulos/07-fhevm.md)

O repositório contém dois projetos independentes. Cargo gerencia o código Rust;
npm e Hardhat gerenciam Solidity e TypeScript. Não execute `npm install` na raiz:
execute dentro de `exemplos/fhevm`.

## Rust: Cargo.toml

Este arquivo define o nome do programa, a edição da linguagem e a biblioteca FHE.
`integer` habilita os tipos inteiros; `=1.8.1` fixa a dependência direta.
`publish = false` evita publicar este projeto por engano no registro de pacotes Rust.

<!-- codigo: exemplos/tfhe-rs/Cargo.toml -->
Arquivo: [`exemplos/tfhe-rs/Cargo.toml`](exemplos/tfhe-rs/Cargo.toml).

```toml
[package]
name = "fhe-healthcare"
version = "0.4.0"
edition = "2021"
default-run = "fhe-healthcare"
publish = false

[dependencies]
tfhe = { version = "=1.8.1", features = ["integer"] }
```
<!-- /codigo -->

`src/main.rs` é o programa padrão. Cada arquivo em `src/bin/` é outro executável.
`src/lib.rs` reúne funções usadas por esses programas. O nome `fhe-healthcare`
no manifesto vira `fhe_healthcare` nos imports Rust.

## Node.js: package.json

O arquivo a seguir é o manifesto completo. Não é necessário copiá-lo: ele já
está em `exemplos/fhevm/package.json`.

<!-- codigo: exemplos/fhevm/package.json -->
Arquivo: [`exemplos/fhevm/package.json`](exemplos/fhevm/package.json).

```json
{
  "name": "fhe-healthcare-contracts",
  "version": "0.4.0",
  "private": true,
  "description": "Operacoes FHE sobre dados de saude",
  "engines": {
    "node": ">=22 <23"
  },
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test --network hardhat",
    "typecheck": "tsc --noEmit",
    "demo": "hardhat run scripts/demo-healthcare.ts --network hardhat",
    "demo:sepolia": "hardhat run scripts/demo-healthcare.ts --network sepolia",
    "demo:plain": "hardhat run scripts/demo-plain.ts --network hardhat",
    "test:plain": "hardhat test test/HealthPlain.ts --network hardhat",
    "test:fhe": "hardhat test test/HealthStats.ts --network hardhat"
  },
  "dependencies": {
    "@fhevm/solidity": "0.11.1",
    "@fhevm/mock-utils": "0.4.2",
    "encrypted-types": "0.0.4"
  },
  "devDependencies": {
    "@fhevm/hardhat-plugin": "0.4.2",
    "@nomicfoundation/hardhat-ethers": "3.1.3",
    "@typechain/ethers-v6": "0.5.1",
    "@typechain/hardhat": "9.1.0",
    "@types/mocha": "10.0.10",
    "@types/node": "20.19.30",
    "@zama-fhe/relayer-sdk": "0.4.1",
    "ethers": "6.16.0",
    "hardhat": "2.28.6",
    "ts-node": "10.9.2",
    "typechain": "8.3.2",
    "typescript": "5.9.3"
  }
}
```
<!-- /codigo -->

### Para que serve cada dependência

| Pacote | Função no projeto |
|---|---|
| `@fhevm/solidity` | Fornece tipos e operações FHE para os contratos |
| `encrypted-types` | Define os tipos cifrados usados pela biblioteca Solidity |
| `@fhevm/hardhat-plugin` | Integra preparação de entradas e execução FHEVM ao Hardhat |
| `@fhevm/mock-utils` | Apoia a execução FHE simulada no ambiente local |
| `@zama-fhe/relayer-sdk` | Cliente da infraestrutura Zama, usado pela integração |
| `hardhat` | Compila, implanta e executa os testes |
| `ethers` | Codifica chamadas, usa contas e lê recibos e eventos |
| `@nomicfoundation/hardhat-ethers` | Disponibiliza ethers dentro do Hardhat |
| `typechain`, `@typechain/hardhat`, `@typechain/ethers-v6` | Geram tipos TypeScript a partir dos contratos compilados |
| `typescript`, `ts-node` | Verificam e executam os arquivos TypeScript |
| `@types/node`, `@types/mocha` | Descrevem os tipos das APIs Node e dos testes |

A configuração usa versões da mesma família do template Zama consultado. Isso
não significa que o projeto seja uma cópia do template, nem que as dependências
mais novas possam ser substituídas isoladamente.

Os testes usam o executor Mocha do Hardhat e `node:assert`, que já faz parte do Node.
Não é necessário instalar Chai para estes exemplos.

## Hardhat: hardhat.config.ts

<!-- codigo: exemplos/fhevm/hardhat.config.ts -->
Arquivo: [`exemplos/fhevm/hardhat.config.ts`](exemplos/fhevm/hardhat.config.ts).

```typescript
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
```
<!-- /codigo -->

Os três primeiros imports ativam os plugins. `defaultNetwork` escolhe a rede local
quando o comando não indica outra. `chainId` identifica a rede.

A entrada `sepolia` só é criada quando as duas variáveis estão configuradas.
Sem elas, você ainda pode compilar e executar os testes locais.

`version` fixa o compilador Solidity. `optimizer` habilita otimizações;
`viaIR` usa a representação intermediária do compilador. `evmVersion` escolhe
a versão da máquina virtual. Preserve esses ajustes enquanto acompanha os exemplos.

`typechain` define onde serão gravados os tipos gerados. `mocha.timeout` limita
o tempo de cada teste; não é uma estimativa de duração da execução em rede.

## TypeScript: tsconfig.json

<!-- codigo: exemplos/fhevm/tsconfig.json -->
Arquivo: [`exemplos/fhevm/tsconfig.json`](exemplos/fhevm/tsconfig.json).

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "types": [
      "node",
      "mocha"
    ]
  },
  "include": [
    "hardhat.config.ts",
    "scripts",
    "test",
    "types"
  ]
}
```
<!-- /codigo -->

`strict` habilita verificações de tipos. `target` permite os recursos usados,
como `bigint`; `module` mantém o formato esperado pelo projeto Hardhat 2.
`include` informa quais arquivos serão verificados. Não edite `types/` à mão:
essa pasta é gerada na compilação.

## Comandos npm

| Comando | Ação |
|---|---|
| `npm run compile` | Compila os contratos e gera os tipos |
| `npm run typecheck` | Verifica o TypeScript sem executá-lo |
| `npm run test:plain` | Executa os testes do contrato em claro |
| `npm run test:fhe` | Executa os testes FHEVM no modo local |
| `npm test` | Executa as duas suítes |
| `npm run demo:plain` | Implanta e consulta o contrato em claro |
| `npm run demo` | Implanta e executa o contrato cifrado localmente |
| `npm run demo:sepolia` | Executa o contrato cifrado em Sepolia |

## Referências

[Manifesto Cargo](https://doc.rust-lang.org/cargo/reference/manifest.html) ·
[Hardhat](https://v2.hardhat.org/hardhat-runner/docs/config) ·
[Dependências do template](https://github.com/zama-ai/fhevm-hardhat-template/blob/main/package.json) ·
[Ethers](https://docs.ethers.org/v6/) · [TypeScript](https://www.typescriptlang.org/docs/)
