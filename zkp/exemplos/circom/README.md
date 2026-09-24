# Circuitos ZKP em healthcare

Projeto Node.js isolado. Leia a [instalação completa](../../INSTALACAO.md).
As entradas vêm de `../../../dados/processado/amostra.json`, na raiz do
repositório existente. Não há download silencioso nem substituição dos dados.

Depois de instalar Node 22, Circom 2.2.3 e as dependências locais:

```bash
npm install
npm run doctor
npm run demo:todos
npm test
npm run demo:contrato
npm run demo:plonk
```

`npm test` gera provas Groth16 reais antes dos testes de contratos. Os testes
unitários sozinhos não validam a criptografia Circom nem o bytecode Solidity.
[Validação realizada](../../VALIDACAO.md).

Circuitos: `intervalo`, `estatisticas`, `contagem`, `media_limiar`, `merkle`.
Para uma execução isolada, por exemplo: `npm run demo -- contagem`.

Os scripts mantêm artefatos sob `build/`, ignorado pelo Git. `npm run dados` cria
novos salts e invalida provas antigas. `npm run limpar` remove apenas `build/`,
`artifacts/` e `cache/` deste projeto. Não toque em arquivos privados de pacientes:
os exemplos são para a amostra pública de referência.

O setup local não é uma cerimônia de produção. O verificador Solidity didático não
foi auditado. [Módulos com código completo](../../README.md).
