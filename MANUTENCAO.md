# Manutenção da documentação

A documentação usa Markdown. Os programas ficam em `exemplos/` e `scripts/`.
Os módulos incluem cópias completas dos arquivos que explicam.

## Alterar o código e os módulos

Edite primeiro o arquivo executável. Nos módulos, os comentários
`<!-- codigo: caminho -->` e `<!-- /codigo -->` delimitam a cópia desse arquivo.
Não altere somente essa cópia, pois ela seria sobrescrita na sincronização.

Na raiz:

```bash
python3 scripts/sincronizar-docs.py
```

Esse comando atualiza os blocos de código e recompõe `ROADMAP.md` com a
instalação, a configuração e os oito módulos. Ele escreve apenas arquivos `.md`.
Para verificar sem alterar:

```bash
python3 scripts/sincronizar-docs.py --check
```

Leia o módulo após mudar uma API: a sincronização atualiza o código, não reescreve
a explicação. Mantenha os caminhos relativos e as referências oficiais.

## Verificar

```bash
python3 -m unittest discover -s tests -v
bash -n scripts/publicar-github.sh
```

Os testes Python verificam os dados, os links internos e a correspondência entre
código e documentação. Para executar os projetos com suas dependências:

```bash
cargo build --release --manifest-path exemplos/tfhe-rs/Cargo.toml --bins
cargo run --release --manifest-path exemplos/tfhe-rs/Cargo.toml \
  -- dados/processado/amostra.csv
cd exemplos/fhevm
npm install
npx hardhat compile
npm run typecheck
npm test
```

Esses comandos exigem o ambiente descrito em `INSTALACAO.md`. Não descreva uma
checagem de sintaxe como execução FHE. Registre o que foi executado em `VALIDACAO.md`.

## Versões e integridade

Preserve `Cargo.lock` e `package-lock.json` após a primeira instalação bem-sucedida.
Não gere lockfiles manualmente. Ao atualizar dependências, repita os testes e
confira as APIs documentadas.

`SHA256SUMS.txt` identifica os arquivos da distribuição original. Editar o código
ou a documentação altera seus hashes. A verificação do manifesto deve ser feita
antes das alterações, não usada como teste funcional do programa.
