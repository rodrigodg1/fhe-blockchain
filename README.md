# FHE em saúde

Roadmap de operações sobre dados cifrados com **TFHE-rs** e **FHEVM**.
O mesmo conjunto de dados é usado em Rust, Solidity e contratos com FHE.
O repositório também inclui uma extensão prática comparativa com **Zero-Knowledge Proofs (ZKP)**.

**Comece por [INSTALACAO.md](INSTALACAO.md).** Depois, siga os módulos na ordem.
Para ler o percurso em um único arquivo, abra [ROADMAP.md](ROADMAP.md).
Para a extensão em provas de conhecimento zero, consulte [ZKP.md](ZKP.md).

## Percurso

| Etapa | O que você encontrará |
|---|---|
| [Instalação](INSTALACAO.md) | Sistema, Git, Python, Rust, Node.js e Hardhat, passo a passo |
| [1. FHE e dados](modulos/01-fhe-e-dados.md) | Conceitos, dataset de saúde e preparação dos arquivos |
| [2. TFHE-rs](modulos/02-tfhe-rs.md) | Tipos, chaves, cifração, soma e decifração |
| [3. Aritmética](modulos/03-aritmetica.md) | Soma, multiplicação, média e variância |
| [4. Comparação](modulos/04-comparacao.md) | Comparação cifrada e seleção condicional |
| [5. Processos](modulos/05-processos.md) | Serialização e execução separada do cálculo |
| [6. Solidity](modulos/06-solidity.md) | Contrato completo, estrutura da linguagem e teste em claro |
| [7. FHEVM](modulos/07-fhevm.md) | Contrato completo e cliente para cifrar, calcular e ler resultados |
| [8. Experimentos](modulos/08-experimentos.md) | Testes, outros recortes e execução em Sepolia |
| [Extensão ZKP](ZKP.md) | Comparativo com Zero-Knowledge Proofs: Circom, Groth16, PLONK e Solidity |

Cada módulo define os recursos usados, explica sua função e inclui os arquivos
completos dos exemplos. Os códigos em Markdown correspondem aos arquivos de `exemplos/`.

## Caso de uso

Usamos `ejection_fraction`, do **Heart Failure Clinical Records**, da UCI.
A amostra padrão é `[20, 38, 20, 20]`. Os exemplos calculam soma, soma dos quadrados
e estatísticas dos valores acima de um limiar. [Origem e licença](dados/README.md).

Os dados e os resultados de referência são públicos. Os exemplos não fazem diagnóstico.
Os contratos publicam os agregados para conferir as operações. Use somente os dados
públicos fornecidos, não prontuários privados.

## Onde estão os arquivos

```text
fhe-healthcare-roadmap/
  INSTALACAO.md       Instalação passo a passo
  CONFIGURACAO.md     Dependências e configuração completas
  ROADMAP.md          Percurso reunido em Markdown
  ZKP.md              Extensão com provas de conhecimento zero (Circom, Groth16, PLONK)
  modulos/           Explicações e exemplos completos de FHE
  exemplos/tfhe-rs/   Programas Rust
  exemplos/fhevm/     Contratos, scripts e testes FHEVM
  dados/             Recorte da UCI e dados preparados
  scripts/           Preparação dos dados e manutenção
  tests/             Testes Python
  zkp/               Circuitos Circom, contratos e testes ZKP
```

[Problemas comuns](PROBLEMAS.md) · [Referências](REFERENCIAS.md) ·
[Verificações realizadas](VALIDACAO.md) · [Extensão ZKP](ZKP.md) ·
[Manutenção](MANUTENCAO.md) · [Publicação no GitHub](PUBLICACAO.md)

A execução local do Hardhat simula as operações FHE. TFHE-rs executa a criptografia
localmente; a integração com a rede é tratada em Sepolia. Consulte
[os modos de execução da Zama](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/run_test).
