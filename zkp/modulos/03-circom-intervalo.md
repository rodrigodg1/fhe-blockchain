# 3. Circom: uma medida dentro de um intervalo

## A declaração

“Conheço `value` e `salt` tais que o compromisso público corresponde à medida,
e `min ≤ value ≤ max`, com todos os percentuais entre 0 e 100.”

No exemplo, `value = 38`, `min = 30` e `max = 45`. O compromisso é calculado como
`Poseidon(101, value, salt)`. O número 101 é um identificador de domínio da medida,
para diferenciá-la dos outros objetos do projeto; não é um limite clínico.

| Visibilidade | Campos |
|---|---|
| Públicos, nessa ordem | `commitment`, `min`, `max` |
| Privados | `value`, `salt` |

O circuito não publica um `true` como resultado. Uma prova aceita demonstra que
as restrições obrigatórias foram satisfeitas. A lista de sinais públicos tem
exatamente três elementos, usados depois pelo contrato.

## Recursos usados

**Circom 2.2.3** compila restrições em um campo finito. **Circomlib 2.0.5** fornece
`Num2Bits`, `LessEqThan`, `GreaterEqThan` e `Poseidon`. **Circomlibjs 0.1.7** gera o
mesmo hash no script de entradas. **Snarkjs 0.7.6** calcula o witness e executa o
setup, a prova Groth16 e a verificação. Consulte os
[comparadores oficiais](https://github.com/iden3/circomlib/blob/master/circuits/comparators.circom)
e o [fluxo de snarkjs](https://github.com/iden3/snarkjs).

`Num2Bits(7)` obriga uma entrada a representar um inteiro não negativo de sete
bits. A comparação adicional com 100 restringe o domínio final a 0..100.
Comparadores não devem receber campos arbitrários sem limites: a aritmética do
circuito é modular, não a aritmética de inteiros ilimitados.

O salt é limitado a 128 bits. A aleatoriedade é obtida em JavaScript e enviada
como string decimal, evitando perda de precisão em `Number`.

## Ler a linguagem

`signal input` declara uma entrada. `signal output` declara uma saída de um
template; saídas do componente principal são públicas, por isso não colocamos a
medida como saída de `main`. `component` instancia um template.

`<==` atribui um valor e impõe a restrição correspondente. `===` impõe igualdade.
`<--`, isoladamente, apenas calcula um valor no witness: não o vincula por uma
restrição. Os circuitos escritos nesta trilha usam `<==` e `===`. Os componentes
de circomlib podem usar cálculos auxiliares acompanhados das restrições necessárias.

`component main {public [commitment, min, max]}` torna essas entradas públicas.
`value` e `salt` não são listados. A ordem dos sinais é mantida também em
`lib/model.cjs`, nos testes e no contrato.

## Passo a passo

Depois da [instalação](../INSTALACAO.md), entre em `zkp/exemplos/circom`:

```bash
node scripts/zk.cjs compile intervalo
node scripts/zk.cjs setup intervalo
npm run dados
npm run witness -- intervalo
npm run provar -- intervalo
npm run verificar -- intervalo
```

A compilação equivale a pedir R1CS, WASM e símbolos ao Circom, com a biblioteca
local no caminho de inclusão. O setup local usa Powers of Tau e uma contribuição
para o circuito. Isso ensina o fluxo, mas **não substitui uma cerimônia confiável
de produção**. A origem e descarte dos segredos do setup são parte das hipóteses
criptográficas. [Discussão de setup](08-groth16-e-plonk.md).

## Arquivos gerados

| Arquivo em `build/intervalo/` | Conteúdo |
|---|---|
| `intervalo.r1cs` | Restrições compiladas |
| `intervalo_js/intervalo.wasm` | Programa que calcula o witness |
| `intervalo.sym` | Mapa de símbolos para inspecionar o circuito |
| `input.private.json` | Medida, salt e entradas públicas |
| `witness.wtns` | Entradas e valores internos do cálculo |
| `statement.json` | Declaração pública esperada pelo exemplo |
| `groth16.zkey` | Chave de prova vinculada ao circuito |
| `groth16.vkey.json` | Chave pública de verificação |
| `groth16.proof.json` | Prova gerada |
| `groth16.public.json` | Sinais públicos extraídos do witness |

Não publique `input.private.json` nem `witness.wtns` em um uso real. A chave de
prova não é a chave de decifração de FHE e não precisa conter o witness. Os hashes
em `compiled.json` e `groth16.meta.json` detectam mistura acidental de fontes e
artefatos locais; eles não autenticam uma distribuição maliciosa desses arquivos.

## Componentes comuns completos

Os percentuais e os compromissos também serão usados nos módulos seguintes.

<!-- codigo: zkp/exemplos/circom/circuits/common.circom -->
```text
pragma circom 2.2.3;
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

// A fração de ejeção é representada como inteiro de 0 a 100.
// Num2Bits impede que um elemento arbitrário do campo finito vire um "inteiro".
template Percent() {
    signal input value;
    component bits = Num2Bits(7);
    bits.in <== value;
    component upper = LessEqThan(7);
    upper.in[0] <== value;
    upper.in[1] <== 100;
    upper.out === 1;
}

template Interval() {
    signal input value;
    signal input min;
    signal input max;
    component v = Percent();
    component lo = Percent();
    component hi = Percent();
    v.value <== value;
    lo.value <== min;
    hi.value <== max;
    component ge = GreaterEqThan(7);
    component le = LessEqThan(7);
    ge.in[0] <== value;
    ge.in[1] <== min;
    le.in[0] <== value;
    le.in[1] <== max;
    ge.out === 1;
    le.out === 1;
}

// 101 separa o compromisso de uma medida dos hashes de outros objetos.
template MeasurementCommitment() {
    signal input value;
    signal input salt;
    signal output commitment;
    component v = Percent();
    v.value <== value;
    component saltBits = Num2Bits(128);
    saltBits.in <== salt;
    component hash = Poseidon(3);
    hash.inputs[0] <== 101;
    hash.inputs[1] <== value;
    hash.inputs[2] <== salt;
    commitment <== hash.out;
}

// A ordem dos quatro valores faz parte do compromisso.
template CohortCommitment(n) {
    signal input values[n];
    signal input salt;
    signal output commitment;
    component limits[n];
    component saltBits = Num2Bits(128);
    saltBits.in <== salt;
    component hash = Poseidon(n + 2);
    hash.inputs[0] <== 102;
    hash.inputs[1] <== salt;
    for (var i = 0; i < n; i++) {
        limits[i] = Percent();
        limits[i].value <== values[i];
        hash.inputs[i + 2] <== values[i];
    }
    commitment <== hash.out;
}
```
<!-- fim-codigo -->

## Circuito completo

<!-- codigo: zkp/exemplos/circom/circuits/intervalo.circom -->
```text
pragma circom 2.2.3;
include "common.circom";

template HealthcareRange() {
    signal input commitment;
    signal input min;
    signal input max;
    signal input value;
    signal input salt;

    component interval = Interval();
    interval.value <== value;
    interval.min <== min;
    interval.max <== max;
    component committed = MeasurementCommitment();
    committed.value <== value;
    committed.salt <== salt;
    committed.commitment === commitment;
}

component main {public [commitment, min, max]} = HealthcareRange();
```
<!-- fim-codigo -->

## Geração completa das entradas

Este arquivo prepara os cinco casos para usar o mesmo recorte. As estatísticas,
a contagem e a condição sobre a média compartilham um compromisso de coorte.
O intervalo e a árvore usam compromissos individuais das medidas. Valores e salts
são convertidos para strings na escrita JSON pelo código de apoio.

<!-- codigo: zkp/exemplos/circom/lib/inputs.cjs -->
```javascript
"use strict";
const { randomBytes } = require("node:crypto");
const { cohort, statistics, countAbove, publicSignals, PUBLIC_ORDER } = require("./model.cjs");
const salt128 = () => BigInt("0x" + randomBytes(16).toString("hex"));

async function createInputs(values) {
  const { buildPoseidon } = require("circomlibjs");
  const poseidon = await buildPoseidon();
  const hash = xs => BigInt(poseidon.F.toString(poseidon(xs)));
  const xs = cohort(values);
  const salt = salt128();
  const commitment = hash([102n, salt, ...xs]);
  const leafSalts = xs.map(salt128);
  const leaves = xs.map((x, i) => hash([101n, x, leafSalts[i]]));
  const parents = [hash([103n, leaves[0], leaves[1]]), hash([103n, leaves[2], leaves[3]])];
  const root = hash([103n, parents[0], parents[1]]);
  // O segundo registro é 38 na amostra original. Limites apenas didáticos.
  const cases = {
    intervalo: { commitment: leaves[1], min: 30n, max: 45n, value: xs[1], salt: leafSalts[1] },
    estatisticas: { commitment, ...statistics(values), values: xs, salt },
    contagem: { commitment, threshold: 30n, count: countAbove(values, 30), values: xs, salt },
    media_limiar: { commitment, threshold: 24n, values: xs, salt },
    merkle: { root, min: 30n, max: 45n, value: xs[1], salt: leafSalts[1],
      siblings: [leaves[0], parents[1]], directions: [1n, 0n] },
  };
  const statements = Object.fromEntries(Object.entries(cases).map(([name, input]) => [name, {
    circuit: name, publicOrder: PUBLIC_ORDER[name], publicSignals: publicSignals(name, input),
  }]));
  return { cases, statements, hash };
}
module.exports = { createInputs, salt128 };
```
<!-- fim-codigo -->

## Conferir os casos negativos

Execute `npm run test:zk`. Ele também gera as provas que precisar. Para o intervalo,
cobre 30 e 45 como extremos aceitos, 29 e 46 como valores rejeitados e os limites
gerais 0 e 100. Testa ainda medida alterada sem mudar o compromisso, salt diferente,
limite público 101, intervalo invertido e salt acima de 128 bits.

Uma falha na geração do witness é diferente de uma prova falsa rejeitada pelo
verificador. O teste verifica as duas situações separadamente. Um arquivo ausente
não conta como sucesso de um teste criptográfico.

## O que a prova não diz

Ela não prova que o valor veio de um hospital, que a pessoa existe ou que o intervalo
é clinicamente relevante. O compromisso precisa ser comparado com uma referência
previamente estabelecida. O arquivo `statement.json` serve como referência local
da demonstração, não como uma assinatura de laboratório.

[Índice](../README.md) · [Anterior](02-schnorr-pedersen.md) · [Próximo](04-estatisticas.md)
