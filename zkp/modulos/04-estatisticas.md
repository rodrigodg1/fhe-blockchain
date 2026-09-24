# 4. Provar estatísticas de uma coorte

## A relação

Um pesquisador conhece quatro frações de ejeção. Ele quer publicar a soma, a soma
dos quadrados, a média e a variância populacional, com uma prova de que esses
números foram calculados sobre a coorte vinculada a um compromisso conhecido.

Usamos **Circom**, os limites e Poseidon de **circomlib**, a contraparte JavaScript
**circomlibjs** e **Groth16 via snarkjs**. Circom expressa a aritmética;
Poseidon vincula a coorte ordenada; Groth16 permite verificar as restrições sem
publicar cada entrada. As bibliotecas e versões estão na
[instalação](../INSTALACAO.md); os [componentes comuns](03-circom-intervalo.md)
são reutilizados sem alteração.

| Visibilidade | Campos |
|---|---|
| Públicos, nessa ordem | `commitment`, `sum`, `sumSquares`, `meanScaled`, `varianceScaled` |
| Privados | `values[4]`, `salt` |

O compromisso é `Poseidon(102, salt, v0, v1, v2, v3)`. O domínio 102 representa uma
coorte ordenada com quatro elementos nesta versão. Trocar um valor, sua posição
ou o salt muda o compromisso, salvo uma colisão do hash. Não é um compromisso de
conjunto sem ordem.

## Inteiros e escala fixa

Circom não usa ponto flutuante nestas operações. A média e a variância são
representadas com escala `S = 10000`. Com `n = 4`, escrevemos:

```text
sum        = v0 + v1 + v2 + v3
sumSquares = v0² + v1² + v2² + v3²
4 · meanScaled     = 10000 · sum
16 · varianceScaled = 10000 · (4 · sumSquares - sum²)
```

São multiplicações cruzadas, não divisões no campo tratadas como se fossem
arredondamentos de inteiros. Como 10000 é divisível por 4 e por 16, os resultados
são inteiros exatos para quaisquer quatro entradas inteiras deste domínio.
`Num2Bits` também limita os resultados escalados, evitando aceitar soluções
modulares enormes para uma interpretação que deveria ser pequena e não negativa.

Para a amostra original:

```text
sum = 98
sumSquares = 2644
meanScaled = 245000         → 24,5
varianceScaled = 607500     → 60,75
4 · 2644 - 98² = 972
972 / 16 = 60,75
```

É **variância populacional**, com divisor `n`. Não é variância amostral, que usaria
`n - 1`. O código fixa quatro entradas; para outro tamanho, seria preciso alterar
a relação, analisar a escala e gerar um novo setup Groth16.

## Executar

Dentro de `zkp/exemplos/circom`:

```bash
npm run demo -- estatisticas
npm run verificar -- estatisticas
```

A verificação retorna `PROVA VALIDA` e os cinco sinais públicos. O primeiro sinal
é o compromisso aleatório, seguido de `98`, `2644`, `245000` e `607500`.

## Circuito completo

<!-- codigo: zkp/exemplos/circom/circuits/estatisticas.circom -->
```text
pragma circom 2.2.3;
include "common.circom";

template HealthcareStatistics() {
    signal input commitment;
    signal input sum;
    signal input sumSquares;
    signal input meanScaled;
    signal input varianceScaled;
    signal input values[4];
    signal input salt;

    component committed = CohortCommitment(4);
    committed.salt <== salt;
    signal acc[5];
    signal accSquares[5];
    signal square[4];
    acc[0] <== 0;
    accSquares[0] <== 0;
    for (var i = 0; i < 4; i++) {
        committed.values[i] <== values[i];
        square[i] <== values[i] * values[i];
        acc[i + 1] <== acc[i] + values[i];
        accSquares[i + 1] <== accSquares[i] + square[i];
    }
    committed.commitment === commitment;
    sum === acc[4];
    sumSquares === accSquares[4];

    // 10.000 é divisível por 4 e por 16: não há arredondamento nesta amostra.
    component meanBits = Num2Bits(20);
    component varianceBits = Num2Bits(27);
    meanBits.in <== meanScaled;
    varianceBits.in <== varianceScaled;
    4 * meanScaled === 10000 * sum;
    signal squaredSum;
    squaredSum <== sum * sum;
    16 * varianceScaled === 10000 * (4 * sumSquares - squaredSum);
}

component main {public [commitment, sum, sumSquares, meanScaled, varianceScaled]} = HealthcareStatistics();
```
<!-- fim-codigo -->

## Ler o circuito

`acc` e `accSquares` acumulam as somas. Cada `square[i]` é vinculado à multiplicação
`values[i] * values[i]`. O compromisso recebe as mesmas entradas; não há um vetor
para o hash e outro para o cálculo.

As duas primeiras saídas públicas são diretamente iguais aos acumuladores.
A média escalada cabe em 20 bits porque o maior percentual permitido é 100.
O limite de 27 bits para a variância escalada é conservador para este domínio.
Todos os produtos usados aqui ficam muito abaixo do módulo do campo.

O cálculo em claro que prepara os resultados está completo em
[CONFIGURACAO.md](../CONFIGURACAO.md), no arquivo `lib/model.cjs`. Ele não substitui
as restrições: mesmo um provador que altere o JavaScript ainda precisa produzir
um witness que satisfaça o circuito.

## Testes e privacidade

`npm run test:zk` altera separadamente soma, quadrados, média e variância.
Também testa coortes de zeros, de cem, `[0, 100, 0, 100]` e `[20, 38, 20, 21]`,
cuja variância 58,6875 evidencia a escala de quatro casas decimais.

A prova não revela os quatro valores por si só, mas os agregados podem permitir
inferências, especialmente com poucos participantes e dados auxiliares. Este
exemplo publica mais informação do que o próximo. ZKP não é privacidade
diferencial e não transforma uma média de uma coorte minúscula em dado anônimo.

[Índice](../README.md) · [Anterior](03-circom-intervalo.md) · [Próximo](05-contagem-e-media-limiar.md)
