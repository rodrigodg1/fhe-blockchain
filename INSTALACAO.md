# Instalação

[Início](README.md) · [Configuração completa](CONFIGURACAO.md) · [Módulo 1](modulos/01-fhe-e-dados.md)

Use um terminal Bash no Ubuntu, no WSL2 ou no macOS. Execute um bloco por vez.
Se um comando falhar, resolva o erro antes de continuar.

## 1. Entenda o que será instalado

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

## 2. Prepare o sistema

### Windows: instale o Ubuntu no WSL2

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

### Ubuntu: instale as ferramentas do sistema

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

### macOS: instale as ferramentas do sistema

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

## 3. Instale Rust e Cargo

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

## 4. Instale Node.js 22 e npm

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

## 5. Abra a pasta do repositório

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

## 6. Prepare os dados com Python

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

## 7. Instale TFHE-rs e compile os programas Rust

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

## 8. Instale Hardhat e as bibliotecas FHEVM

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

## 9. Execute o contrato em claro e os testes

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

## 10. Preserve as versões resolvidas

A primeira instalação gera `exemplos/tfhe-rs/Cargo.lock` e
`exemplos/fhevm/package-lock.json`. Guarde esses arquivos junto do código.
Após gerar o lockfile Node, use `npm ci` nas reinstalações:

```bash
cd "$FHE_ROADMAP_ROOT/exemplos/fhevm"
npm ci
```

Não use `npm ci` antes de existir um `package-lock.json`. Dependências diretas
fixadas não substituem os lockfiles das dependências transitivas.

## Referências

[WSL](https://learn.microsoft.com/en-us/windows/wsl/install) ·
[Rust](https://rust-lang.org/pt-BR/tools/install/) ·
[TFHE-rs](https://docs.zama.org/tfhe-rs/get-started/installation) ·
[nvm](https://github.com/nvm-sh/nvm) ·
[Node.js](https://nodejs.org/en/download) ·
[Hardhat 2](https://v2.hardhat.org/hardhat-runner/docs/getting-started) ·
[Template Zama](https://github.com/zama-ai/fhevm-hardhat-template)
