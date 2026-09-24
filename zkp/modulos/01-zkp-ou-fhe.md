# 1. Quando usar ZKP ou FHE

## Duas perguntas diferentes

**FHE — Fully Homomorphic Encryption** permite que um executor calcule sobre
cifrados sem possuir a chave secreta de decifração. O resultado do cálculo continua
cifrado, até uma etapa de decifração. É o papel de TFHE-rs nos exemplos anteriores.
[Documentação de TFHE-rs](https://docs.zama.org/tfhe-rs/get-started/quick-start).

**ZKP — Zero-Knowledge Proof**, ou prova de conhecimento zero, permite verificar
uma relação sem receber o witness que a satisfaz. Na implementação comum desta
trilha, quem gera a prova conhece os valores em claro. O verificador recebe a
prova e os sinais públicos, não a lista de medidas. Isso não é cifração e não
transforma automaticamente o executor em alguém que calcula sem conhecer a
entrada. [Sistemas implementados por snarkjs](https://github.com/iden3/snarkjs).

Pense na amostra de frações de ejeção `[20, 38, 20, 20]`:

| Necessidade | Escolha neste caso | Motivo |
|---|---|---|
| Um servidor deve calcular a soma sem ler as medidas | FHE | O servidor opera sobre cifrados |
| Um pesquisador conhece as medidas e quer provar que a soma é 98 | ZKP | A prova permite conferir a relação sem publicar as entradas |
| Provar que uma medida previamente comprometida está entre 30 e 45 | ZKP | O objeto da verificação é uma condição sobre um segredo |
| Um contrato deve continuar calculando sobre estado cifrado | FHEVM | A computação precisa preservar o estado cifrado |
| Um contrato só precisa aceitar ou rejeitar uma afirmação | ZKP + verificador Solidity | O contrato verifica a prova; não refaz toda a computação privada |
| Calcular sobre cifrados e provar que a execução respeitou uma relação | Composição de FHE e prova verificável | É necessário provar vínculos com os cifrados e a computação efetivos |

A tabela é uma decisão de projeto para estes cenários, não uma afirmação de que
uma técnica substitua a outra. O último caso não é obtido só por executar duas
bibliotecas lado a lado. [Discussão da composição](09-zkp-com-fhe.md).

## Vocabulário usado nos exemplos

O **provador** produz a prova. O **verificador** a confere. A **declaração pública**
especifica o que deve ser verdade. O **witness** contém os valores privados e os
valores auxiliares necessários para satisfazer a relação. Um **circuito** escreve
a relação como restrições matemáticas; ele não é um prontuário nem um contrato.

Um **compromisso criptográfico** fixa um segredo sem publicá-lo. Mais tarde, uma
prova pode demonstrar propriedades do mesmo segredo vinculado ao compromisso.
Aqui aparecem dois tipos: Pedersen na introdução Python e Poseidon com salt nos
circuitos. Eles não são intercambiáveis: usam grupos, campos e relações diferentes.

O **salt** é um valor aleatório de ocultação. Sem ele, alguém poderia calcular o
hash dos 101 valores possíveis de uma medida de 0 a 100 e identificar a entrada.
Nos circuitos usamos 128 bits novos, gerados pelo sistema operacional. Publicar o
salt junto de uma medida de domínio pequeno desfaz essa proteção contra busca
exaustiva. O salt fica no witness, nunca no `public.json`.

Uma prova válida deve oferecer completude e resistência a afirmações falsas sob
as hipóteses do sistema. A propriedade de conhecimento zero impede extrair do
transcrito informações adicionais sobre o witness além da declaração e das
informações já disponíveis. Isso **não** significa que a declaração seja incapaz
de revelar algo. Publicar a média é publicar a média, mesmo com ZKP.
[Groth16](https://eprint.iacr.org/2016/260) · [Schnorr](https://www.rfc-editor.org/rfc/rfc8235.html).

## O compromisso precisa ser o esperado

Provar “conheço alguma medida entre 30 e 45” é fácil: basta inventar uma.
O problema útil é provar “a medida ligada a **este compromisso** está nessa faixa”.
Por isso, todos os circuitos vinculam as medidas a um compromisso público ou a uma
raiz Merkle. O contrato compara os sinais da prova com a declaração definida no
seu construtor.

Ainda falta uma pergunta fora da relação matemática: **quem assegura que o
compromisso corresponde a um exame verdadeiro?** Nesta demonstração, a referência
vem da amostra pública. Não há assinatura de laboratório, atestação de dispositivo,
verificação de identidade ou prova de qualidade dos dados. Um compromisso criado
pelo próprio atacante não certifica origem clínica. Um protocolo real precisaria
autenticar essa referência por um mecanismo especificado e verificado.

## O que fica visível

| Exemplo | Sinais públicos | Witness privado |
|---|---|---|
| Abertura Pedersen | Compromisso e contexto | Medida, fator de ocultação e nonces durante a geração |
| Intervalo | Compromisso, mínimo e máximo | Medida e salt |
| Estatísticas | Compromisso, soma, quadrados, média e variância escaladas | Quatro medidas e salt |
| Contagem | Compromisso, limiar e contagem | Quatro medidas e salt |
| Média por limiar | Compromisso e limiar | Quatro medidas e salt |
| Merkle | Raiz, mínimo e máximo | Medida, salt, irmãos e direções do caminho |

O witness é privado em relação ao verificador, não em relação à máquina que o
calcula. `input.private.json` e `witness.wtns` são arquivos sensíveis em um uso real.
O `.gitignore` evita inclusão acidental por Git, mas não cifra esses arquivos.

Compromissos reutilizados permitem correlacionar provas. Muitas consultas de
limiar sobre o mesmo conjunto podem estreitar ou reconstruir estatísticas.
Nenhum exemplo promete anonimato de rede, proteção contra metadados ou
privacidade estatística de agregados pequenos.

## Por que estas ferramentas

Python torna a equação de Schnorr visível sem instalar uma pilha blockchain.
Circom expressa os limites e relações aritméticas. Circomlib evita reescrever
comparadores e Poseidon. Circomlibjs calcula o mesmo compromisso fora do circuito.
Snarkjs executa Groth16 e PLONK. Hardhat fornece uma EVM local e ethers conecta os
scripts aos contratos. O [mapa de versões](../INSTALACAO.md) mantém esse conjunto
isolado do FHEVM existente.

[Índice](../README.md) · [Próximo](02-schnorr-pedersen.md)
