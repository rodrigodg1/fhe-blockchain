# FHE aplicada a dados de saúde

[Início](README.md) · [Referências](REFERENCIAS.md) · [Verificações](VALIDACAO.md)

Este arquivo reúne a instalação, a configuração e os oito módulos. Os mesmos textos estão disponíveis em arquivos separados. Os blocos mostram o código completo dos arquivos usados em cada etapa.

## Percurso

- [Instalação](#instalacao)
- [Configuração dos projetos](#configuracao)
- [Módulo 1 — FHE e dados de saúde](#modulo-01)
- [Módulo 2 — Chaves e soma com TFHE-rs](#modulo-02)
- [Módulo 3 — Soma, multiplicação e estatísticas](#modulo-03)
- [Módulo 4 — Comparação e seleção cifrada](#modulo-04)
- [Módulo 5 — Arquivos e execução em processos separados](#modulo-05)
- [Módulo 6 — Os cálculos em um contrato Solidity](#modulo-06)
- [Módulo 7 — As mesmas operações com FHEVM](#modulo-07)
- [Módulo 8 — Testes, recortes e Sepolia](#modulo-08)

---

<a id="instalacao"></a>

## Instalação

[Início](README.md) · [Configuração completa](CONFIGURACAO.md) · [Módulo 1](modulos/01-fhe-e-dados.md)

Use um terminal Bash no Ubuntu, no WSL2 ou no macOS. Execute um bloco por vez.
Se um comando falhar, resolva o erro antes de continuar.

### 1. Entenda o que será instalado

| Recurso | O que é | Por que aparece aqui |
|---|---|---|
| Git | Controle de versões | Manter e publicar o código |
| Python 3.10 ou superior | Linguagem de programação | Preparar CSV e JSON usando a biblioteca padrão |
| Rust | Linguagem compilada | Executar a biblioteca TFHE-rs |
| rustup | Gerenciador de ferramentas Rust | Instalar e atualizar o compilador |
| Cargo | Gerenciador de projetos Rust | Baixar dependências, compilar e executar |
| Node.js 22 | Ambiente de execução JavaScript | Executar Hardhat e os scripts dos contratos |
| npm | Gerenciador de pacotes Node.js | Instalar as versões declaradas no projeto |
| Hardhat 2.28.6 | Ambiente de desenvolvimento Ethereum | Compilar Solidity e executar testes |

Rust é necessário para os módulos 2–5. Node.js e Hardhat são necessários para os
módulos 6–8. Você não precisa instalar uma blockchain completa, GPU ou carteira
para executar os exemplos locais.

### 2. Prepare o sistema

#### Windows: instale o Ubuntu no WSL2

Abra o PowerShell como administrador e execute:

```powershell
wsl --install -d Ubuntu
```

Reinicie o computador se o instalador solicitar. Abra o aplicativo Ubuntu e crie
seu usuário e sua senha Linux. No PowerShell, confira a versão:

```powershell
wsl --list --verbose
```

A distribuição deve mostrar `VERSION 2`. Se mostrar `1`, converta-a:

```powershell
wsl --set-version Ubuntu 2
```

**Daqui em diante, use o terminal do Ubuntu.** Instale Rust e Node dentro dele,
não apenas no Windows. Siga a seção Ubuntu abaixo.

#### Ubuntu: instale as ferramentas do sistema

```bash
sudo apt update
sudo apt install -y build-essential pkg-config libssl-dev \
  git curl ca-certificates python3 unzip less
```

`build-essential` instala compiladores e ferramentas de ligação.
`curl` baixa os instaladores; `ca-certificates` permite validar conexões HTTPS.
Python prepara os dados; `unzip` extrai o pacote.

Confira:

```bash
git --version
python3 --version
curl --version
```

#### macOS: instale as ferramentas do sistema

Abra o Terminal e execute:

```bash
xcode-select --install
```

Conclua a instalação da janela aberta. Ela fornece Git e ferramentas de compilação.
Confira Python:

```bash
git --version
python3 --version
```

Se Python não existir ou estiver abaixo de 3.10, baixe o instalador Python 3 para
macOS na [página oficial](https://www.python.org/downloads/macos/), abra o arquivo
`.pkg` e conclua a instalação. Reabra o terminal e confira `python3 --version`.
Para usar os blocos deste guia no mesmo shell, execute `bash` no Terminal.
Não execute os comandos `apt` no macOS.

### 3. Instale Rust e Cargo

Baixe o instalador oficial:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
  -o /tmp/rustup-instalar.sh
```

Você pode ler o script com `less /tmp/rustup-instalar.sh`; pressione `q` para sair.
Execute-o e escolha a instalação padrão quando solicitado:

```bash
sh /tmp/rustup-instalar.sh
source "$HOME/.cargo/env"
rustup update stable
```

Confira as três ferramentas:

```bash
rustup --version
rustc --version
cargo --version
```

`rustc` é o compilador. Cargo usa esse compilador para construir os programas.
`source` carrega a configuração no terminal atual. Não use `sudo cargo`.

A biblioteca TFHE-rs será instalada por Cargo no passo 7. Ela não é instalada
por um comando global separado. Use os parâmetros padrão da biblioteca; não
reduza parâmetros criptográficos para contornar limitações da máquina.

### 4. Instale Node.js 22 e npm

Usaremos **nvm**, que instala versões de Node por usuário. Baixe a versão indicada
do instalador oficial:

```bash
export NVM_DIR="$HOME/.nvm"
curl --proto '=https' --tlsv1.2 -fsSL \
  https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh \
  -o /tmp/nvm-instalar.sh
```

Leia o arquivo com `less /tmp/nvm-instalar.sh` e saia com `q`. Depois:

```bash
bash /tmp/nvm-instalar.sh
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm install 22
nvm use 22
nvm alias default 22
```

Confira:

```bash
command -v nvm
node --version
npm --version
```

`command -v nvm` deve retornar `nvm`. Node deve mostrar uma versão `v22.x`.
O npm acompanha a instalação de Node; não é necessário instalá-lo separadamente.

A série 22 é a base deste repositório, não uma afirmação sobre a versão mais nova
do Node. Hardhat será instalado dentro do projeto, no passo 8.

### 5. Abra a pasta do repositório

Extraia o ZIP em uma pasta nova. Abra a pasta `fhe-healthcare-roadmap` no terminal.
Ela deve conter `README.md`, `INSTALACAO.md`, `dados/` e `exemplos/`.

Confira e guarde o caminho da pasta:

```bash
pwd
ls README.md INSTALACAO.md
export FHE_ROADMAP_ROOT="$PWD"
```

`FHE_ROADMAP_ROOT` aponta para a raiz do repositório. Os módulos usam essa variável
para que os comandos funcionem mesmo depois de você mudar de pasta.
**Em um novo terminal, volte à raiz e execute o `export` novamente.**

### 6. Prepare os dados com Python

```bash
cd "$FHE_ROADMAP_ROOT"
python3 scripts/preparar-dataset.py
```

Saída esperada:

```text
Registros: 4
Soma: 98
Media (%): 24.50
Dados publicos da UCI. Sem uso clinico.
```

O script lê o recorte incluído e cria `dados/processado/amostra.csv` e
`dados/processado/amostra.json`. Não é necessário baixar o conjunto completo
para seguir o roadmap. Não há pacotes Python adicionais para instalar.

Teste a preparação:

```bash
python3 -m unittest discover -s tests -v
```

Esses testes verificam dados e documentação. Eles não executam FHE.

### 7. Instale TFHE-rs e compile os programas Rust

```bash
cd "$FHE_ROADMAP_ROOT"
cargo fetch --manifest-path exemplos/tfhe-rs/Cargo.toml
cargo build --release --manifest-path exemplos/tfhe-rs/Cargo.toml --bins
```

`cargo fetch` baixa as dependências do `Cargo.toml`. `cargo build` compila os
executáveis. `--release` habilita otimizações; `--bins` inclui todos os programas
em `src/bin/`. A primeira compilação pode consumir bastante memória.

Execute a soma:

```bash
cargo run --release --manifest-path exemplos/tfhe-rs/Cargo.toml \
  -- dados/processado/amostra.csv
```

Saída esperada:

```text
Soma dos dois primeiros valores: 58
```

O separador `--` indica que o caminho seguinte é argumento do programa, não do
Cargo. O [módulo 2](modulos/02-tfhe-rs.md) mostra o código completo.

Se a compilação falhar por falta de memória, limite o paralelismo:

```bash
CARGO_BUILD_JOBS=1 cargo build --release \
  --manifest-path exemplos/tfhe-rs/Cargo.toml --bins
```

Isso reduz compilações simultâneas; não garante que qualquer máquina comporte a biblioteca.

### 8. Instale Hardhat e as bibliotecas FHEVM

```bash
cd "$FHE_ROADMAP_ROOT/exemplos/fhevm"
nvm use
npm install
```

`nvm use` lê o arquivo `.nvmrc`. `npm install` lê `package.json` e instala
**Hardhat 2.28.6**, os plugins e as bibliotecas dentro de `node_modules/`.
Essa é a instalação do Hardhat deste projeto: não use `npm install -g hardhat`.

O projeto já contém os arquivos de configuração. **Não execute `hardhat init`
nesta pasta**, pois não é necessário gerar outro projeto.

Confira o que foi instalado:

```bash
npx hardhat --version
npm ls hardhat @fhevm/solidity @fhevm/hardhat-plugin ethers
```

`npx` executa a ferramenta instalada no projeto. O primeiro comando deve mostrar
`2.28.6`. As versões diretas estão fixadas em `package.json` e explicadas em
[CONFIGURACAO.md](CONFIGURACAO.md). Não troque apenas Hardhat por outra versão
principal sem revisar os plugins juntos.

Agora compile:

```bash
npx hardhat compile
npm run typecheck
```

Hardhat baixa o compilador Solidity 0.8.27 na primeira compilação. Não instale
`solc` globalmente. A compilação gera `artifacts/` e os tipos de contrato em
`types/`; execute-a antes do `typecheck`.

### 9. Execute o contrato em claro e os testes

Ainda em `exemplos/fhevm`:

```bash
npm run demo:plain
npm run test:plain
```

A demonstração deve mostrar:

```text
Soma: 98
Soma dos quadrados: 2644
Media (%): 24.50
Variancia populacional (p.p.^2): 60.75
Quantidade acima de 30: 1
Soma acima de 30: 38
```

Depois, execute a versão FHEVM:

```bash
npm run test:fhe
npm run demo
```

Os resultados numéricos devem coincidir. `npm run demo` também mostra a rede,
o endereço, o gas e os tempos medidos. Não há necessidade de abrir outro terminal
com `hardhat node`: cada comando acima cria sua rede local em memória.

**O modo local simula FHE.** Ele serve para testar os contratos; não mede o custo
da criptografia real. Sepolia é explicada no [módulo 8](modulos/08-experimentos.md).
As verificações já feitas neste pacote estão em [VALIDACAO.md](VALIDACAO.md).

### 10. Preserve as versões resolvidas

A primeira instalação gera `exemplos/tfhe-rs/Cargo.lock` e
`exemplos/fhevm/package-lock.json`. Guarde esses arquivos junto do código.
Após gerar o lockfile Node, use `npm ci` nas reinstalações:

```bash
cd "$FHE_ROADMAP_ROOT/exemplos/fhevm"
npm ci
```

Não use `npm ci` antes de existir um `package-lock.json`. Dependências diretas
fixadas não substituem os lockfiles das dependências transitivas.

### Referências

[WSL](https://learn.microsoft.com/en-us/windows/wsl/install) ·
[Rust](https://rust-lang.org/pt-BR/tools/install/) ·
[TFHE-rs](https://docs.zama.org/tfhe-rs/get-started/installation) ·
[nvm](https://github.com/nvm-sh/nvm) ·
[Node.js](https://nodejs.org/en/download) ·
[Hardhat 2](https://v2.hardhat.org/hardhat-runner/docs/getting-started) ·
[Template Zama](https://github.com/zama-ai/fhevm-hardhat-template)

---

<a id="configuracao"></a>

## Configuração dos projetos

[Instalação](INSTALACAO.md) · [Solidity](modulos/06-solidity.md) · [FHEVM](modulos/07-fhevm.md)

O repositório contém dois projetos independentes. Cargo gerencia o código Rust;
npm e Hardhat gerenciam Solidity e TypeScript. Não execute `npm install` na raiz:
execute dentro de `exemplos/fhevm`.

### Rust: Cargo.toml

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

### Node.js: package.json

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

#### Para que serve cada dependência

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

### Hardhat: hardhat.config.ts

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

### TypeScript: tsconfig.json

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

### Comandos npm

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

### Referências

[Manifesto Cargo](https://doc.rust-lang.org/cargo/reference/manifest.html) ·
[Hardhat](https://v2.hardhat.org/hardhat-runner/docs/config) ·
[Dependências do template](https://github.com/zama-ai/fhevm-hardhat-template/blob/main/package.json) ·
[Ethers](https://docs.ethers.org/v6/) · [TypeScript](https://www.typescriptlang.org/docs/)

---

<a id="modulo-01"></a>

## Módulo 1 — FHE e dados de saúde

[Percurso](README.md) · [Instalação](INSTALACAO.md)


### Recursos usados

| Recurso | O que é | Por que usar |
|---|---|---|
| FHE | Criptografia que permite calcular sobre valores cifrados | Entender o fluxo que será programado |
| UCI Heart Failure Clinical Records | Dataset público de saúde | Usar observações reais e reproduzir o mesmo cálculo |
| Python e sua biblioteca padrão | Ferramentas para ler CSV, validar e escrever JSON | Preparar entradas sem instalar pacotes adicionais |

### 1. Entenda o fluxo

FHE significa *Fully Homomorphic Encryption*. O programa cifra os dados, executa
operações compatíveis sobre os ciphertexts e produz outro ciphertext.
A decifração recupera o resultado do cálculo.

```text
Valores em claro -> cifração -> operações FHE -> resultado cifrado -> decifração
```

Um **plaintext** é um valor em claro. Um **ciphertext** é sua representação cifrada.
A **chave de avaliação** permite executar operações; a **chave secreta** permite
decifrar. Não são a mesma chave. Esses papéis aparecem diretamente no módulo 2.

Usaremos duas camadas: TFHE-rs executa FHE em Rust; FHEVM permite expressar
operações cifradas em contratos Solidity. O programa Rust não será convertido
ou implantado como contrato.

### 2. Conheça os dados

A UCI descreve 299 registros no **Heart Failure Clinical Records**. Vamos usar
`ejection_fraction`, a porcentagem de sangue expelido a cada contração cardíaca,
conforme o dicionário do dataset. A licença e a procedência estão em
[dados/README.md](dados/README.md).

O pacote inclui as oito primeiras linhas. A amostra padrão seleciona as quatro primeiras:

```text
Valores (%): 20, 38, 20, 20
Soma: 98
Quantidade: 4
Média (%): 24,5
```

O limiar `30`, usado adiante, é um parâmetro de comparação numérica. Não estamos
construindo um classificador ou uma regra clínica.

### 3. Prepare os arquivos

Após seguir [a instalação](INSTALACAO.md), execute na raiz:

```bash
cd "$FHE_ROADMAP_ROOT"
python3 scripts/preparar-dataset.py
```

O script lê o CSV, seleciona linhas, valida os valores e grava dois formatos:
CSV para Rust e JSON para TypeScript. Os números não são arredondados ou substituídos.
A preparação recusa percentuais ausentes, não inteiros ou fora de `0..100`.

#### Código completo da preparação

<!-- codigo: scripts/preparar-dataset.py -->
Arquivo: [`scripts/preparar-dataset.py`](scripts/preparar-dataset.py).

```python
#!/usr/bin/env python3
"""Seleciona ejection_fraction do CSV da UCI, sem preencher ausencias."""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
from decimal import Decimal, InvalidOperation
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FONTE = ROOT / "dados/fonte/heart_failure_primeiros8.csv"
COLUNA = "ejection_fraction"
LIMITE_REGISTROS = 299

def ler_fonte(path: Path) -> list[dict[str, int]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or COLUNA not in reader.fieldnames:
            raise ValueError("CSV sem a coluna ejection_fraction")
        result = []
        for source_row, row in enumerate(reader, 1):
            value = (row.get(COLUNA) or "").strip()
            try:
                decimal = Decimal(value)
            except InvalidOperation as exc:
                raise ValueError(f"Linha {source_row}: percentual ausente ou invalido") from exc
            if not decimal.is_finite() or decimal != decimal.to_integral_value():
                raise ValueError(f"Linha {source_row}: percentual deve ser inteiro")
            if not 0 <= decimal <= 100:
                raise ValueError(f"Linha {source_row}: percentual fora de 0..100")
            result.append({"source_row": source_row, COLUNA: int(decimal)})
        if not 1 <= len(result) <= LIMITE_REGISTROS:
            raise ValueError("Use de 1 a 299 registros")
        return result

def gerar(fonte: Path, destino: Path, limite: int = 4, inicio: int = 1) -> dict:
    registros = ler_fonte(fonte)
    if inicio < 1 or limite < 2 or inicio + limite - 1 > len(registros):
        raise ValueError("Selecione pelo menos duas linhas existentes")
    selected = registros[inicio - 1:inicio - 1 + limite]
    values = [r[COLUNA] for r in selected]
    info = {
        "dataset": "Heart Failure Clinical Records",
        "dataset_id": 519,
        "dataset_doi": "10.24432/C5Z89R",
        "source_url": "https://archive.ics.uci.edu/ml/machine-learning-databases/00519/heart_failure_clinical_records_dataset.csv",
        "license": "CC BY 4.0",
        "source_sha256": hashlib.sha256(fonte.read_bytes()).hexdigest(),
        "source_records_available": len(registros),
        "variable": COLUNA,
        "unit": "%",
        "source_rows": [r["source_row"] for r in selected],
        "values": values,
        "count": len(values),
        "sum": sum(values),
        "mean": sum(values) / len(values),
        "sum_squares": sum(v * v for v in values),
        "population_variance": sum(v * v for v in values) / len(values) - (sum(values) / len(values)) ** 2,
        "public_reference_only": True,
    }
    destino.mkdir(parents=True, exist_ok=True)
    with (destino / "amostra.csv").open("w", encoding="utf-8", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=["source_row", COLUNA], lineterminator="\n")
        writer.writeheader()
        writer.writerows(selected)
    (destino / "amostra.json").write_text(json.dumps(info, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return info

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fonte", type=Path, default=FONTE)
    parser.add_argument("--destino", type=Path, default=ROOT / "dados/processado")
    parser.add_argument("--limite", type=int, default=4)
    parser.add_argument("--inicio", type=int, default=1, help="Posicao do primeiro registro, sem cabecalho")
    args = parser.parse_args()
    try:
        info = gerar(args.fonte, args.destino, args.limite, args.inicio)
    except (OSError, ValueError) as exc:
        parser.exit(1, f"Erro: {exc}\n")
    print(f"Registros: {info['count']}")
    print(f"Soma: {info['sum']}")
    print(f"Media (%): {info['mean']:.2f}")
    print("Dados publicos da UCI. Sem uso clinico.")

if __name__ == "__main__":
    main()
```
<!-- /codigo -->

`csv.DictReader` associa cada coluna ao seu nome. `Decimal` permite verificar
se o texto é um inteiro sem introduzir arredondamento de ponto flutuante.
`source_row` registra a posição no CSV; não representa uma pessoa identificada.
O SHA-256 identifica os bytes da fonte usada, não prova a veracidade de uma medição.

#### CSV resultante

<!-- codigo: dados/processado/amostra.csv -->
Arquivo: [`dados/processado/amostra.csv`](dados/processado/amostra.csv).

```csv
source_row,ejection_fraction
1,20
2,38
3,20
4,20
```
<!-- /codigo -->

O cabeçalho contém os nomes das colunas. Cada linha contém o número da linha de
origem e o percentual que será cifrado.

#### JSON resultante

<!-- codigo: dados/processado/amostra.json -->
Arquivo: [`dados/processado/amostra.json`](dados/processado/amostra.json).

```json
{
  "dataset": "Heart Failure Clinical Records",
  "dataset_id": 519,
  "dataset_doi": "10.24432/C5Z89R",
  "source_url": "https://archive.ics.uci.edu/ml/machine-learning-databases/00519/heart_failure_clinical_records_dataset.csv",
  "license": "CC BY 4.0",
  "source_sha256": "249a5673585edef9d66da2049f58ce9b2a93b09307de55693bf8fce10b2af9f4",
  "source_records_available": 8,
  "variable": "ejection_fraction",
  "unit": "%",
  "source_rows": [
    1,
    2,
    3,
    4
  ],
  "values": [
    20,
    38,
    20,
    20
  ],
  "count": 4,
  "sum": 98,
  "mean": 24.5,
  "sum_squares": 2644,
  "population_variance": 60.75,
  "public_reference_only": true
}
```
<!-- /codigo -->

Os campos `sum`, `mean` e `sum_squares` são referências em claro para os testes.
Eles não são resultados de uma execução FHE. Os exemplos recalculam as operações
para comparar o valor decifrado com essa referência.

### 4. Use outro recorte

```bash
cd "$FHE_ROADMAP_ROOT"
python3 scripts/preparar-dataset.py \
  --inicio 5 --limite 4 --destino dados/grupo2
```

Isso cria outra amostra, sem alterar a padrão: `[20, 40, 15, 60]`, soma `135`
e média `33,75%`. `--inicio` conta os registros a partir de 1, sem o cabeçalho.
O download opcional da fonte completa está em [dados/README.md](dados/README.md).

Os dados de origem já são públicos. Cifrá-los neste exercício não desfaz essa
publicação; permite observar como as operações seriam feitas sobre ciphertexts.

### Referências

[UCI — dataset](https://archive.ics.uci.edu/dataset/519/heart+failure+clinical+records) · [TFHE-rs — fluxo de cálculo](https://docs.zama.org/tfhe-rs/get-started/quick-start) · [Zama — biblioteca FHE](https://docs.zama.org/protocol/protocol/overview/library)

---

<a id="modulo-02"></a>

## Módulo 2 — Chaves e soma com TFHE-rs

[Percurso](README.md) · [Instalação](INSTALACAO.md)


### Recursos usados

| Recurso | O que é | Por que usar |
|---|---|---|
| Rust | Linguagem compilada | Executar diretamente a biblioteca da Zama |
| Cargo | Gerenciador de projetos e dependências Rust | Compilar e selecionar os executáveis |
| TFHE-rs 1.8.1 | Biblioteca de FHE | Cifrar inteiros, somar e decifrar o resultado |
| `FheUint32` | Inteiro cifrado sem sinal de 32 bits | Manter o mesmo tipo nos cálculos seguintes |

### 1. Veja a estrutura do projeto

```text
exemplos/tfhe-rs/
  Cargo.toml
  src/
    lib.rs
    main.rs
    bin/
      estatisticas.rs
      selecionar.rs
      preparar.rs
      calcular.rs
      revelar.rs
```

`Cargo.toml` declara as dependências. `main.rs` é o programa padrão;
`lib.rs` contém funções compartilhadas. Os demais arquivos são executáveis
selecionados com `--bin`.

#### Cargo.toml completo

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

A feature `integer` habilita a API de inteiros. O sinal `=` fixa TFHE-rs em 1.8.1.
Cargo cria um `Cargo.lock` na primeira resolução das dependências.

### 2. Leia o programa de soma

O programa lê a amostra do módulo 1, cifra seus dois primeiros valores e soma
`20 + 38`. A função de cálculo recebe somente valores cifrados.

#### main.rs completo

<!-- codigo: exemplos/tfhe-rs/src/main.rs -->
Arquivo: [`exemplos/tfhe-rs/src/main.rs`](exemplos/tfhe-rs/src/main.rs).

```rust
use std::error::Error;
use std::path::Path;

use fhe_healthcare::ler_amostra;
use tfhe::prelude::*;
use tfhe::{generate_keys, set_server_key, ConfigBuilder, FheUint32};

// Esta funcao recebe apenas valores cifrados.
fn somar_no_servidor(a: &FheUint32, b: &FheUint32) -> FheUint32 {
    a + b
}

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 2 {
        return Err("Uso: fhe-healthcare AMOSTRA.csv".into());
    }
    let valores = ler_amostra(Path::new(&args[1]))?;
    if valores.len() < 2 {
        return Err("Use pelo menos dois registros".into());
    }

    // Cliente: gerar as chaves e cifrar os dois primeiros valores.
    let config = ConfigBuilder::default().build();
    let (chave_cliente, chave_avaliacao) = generate_keys(config);
    let a = FheUint32::try_encrypt(valores[0], &chave_cliente)?;
    let b = FheUint32::try_encrypt(valores[1], &chave_cliente)?;

    // Servidor: calcular sem usar a chave de decifracao.
    set_server_key(chave_avaliacao);
    let resultado = somar_no_servidor(&a, &b);

    // Cliente: recuperar a soma e comparar com o calculo em claro.
    let soma: u32 = resultado.decrypt(&chave_cliente);
    assert_eq!(soma, valores[0] + valores[1]);
    println!("Soma dos dois primeiros valores: {soma}");
    Ok(())
}
```
<!-- /codigo -->

#### Como o programa funciona

`use` importa nomes. `tfhe::prelude::*` traz os traits necessários para métodos
como cifrar e decifrar. Um trait descreve operações que um tipo implementa.

`ConfigBuilder::default().build()` usa a configuração padrão. `generate_keys`
cria a chave do cliente e a chave de avaliação. `try_encrypt` cifra cada inteiro;
`set_server_key` configura a chave de avaliação no contexto de execução.

`somar_no_servidor` aplica `+` a dois `FheUint32`. O retorno continua cifrado.
`decrypt` recupera um `u32` usando a chave do cliente. `assert_eq!` compara esse
resultado com a soma conhecida da amostra.

`&a` empresta uma referência a `a`; não copia o objeto inteiro. `?` devolve ao
chamador um erro ocorrido na operação. `Result<(), Box<dyn Error>>` indica que
`main` termina sem valor ou com um erro.

Cliente e servidor ainda são etapas do mesmo processo. Separá-los em executáveis
será o assunto do módulo 5.

### 3. Conheça o código compartilhado

O import `fhe_healthcare::ler_amostra` vem do arquivo completo abaixo.
Além de ler o CSV, ele reúne os auxiliares de arquivo usados no módulo 5.

#### lib.rs completo

<!-- codigo: exemplos/tfhe-rs/src/lib.rs -->
Arquivo: [`exemplos/tfhe-rs/src/lib.rs`](exemplos/tfhe-rs/src/lib.rs).

```rust
//! Le CSV e arquivos da mesma geracao de chaves.
//! Nao aceita com seguranca arquivos arbitrarios de terceiros.
use std::collections::HashSet;
use std::fs::{self, File, OpenOptions};
use std::io::{self, BufReader};
use std::path::Path;

pub const LIMITE_CHAVE: u64 = 1 << 30;
pub const LIMITE_CIPHERTEXT: u64 = 1 << 26;
pub const MAX_REGISTROS: usize = 299;

pub fn novo_arquivo(path: &Path) -> io::Result<File> {
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)] {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    options.open(path)
}

pub fn abrir_limitado(path: &Path, limite: u64) -> io::Result<BufReader<File>> {
    let file = File::open(path)?;
    if file.metadata()?.len() > limite {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "Arquivo excede o limite"));
    }
    Ok(BufReader::new(file))
}

pub fn ler_amostra(path: &Path) -> Result<Vec<u32>, Box<dyn std::error::Error>> {
    if fs::metadata(path)?.len() > 1_000_000 {
        return Err("CSV excede o limite".into());
    }
    let text = fs::read_to_string(path)?;
    let mut lines = text.lines();
    if lines.next().map(str::trim) != Some("source_row,ejection_fraction") {
        return Err("Use o CSV gerado por scripts/preparar-dataset.py".into());
    }
    let mut values = Vec::new();
    let mut seen = HashSet::new();
    for line in lines {
        let fields: Vec<&str> = line.split(',').collect();
        if fields.len() != 2 { return Err("Linha CSV invalida".into()); }
        let id: u32 = fields[0].trim().parse()?;
        let value: u32 = fields[1].trim().parse()?;
        if id == 0 || !seen.insert(id) || value > 100 {
            return Err("Linha invalida, duplicada ou percentual fora de 0..100".into());
        }
        values.push(value);
    }
    if values.is_empty() || values.len() > MAX_REGISTROS {
        return Err("Use entre 1 e 299 registros".into());
    }
    Ok(values)
}
```
<!-- /codigo -->

`ler_amostra` verifica o cabeçalho, linhas repetidas, tamanho da amostra e intervalo
dos percentuais. Ela retorna os valores em `Vec<u32>`, um vetor de inteiros em claro.
A cifração só acontece depois, em `main`.

Os auxiliares de arquivo limitam o tamanho da leitura e evitam sobrescrita. Os
limites são limites de entrada e saída, não parâmetros de segurança criptográfica.

### 4. Execute

```bash
cd "$FHE_ROADMAP_ROOT"
cargo run --release --manifest-path exemplos/tfhe-rs/Cargo.toml \
  -- dados/processado/amostra.csv
```

Saída esperada:

```text
Soma dos dois primeiros valores: 58
```

Para usar o segundo recorte preparado no módulo 1:

```bash
cargo run --release --manifest-path exemplos/tfhe-rs/Cargo.toml \
  -- dados/grupo2/amostra.csv
```

Agora os dois primeiros valores são `20` e `40`; a soma deve ser `60`.
A lógica FHE é a mesma. Apenas o arquivo de entrada mudou.

### Referências

[TFHE-rs — primeiros passos](https://docs.zama.org/tfhe-rs/get-started/quick-start) · [Geração de chaves](https://docs.zama.org/tfhe-rs/fhe-computation/compute/configure-and-generate-keys) · [Livro Rust](https://doc.rust-lang.org/book/)

---

<a id="modulo-03"></a>

## Módulo 3 — Soma, multiplicação e estatísticas

[Percurso](README.md) · [Instalação](INSTALACAO.md)


### Recursos usados

| Recurso | O que é | Por que usar |
|---|---|---|
| TFHE-rs e `FheUint32` | Biblioteca e tipo cifrado | Calcular soma e soma dos quadrados |
| `Instant`, da biblioteca padrão Rust | Relógio para medir intervalos | Separar tempo de chaves, cifração e operações |
| `safe_serialize` | Conversão de um objeto FHE em bytes com limite | Observar o tamanho de um resultado cifrado |
| `f64` | Número em ponto flutuante em claro | Calcular média e variância depois da decifração |

### 1. Separe operações cifradas e operações em claro

Para valores `x₁, ..., xₙ`, o programa calcula sob FHE:

```text
S = x₁ + ... + xₙ
Q = x₁² + ... + xₙ²
```

Depois de recuperar `S` e `Q`, calcula em claro:

```text
média = S / n
variância populacional = Q / n - média²
```

Assim, quem lê a saída recebe as somas, não apenas a média. A divisão não é
homomórfica neste exemplo; separar as etapas permite ver exatamente o que foi cifrado.

### 2. Leia o código completo

<!-- codigo: exemplos/tfhe-rs/src/bin/estatisticas.rs -->
Arquivo: [`exemplos/tfhe-rs/src/bin/estatisticas.rs`](exemplos/tfhe-rs/src/bin/estatisticas.rs).

```rust
use std::error::Error;
use std::path::Path;
use std::time::Instant;
use tfhe::prelude::*;
use tfhe::safe_serialization::safe_serialize;
use tfhe::{generate_keys, set_server_key, ConfigBuilder, FheUint32};
use fhe_healthcare::{ler_amostra, LIMITE_CIPHERTEXT};

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 2 { return Err("Uso: estatisticas AMOSTRA.csv".into()); }
    let valores = ler_amostra(Path::new(&args[1]))?;
    let inicio = Instant::now();
    let (chave_cliente, chave_avaliacao) = generate_keys(ConfigBuilder::default().build());
    let tempo_chaves = inicio.elapsed();
    let inicio = Instant::now();
    let cifradas: Vec<FheUint32> = valores.iter()
        .map(|&v| FheUint32::try_encrypt(v, &chave_cliente))
        .collect::<Result<_, _>>()?;
    let tempo_cifracao = inicio.elapsed();
    set_server_key(chave_avaliacao);

    let inicio = Instant::now();
    let mut soma = cifradas[0].clone();
    for valor in &cifradas[1..] { soma = &soma + valor; }
    let tempo_soma = inicio.elapsed();

    let inicio = Instant::now();
    let mut quadrados = &cifradas[0] * &cifradas[0];
    for valor in &cifradas[1..] { quadrados = &quadrados + &(valor * valor); }
    let tempo_quadrados = inicio.elapsed();

    let inicio = Instant::now();
    let total: u32 = soma.decrypt(&chave_cliente);
    let total_quadrados: u32 = quadrados.decrypt(&chave_cliente);
    let tempo_decifracao = inicio.elapsed();
    assert_eq!(total, valores.iter().sum::<u32>());
    assert_eq!(total_quadrados, valores.iter().map(|v| v * v).sum::<u32>());

    // A divisao e feita em claro, depois da decifracao.
    let n = valores.len() as f64;
    let media = f64::from(total) / n;
    let variancia = f64::from(total_quadrados) / n - media * media;
    let inicio = Instant::now();
    let mut bytes = Vec::new();
    safe_serialize(&soma, &mut bytes, LIMITE_CIPHERTEXT)?;
    let tempo_serializacao = inicio.elapsed();

    println!("Registros: {}", valores.len());
    println!("Soma: {total}");
    println!("Soma dos quadrados: {total_quadrados}");
    println!("Media (%): {media:.2}");
    println!("Variancia populacional (p.p.^2): {variancia:.2}");
    println!("Chaves: {tempo_chaves:?}");
    println!("Cifracao: {tempo_cifracao:?}");
    println!("Soma: {tempo_soma:?}");
    println!("Quadrados e soma: {tempo_quadrados:?}");
    println!("Decifracao: {tempo_decifracao:?}");
    println!("Serializacao da soma: {tempo_serializacao:?}");
    println!("Soma serializada: {} bytes", bytes.len());
    Ok(())
}
```
<!-- /codigo -->

A criação do vetor `cifradas` aplica `try_encrypt` a cada valor. `collect`
reúne os ciphertexts ou devolve o primeiro erro de cifração.

O primeiro laço acumula as parcelas. O segundo multiplica cada ciphertext por
si próprio e soma os quadrados. A multiplicação é cifrado–cifrado; nenhum valor
individual é decifrado dentro dos laços.

`clone()` copia o primeiro ciphertext para iniciar o acumulador. Os operadores
`+` e `*` mantêm o resultado em `FheUint32`. Apenas as duas chamadas a `decrypt`
recuperam inteiros em claro.

### 3. Execute

```bash
cd "$FHE_ROADMAP_ROOT"
cargo run --release --manifest-path exemplos/tfhe-rs/Cargo.toml \
  --bin estatisticas -- dados/processado/amostra.csv
```

Parte numérica esperada:

```text
Registros: 4
Soma: 98
Soma dos quadrados: 2644
Media (%): 24.50
Variancia populacional (p.p.^2): 60.75
```

`p.p.` significa pontos percentuais. Como os dados são percentuais, a variância
é expressa em pontos percentuais ao quadrado. Ela descreve somente esse recorte,
não uma estimativa clínica da população.

O programa também imprime os tempos e o tamanho serializado da soma. Esses
valores dependem da máquina; não há tempos esperados fixos.

### 4. Entenda a escolha de 32 bits

Os dados preparados estão em `0..100`, mas `100² = 10.000` já não cabe em 8 bits.
Com até 299 registros, a soma dos quadrados é limitada por `299 × 10.000 = 2.990.000`,
que cabe em `u32`. Por isso usamos `FheUint32` antes de multiplicar e somar.

A aritmética inteira FHE é limitada pela largura do tipo. Não espere que uma
operação cifrada detecte overflow como uma validação de entrada. Ao mudar o tipo,
revise o maior valor intermediário, não apenas os valores originais.

### 5. Compare operações

Repita o comando e compare os intervalos impressos. O tempo de geração das chaves
não é o tempo de uma soma. A medida de quadrados inclui multiplicações e adições.
O tamanho serializado inclui somente o ciphertext da soma, não todas as chaves e entradas.

No segundo recorte, espere soma `135`, soma dos quadrados `5825`, média `33,75`
e variância `317,1875` — impressa como `317.19` pelo formato de duas casas.

### Referências

[TFHE-rs — operações](https://docs.zama.org/tfhe-rs/fhe-computation/operations) · [Serialização](https://docs.zama.org/tfhe-rs/fhe-computation/data-handling/serialization) · [Instant](https://doc.rust-lang.org/std/time/struct.Instant.html)

---

<a id="modulo-04"></a>

## Módulo 4 — Comparação e seleção cifrada

[Percurso](README.md) · [Instalação](INSTALACAO.md)


### Recursos usados

| Recurso | O que é | Por que usar |
|---|---|---|
| TFHE-rs | Biblioteca de operações cifradas | Comparar os percentuais sem recuperá-los antes |
| `FheBool` | Booleano cifrado | Representar o resultado de uma comparação |
| `if_then_else` | Seleção a partir de um booleano cifrado | Escolher uma parcela sem um `if` sobre plaintext |
| `FheUint32` | Inteiro cifrado | Acumular a contagem e a soma selecionada |

### 1. Defina a operação

Para cada percentual, calcule a condição `valor > limiar`. Use o resultado para
somar `1` à contagem quando a condição for verdadeira e `0` caso contrário.
Para a soma filtrada, selecione o próprio valor ou zero.

```text
valor:              20   38   20   20
valor > 30:          0    1    0    0
parcela selecionada: 0   38    0    0
```

No programa, essas respostas intermediárias continuam cifradas. A tabela acima
é apenas a referência em claro da amostra pública.

### 2. Leia o código completo

<!-- codigo: exemplos/tfhe-rs/src/bin/selecionar.rs -->
Arquivo: [`exemplos/tfhe-rs/src/bin/selecionar.rs`](exemplos/tfhe-rs/src/bin/selecionar.rs).

```rust
use std::error::Error;
use std::path::Path;
use tfhe::prelude::*;
use tfhe::{generate_keys, set_server_key, ConfigBuilder, FheUint32};
use fhe_healthcare::ler_amostra;

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 3 { return Err("Uso: selecionar AMOSTRA.csv LIMIAR".into()); }
    let valores = ler_amostra(Path::new(&args[1]))?;
    let limiar: u32 = args[2].parse()?;
    if limiar > 100 { return Err("Use um limiar entre 0 e 100".into()); }
    let (chave_cliente, chave_avaliacao) = generate_keys(ConfigBuilder::default().build());
    let cifradas: Vec<FheUint32> = valores.iter()
        .map(|&v| FheUint32::try_encrypt(v, &chave_cliente))
        .collect::<Result<_, _>>()?;
    let zero = FheUint32::try_encrypt(0u32, &chave_cliente)?;
    let um = FheUint32::try_encrypt(1u32, &chave_cliente)?;
    set_server_key(chave_avaliacao);
    let mut quantidade = zero.clone();
    let mut soma = zero.clone();
    for valor in &cifradas {
        let acima = valor.gt(limiar);
        let indicador = acima.if_then_else(&um, &zero);
        let parcela = acima.if_then_else(valor, &zero);
        quantidade = &quantidade + &indicador;
        soma = &soma + &parcela;
    }
    let total: u32 = soma.decrypt(&chave_cliente);
    let contagem: u32 = quantidade.decrypt(&chave_cliente);
    let selecionados: Vec<u32> = valores.into_iter().filter(|&v| v > limiar).collect();
    assert_eq!(total, selecionados.iter().sum::<u32>());
    assert_eq!(contagem as usize, selecionados.len());
    println!("Limiar numerico: {limiar}");
    println!("Quantidade acima do limiar: {contagem}");
    println!("Soma acima do limiar: {total}");
    Ok(())
}
```
<!-- /codigo -->

`gt` significa *greater than*: maior que. Seu resultado é `FheBool`, não `bool`.
Rust não pode usar esse objeto diretamente como condição de um `if` convencional.

`acima.if_then_else(&um, &zero)` cria um inteiro cifrado igual a 1 ou 0.
`acima.if_then_else(valor, &zero)` seleciona o percentual ou zero. Somar esses
resultados produz a contagem e a soma do subconjunto sem decifrar as condições.

O limiar é público. As comparações são feitas entre um valor cifrado e uma
constante pública; isso não revela automaticamente qual comparação foi verdadeira.

### 3. Execute

```bash
cd "$FHE_ROADMAP_ROOT"
cargo run --release --manifest-path exemplos/tfhe-rs/Cargo.toml \
  --bin selecionar -- dados/processado/amostra.csv 30
```

Saída esperada:

```text
Limiar numerico: 30
Quantidade acima do limiar: 1
Soma acima do limiar: 38
```

Mude o último argumento para `20`. Como a comparação é estrita, os valores
iguais a 20 não entram: a contagem continua 1. Com limiar `100`, contagem e soma
são zero.

A soma de um grupo de tamanho 1 revela o valor selecionado. O objetivo aqui é
compreender a operação, não afirmar que qualquer estatística publicada preserva
a privacidade dos indivíduos.

### Referências

[TFHE-rs — operações](https://docs.zama.org/tfhe-rs/fhe-computation/operations) · [FheBool — API](https://docs.rs/tfhe/1.8.1/tfhe/struct.FheBool.html)

---

<a id="modulo-05"></a>

## Módulo 5 — Arquivos e execução em processos separados

[Percurso](README.md) · [Instalação](INSTALACAO.md)


### Recursos usados

| Recurso | O que é | Por que usar |
|---|---|---|
| TFHE-rs | Biblioteca de FHE | Continuar calculando com as mesmas chaves e tipos |
| `safe_serialize` e `safe_deserialize` | Conversão entre objetos FHE e bytes | Passar ciphertexts entre executáveis |
| `std::fs`, `std::io` e `std::path` | APIs de arquivos da biblioteca padrão Rust | Ler e gravar os dados sem adicionar uma API de rede |

### 1. Separe as três etapas

Até aqui, chaves, entradas e resultados estavam no mesmo processo. Agora serão
usados três programas:

```text
preparar -> arquivos cifrados -> calcular -> resultado cifrado -> revelar
```

`preparar` lê o CSV e gera os arquivos. `calcular` recebe apenas o material usado
na avaliação. `revelar` recupera o resultado usando a chave do cliente.
A operação continua sendo uma soma.

### 2. Código completo: preparar.rs

<!-- codigo: exemplos/tfhe-rs/src/bin/preparar.rs -->
Arquivo: [`exemplos/tfhe-rs/src/bin/preparar.rs`](exemplos/tfhe-rs/src/bin/preparar.rs).

```rust
use std::error::Error;
use std::fs;
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use tfhe::prelude::*;
use tfhe::safe_serialization::safe_serialize;
use tfhe::{generate_keys, ConfigBuilder, FheUint32};
use fhe_healthcare::{ler_amostra, novo_arquivo, LIMITE_CHAVE, LIMITE_CIPHERTEXT};

fn destino_novo(path: &str) -> Result<PathBuf, Box<dyn Error>> {
    let path = Path::new(path);
    if path.components().any(|p| matches!(p, Component::ParentDir)) {
        return Err("Use diretorios sem '..' no caminho".into());
    }
    if path.exists() { return Err(format!("Diretorio ja existe: {}", path.display()).into()); }
    if let Some(parent) = path.parent().filter(|p| !p.as_os_str().is_empty()) {
        fs::create_dir_all(parent)?;
    }
    let parent = path.parent().filter(|p| !p.as_os_str().is_empty()).unwrap_or(Path::new("."));
    let name = path.file_name().ok_or("Caminho de diretorio invalido")?;
    Ok(parent.canonicalize()?.join(name))
}

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 4 { return Err("Uso: preparar AMOSTRA.csv DIR_CLIENTE DIR_SERVIDOR".into()); }
    let valores = ler_amostra(Path::new(&args[1]))?;
    let cliente = destino_novo(&args[2])?;
    let servidor = destino_novo(&args[3])?;
    if cliente.starts_with(&servidor) || servidor.starts_with(&cliente) {
        return Err("Use diretorios separados, sem aninhamento".into());
    }
    // Criar os pais pode ter criado um dos destinos.
    if cliente.exists() || servidor.exists() { return Err("Use dois diretorios novos".into()); }
    fs::create_dir(&cliente)?;
    fs::create_dir(&servidor)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&cliente, fs::Permissions::from_mode(0o700))?;
        fs::set_permissions(&servidor, fs::Permissions::from_mode(0o700))?;
    }
    let (chave_cliente, chave_avaliacao) = generate_keys(ConfigBuilder::default().build());
    safe_serialize(&chave_cliente, novo_arquivo(&cliente.join("chave_cliente.bin"))?, LIMITE_CHAVE)?;
    safe_serialize(&chave_avaliacao, novo_arquivo(&servidor.join("chave_avaliacao.bin"))?, LIMITE_CHAVE)?;
    writeln!(novo_arquivo(&cliente.join("quantidade.txt"))?, "{}", valores.len())?;
    writeln!(novo_arquivo(&servidor.join("quantidade.txt"))?, "{}", valores.len())?;
    for (i, valor) in valores.into_iter().enumerate() {
        let cifrada = FheUint32::try_encrypt(valor, &chave_cliente)?;
        safe_serialize(&cifrada, novo_arquivo(&servidor.join(format!("registro_{i:03}.bin")))?, LIMITE_CIPHERTEXT)?;
    }
    println!("Entradas cifradas. Mantenha a pasta do cliente separada.");
    Ok(())
}
```
<!-- /codigo -->

O programa cria dois diretórios novos. A pasta do cliente guarda a chave secreta;
a do servidor guarda a chave de avaliação e os ciphertexts. Os dois lados conhecem
a quantidade de registros.

Os arquivos são gerados juntos para pertencerem ao mesmo conjunto de chaves.
Não misture arquivos de execuções independentes.

### 3. Código completo: calcular.rs

<!-- codigo: exemplos/tfhe-rs/src/bin/calcular.rs -->
Arquivo: [`exemplos/tfhe-rs/src/bin/calcular.rs`](exemplos/tfhe-rs/src/bin/calcular.rs).

```rust
use std::error::Error;
use std::fs;
use std::path::Path;
use tfhe::safe_serialization::{safe_deserialize, safe_serialize};
use tfhe::{set_server_key, FheUint32, ServerKey};
use fhe_healthcare::{abrir_limitado, novo_arquivo, LIMITE_CHAVE, LIMITE_CIPHERTEXT, MAX_REGISTROS};

// Sem ClientKey. Use arquivos da mesma execucao de preparar.
fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 3 { return Err("Uso: calcular DIR_SERVIDOR RESULTADO.bin".into()); }
    let dir = Path::new(&args[1]);
    let quantidade: usize = fs::read_to_string(dir.join("quantidade.txt"))?.trim().parse()?;
    if quantidade == 0 || quantidade > MAX_REGISTROS { return Err("Quantidade invalida".into()); }
    let chave_avaliacao: ServerKey = safe_deserialize(
        abrir_limitado(&dir.join("chave_avaliacao.bin"), LIMITE_CHAVE)?, LIMITE_CHAVE)?;
    set_server_key(chave_avaliacao);
    let mut soma: FheUint32 = safe_deserialize(
        abrir_limitado(&dir.join("registro_000.bin"), LIMITE_CIPHERTEXT)?, LIMITE_CIPHERTEXT)?;
    for i in 1..quantidade {
        let path = dir.join(format!("registro_{i:03}.bin"));
        let valor: FheUint32 = safe_deserialize(abrir_limitado(&path, LIMITE_CIPHERTEXT)?, LIMITE_CIPHERTEXT)?;
        soma = &soma + &valor;
    }
    safe_serialize(&soma, novo_arquivo(Path::new(&args[2]))?, LIMITE_CIPHERTEXT)?;
    println!("Resultado cifrado salvo, sem decifracao.");
    Ok(())
}
```
<!-- /codigo -->

O programa carrega `ServerKey`, configura a avaliação e soma os arquivos na ordem.
O resultado é serializado sem decifração. Os auxiliares `abrir_limitado` e
`novo_arquivo` estão em `src/lib.rs`, mostrado integralmente no
[módulo 2](modulos/02-tfhe-rs.md).

### 4. Código completo: revelar.rs

<!-- codigo: exemplos/tfhe-rs/src/bin/revelar.rs -->
Arquivo: [`exemplos/tfhe-rs/src/bin/revelar.rs`](exemplos/tfhe-rs/src/bin/revelar.rs).

```rust
use std::error::Error;
use std::fs;
use std::path::Path;
use tfhe::prelude::*;
use tfhe::safe_serialization::safe_deserialize;
use tfhe::{ClientKey, FheUint32};
use fhe_healthcare::{abrir_limitado, LIMITE_CHAVE, LIMITE_CIPHERTEXT};

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 3 { return Err("Uso: revelar DIR_CLIENTE RESULTADO.bin".into()); }
    let dir = Path::new(&args[1]);
    let chave_cliente: ClientKey = safe_deserialize(
        abrir_limitado(&dir.join("chave_cliente.bin"), LIMITE_CHAVE)?, LIMITE_CHAVE)?;
    let resultado: FheUint32 = safe_deserialize(
        abrir_limitado(Path::new(&args[2]), LIMITE_CIPHERTEXT)?, LIMITE_CIPHERTEXT)?;
    let quantidade: u32 = fs::read_to_string(dir.join("quantidade.txt"))?.trim().parse()?;
    if quantidade == 0 || quantidade > 299 { return Err("Use de 1 a 299 registros".into()); }
    let soma: u32 = resultado.decrypt(&chave_cliente);
    println!("Soma: {soma}");
    println!("Quantidade: {quantidade}");
    println!("Media da fracao de ejecao (%): {:.2}", f64::from(soma) / f64::from(quantidade));
    Ok(())
}
```
<!-- /codigo -->

A chave do cliente e o ciphertext final são reconstruídos a partir dos bytes.
Depois da decifração, a média é calculada em claro usando a quantidade de registros.

### 5. Compile e execute

Na raiz, compile todos os programas:

```bash
cd "$FHE_ROADMAP_ROOT"
cargo build --release --manifest-path exemplos/tfhe-rs/Cargo.toml --bins
```

Prepare uma rodada em diretórios novos:

```bash
./exemplos/tfhe-rs/target/release/preparar \
  dados/processado/amostra.csv \
  execucoes/rodada1/cliente execucoes/rodada1/servidor
```

A estrutura gerada será:

```text
execucoes/rodada1/
  cliente/
    chave_cliente.bin
    quantidade.txt
  servidor/
    chave_avaliacao.bin
    quantidade.txt
    registro_000.bin
    registro_001.bin
    registro_002.bin
    registro_003.bin
```

Execute o cálculo e recupere a soma:

```bash
./exemplos/tfhe-rs/target/release/calcular \
  execucoes/rodada1/servidor execucoes/rodada1/resultado.bin

./exemplos/tfhe-rs/target/release/revelar \
  execucoes/rodada1/cliente execucoes/rodada1/resultado.bin
```

Saída numérica esperada:

```text
Soma: 98
Quantidade: 4
Media da fracao de ejecao (%): 24.50
```

Os programas recusam sobrescrever os arquivos. Para repetir o fluxo, use
`rodada2` em todos os caminhos de saída; não apague uma chave ainda necessária.

### 6. Entenda o que a separação demonstra

`calcular` não recebe a pasta do cliente. Isso mostra a separação dos dados
necessários ao cálculo e à decifração. Rodar todos os programas no mesmo usuário
do sistema, porém, não isola seus arquivos contra um processo malicioso.

A serialização também não autentica arquivos. Este exemplo lê arquivos que você
acabou de gerar. O prefixo `safe` não torna qualquer conteúdo recebido da internet
confiável. A documentação da Zama descreve verificações adicionais de conformidade.

O foco aqui é observar que ciphertexts e chaves de avaliação podem ser gravados,
transportados e reutilizados por outro processo sem decifrar as entradas.

### Referências

[Zama — serialização](https://docs.zama.org/tfhe-rs/fhe-computation/data-handling/serialization) · [Rust — arquivos](https://doc.rust-lang.org/std/fs/index.html)

---

<a id="modulo-06"></a>

## Módulo 6 — Os cálculos em um contrato Solidity

[Percurso](README.md) · [Instalação](INSTALACAO.md)


### Recursos usados

| Recurso | O que é | Por que usar |
|---|---|---|
| Solidity 0.8.27 | Linguagem de contratos inteligentes | Escrever as operações executadas pela EVM |
| EVM | Máquina virtual do Ethereum | Executar o código compilado do contrato |
| Hardhat 2 | Ambiente de desenvolvimento | Compilar, implantar e testar sem rede externa |
| ethers 6 | Biblioteca de interação com contratos | Usar contas e chamar funções a partir do TypeScript |
| TypeScript | JavaScript com tipos | Escrever scripts e testes com verificação de tipos |

### 1. Entenda contrato, compilação e implantação

Um contrato contém funções e pode conter estado persistente. Seu código Solidity
é compilado em bytecode para a EVM e em uma **ABI**, que descreve como chamar as
funções e interpretar os resultados.

**Implantar** significa criar uma instância do contrato na rede. Ela recebe um
endereço. O Hardhat gerencia a rede local; ethers usa a ABI para chamar a instância.
Neste primeiro contrato, todas as operações são sobre números em claro.

### 2. Confira a configuração

A instalação está em [INSTALACAO.md](INSTALACAO.md). Os arquivos completos
`package.json`, `hardhat.config.ts` e `tsconfig.json`, com a explicação de cada
biblioteca, estão em [CONFIGURACAO.md](CONFIGURACAO.md).

```bash
cd "$FHE_ROADMAP_ROOT/exemplos/fhevm"
nvm use
npm install
npx hardhat compile
```

Depois de existir um `package-lock.json`, use `npm ci` para reinstalar.
Não inicialize outro projeto dentro desta pasta.

### 3. Contrato completo: HealthPlain.sol

<!-- codigo: exemplos/fhevm/contracts/HealthPlain.sol -->
Arquivo: [`exemplos/fhevm/contracts/HealthPlain.sol`](exemplos/fhevm/contracts/HealthPlain.sol).

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

#### Entenda a estrutura

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

### 4. Código completo: leitura dos dados

Os scripts e testes usam o mesmo arquivo abaixo. Ele verifica o JSON produzido
no módulo 1 e calcula a resposta em claro para comparação.

<!-- codigo: exemplos/fhevm/scripts/dataset.ts -->
Arquivo: [`exemplos/fhevm/scripts/dataset.ts`](exemplos/fhevm/scripts/dataset.ts).

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

### 5. Código completo: demonstração em claro

<!-- codigo: exemplos/fhevm/scripts/demo-plain.ts -->
Arquivo: [`exemplos/fhevm/scripts/demo-plain.ts`](exemplos/fhevm/scripts/demo-plain.ts).

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

### 6. Código completo: teste do contrato

<!-- codigo: exemplos/fhevm/test/HealthPlain.ts -->
Arquivo: [`exemplos/fhevm/test/HealthPlain.ts`](exemplos/fhevm/test/HealthPlain.ts).

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

### Referências

[Solidity — contratos](https://docs.soliditylang.org/en/latest/contracts.html) · [Hardhat 2](https://v2.hardhat.org/hardhat-runner/docs/getting-started) · [Ethers](https://docs.ethers.org/v6/)

---

<a id="modulo-07"></a>

## Módulo 7 — As mesmas operações com FHEVM

[Percurso](README.md) · [Instalação](INSTALACAO.md)


### Recursos usados

| Recurso | O que é | Por que usar |
|---|---|---|
| FHEVM | Integração de operações FHE a contratos EVM | Expressar o cálculo cifrado em Solidity |
| `@fhevm/solidity` | Biblioteca Solidity da Zama | Usar tipos cifrados e operações `FHE.*` |
| `ZamaEthereumConfig` | Configuração de rede do contrato | Conectar o contrato aos componentes FHEVM |
| `@fhevm/hardhat-plugin` | Plugin para Hardhat | Criar entradas cifradas e recuperar resultados |
| `@zama-fhe/relayer-sdk` | Cliente da infraestrutura Zama | Apoiar o fluxo com os serviços da rede |

### 1. Entenda o que muda

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

### 2. Contrato completo: HealthStats.sol

<!-- codigo: exemplos/fhevm/contracts/HealthStats.sol -->
Arquivo: [`exemplos/fhevm/contracts/HealthStats.sol`](exemplos/fhevm/contracts/HealthStats.sol).

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

#### Entradas e conversões

Os imports trazem a biblioteca e os tipos utilizados. `is ZamaEthereumConfig`
faz o contrato herdar a configuração de rede.

`externalEuint8[4]` recebe quatro referências de entrada. `FHE.fromExternal`
valida a entrada com sua prova e produz um `euint8` usado no cálculo.
A prova não demonstra que o valor é uma medição clínica verdadeira.

`FHE.asEuint32(input)` amplia o tipo antes de multiplicar. Já
`FHE.asEuint32(0)` e `FHE.asEuint32(1)` criam representações cifradas de constantes
públicas. Isso não serve para esconder uma entrada enviada em claro.

#### Soma, produto e seleção

Os acumuladores são locais à chamada. `FHE.mul(value, value)` calcula o quadrado;
`FHE.add` acumula as parcelas. `FHE.gt` produz uma condição cifrada.

`FHE.select(above, one, zero)` produz 1 ou 0 para a contagem.
`FHE.select(above, value, zero)` produz a parcela da soma filtrada.
Nenhuma condição é decifrada para decidir um desvio de execução Solidity.

#### Resultados

`FHE.makePubliclyDecryptable` marca os quatro agregados para recuperação pública.
A chamada não retorna imediatamente o número em claro. O cliente usa os handles
emitidos no evento `Results` para solicitar a decifração.

`FHE.toBytes32` converte cada handle para o formato de 32 bytes do evento.
`emit` grava o evento no recibo da transação. A ordem é sempre: soma, soma dos
quadrados, contagem e soma filtrada.

Este exemplo publica os agregados para verificar os cálculos. Não adicione dados
clínicos privados. Uma soma filtrada com contagem 1 identifica o valor selecionado.

### 3. Código completo: enviar entradas e ler resultados

Este auxiliar é usado tanto pela demonstração quanto pelos testes.

<!-- codigo: exemplos/fhevm/scripts/calculo.ts -->
Arquivo: [`exemplos/fhevm/scripts/calculo.ts`](exemplos/fhevm/scripts/calculo.ts).

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

### 4. Código completo: demonstração FHEVM

<!-- codigo: exemplos/fhevm/scripts/demo-healthcare.ts -->
Arquivo: [`exemplos/fhevm/scripts/demo-healthcare.ts`](exemplos/fhevm/scripts/demo-healthcare.ts).

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
está no [módulo 6](modulos/06-solidity.md).

`fhevm.isMock` informa se a execução usa a simulação local. A média e a variância
são calculadas no TypeScript, após recuperar os agregados, como no programa Rust.

### 5. Execute localmente

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

### Referências

[Zama — operações](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations) · [Entradas](https://docs.zama.org/protocol/solidity-guides/smart-contract/inputs) · [Conversões](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations/casting) · [Resultados públicos](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle) · [Coprocessor](https://docs.zama.org/protocol/protocol/overview/coprocessor)

---

<a id="modulo-08"></a>

## Módulo 8 — Testes, recortes e Sepolia

[Percurso](README.md) · [Instalação](INSTALACAO.md)


### Recursos usados

| Recurso | O que é | Por que usar |
|---|---|---|
| Testes Hardhat e `node:assert` | Execução automatizada e comparação | Verificar os resultados para diferentes limiares |
| Rede local `hardhat` | Blockchain em memória | Executar testes sem serviços externos |
| Sepolia | Rede de testes Ethereum | Exercitar a integração FHEVM real |
| RPC | Interface de comunicação com um nó | Enviar transações e consultar recibos |
| Carteira de teste | Chave para assinar transações | Implantar e chamar o contrato em Sepolia |

### 1. Leia o teste FHEVM completo

<!-- codigo: exemplos/fhevm/test/HealthStats.ts -->
Arquivo: [`exemplos/fhevm/test/HealthStats.ts`](exemplos/fhevm/test/HealthStats.ts).

```typescript
import { strict as assert } from "node:assert";
import { ethers, fhevm } from "hardhat";
import type { HealthStats } from "../types";
import { carregarAmostra, referencia } from "../scripts/dataset";
import { calcular } from "../scripts/calculo";

describe("HealthStats", function () {
  before(function () {
    if (!fhevm.isMock) throw new Error("Use a rede hardhat para esta suite");
  });
  for (const threshold of [20, 30, 100]) {
    it(`calcula a amostra cifrada com limiar ${threshold}`, async function () {
      const values = carregarAmostra().values;
      const [signer] = await ethers.getSigners();
      const factory = await ethers.getContractFactory("HealthStats");
      const contract = (await factory.deploy()) as HealthStats;
      await contract.waitForDeployment();
      const result = await calcular(contract, signer, values, threshold);
      assert.deepEqual(result.values, referencia(values, threshold));
    });
  }
  it("calcula duas vezes sem acumular os resultados", async function () {
    const values = carregarAmostra().values;
    const [signer] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("HealthStats");
    const contract = (await factory.deploy()) as HealthStats;
    await contract.waitForDeployment();
    const first = await calcular(contract, signer, values, 30);
    const second = await calcular(contract, signer, values, 30);
    assert.deepEqual(first.values, second.values);
    assert.deepEqual(second.values, referencia(values, 30));
  });
});
```
<!-- /codigo -->

Os três primeiros casos usam limiares 20, 30 e 100. O último chama a mesma
instância duas vezes: os resultados não devem se acumular, pois os acumuladores
existem somente durante cada chamada.

`before` impede rodar esta suíte numa rede externa. Não use uma execução ignorada
ou uma falha de configuração como evidência de que os cálculos funcionaram.
O arquivo `calculo.ts` usado nos testes está completo no [módulo 7](modulos/07-fhevm.md).

Execute as duas suítes e confira os tipos:

```bash
cd "$FHE_ROADMAP_ROOT/exemplos/fhevm"
npx hardhat compile
npm run typecheck
npm test
```

São três testes em claro e quatro FHEVM. Os testes Python da raiz verificam a
preparação de dados e a documentação; são verificações diferentes.

### 2. Varie o limiar

```bash
HEALTHCARE_THRESHOLD=20 npm run demo
HEALTHCARE_THRESHOLD=100 npm run demo
```

As variáveis antes de cada comando valem apenas para aquela execução.
Na amostra `[20, 38, 20, 20]`, as referências são:

| Limiar | Soma | Soma dos quadrados | Quantidade acima | Soma acima |
|---|---:|---:|---:|---:|
| 20 | 98 | 2644 | 1 | 38 |
| 30 | 98 | 2644 | 1 | 38 |
| 100 | 98 | 2644 | 0 | 0 |

A condição é `>`, não `>=`. Por isso os valores iguais a 20 não entram no filtro.

### 3. Use outros registros de saúde

Prepare o segundo grupo, sem substituir a amostra padrão:

```bash
cd "$FHE_ROADMAP_ROOT"
python3 scripts/preparar-dataset.py \
  --inicio 5 --limite 4 --destino dados/grupo2

cd "$FHE_ROADMAP_ROOT/exemplos/fhevm"
HEALTHCARE_DATASET="$FHE_ROADMAP_ROOT/dados/grupo2/amostra.json" \
  HEALTHCARE_THRESHOLD=30 npm run demo
```

Para `[20, 40, 15, 60]`, espere `[135, 5825, 2, 100]`. A média é `33,75%`.
Execute também `npm run demo:plain` com as mesmas variáveis para comparar os resultados.

O formato dos contratos exige quatro registros. Rust aceita outros tamanhos
permitidos pelo carregador. Não envie oito valores a uma função declarada com vetor de quatro.

### 4. Prepare uma carteira para Sepolia

A parte local termina aqui. Os próximos passos usam serviços de rede e uma
carteira **exclusivamente de teste**, sem ativos reais.

O arquivo abaixo gera uma carteira no seu computador, sem chamadas de rede.
Não redirecione sua saída para um arquivo do repositório e não a compartilhe.

#### Código completo: criar-carteira.ts

<!-- codigo: exemplos/fhevm/scripts/criar-carteira.ts -->
Arquivo: [`exemplos/fhevm/scripts/criar-carteira.ts`](exemplos/fhevm/scripts/criar-carteira.ts).

```typescript
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
```
<!-- /codigo -->

Execute dentro do projeto Node:

```bash
cd "$FHE_ROADMAP_ROOT/exemplos/fhevm"
npx ts-node scripts/criar-carteira.ts
```

Guarde a frase-semente fora do repositório. Cada execução gera outra carteira.
A frase permite reconstruir as chaves; não reutilize uma carteira pessoal neste projeto.

Configure a frase interativamente:

```bash
npx hardhat vars set MNEMONIC
```

Cole somente a frase da carteira de teste no prompt. O mecanismo `vars` armazena
valores localmente sem cifração; não é um cofre de segredos.

### 5. Configure o endpoint RPC

No serviço RPC de sua escolha, crie um endpoint para **Ethereum Sepolia** e copie
a URL HTTPS completa. Ela pode conter uma credencial do provedor. Configure-a
no prompt, não no código:

```bash
npx hardhat vars set SEPOLIA_RPC_URL
```

Não use a URL de uma rede diferente nem a página de um explorador de blocos.
As duas variáveis fazem a configuração criar a rede `sepolia`.

O relayer Zama em Sepolia é descrito como aberto na
[documentação de autenticação](https://docs.zama.org/protocol/sdk/guides/relayer-api-keys).
A credencial eventualmente contida na URL RPC pertence ao provedor RPC; são serviços diferentes.

#### Código completo: account.ts

<!-- codigo: exemplos/fhevm/scripts/account.ts -->
Arquivo: [`exemplos/fhevm/scripts/account.ts`](exemplos/fhevm/scripts/account.ts).

```typescript
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
```
<!-- /codigo -->

Consulte o endereço que o Hardhat realmente está usando:

```bash
npx hardhat run scripts/account.ts --network sepolia
```

Use um faucet de Sepolia para enviar ETH de teste a esse endereço. A documentação
[das redes Ethereum](https://ethereum.org/en/developers/docs/networks/#sepolia)
lista recursos para a rede. Um faucet precisa do **endereço público**, nunca da frase-semente.
Execute `account.ts` novamente para conferir o saldo.

### 6. Implante e execute em Sepolia

O script completo `demo-healthcare.ts` está no [módulo 7](modulos/07-fhevm.md).
Ele implanta a instância, cifra a amostra, envia a chamada e recupera os resultados:

```bash
cd "$FHE_ROADMAP_ROOT/exemplos/fhevm"
npx hardhat clean
npx hardhat compile --network sepolia
npm run demo:sepolia
```

A referência numérica é a mesma do modo local. A saída deve indicar
`FHE simulado: false`. Cada execução implanta outra instância.
Uma transação confirmada não significa que o resultado FHE já foi recuperado;
o script trata essas etapas separadamente.

Se ocorrer uma falha depois do envio, guarde o hash público mostrado e consulte
o recibo antes de repetir. Não registre a frase-semente ou a URL RPC com credenciais.
O teste de saldo não nulo do script não garante saldo suficiente para todas as transações.

### 7. Interprete as medidas

| Campo | O que mede |
|---|---|
| `Entrada (ms)` | Preparação dos handles e da prova pelo cliente |
| `Envio e recibo (ms)` | Chamada do contrato até o recibo |
| `Recuperacao (ms)` | Solicitação dos resultados até a resposta |
| `Gas da chamada calculate` | Gas da transação de cálculo, sem a implantação |

Tempos da simulação local não representam o custo criptográfico de Sepolia.
Gas também não é o mesmo que complexidade homomórfica, medida pela Zama em HCU.
O `HealthPlain` é consultado sem transação de cálculo na demonstração, por isso
seu tempo não deve ser comparado diretamente ao envio FHEVM.

Para estudar o efeito das operações, compare as medidas com o programa Rust
do módulo 3 e identifique quais etapas cada número inclui. As implementações
não executam no mesmo ambiente e não constituem um benchmark equivalente.

### Referências

[Zama — testes e Sepolia](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/run_test) · [Hardhat — variáveis](https://v2.hardhat.org/hardhat-runner/docs/guides/configuration-variables) · [Zama — HCU](https://docs.zama.org/protocol/solidity-guides/development-guide/hcu)
