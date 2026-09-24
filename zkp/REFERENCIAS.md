# Referências e escolhas

As referências abaixo são fontes primárias: implementações, documentação oficial,
especificações e artigos dos sistemas usados. A trilha escreve exemplos próprios;
a instalação obtém as bibliotecas dos respectivos projetos.

## Repositório de partida

[rodrigodg1/fhe-blockchain](https://github.com/rodrigodg1/fhe-blockchain), branch
`main`, commit inspecionado `d555acdeda18d53b214ea386d71e7ee8a4fcc4f0`.
A leitura do README, do pacote FHEVM e da amostra orientou o isolamento do projeto,
a escolha de Node 22 e o reaproveitamento do recorte de saúde. Os identificadores
retornados pelo GitHub estão em [BASE-INSPECIONADA.json](BASE-INSPECIONADA.json).
A atribuição do dataset continua em [dados/README.md](../dados/README.md).

## Provas e grupos

**RFC 8235 — Schnorr Non-interactive Zero-Knowledge Proof.** Explica Schnorr,
Fiat–Shamir e cuidados de contexto e validação. Nosso exemplo usa uma relação de
representação com dois expoentes e um transcrito próprio, não o formato de uma
implementação de referência dessa RFC.
[Documento](https://www.rfc-editor.org/rfc/rfc8235.html).

**RFC 3526 — More Modular Exponential (MODP) Diffie-Hellman groups.** Fonte do primo
MODP de 2048 bits. O exemplo usa o subgrupo de ordem `(p-1)/2`, com `g=4` e um segundo
gerador derivado publicamente.
[Documento](https://www.rfc-editor.org/rfc/rfc3526.html).

**Groth, Jens — On the Size of Pairing-based Non-interactive Arguments (2016).**
Base de Groth16. [Artigo](https://eprint.iacr.org/2016/260).

**Gabizon, Ariel; Williamson, Zachary J.; Ciobotaru, Oana — PLONK: Permutations over
Lagrange-bases for Oecumenical Noninteractive arguments of Knowledge (2019).**
Base do modelo universal e atualizável de PLONK.
[Artigo](https://eprint.iacr.org/2019/953).

## Circuitos e implementações

**Circom.** Compilador dos circuitos. A versão selecionada é 2.2.3.
[Repositório](https://github.com/iden3/circom) ·
[Release](https://github.com/iden3/circom/releases/tag/v2.2.3) ·
[Documentação](https://docs.circom.io/).

**Circomlib.** Bits, comparações e Poseidon. Versão selecionada: 2.0.5.
[Repositório](https://github.com/iden3/circomlib) ·
[Comparadores](https://github.com/iden3/circomlib/blob/master/circuits/comparators.circom).

**Circomlibjs.** Poseidon compatível do lado JavaScript. Versão selecionada: 0.1.7;
isso não significa que a branch principal permaneça nessa versão.
[Repositório](https://github.com/iden3/circomlibjs).

**Snarkjs.** Setup, geração de witness, Groth16, PLONK, verificação e exportação
Solidity. Versão selecionada: 0.7.6.
[Repositório e guia](https://github.com/iden3/snarkjs).

## EVM e ferramentas

**EIP-196.** Adição e multiplicação escalar na curva BN254/alt_bn128.
[Especificação](https://eips.ethereum.org/EIPS/eip-196).

**EIP-197.** Emparelhamentos, codificação dos pontos e distinção entre campo base
e escalar. [Especificação](https://eips.ethereum.org/EIPS/eip-197).

**Hardhat 2.** Ambiente EVM local e testes. O projeto usa 2.28.6, isolado do FHEVM.
[Documentação](https://v2.hardhat.org/).

**nvm.** Seleção de Node por shell; a instalação nova mostrada usa a tag 0.40.8.
[Instalação via Git](https://github.com/nvm-sh/nvm#git-install).

**Rust/rustup.** Instalação do toolchain usado para compilar Circom.
[Instalação oficial](https://rust-lang.org/tools/install/).

**TFHE-rs.** Referência para contrastar o fluxo de computação FHE com o provador ZKP.
[Guia oficial](https://docs.zama.org/tfhe-rs/get-started/quick-start).

## Dependências e licenças

O incremento não redistribui o código das bibliotecas dentro de `node_modules`.
Os pacotes baixados mantêm suas próprias licenças; consulte cada projeto e os
arquivos instalados. A licença dos materiais anteriores do repositório não foi
alterada. Os contratos próprios deste incremento estão identificados por SPDX.
