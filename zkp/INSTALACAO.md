# Instalação passo a passo

O projeto novo é independente de `exemplos/fhevm` e `exemplos/tfhe-rs`.
Não execute `npm install` dentro deles para instalar ZKP. Não substitua os seus
arquivos de configuração ou dependências.

O exemplo Schnorr precisa apenas de **Python 3.10 ou superior**. Os circuitos usam
**Node.js 22** e **Circom 2.2.3**. Rust/Cargo servem para instalar o compilador Circom;
as provas são geradas por snarkjs. O compilador Solidity vem como dependência npm
local, não exige instalação global. [Fontes das ferramentas](REFERENCIAS.md).

## 1. Preparar o sistema

### Ubuntu ou Debian

Abra um terminal e instale as ferramentas de sistema:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates build-essential pkg-config libssl-dev python3 python3-venv unzip

git --version
python3 --version
```

`git` obtém o código; `curl` baixa instaladores; `build-essential` fornece o linker
e as ferramentas nativas usadas pelo Rust; `python3` executa o primeiro exemplo
e as verificações do incremento.

### Windows com WSL2

No PowerShell como administrador, instale Ubuntu:

```powershell
wsl --install -d Ubuntu
```

Reinicie se o instalador solicitar. Abra **Ubuntu**, crie o usuário Linux e execute
os comandos da seção Ubuntu dentro desse terminal. Mantenha Node, Rust, Circom e
o repositório no mesmo ambiente WSL; não misture `node.exe` do Windows com
`circom` do Linux. Trabalhe preferencialmente em uma pasta como `~/projetos`.
Consulte a [instalação oficial do WSL](https://learn.microsoft.com/windows/wsl/install).

### macOS

Instale as ferramentas de linha de comando:

```bash
xcode-select --install
```

Depois da instalação, confira `git --version` e `python3 --version`. Para Python
3.10 ou superior ausente, instale o pacote oficial de
[Python para macOS](https://www.python.org/downloads/macos/). Os passos de nvm,
Rust e Circom abaixo usam o Terminal com Bash ou Zsh. Os comandos `apt` são
exclusivos de Ubuntu/Debian e não devem ser executados no macOS.

## 2. Abrir a cópia existente do repositório

Este guia supõe que os arquivos incrementais já foram copiados segundo
[COMO-ADICIONAR.md](COMO-ADICIONAR.md). Abra um terminal na raiz de `fhe-blockchain`:

```bash
pwd
git status --short
python3 -c "from pathlib import Path; assert Path('dados/processado/amostra.json').is_file(); assert Path('zkp/README.md').is_file(); print('Pasta correta')"
```

Os caminhos seguintes são relativos a essa raiz, salvo indicação contrária.
Não é necessário clonar outra cópia se você já possui o repositório.

## 3. Executar Python antes de instalar o restante

Não há `pip install`, ambiente virtual obrigatório ou biblioteca criptográfica
externa neste primeiro exemplo:

```bash
python3 zkp/exemplos/schnorr/schnorr.py demo
python3 zkp/exemplos/schnorr/schnorr.py verify \
  zkp/exemplos/schnorr/saida/proof.json \
  --context 'healthcare:amostra-publica:v1'
python3 -m unittest discover -s zkp/exemplos/schnorr -v
```

A demonstração escreve somente a declaração pública e a prova. Ela não escreve a
medida secreta, o fator de ocultação nem os nonces no JSON. Leia a distinção entre
conhecimento da abertura e prova de intervalo no [módulo 2](modulos/02-schnorr-pedersen.md).

## 4. Instalar ou carregar nvm

**nvm** seleciona a versão do Node por terminal. Uma instalação existente pode ser
reutilizada. Estes comandos não editam automaticamente o arquivo de inicialização
do seu shell:

```bash
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  git clone --depth 1 --branch v0.40.8 https://github.com/nvm-sh/nvm.git "$NVM_DIR"
fi
. "$NVM_DIR/nvm.sh"
command -v nvm
```

A saída esperada do último comando é `nvm`. Se a pasta existir, mas estiver
incompleta, examine-a antes de tentar outra instalação; o guia não manda apagá-la.
A instalação via Git e o carregamento por shell estão descritos no
[projeto nvm](https://github.com/nvm-sh/nvm#git-install).

Entre **somente no projeto ZKP** e selecione Node 22:

```bash
cd zkp/exemplos/circom
nvm install 22
nvm use
node --version
npm --version
```

`nvm use` lê o `.nvmrc` local, que contém `22`. Não há alteração do `.nvmrc` da raiz
nem do projeto FHEVM. O guia não usa `nvm alias default`, portanto não troca
explicitamente o Node padrão dos seus outros terminais.

**Permaneça em `zkp/exemplos/circom` até o fim desta instalação.**

## 5. Instalar Rust e Cargo somente quando ausentes

Confira primeiro:

```bash
rustc --version
cargo --version
rustup --version
```

Com Rust já instalado pelo rustup, não é preciso reinstalar. Quando estiver
ausente, baixe o instalador oficial e execute-o como usuário normal:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o /tmp/zkp-rustup-init.sh
sh /tmp/zkp-rustup-init.sh
. "$HOME/.cargo/env"
```

Leia as opções apresentadas pelo instalador. Em uma instalação existente,
`rustup toolchain install stable` adiciona a ferramenta necessária sem exigir que
você troque o toolchain padrão usado por TFHE-rs:

```bash
rustup toolchain install stable
cargo +stable --version
```

`Cargo` é o gerenciador de pacotes e compilação do Rust. A sintaxe `+stable`
seleciona o toolchain apenas para esse comando.
[Instalação oficial do Rust](https://rust-lang.org/tools/install/).

## 6. Instalar Circom 2.2.3 em uma pasta separada

Circom descreve relações matemáticas verificáveis. Seu compilador produz as
restrições R1CS e o programa WebAssembly que calcula o witness. Não confunda o
compilador Circom 2 com o antigo pacote npm chamado `circom`.

```bash
mkdir -p "$HOME/.local/src" "$HOME/.local/opt"
git clone --depth 1 --branch v2.2.3 \
  https://github.com/iden3/circom.git \
  "$HOME/.local/src/circom-2.2.3"

cargo +stable install --locked \
  --path "$HOME/.local/src/circom-2.2.3/circom" \
  --root "$HOME/.local/opt/circom-2.2.3"

export PATH="$HOME/.local/opt/circom-2.2.3/bin:$PATH"
circom --version
```

A versão deve ser `2.2.3`. Se você já criou essa pasta antes, não repita o clone:
confira a tag com `git -C "$HOME/.local/src/circom-2.2.3" describe --tags --exact-match`
e continue a partir do `cargo`. O binário instalado fica separado de qualquer
outro Circom existente. O `export PATH` vale para o terminal atual.
[Versão selecionada](https://github.com/iden3/circom/releases/tag/v2.2.3).

## 7. Instalar as bibliotecas do novo projeto

Ainda dentro de `zkp/exemplos/circom`:

```bash
npm install
npm run doctor
```

Não use `sudo npm install`. Não é necessário instalar snarkjs ou Hardhat
globalmente. `npm install` instala as versões diretas declaradas no
`package.json` local e cria um `package-lock.json` local.

| Biblioteca | Versão selecionada | Função |
|---|---|---|
| `circomlib` | 2.0.5 | Circuitos de bits, comparação e Poseidon |
| `circomlibjs` | 0.1.7 | Calcula o mesmo Poseidon em JavaScript |
| `snarkjs` | 0.7.6 | Setup, witness, Groth16, PLONK e verificação |
| `hardhat` | 2.28.6 | EVM local, compilação e testes de contratos |
| `@nomicfoundation/hardhat-ethers` | 3.1.3 | Integra ethers com Hardhat |
| `ethers` | 6.16.0 | Deploy e chamadas aos contratos |
| `solc` | 0.8.24 | Compilador Solidity local |

São versões escolhidas para esta implementação, não uma promessa de que sejam as
mais recentes. Node 22, Hardhat e o plugin ethers seguem a linha já declarada no
projeto FHEVM inspecionado, mas as instalações permanecem separadas.

Depois que o lockfile local tiver sido gerado e conferido, futuras instalações
podem usar `npm ci`. **Não execute `npm ci` na primeira instalação deste ZIP**:
ele não contém um lockfile npm resolvido. Versões diretas fixas não tornam todas
as dependências transitivas reproduzíveis sem esse arquivo.

## 8. Compilar e provar, uma etapa por vez

```bash
node scripts/zk.cjs compile intervalo
node scripts/zk.cjs setup intervalo
npm run dados
npm run witness -- intervalo
npm run provar -- intervalo
npm run verificar -- intervalo
```

O primeiro comando cria as restrições e o WASM. O segundo cria/verifica Powers of
Tau e a chave específica do circuito. `dados` prepara as entradas usando a amostra
pública. `witness` calcula os valores internos. `provar` recalcula o witness para
não usar um arquivo antigo, gera Groth16 e já verifica a prova. `verificar` repete
a verificação com a declaração pública esperada.

A saída da verificação inclui `PROVA VALIDA`. Os números do compromisso e os
componentes da prova variam. Os limites públicos da demonstração são 30 e 45.

O atalho equivalente é:

```bash
npm run demo -- intervalo
```

Não é necessário executar as duas formas. O atalho reutiliza entradas e setup
compatíveis. `npm run dados` é uma ação explícita: gera novos salts e remove as
provas antigas dos cinco exemplos, porque seus compromissos mudaram.

## 9. Verificar no contrato local

Depois de gerar a prova Groth16 de `intervalo`:

```bash
npm run compile:solidity
npm run test:contratos
npm run demo:contrato
```

Não inicie outro nó para esses comandos: a rede Hardhat em memória é criada pelo
próprio comando e descartada ao terminar. A compilação usa `solc` instalado via
npm. Nenhuma conta real, frase-semente, chave privada ou faucet é necessário.

## 10. Percorrer todos os exemplos

```bash
npm run demo:todos
npm test
npm run demo:plonk
```

`npm test` executa testes unitários, gera/verifica provas Groth16 dos cinco
circuitos, testa entradas adulteradas e executa os testes dos contratos.
PLONK é uma execução adicional, separada. A primeira geração de Powers of Tau
consome recursos locais; acompanhe os processos no terminal. Nenhum número de
desempenho é pressuposto pelo guia.

## 11. Reabrir um terminal

Carregue as ferramentas novamente e entre na pasta correta:

```bash
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
. "$NVM_DIR/nvm.sh"
export PATH="$HOME/.local/opt/circom-2.2.3/bin:$PATH"
```

Depois de abrir `zkp/exemplos/circom`, execute `nvm use` e `npm run doctor`.
Não há scripts que alterem automaticamente seu perfil de shell ou os projetos
antigos. [Problemas comuns](PROBLEMAS.md) · [Estado da validação](VALIDACAO.md).
