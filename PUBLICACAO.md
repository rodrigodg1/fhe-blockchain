# Publicação no GitHub

Esta etapa é opcional. Nenhum comando de publicação é necessário para ler o
roadmap ou executar os exemplos.

## Instale o GitHub CLI

Git já faz parte da [instalação](INSTALACAO.md). Para instalar o comando `gh`,
siga a página oficial do [GitHub CLI](https://cli.github.com/) para seu sistema.
No WSL, instale a versão Linux dentro do Ubuntu.

Confira e autentique a conta:

```bash
git --version
gh --version
gh auth login --hostname github.com
```

Escolha a autenticação pelo navegador e use a conta `rodrigodg1`.

## Publique o pacote original

Na raiz do repositório:

```bash
python3 scripts/verificar-pacote.py
bash scripts/publicar-github.sh
```

O script cria `rodrigodg1/fhe-healthcare-roadmap` como privado e envia os arquivos
listados em `SHA256SUMS.txt`. Ele recusa uma pasta com `.git` ou um repositório
remoto já existente. Não executa Rust, Hardhat ou transações blockchain.

Se você já tiver alterado os arquivos, revise o conteúdo e use seu fluxo Git
habitual. Não inclua frases-semente, credenciais RPC, chaves FHE, `node_modules/`
ou `target/`. O manifesto verifica o pacote distribuído; não é uma assinatura.

Para compartilhar um repositório privado, conceda acesso à conta do leitor no
GitHub. A execução deste script não concede esse acesso automaticamente.
