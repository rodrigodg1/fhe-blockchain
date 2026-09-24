# Problemas comuns

## `nvm: command not found`

Carregue a instalação no terminal atual:

```bash
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
. "$NVM_DIR/nvm.sh"
```

Dentro de `zkp/exemplos/circom`, rode `nvm use`. Não instale dependências no projeto
FHEVM para corrigir o projeto ZKP.

## `circom: command not found` ou versão diferente

```bash
export PATH="$HOME/.local/opt/circom-2.2.3/bin:$PATH"
circom --version
```

O fluxo automatizado exige 2.2.3. Não instale o antigo pacote npm `circom` como
substituto. Confira o passo de compilação em [INSTALACAO.md](INSTALACAO.md).

## `Cannot find module` ou biblioteca Circom não encontrada

Dentro de `zkp/exemplos/circom`, execute `npm install` e `npm run doctor`.
O pacote `circomlib` fornece os arquivos `.circom`; `circomlibjs` não os substitui.
Os scripts passam `node_modules` ao compilador com `-l`.

## `npm ci` reclama de lockfile ausente

A primeira instalação usa `npm install`. O ZIP não inclui um lockfile que não foi
resolvido neste ambiente. Após gerar e conferir o lockfile do projeto novo, use
`npm ci` nas instalações seguintes. Não copie o lockfile de `exemplos/fhevm`.

## Dataset ausente ou tamanho diferente

O programa espera a cópia existente de `dados/processado/amostra.json`, na raiz
do repositório, com quatro inteiros da variável `ejection_fraction` e marcador
`public_reference_only: true`. Adicione o incremento ao repositório completo;
não execute a pasta ZIP isolada como se ela contivesse os dados antigos.

Alterar o recorte muda os resultados esperados. Os testes de regressão usam
explicitamente `[20, 38, 20, 20]`. Não converta valores fracionários silenciosamente
nem passe prontuários privados para testar um tutorial.

## `Assert Failed` ao calcular o witness

A entrada pode não satisfazer a relação: valor fora do intervalo, compromisso
incompatível, estatística errada, salt longo ou caminho Merkle incorreto.
Esse erro é o resultado esperado nos testes negativos. Uma prova de afirmação
falsa não deve ser produzida.

## Artefatos de setup incompatíveis

Mudou circuito, arquivo comum, dependência de circuito ou chave? Não reutilize a
chave anterior. Depois de guardar algum resultado didático que queira comparar,
execute **dentro do projeto ZKP**:

```bash
npm run limpar
npm run demo:todos
```

Isso remove somente artefatos gerados pelo novo projeto, inclusive inputs locais
sob `build/`. Não altera os fontes nem os exemplos FHE. Uma geração de Powers of
Tau interrompida pode exigir o mesmo procedimento. Nunca aplique comandos de
limpeza a uma pasta diferente por engano.

## Prova válida localmente, mas rejeitada no contrato

Confirme que usou Groth16 de `intervalo`, três sinais na ordem correta, a mesma
chave de verificação e a declaração esperada. Confira a inversão dos coeficientes
G2 exatamente uma vez. Provas PLONK e chaves de `estatisticas` não são aceitas pelo
contrato de três sinais deste módulo.

## `statement.json` mudou depois da prova

`npm run dados` gera novos salts e remove provas antigas. Refaça a prova com
`npm run provar -- intervalo` ou execute o `demo`. Não copie `public.json` de uma
execução e `proof.json` de outra.

## Consumo de memória ou geração demorada

Feche processos pesados e execute um circuito por vez: `npm run demo -- intervalo`.
O parâmetro Powers of Tau tem potência 14 para os pequenos circuitos desta trilha.
Não reduza a potência sem verificar a quantidade de restrições e os requisitos
do sistema de prova. O consumo depende da plataforma e das versões instaladas;
não foi medido no ambiente de preparação deste ZIP.

## Posso usar no hospital ou colocar em produção?

O material é educacional. Não houve auditoria dos circuitos, do protocolo Python
ou do verificador parametrizado. O setup local não é uma cerimônia de produção e
não existe autenticação de origem clínica. O estado exato dos testes está em
[VALIDACAO.md](VALIDACAO.md). Essas limitações não são resolvidas apenas pela
compilação sem erros.
