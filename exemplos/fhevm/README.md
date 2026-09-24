# Solidity e FHEVM

Este projeto calcula as mesmas quatro estatísticas em dois contratos:
`HealthPlain` recebe valores em claro; `HealthStats` recebe entradas cifradas.
Ambos processam quatro registros por chamada.

Leia a [instalação](../../INSTALACAO.md) e a
[configuração completa](../../CONFIGURACAO.md). Os contratos, testes e scripts
estão reproduzidos nos módulos [6](../../modulos/06-solidity.md),
[7](../../modulos/07-fhevm.md) e [8](../../modulos/08-experimentos.md).

## Instalar

Na raiz do repositório:

```bash
export FHE_ROADMAP_ROOT="$PWD"
cd exemplos/fhevm
nvm use
npm install
npx hardhat compile
npm run typecheck
```

Hardhat é instalado localmente pelo npm. Não instale Hardhat globalmente e não
execute seu assistente de criação: este projeto já tem os arquivos necessários.

## Executar

Dentro de `exemplos/fhevm`:

```bash
npm run demo:plain
npm run demo
npm test
```

Com o limiar 30, os resultados são soma 98, soma dos quadrados 2644, contagem 1 e
soma filtrada 38. O modo `hardhat` simula as operações FHE. Não mede o desempenho
criptográfico de uma rede real.

## Arquivos

| Caminho | Função |
|---|---|
| `contracts/SimplePlain.sol` | Soma simples em claro |
| `contracts/SimpleAdd.sol` | Soma simples com FHEVM |
| `contracts/HealthPlain.sol` | Estatísticas em claro |
| `contracts/HealthStats.sol` | Estatísticas com FHEVM |
| `scripts/dataset.ts` | Leitura da amostra e cálculo de referência |
| `scripts/calculo.ts` | Entrada cifrada, transação e recuperação dos agregados |
| `scripts/demo-plain.ts` | Demonstração do contrato em claro |
| `scripts/demo-healthcare.ts` | Demonstração FHEVM local ou em Sepolia |
| `scripts/criar-carteira.ts` | Geração local de uma carteira de teste |
| `scripts/account.ts` | Consulta do endereço e saldo em Sepolia |
| `test/` | Comparação dos resultados para diferentes limiares |

O exemplo FHEVM publica os agregados para comparação com os dados públicos.
Não use registros clínicos privados. A configuração de Sepolia está no
[módulo 8](../../modulos/08-experimentos.md).
