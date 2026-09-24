# Adicionar o incremento sem sobrescrever o repositório

O ZIP contém somente `ZKP.md` e a pasta `zkp/`. Esses nomes não existiam na raiz do
commit inspecionado. A base está registrada em [BASE-INSPECIONADA.json](BASE-INSPECIONADA.json).
O pacote não contém cópias dos arquivos antigos nem faz push ao GitHub.

## Copiar manualmente

Extraia o ZIP em uma pasta temporária. Copie `ZKP.md` e `zkp/` para a raiz da sua
cópia de `fhe-blockchain`. Se surgir uma pergunta de sobrescrita, cancele e confira
o conflito: este pacote foi preparado como adição, não atualização de arquivos
preexistentes com esses nomes.

O resultado deve ter `README.md` antigo ao lado de `ZKP.md`, e `dados/` antigo ao
lado de `zkp/`. Não coloque a pasta nova dentro de `exemplos/fhevm`.

## Aplicação com verificação

O script incluído confere checksums e todos os conflitos antes de escrever.
Por padrão ele apenas simula. Execute-o **na pasta onde você extraiu o ZIP**:

```bash
python3 zkp/scripts/aplicar_incremento.py /caminho/para/fhe-blockchain
```

Troque `/caminho/para/fhe-blockchain` pelo caminho real da sua cópia. Depois de
conferir a simulação, aplique:

```bash
python3 zkp/scripts/aplicar_incremento.py /caminho/para/fhe-blockchain --aplicar
```

Arquivos já idênticos são mantidos. Arquivos diferentes causam erro, sem
sobrescrita. A criação de cada arquivo usa modo exclusivo para também evitar
sobrescrita em uma concorrência posterior à checagem. Não há garantia de transação
atômica de todos os novos arquivos se o disco falhar durante a cópia, mas nenhum
arquivo anterior é substituído pelo script.

O manifesto e os checksums conferem a consistência do pacote. Não são assinatura
digital nem autenticação de quem produziu o ZIP.

## Conferir no Git

Na raiz do repositório de destino:

```bash
git status --short
git diff -- README.md ROADMAP.md INSTALACAO.md exemplos dados modulos scripts tests
```

O incremento só adiciona os dois caminhos novos. O segundo comando não deve mostrar
alterações feitas por este pacote; mudanças que você já possuía continuam sendo
suas. Os exemplos antigos e seus lockfiles permanecem como estavam.

O índice antigo não é editado automaticamente. A entrada nova é `ZKP.md`. Também
não alteramos o `SHA256SUMS.txt` antigo: o incremento tem checksums próprios em
`zkp/SHA256SUMS.txt`.

## Começar a leitura

Abra [README.md](README.md), siga a [instalação](INSTALACAO.md) e leia o primeiro
módulo. Os scripts de prova e teste não enviam transações públicas nem precisam
de chaves reais. Os testes originais de FHE não são executados por este incremento
e não foram declarados aprovados pela nova validação.
