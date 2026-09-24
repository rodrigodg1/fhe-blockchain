# Procedência

O roadmap reúne operações FHE em Rust e os cálculos correspondentes em Solidity
e FHEVM. A única aplicação é a análise numérica dos dados públicos de saúde
identificados em [dados/README.md](dados/README.md).

Os exemplos usam a biblioteca TFHE-rs e as interfaces documentadas pela Zama.
O projeto Hardhat tem configuração própria; não contém uma cópia do template
oficial. Suas versões diretas seguem a base descrita em
[CONFIGURACAO.md](CONFIGURACAO.md). As dependências transitivas não estão fixadas
neste pacote: os lockfiles serão gerados na instalação.

Os blocos completos de código nos módulos são copiados dos arquivos do próprio
repositório por `scripts/sincronizar-docs.py`. `ROADMAP.md` reúne os mesmos textos.

As fontes oficiais estão em [REFERENCIAS.md](REFERENCIAS.md). O estado das
verificações desta edição está em [VALIDACAO.md](VALIDACAO.md). O material não é
uma implementação clínica nem uma auditoria de segurança.
