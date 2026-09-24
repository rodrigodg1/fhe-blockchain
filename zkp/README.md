# ZKP em saúde

Esta trilha continua o [roadmap de FHE](../ROADMAP.md), sem modificar os exemplos
anteriores. A pergunta muda de **“como calcular sem revelar os dados ao executor?”**
para **“como verificar uma afirmação sem receber os dados que a sustentam?”**
A primeira motiva FHE; a segunda, ZKP. A combinação exige vínculos criptográficos
adicionais, explicados no último módulo. [Fundamentos](modulos/01-zkp-ou-fhe.md).

## Percurso

| Ordem | Leitura | O que será implementado |
|---|---|---|
| 0 | [Instalação](INSTALACAO.md) | Git, Python, Node.js, Rust, Circom, snarkjs e Hardhat |
| 1 | [ZKP ou FHE?](modulos/01-zkp-ou-fhe.md) | Escolha da técnica, dados públicos e privados, compromissos e limites |
| 2 | [Schnorr e Pedersen](modulos/02-schnorr-pedersen.md) | Provar conhecimento da abertura de um compromisso em Python |
| 3 | [Circom e intervalo](modulos/03-circom-intervalo.md) | Provar que uma medida comprometida está entre dois limites |
| 4 | [Estatísticas](modulos/04-estatisticas.md) | Provar soma, quadrados, média e variância de quatro medidas |
| 5 | [Contagem e média por limiar](modulos/05-contagem-e-media-limiar.md) | Contar valores acima de um limiar e provar uma condição sobre a média |
| 6 | [Lote de exames e Merkle](modulos/06-merkle.md) | Provar inclusão em um lote e uma faixa, sem expor o índice |
| 7 | [Solidity](modulos/07-solidity.md) | Verificar Groth16 e registrar uma declaração na EVM local |
| 8 | [Groth16 e PLONK](modulos/08-groth16-e-plonk.md) | Executar a mesma relação com outro sistema de provas |
| 9 | [ZKP junto de FHE](modulos/09-zkp-com-fhe.md) | Identificar o que uma composição real precisaria provar |

Cada módulo define as bibliotecas usadas, explica os sinais públicos e privados,
mostra os comandos e inclui os fontes completos relevantes. Os arquivos de apoio
estão integralmente em [CONFIGURACAO.md](CONFIGURACAO.md).

## Dados e resultados

Os programas Node leem o arquivo **já existente** `dados/processado/amostra.json`.
Não baixam outro dataset nem sobrescrevem essa amostra. O recorte original contém
`ejection_fraction = [20, 38, 20, 20]`, quatro medidas públicas do
Heart Failure Clinical Records. Veja a [origem no repositório](../dados/README.md)
e a [base inspecionada](BASE-INSPECIONADA.json).

| Operação sobre a amostra | Resultado de referência |
|---|---:|
| Soma | 98 |
| Soma dos quadrados | 2644 |
| Média | 24,5 |
| Variância populacional | 60,75 |
| Quantidade de valores estritamente maiores que 30 | 1 |
| Média maior ou igual a 24 | Verdadeiro |
| Média maior ou igual a 25 | Falso |

Os limites 24, 25, 30 e 45 foram escolhidos para ensinar as operações. Não são
critérios clínicos. Os exemplos não fazem diagnóstico. A amostra pública permite
conferir os cálculos; por ser pública, não demonstra sigilo real dos pacientes.

## Primeira execução

O exemplo Python usa somente a biblioteca padrão. Na raiz do repositório:

```bash
python3 zkp/exemplos/schnorr/schnorr.py demo
python3 zkp/exemplos/schnorr/schnorr.py verify   zkp/exemplos/schnorr/saida/proof.json   --context 'healthcare:amostra-publica:v1'
```

Para os circuitos, conclua a [instalação](INSTALACAO.md) e execute:

```bash
cd zkp/exemplos/circom
npm run demo -- intervalo
npm run demo:contrato
```

`demo` compila, prepara os parâmetros locais, gera a entrada, calcula o witness,
produz uma prova e verifica o resultado. Não simula uma resposta `true`.
`demo:contrato` envia a prova à EVM local do Hardhat. Não usa conta real, fundos ou
rede pública.

## Organização

```text
ZKP.md
zkp/
  README.md
  INSTALACAO.md
  CONFIGURACAO.md
  COMO-ADICIONAR.md
  REFERENCIAS.md
  PROBLEMAS.md
  VALIDACAO.md
  modulos/
  exemplos/schnorr/
  exemplos/circom/
  scripts/
  tests/
  MANIFESTO.json
  SHA256SUMS.txt
```

O ZIP não contém `node_modules`, chaves de prova prontas, Powers of Tau, witnesses,
provas pré-geradas ou lockfile npm inventado. A primeira instalação cria o
`package-lock.json` **deste novo projeto**. O setup local é exclusivamente didático.
A execução integral Circom/snarkjs/Hardhat não foi realizada no ambiente de
preparação deste incremento; os testes executados e os pendentes estão em
[VALIDACAO.md](VALIDACAO.md).
