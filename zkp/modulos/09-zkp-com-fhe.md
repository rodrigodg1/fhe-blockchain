# 9. O que seria necessário para combinar ZKP e FHE

## O que já pode ser comparado

Os exemplos anteriores do repositório usam TFHE-rs e FHEVM para operações sobre
frações de ejeção. A nova trilha usa o mesmo recorte público para provar relações
aritméticas. Assim, você pode comparar os resultados matemáticos da mesma amostra:
98 para a soma, 2644 para a soma dos quadrados, 24,5 para a média e 60,75 para a
variância populacional. [Amostra e origem](../../dados/README.md).

Essa comparação **não é uma prova criptográfica de que os valores de ambos os
fluxos são os mesmos**. Ela confere referências públicas em duas implementações.
Nenhum arquivo do TFHE-rs ou do FHEVM é importado, modificado ou substituído pelo
projeto ZKP. [Exemplos FHE existentes](../../README.md).

## FHE e ZKP protegem etapas diferentes

No uso comum de TFHE-rs, a parte que calcula recebe cifrados e material de avaliação,
sem receber a chave secreta. No uso de Circom/snarkjs mostrado aqui, a parte que
gera o witness possui os valores em claro. Ela pode produzir uma prova e revelar
somente os sinais públicos escolhidos.
[Fluxo TFHE-rs](https://docs.zama.org/tfhe-rs/get-started/quick-start) ·
[Fluxo snarkjs](https://github.com/iden3/snarkjs).

Não basta entregar uma prova de intervalo `π` e um ciphertext `ct` ao mesmo
contrato. O valor comprometido na prova pode ser 38, enquanto o valor cifrado pode
ser outro. Verificar `π` isoladamente não impede essa discrepância.

## As relações que faltariam

Considere esta formulação conceitual, que **não está implementada neste incremento**:

```text
Entradas públicas: chave pública pk, ciphertext ct, compromisso C, limites min e max
Witness: medida v, salt s, aleatoriedade de cifração r

Relações desejadas:
C  = Commit(v, s)
ct = Encrypt(pk, v; r)
min ≤ v ≤ max
```

A igualdade com `Encrypt` precisa corresponder ao esquema e formato de cifração
realmente usados. Nem Pedersen nem Poseidon do exemplo tornam essa relação
verdadeira automaticamente. Provar apenas que duas operações receberam números
iguais em JavaScript não substitui uma restrição criptográfica.

Há outras perguntas possíveis, cada uma com relação e hipóteses próprias:

| Objetivo | O que precisaria ser vinculado |
|---|---|
| Validade de entrada cifrada | A medida, o ciphertext, a chave e a aleatoriedade de cifração |
| Correção de computação terceirizada | O programa, os cifrados de entrada, o material de avaliação e o ciphertext de saída |
| Correção de uma divulgação após decifração | O ciphertext divulgado, o resultado, a chave/protocolo de decifração e sua prova |
| Origem de uma medida | O compromisso/ciphertext e uma referência autenticada da fonte |

Verificar uma assinatura, provar bem-formação de entrada, provar um cálculo inteiro
e provar uma decifração são objetivos diferentes. Uma prova feita para um deles
não deve ser descrita como garantia de todos os demais.

## Onde entram Zama e FHEVM

A trilha anterior permanece como documentação do fluxo específico de FHEVM. Seus
formatos de entrada cifrada e provas associadas devem ser usados conforme o SDK e
a versão do protocolo daquele projeto. A prova Groth16 deste incremento não é
substituta automática de uma prova de entrada exigida pelo SDK da Zama.

Antes de afirmar uma integração, seria necessário especificar as relações exatas,
usar os mecanismos compatíveis e testar que valores cifrados e comprometidos
inconsistentes são rejeitados. Este incremento não faz essa integração nem altera
os contratos Zama existentes.

## Escolher a divulgação antes de escolher a prova

Para o exemplo de healthcare, faça a pergunta concreta. Um executor sem acesso às
medidas precisa calcular? O caminho de FHE resolve essa parte. O detentor das
medidas precisa convencer um pesquisador de uma estatística? Os circuitos desta
trilha mostram esse caminho de ZKP. Só uma resposta binária é necessária? O
circuito `media_limiar` evita publicar o valor exato da média.

Em todos esses cenários, permanecem decisões sobre origem dos dados, metadados,
pequenas coortes, atualização da referência e resultados publicados. A técnica
criptográfica deve corresponder à garantia declarada, sem atribuir ao protocolo
uma propriedade que não foi implementada ou testada.

[Índice](../README.md) · [Anterior](08-groth16-e-plonk.md)
