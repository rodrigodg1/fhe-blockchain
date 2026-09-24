# Verificações desta edição

## Executado

| Verificação | Resultado |
|---|---|
| Testes Python | 12 passaram: sete de dados e cinco de documentação |
| Preparação da amostra padrão | `[20, 38, 20, 20]`, soma 98 e média 24,50 |
| Preparação do segundo grupo | `[20, 40, 15, 60]`, soma 135 e média 33,75 |
| Sintaxe TypeScript | Nove arquivos processados sem erros de sintaxe |
| Carregador TypeScript e referência em claro | Amostras e resultados conferidos |
| Script de publicação | Sintaxe conferida com `bash -n`; publicação não executada |
| Código nos módulos | Blocos completos conferem com os arquivos-fonte |
| Links internos | Destinos existentes |
| Roadmap reunido | Sincronizado com instalação, configuração e módulos |

Comando dos testes Python:

```bash
python3 -m unittest discover -s tests -v
```

Resultado:

```text
Ran 12 tests
OK
```

A checagem TypeScript usou `transpileModule` para verificar sintaxe. O carregador
`dataset.ts` foi executado após a conversão para JavaScript, sem importar Hardhat.
Isso não equivale a `npm run typecheck` com as dependências e os contratos gerados.

## Não executado

Os programas Rust não foram compilados nem executados neste ambiente.
As dependências Node do projeto não foram instaladas. Não foram executados
`hardhat compile`, a checagem completa de tipos, os testes Hardhat, as operações
FHEVM ou as transações em Sepolia. O download do conjunto completo também não foi
executado nesta revisão; a preparação usa os oito registros incluídos.

Os valores dos módulos são referências calculadas em claro, não medições de
desempenho FHE. Os tempos devem ser obtidos na execução descrita no roadmap.

## Integridade

`SHA256SUMS.txt` permite conferir os arquivos distribuídos:

```bash
python3 scripts/verificar-pacote.py
```

Faça essa verificação antes de editar. O manifesto detecta mudanças nos arquivos;
não demonstra a correção dos algoritmos nem substitui testes com as dependências.
