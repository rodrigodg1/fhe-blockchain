# ZKP em saúde: extensão do roadmap de FHE

**Comece por [zkp/README.md](zkp/README.md)** e siga a
[instalação passo a passo](zkp/INSTALACAO.md).

A extensão compara FHE e provas de conhecimento zero usando o caso de healthcare
do repositório. Há uma prova em Python, cinco circuitos Circom, execução com
Groth16 e PLONK e dois contratos Solidity completos.

Os exemplos reaproveitam `dados/processado/amostra.json`. O projeto Node.js está
isolado em `zkp/exemplos/circom`; não depende da configuração do FHEVM.

Esta adição contém somente este arquivo e a pasta `zkp/`.
`README.md`, `ROADMAP.md`, os módulos anteriores, TFHE-rs, FHEVM, dados e arquivos
de dependências existentes não são substituídos.

[ZKP ou FHE?](zkp/modulos/01-zkp-ou-fhe.md) ·
[Exemplos e código completo](zkp/README.md) ·
[Como adicionar o incremento](zkp/COMO-ADICIONAR.md) ·
[O que foi validado](zkp/VALIDACAO.md)
