# Validação do incremento

## Escopo

O pacote foi preparado a partir do commit
`d555acdeda18d53b214ea386d71e7ee8a4fcc4f0` de `rodrigodg1/fhe-blockchain`.
A árvore e os arquivos de referência foram consultados no GitHub. O pacote
contém apenas `ZKP.md` e `zkp/`, ausentes na raiz dessa versão. A referência
está em [BASE-INSPECIONADA.json](BASE-INSPECIONADA.json).

**A integração Circom/snarkjs/Solidity/Hardhat ainda precisa ser executada em um
ambiente com as dependências instaladas. Não foi declarada aprovada.**
O ambiente de preparação tinha Python 3.13.5, Node.js 22.16.0 e npm 10.9.2,
mas não tinha Circom, Rust/Cargo, solc ou as dependências npm deste projeto.
As tentativas de obter dependências pela rede não tiveram sucesso. Não foi
criado um lockfile com resolução fictícia.

## Executado com sucesso

| Verificação | Resultado e alcance |
|---|---|
| Schnorr/Pedersen em Python | 14 testes aprovados, executando as operações modulares reais |
| Demonstração Python pela CLI | Geração e verificação positiva; contexto diferente e prova adulterada rejeitados |
| Funções JavaScript sem dependências externas | 11 testes aprovados de aritmética, limites, serialização e formato de argumentos EVM |
| Aplicador do incremento | 6 testes aprovados de simulação, cópia sem sobrescrita, idempotência, conflitos e caminhos inseguros |
| Sintaxe e formatos | Fontes Python analisados por `ast.parse`, JavaScript por `node --check` e JSON por parser |
| Fontes na documentação | 23 blocos integrais conferidos contra os arquivos correspondentes |

O [registro de execução](validacao/execucao.txt) contém os comandos, as saídas e
os códigos de retorno. Os testes do aplicador usam um repositório temporário
mínimo, com arquivos sentinela. Eles não executam o projeto FHE original.
Os testes JavaScript unitários não validam Poseidon, provas ou emparelhamentos:
eles não substituem os testes de integração.

## Implementado, mas não executado neste ambiente

A instalação das dependências e sua resolução transitiva; a compilação dos
cinco circuitos; a geração e verificação de witnesses; Powers of Tau e o setup
Groth16; a geração/verificação de provas Groth16 e PLONK; a compilação Solidity;
o deploy e os testes da EVM local; a exportação do verificador otimizado snarkjs.
Não há métricas de desempenho ou gás medidas para essas etapas neste pacote.

Os testes criptográficos implementados alteram sinais públicos, componentes de
provas, valores, salts, limites, agregados e caminhos Merkle. Os testes Solidity
implementados verificam prova válida, adulterações, codificação canônica,
vínculo à declaração esperada, atualização do registro e submissão repetida.
Esses casos são código de teste, não resultados de execução apresentados como
se tivessem ocorrido.

O setup local é didático, não uma cerimônia auditada. O verificador Solidity
parametrizado é código educacional original, não uma biblioteca auditada. Os
exemplos não devem ser usados em produção ou com dados privados de pacientes.

## Repetir as verificações leves

Na raiz do repositório, depois de adicionar o incremento:

```bash
python3 -m unittest discover -s zkp/exemplos/schnorr -v
node --test zkp/exemplos/circom/test/unit.test.cjs
python3 -m unittest discover -s zkp/tests -v
python3 zkp/scripts/verificar_estatico.py
```

## Executar a integração

Conclua [INSTALACAO.md](INSTALACAO.md). Na raiz do repositório:

```bash
cd zkp/exemplos/circom
npm install
npm run doctor
npm test
npm run demo:contrato
npm run demo:plonk
npm run exportar:verificador
```

`npm test` executa os testes unitários, prepara e testa os cinco circuitos com
Groth16 e então executa os contratos na EVM. O teste do contrato exige a prova
de intervalo criada na etapa anterior. `demo:plonk` executa separadamente a
relação de intervalo usando PLONK, sem prometer verificação PLONK on-chain.
A primeira instalação usa `npm install`, pois não há lockfile incluído.

Se uma etapa falhar, preserve o erro e consulte [PROBLEMAS.md](PROBLEMAS.md).
Uma falha de instalação, compilação ou arquivo ausente não deve ser registrada
como rejeição criptográfica esperada.

## Preservação e integridade

Nenhum fonte, dado, dependência, lockfile, configuração ou documentação anterior
é incluído como substituição. Os testes originais de FHE **não foram executados
novamente**; o incremento não afirma que foram revalidados.

`MANIFESTO.json` enumera os arquivos novos. `SHA256SUMS.txt` contém o SHA-256 de
todos os arquivos enumerados, exceto dele próprio. Verifique, na raiz onde o
ZIP foi extraído, com `sha256sum -c zkp/SHA256SUMS.txt` no Linux ou com o aplicador
Python em modo de simulação. Após editar o incremento, seus hashes deixarão de
corresponder aos do pacote original. Os checksums não são assinatura digital.
