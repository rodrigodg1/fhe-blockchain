# Módulo 8 — Testes, recortes e Sepolia

[Percurso](../README.md) · [Instalação](../INSTALACAO.md)


## Recursos usados

| Recurso | O que é | Por que usar |
|---|---|---|
| Testes Hardhat e `node:assert` | Execução automatizada e comparação | Verificar os resultados para diferentes limiares |
| Rede local `hardhat` | Blockchain em memória | Executar testes sem serviços externos |
| Sepolia | Rede de testes Ethereum | Exercitar a integração FHEVM real |
| RPC | Interface de comunicação com um nó | Enviar transações e consultar recibos |
| Carteira de teste | Chave para assinar transações | Implantar e chamar o contrato em Sepolia |

## 1. Leia o teste FHEVM completo

<!-- codigo: exemplos/fhevm/test/HealthStats.ts -->
Arquivo: [`exemplos/fhevm/test/HealthStats.ts`](../exemplos/fhevm/test/HealthStats.ts).

```typescript
import { strict as assert } from "node:assert";
import { ethers, fhevm } from "hardhat";
import type { HealthStats } from "../types";
import { carregarAmostra, referencia } from "../scripts/dataset";
import { calcular } from "../scripts/calculo";

describe("HealthStats", function () {
  before(function () {
    if (!fhevm.isMock) throw new Error("Use a rede hardhat para esta suite");
  });
  for (const threshold of [20, 30, 100]) {
    it(`calcula a amostra cifrada com limiar ${threshold}`, async function () {
      const values = carregarAmostra().values;
      const [signer] = await ethers.getSigners();
      const factory = await ethers.getContractFactory("HealthStats");
      const contract = (await factory.deploy()) as HealthStats;
      await contract.waitForDeployment();
      const result = await calcular(contract, signer, values, threshold);
      assert.deepEqual(result.values, referencia(values, threshold));
    });
  }
  it("calcula duas vezes sem acumular os resultados", async function () {
    const values = carregarAmostra().values;
    const [signer] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("HealthStats");
    const contract = (await factory.deploy()) as HealthStats;
    await contract.waitForDeployment();
    const first = await calcular(contract, signer, values, 30);
    const second = await calcular(contract, signer, values, 30);
    assert.deepEqual(first.values, second.values);
    assert.deepEqual(second.values, referencia(values, 30));
  });
});
```
<!-- /codigo -->

Os três primeiros casos usam limiares 20, 30 e 100. O último chama a mesma
instância duas vezes: os resultados não devem se acumular, pois os acumuladores
existem somente durante cada chamada.

`before` impede rodar esta suíte numa rede externa. Não use uma execução ignorada
ou uma falha de configuração como evidência de que os cálculos funcionaram.
O arquivo `calculo.ts` usado nos testes está completo no [módulo 7](07-fhevm.md).

Execute as duas suítes e confira os tipos:

```bash
cd "$FHE_ROADMAP_ROOT/exemplos/fhevm"
npx hardhat compile
npm run typecheck
npm test
```

São três testes em claro e quatro FHEVM. Os testes Python da raiz verificam a
preparação de dados e a documentação; são verificações diferentes.

## 2. Varie o limiar

```bash
HEALTHCARE_THRESHOLD=20 npm run demo
HEALTHCARE_THRESHOLD=100 npm run demo
```

As variáveis antes de cada comando valem apenas para aquela execução.
Na amostra `[20, 38, 20, 20]`, as referências são:

| Limiar | Soma | Soma dos quadrados | Quantidade acima | Soma acima |
|---|---:|---:|---:|---:|
| 20 | 98 | 2644 | 1 | 38 |
| 30 | 98 | 2644 | 1 | 38 |
| 100 | 98 | 2644 | 0 | 0 |

A condição é `>`, não `>=`. Por isso os valores iguais a 20 não entram no filtro.

## 3. Use outros registros de saúde

Prepare o segundo grupo, sem substituir a amostra padrão:

```bash
cd "$FHE_ROADMAP_ROOT"
python3 scripts/preparar-dataset.py \
  --inicio 5 --limite 4 --destino dados/grupo2

cd "$FHE_ROADMAP_ROOT/exemplos/fhevm"
HEALTHCARE_DATASET="$FHE_ROADMAP_ROOT/dados/grupo2/amostra.json" \
  HEALTHCARE_THRESHOLD=30 npm run demo
```

Para `[20, 40, 15, 60]`, espere `[135, 5825, 2, 100]`. A média é `33,75%`.
Execute também `npm run demo:plain` com as mesmas variáveis para comparar os resultados.

O formato dos contratos exige quatro registros. Rust aceita outros tamanhos
permitidos pelo carregador. Não envie oito valores a uma função declarada com vetor de quatro.

## 4. Prepare uma carteira para Sepolia

A parte local termina aqui. Os próximos passos usam serviços de rede e uma
carteira **exclusivamente de teste**, sem ativos reais.

O arquivo abaixo gera uma carteira no seu computador, sem chamadas de rede.
Não redirecione sua saída para um arquivo do repositório e não a compartilhe.

### Código completo: criar-carteira.ts

<!-- codigo: exemplos/fhevm/scripts/criar-carteira.ts -->
Arquivo: [`exemplos/fhevm/scripts/criar-carteira.ts`](../exemplos/fhevm/scripts/criar-carteira.ts).

```typescript
import { Wallet } from "ethers";

// Gera uma carteira local. Nao envia transacoes nem faz chamadas de rede.
const wallet = Wallet.createRandom();
const phrase = wallet.mnemonic?.phrase;
if (!phrase) {
  throw new Error("Nao foi possivel gerar a frase-semente");
}

console.log("Use esta carteira somente em redes de teste.");
console.log(`Endereco: ${wallet.address}`);
console.log(`Frase-semente: ${phrase}`);
console.log("Guarde a frase fora do repositorio. Nao compartilhe esta saida.");
```
<!-- /codigo -->

Execute dentro do projeto Node:

```bash
cd "$FHE_ROADMAP_ROOT/exemplos/fhevm"
npx ts-node scripts/criar-carteira.ts
```

Guarde a frase-semente fora do repositório. Cada execução gera outra carteira.
A frase permite reconstruir as chaves; não reutilize uma carteira pessoal neste projeto.

Configure a frase interativamente:

```bash
npx hardhat vars set MNEMONIC
```

Cole somente a frase da carteira de teste no prompt. O mecanismo `vars` armazena
valores localmente sem cifração; não é um cofre de segredos.

## 5. Configure o endpoint RPC

No serviço RPC de sua escolha, crie um endpoint para **Ethereum Sepolia** e copie
a URL HTTPS completa. Ela pode conter uma credencial do provedor. Configure-a
no prompt, não no código:

```bash
npx hardhat vars set SEPOLIA_RPC_URL
```

Não use a URL de uma rede diferente nem a página de um explorador de blocos.
As duas variáveis fazem a configuração criar a rede `sepolia`.

O relayer Zama em Sepolia é descrito como aberto na
[documentação de autenticação](https://docs.zama.org/protocol/sdk/guides/relayer-api-keys).
A credencial eventualmente contida na URL RPC pertence ao provedor RPC; são serviços diferentes.

### Código completo: account.ts

<!-- codigo: exemplos/fhevm/scripts/account.ts -->
Arquivo: [`exemplos/fhevm/scripts/account.ts`](../exemplos/fhevm/scripts/account.ts).

```typescript
import { ethers, network } from "hardhat";

async function main() {
  const [account] = await ethers.getSigners();
  if (!account) throw new Error("Configure a carteira de teste");
  const balance = await ethers.provider.getBalance(account.address);
  console.log(`Rede: ${network.name}`);
  console.log(`Endereco: ${account.address}`);
  console.log(`Saldo (ETH): ${ethers.formatEther(balance)}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
```
<!-- /codigo -->

Consulte o endereço que o Hardhat realmente está usando:

```bash
npx hardhat run scripts/account.ts --network sepolia
```

Use um faucet de Sepolia para enviar ETH de teste a esse endereço. A documentação
[das redes Ethereum](https://ethereum.org/en/developers/docs/networks/#sepolia)
lista recursos para a rede. Um faucet precisa do **endereço público**, nunca da frase-semente.
Execute `account.ts` novamente para conferir o saldo.

## 6. Implante e execute em Sepolia

O script completo `demo-healthcare.ts` está no [módulo 7](07-fhevm.md).
Ele implanta a instância, cifra a amostra, envia a chamada e recupera os resultados:

```bash
cd "$FHE_ROADMAP_ROOT/exemplos/fhevm"
npx hardhat clean
npx hardhat compile --network sepolia
npm run demo:sepolia
```

A referência numérica é a mesma do modo local. A saída deve indicar
`FHE simulado: false`. Cada execução implanta outra instância.
Uma transação confirmada não significa que o resultado FHE já foi recuperado;
o script trata essas etapas separadamente.

Se ocorrer uma falha depois do envio, guarde o hash público mostrado e consulte
o recibo antes de repetir. Não registre a frase-semente ou a URL RPC com credenciais.
O teste de saldo não nulo do script não garante saldo suficiente para todas as transações.

## 7. Interprete as medidas

| Campo | O que mede |
|---|---|
| `Entrada (ms)` | Preparação dos handles e da prova pelo cliente |
| `Envio e recibo (ms)` | Chamada do contrato até o recibo |
| `Recuperacao (ms)` | Solicitação dos resultados até a resposta |
| `Gas da chamada calculate` | Gas da transação de cálculo, sem a implantação |

Tempos da simulação local não representam o custo criptográfico de Sepolia.
Gas também não é o mesmo que complexidade homomórfica, medida pela Zama em HCU.
O `HealthPlain` é consultado sem transação de cálculo na demonstração, por isso
seu tempo não deve ser comparado diretamente ao envio FHEVM.

Para estudar o efeito das operações, compare as medidas com o programa Rust
do módulo 3 e identifique quais etapas cada número inclui. As implementações
não executam no mesmo ambiente e não constituem um benchmark equivalente.

## Referências

[Zama — testes e Sepolia](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/run_test) · [Hardhat — variáveis](https://v2.hardhat.org/hardhat-runner/docs/guides/configuration-variables) · [Zama — HCU](https://docs.zama.org/protocol/solidity-guides/development-guide/hcu)
