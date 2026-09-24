# Problemas de instalação e execução

[Início](README.md) · [Instalação](INSTALACAO.md)

## O comando usa a pasta errada

Volte à pasta que contém `README.md` e `INSTALACAO.md`:

```bash
pwd
ls README.md INSTALACAO.md
export FHE_ROADMAP_ROOT="$PWD"
```

Em cada novo terminal, configure a variável novamente. Para Rust, os comandos
usam caminhos relativos à raiz. Para npm, entre em `exemplos/fhevm`.

## `cargo` ou `rustc` não foi encontrado

Carregue a instalação do usuário:

```bash
source "$HOME/.cargo/env"
rustc --version
cargo --version
```

No WSL, Rust deve estar instalado dentro do Ubuntu. Se o arquivo de ambiente não
existir, volte ao passo de instalação do Rust.

## `nvm` ou `node` não foi encontrado

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm install 22
nvm use 22
node --version
npm --version
```

`nvm` é uma função do shell. `command -v nvm` deve retornar `nvm`.
Não use `sudo npm install` neste projeto.

## Falta memória ao compilar TFHE-rs

Reduza apenas o paralelismo de compilação:

```bash
cd "$FHE_ROADMAP_ROOT"
CARGO_BUILD_JOBS=1 cargo build --release \
  --manifest-path exemplos/tfhe-rs/Cargo.toml --bins
```

Essa mudança pode reduzir o pico de memória, mas não garante que o programa caiba
na máquina. Não altere parâmetros criptográficos para tentar resolver o problema.

## A primeira instalação Node pede um lockfile

O pacote declara versões diretas, mas não inclui `package-lock.json`.
Use `npm install` na primeira instalação. Preserve o lockfile gerado; em cópias
que já o incluam, use `npm ci`. Não substitua o manifesto por um projeto novo.

## O import `../types` falha

Os tipos dos contratos são gerados na compilação:

```bash
cd "$FHE_ROADMAP_ROOT/exemplos/fhevm"
npx hardhat compile
npm run typecheck
```

Não crie a pasta `types/` manualmente. Confira o erro de compilação antes de
alterar os scripts TypeScript.

## Uma dependência pede uma versão diferente

Confira a base instalada:

```bash
node --version
npm --version
npm ls hardhat @fhevm/solidity @fhevm/hardhat-plugin ethers
```

O projeto usa Node 22 e Hardhat 2.28.6. Não troque somente o Hardhat por outra
família de versões, nem use `npm audit fix --force` sem avaliar as mudanças.
Consulte a [configuração](CONFIGURACAO.md).

## O programa recusa os dados

Confira `dados/processado/amostra.json` e o caminho de `HEALTHCARE_DATASET`.
O programa TypeScript exige quatro percentuais inteiros entre 0 e 100.
Os programas Rust leem o CSV de duas colunas gerado pelo script de preparação,
não o CSV clínico completo de 13 colunas.

## `preparar` ou `calcular` recusa um caminho

Os programas do módulo 5 evitam sobrescrever chaves e resultados.
Use outra pasta de rodada e outro nome para o resultado. Não apague uma chave
que ainda seja necessária para decifrar arquivos existentes.

## A rede `sepolia` não aparece

A configuração só inclui essa rede quando ambas as variáveis existem:

```bash
cd "$FHE_ROADMAP_ROOT/exemplos/fhevm"
npx hardhat vars set MNEMONIC
npx hardhat vars set SEPOLIA_RPC_URL
npx hardhat run scripts/account.ts --network sepolia
```

Use uma carteira de teste e um endpoint Ethereum Sepolia. Não publique a frase
nem a URL com credenciais. A variável `vars` não cifra os valores no disco.

## A transação foi enviada, mas o resultado não apareceu

Consulte o hash exibido e o recibo antes de repetir. Confirme a rede, o endereço,
o saldo e a disponibilidade do RPC e do serviço FHEVM. A inclusão da transação
e a recuperação dos resultados são etapas diferentes.

Não altere o contrato para revelar as entradas como forma de depuração.
O script já compara os agregados com a referência pública.

## Os tempos locais parecem muito baixos

`FHE simulado: true` indica o modo local do plugin. Ele testa a lógica, não o
custo da criptografia da rede. O contrato em claro também é consultado de modo
diferente: sua função `pure` usa uma chamada de leitura na demonstração.
