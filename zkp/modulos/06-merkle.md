# 6. Uma medida pertence a um lote de exames

## O problema

Um lote contém quatro medidas comprometidas individualmente. O provador deseja
mostrar que conhece **uma medida incluída nesse lote** e que ela está entre dois
limites, sem publicar qual posição da árvore corresponde ao exame.

O exemplo demonstra integridade de inclusão em um lote, não autorização de acesso.
Não há cadastro de usuários, papéis ou lista de permissões.

**Circom** expressa a relação. **Poseidon de circomlib** calcula folhas e nós no
circuito; **circomlibjs** constrói a mesma árvore no cliente. Os comparadores
reutilizam o módulo de intervalo. **Snarkjs/Groth16** prova e verifica a relação
completa. [Biblioteca de circuitos](https://github.com/iden3/circomlib).

## A árvore deste exemplo

Cada folha é `Poseidon(101, medida, salt_individual)`. Cada nó interno é
`Poseidon(103, esquerdo, direito)`. O domínio 103 distingue nós de folhas.
Os salts individuais fazem folhas de medidas iguais serem diferentes, exceto
coincidência ou colisão. Há quatro folhas e altura dois:

```text
                         raiz
                       /      \
                  nó 0          nó 1
                 /    \        /    \
             folha 0 folha 1 folha 2 folha 3
```

A demonstração prova a folha 1, cujo valor público de referência é 38.
O caminho privado contém a folha 0 e o nó 1. As direções são `[1, 0]`:
primeiro o elemento corrente é filho direito; depois é filho esquerdo.

| Visibilidade | Campos |
|---|---|
| Públicos, nessa ordem | `root`, `min`, `max` |
| Privados | `value`, `salt`, `siblings[2]`, `directions[2]` |

A raiz não deve ser escolhida pelo provador sem comparação com uma referência.
Uma raiz que alguém acabou de inventar só comprova inclusão na árvore que essa
pessoa inventou. O exemplo não autentica um laboratório nem verifica assinaturas.

## Executar

Dentro de `zkp/exemplos/circom`:

```bash
npm run demo -- merkle
npm run verificar -- merkle
```

O resultado é `PROVA VALIDA`, com três sinais públicos: raiz, 30 e 45. Nenhum
índice é incluído no arquivo `groth16.public.json`.

## Circuito completo

<!-- codigo: zkp/exemplos/circom/circuits/merkle.circom -->
```text
pragma circom 2.2.3;
include "common.circom";

template HealthcareBatchMembership() {
    signal input root;
    signal input min;
    signal input max;
    signal input value;
    signal input salt;
    signal input siblings[2];
    signal input directions[2];

    component interval = Interval();
    interval.value <== value;
    interval.min <== min;
    interval.max <== max;
    component leaf = MeasurementCommitment();
    leaf.value <== value;
    leaf.salt <== salt;
    signal current[3];
    signal left[2];
    signal right[2];
    component nodes[2];
    current[0] <== leaf.commitment;
    for (var i = 0; i < 2; i++) {
        // 0: current fica à esquerda; 1: current fica à direita.
        directions[i] * (directions[i] - 1) === 0;
        left[i] <== current[i] + directions[i] * (siblings[i] - current[i]);
        right[i] <== siblings[i] + directions[i] * (current[i] - siblings[i]);
        nodes[i] = Poseidon(3);
        nodes[i].inputs[0] <== 103;
        nodes[i].inputs[1] <== left[i];
        nodes[i].inputs[2] <== right[i];
        current[i + 1] <== nodes[i].out;
    }
    current[2] === root;
}

component main {public [root, min, max]} = HealthcareBatchMembership();
```
<!-- fim-codigo -->

## Como o caminho é imposto

Para cada nível, `directions[i] * (directions[i] - 1) === 0` limita a direção a
zero ou um. O circuito calcula esquerdo e direito por seleção algébrica, não por
um `if` JavaScript que o verificador teria de confiar.

O primeiro `current` é exatamente o compromisso da mesma medida que passou pelo
intervalo. Cada nó depende do anterior e do irmão privado. O último `current`
deve ser igual à raiz pública. Um caminho calculado para outra folha não serve
para esta medida sem satisfazer todas essas relações.

O arquivo [de geração de entradas](03-circom-intervalo.md) contém a construção
completa da árvore de quatro folhas. A altura não é dinâmica. Uma árvore maior
exigiria um novo circuito e, para Groth16, uma nova fase específica de setup.

## Testes

`npm run test:zk` inclui prova válida, troca de raiz, troca de irmão, inversão da
posição e direção com valor 2. Os casos inválidos devem falhar nas restrições ou
na verificação da prova, conforme a etapa testada.

Nesta amostra pública, todo mundo já conhece as quatro medidas; a estrutura serve
para estudar o protocolo. Em um lote real, valores, salts e caminhos devem ser
tratados como privados. A prova não demonstra ausência de registros duplicados,
completude do lote, atualidade do exame ou qualidade da coleta.

[Índice](../README.md) · [Anterior](05-contagem-e-media-limiar.md) · [Próximo](07-solidity.md)
