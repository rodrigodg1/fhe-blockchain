# 5. Contagem e condição sobre a média

Os dois exemplos usam a mesma coorte ordenada e o mesmo compromisso do módulo 4.
Eles mostram como mudar **o que é revelado**, sem trocar os dados de origem.

Usamos **Circom** para as relações, **circomlib** para Poseidon e comparadores,
**circomlibjs** para o compromisso fora do circuito e **snarkjs/Groth16** para as
provas. O componente `CohortCommitment(4)` limita cada valor a 0..100 e vincula o
vetor ao salt. [Componentes comuns completos](03-circom-intervalo.md).

## Exemplo A: quantos valores estão acima de um limiar?

A relação é `count = Σ [values[i] > threshold]`.
O comparador é **estritamente maior**: uma medida igual ao limiar não conta.

| Visibilidade | Campos |
|---|---|
| Públicos, nessa ordem | `commitment`, `threshold`, `count` |
| Privados | `values[4]`, `salt` |

Para `[20, 38, 20, 20]` e limiar 30, a contagem é 1. Com limiar 20, ela continua
sendo 1, não 4. Cada resultado de `GreaterThan(7)` é um bit e a soma dos quatro
bits limita automaticamente `count` a 0..4.

Dentro de `zkp/exemplos/circom`:

```bash
npm run demo -- contagem
npm run verificar -- contagem
```

O circuito completo é:

<!-- codigo: zkp/exemplos/circom/circuits/contagem.circom -->
```text
pragma circom 2.2.3;
include "common.circom";

template HealthcareCount() {
    signal input commitment;
    signal input threshold;
    signal input count;
    signal input values[4];
    signal input salt;

    component thresholdLimit = Percent();
    thresholdLimit.value <== threshold;
    component committed = CohortCommitment(4);
    committed.salt <== salt;
    component above[4];
    signal acc[5];
    acc[0] <== 0;
    for (var i = 0; i < 4; i++) {
        committed.values[i] <== values[i];
        above[i] = GreaterThan(7);
        above[i].in[0] <== values[i];
        above[i].in[1] <== threshold;
        acc[i + 1] <== acc[i] + above[i].out;
    }
    committed.commitment === commitment;
    count === acc[4];
}

component main {public [commitment, threshold, count]} = HealthcareCount();
```
<!-- fim-codigo -->

O verificador aprende a quantidade e o limiar, mas não recebe os índices dos
valores que passaram. Isso não elimina inferências com outras informações.

## Exemplo B: a média atende a um limiar, sem revelar seu valor?

A relação é `sum(values) ≥ 4 · threshold`. Não há campo público com a soma ou a
média. A aceitação da prova demonstra somente essa desigualdade para a coorte
comprometida.

| Visibilidade | Campos |
|---|---|
| Públicos, nessa ordem | `commitment`, `threshold` |
| Privados | `values[4]`, `salt` |

Com média 24,5, o limiar 24 permite uma prova válida. O limiar 25 não permite.
`GreaterEqThan(9)` compara dois inteiros limitados a 0..400, que cabem em nove bits.
Não há divisão nem arredondamento da média.

```bash
npm run demo -- media_limiar
npm run verificar -- media_limiar
```

O circuito completo é:

<!-- codigo: zkp/exemplos/circom/circuits/media_limiar.circom -->
```text
pragma circom 2.2.3;
include "common.circom";

template HealthcareMeanThreshold() {
    signal input commitment;
    signal input threshold;
    signal input values[4];
    signal input salt;

    component thresholdLimit = Percent();
    thresholdLimit.value <== threshold;
    component committed = CohortCommitment(4);
    committed.salt <== salt;
    signal acc[5];
    acc[0] <== 0;
    for (var i = 0; i < 4; i++) {
        committed.values[i] <== values[i];
        acc[i + 1] <== acc[i] + values[i];
    }
    committed.commitment === commitment;
    // Ambos os lados estão em 0..400 e cabem em 9 bits.
    component enough = GreaterEqThan(9);
    enough.in[0] <== acc[4];
    enough.in[1] <== 4 * threshold;
    enough.out === 1;
}

component main {public [commitment, threshold]} = HealthcareMeanThreshold();
```
<!-- fim-codigo -->

## Conferir a diferença entre as declarações

Depois das duas execuções, compare as listas públicas:

```bash
node -e "const fs=require('node:fs'); for(const n of ['contagem','media_limiar']) console.log(n,JSON.parse(fs.readFileSync('build/'+n+'/groth16.public.json','utf8')))"
```

`contagem` tem três sinais; `media_limiar` tem dois. O compromisso compartilhado
permite reconhecer que são afirmações sobre a mesma coorte na demonstração.
O segundo circuito revela menos do que publicar a média, mas revela que ela
passou pelo limiar escolhido.

## Testar uma condição falsa

O teste automático inclui o limiar 25. Para observar a falha manualmente, sem
alterar a entrada padrão:

```bash
node -e "const fs=require('node:fs'); const x=JSON.parse(fs.readFileSync('build/media_limiar/input.private.json','utf8')); x.threshold='25'; fs.writeFileSync('build/media_limiar/limiar25.private.json',JSON.stringify(x),{mode:384})"
npm run witness -- media_limiar build/media_limiar/limiar25.private.json
```

A geração do witness deve falhar por restrição. O número 384 no comando é o modo
Unix 0600 em decimal; ele limita a leitura do arquivo ao usuário. Isso não é
cifração. A prova válida anterior continua associada ao limiar 24; mudar um JSON
não transforma uma prova antiga em prova de outra afirmação.

## Limite de consultas repetidas

Várias provas de contagem com limiares diferentes podem revelar um histograma.
Várias condições sobre a média podem estreitar seu intervalo. Quando um sistema
permitir muitas consultas, a divulgação acumulada precisa ser analisada. As
provas não escondem resultados que foram deliberadamente tornados públicos.

[Índice](../README.md) · [Anterior](04-estatisticas.md) · [Próximo](06-merkle.md)
