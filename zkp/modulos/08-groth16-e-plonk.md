# 8. A mesma afirmação com Groth16 e PLONK

**Circom** define a relação. **Groth16** e **PLONK** são sistemas que permitem
provar essa relação. Não são duas linguagens alternativas para escrever o mesmo
arquivo. **Snarkjs** implementa ambos e aceita os artefatos compilados de Circom.
[Implementação utilizada](https://github.com/iden3/snarkjs).

## O que muda

| Aspecto desta implementação | Groth16 | PLONK |
|---|---|---|
| Relação do exemplo | `intervalo.circom` | O mesmo `intervalo.circom` |
| Fonte dos valores | A amostra pública existente | A mesma amostra |
| Parâmetros universais | Powers of Tau | Powers of Tau |
| Cerimônia específica por circuito | Necessária no modelo de Groth16 | Não há a mesma fase de contribuição específica |
| Preparação de chaves do circuito | `groth16 setup` e contribuição `zkey` | `plonk setup`, a partir dos parâmetros universais |
| Formato de prova/verificação | Groth16 | PLONK |
| Contrato executado nesta trilha | Verificador didático Groth16 | Somente verificação local por snarkjs |

O modelo universal e atualizável de PLONK não significa ausência de setup. Esta
versão de PLONK em snarkjs usa Powers of Tau. Também não significa “uma única chave
para todos os circuitos”: os artefatos de preparação e verificação continuam
relacionados ao circuito. Consulte os artigos de
[Groth16](https://eprint.iacr.org/2016/260) e
[PLONK](https://eprint.iacr.org/2019/953).

Não há promessa de que PLONK seja sempre mais rápido, menor ou mais barato em gás.
Circuito, implementação, parâmetros e plataforma influenciam os custos. Esta
trilha não apresenta benchmarks que não foram medidos.

## Por que o setup local não serve para produção

O comando de demonstração cria os parâmetros na sua própria máquina, com
aleatoriedade do sistema operacional. A contribuição local não é uma cerimônia
com participantes independentes e descarte de segredos auditável. Isso permite
estudar os comandos, mas deixa a confiança concentrada nesse processo.

Verificar o arquivo Powers of Tau confere sua consistência criptográfica; não
prova que segredos foram apagados, que a máquina não estava comprometida ou que
participantes eram independentes. Para Groth16, a mesma atenção vale para a fase
específica do circuito. As hipóteses do setup não desaparecem porque a prova foi
aceita. [Ferramentas de cerimônia do snarkjs](https://github.com/iden3/snarkjs).

Não versionamos uma chave pronta nem fornecemos uma contribuição com uma frase
fixa como se ela fosse uma cerimônia segura. Os scripts geram entropia nova e
avisam que o setup é didático. Provas futuras dependem da chave local produzida.

## Executar PLONK de verdade

Conclua a [instalação](../INSTALACAO.md). Dentro de `zkp/exemplos/circom`:

```bash
npm run demo -- intervalo
npm run demo:plonk
```

O segundo comando recompila o mesmo circuito, verifica o Powers of Tau local,
executa `plonk setup`, calcula o witness, gera uma prova PLONK e a verifica. Os
arquivos têm prefixos separados:

```text
build/intervalo/groth16.zkey
build/intervalo/groth16.vkey.json
build/intervalo/groth16.proof.json
build/intervalo/groth16.public.json
build/intervalo/plonk.zkey
build/intervalo/plonk.vkey.json
build/intervalo/plonk.proof.json
build/intervalo/plonk.public.json
```

Os comandos reutilizam a entrada existente. Assim, os sinais públicos das duas
provas devem ser iguais, embora as provas e as chaves não sejam intercambiáveis.
Confira com código completo e independente de outras bibliotecas:

```bash
node -e "const fs=require('node:fs'); const assert=require('node:assert/strict'); const read=f=>JSON.parse(fs.readFileSync('build/intervalo/'+f,'utf8')); assert.deepEqual(read('groth16.public.json'),read('plonk.public.json')); console.log('Mesma declaração pública, sistemas de prova diferentes');"
```

Para verificar novamente apenas PLONK:

```bash
node scripts/verify.cjs plonk \
  build/intervalo/plonk.vkey.json \
  build/intervalo/plonk.public.json \
  build/intervalo/plonk.proof.json
```

Esse verificador de baixo nível confere a prova contra a chave e os sinais que
você fornece. Diferentemente do comando `npm run verificar -- intervalo`, ele
não escolhe nem autentica a declaração esperada pela aplicação. Você precisa
conferir essa declaração separadamente.

## Código executado

O ramo `plonk` de `scripts/zk.cjs` e o verificador `scripts/verify.cjs` estão
integralmente em [CONFIGURACAO.md](../CONFIGURACAO.md). Não há pseudocódigo ou
substituição de uma prova por uma comparação JavaScript.

O verificador Solidity do módulo 7 aceita apenas o formato Groth16 e três sinais.
Não envie uma prova PLONK para ele. A prova PLONK deste módulo é verificada fora da
blockchain. O incremento não afirma implementar um contrato PLONK.

[Índice](../README.md) · [Anterior](07-solidity.md) · [Próximo](09-zkp-com-fhe.md)
