# 7. Verificação de Groth16 em Solidity

## O que o contrato faz

O circuito continua sendo executado fora da blockchain. O provador gera uma prova
Groth16 para `intervalo`. A EVM recebe a prova e três sinais públicos:
`commitment`, `min`, `max`.

**Hardhat 2** fornece uma EVM local. **Solc 0.8.24** compila os contratos.
**Ethers 6** faz deploy e chamadas. **Snarkjs** produz a prova e exporta a chave de
verificação. Não é necessário FHEVM para verificar esta prova; o projeto está
separado dos contratos FHE que já funcionam no repositório.

Há dois contratos, ambos completos neste módulo:

| Contrato | Responsabilidade |
|---|---|
| `Groth16Verifier` | Verificar a equação criptográfica usando a chave fixada no deploy |
| `HealthRangeRegistry` | Exigir a declaração esperada e registrar uma aceitação |

Não há mock que retorne `true`. O verificador implementa chamadas às precompiladas
BN254 da EVM. A execução é local; isso é diferente de afirmar que uma transação foi
enviada à Ethereum pública. As operações estão especificadas nas
[EIP-196](https://eips.ethereum.org/EIPS/eip-196) e
[EIP-197](https://eips.ethereum.org/EIPS/eip-197).

## Preparar e executar

Depois da [instalação](../INSTALACAO.md), dentro de `zkp/exemplos/circom`:

```bash
npm run demo -- intervalo
npm run compile:solidity
npm run test:contratos
npm run demo:contrato
```

O último comando faz deploy dos dois contratos, verifica a prova, submete a prova
ao registro e imprime endereços, hash da chave e gás efetivamente usado nessa
execução. Não há valor de gás pré-fabricado no guia. Cada execução Hardhat inicia
um estado novo; endereços e registro não são persistidos em uma rede pública.

## O que é verificado

Groth16 representa a prova por `A`, `B` e `C`. A chave de verificação contém
`alpha`, `beta`, `gamma`, `delta` e quatro pontos `IC`. Com três sinais públicos,
a combinação linear é:

```text
vkx = IC[0] + signal[0]·IC[1] + signal[1]·IC[2] + signal[2]·IC[3]
```

A verificação do produto de emparelhamentos usa:

```text
e(-A, B) · e(alpha, beta) · e(vkx, gamma) · e(C, delta) = 1
```

As precompiladas 0x06 e 0x07 executam adição e multiplicação escalar em G1.
A 0x08 verifica o produto de emparelhamentos e rejeita pontos malformados.
O campo base das coordenadas **não** é o campo escalar dos sinais públicos;
o código mantém constantes distintas para eles. [Especificação BN254 na EVM](https://eips.ethereum.org/EIPS/eip-197).

O construtor recebe uma chave exportada do setup local e a mantém sem setter.
`verificationKeyHash` identifica os parâmetros implantados; não certifica que o
setup foi confiável. Um verificador implantado com outra chave, uma chave
maliciosa ou outro código não tem a mesma garantia. O consumidor deve usar o
verificador e a chave esperados, não um endereço fornecido sem validação por quem
submete a prova.

## Verificador completo

Esta implementação parametrizada foi escrita para tornar a equação legível.
Não é o verificador Solidity otimizado gerado pelo snarkjs, não é uma biblioteca
auditada e precisa passar pelos testes de integração antes de qualquer uso além
do estudo. O tamanho de entrada é fixo em três sinais.

<!-- codigo: zkp/exemplos/circom/contracts/Groth16Verifier.sol -->
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Verificador didático Groth16/BN254 com exatamente três entradas públicas.
/// @dev A chave vem de snarkjs zkey export verificationkey. Não há setter de chave.
///      Código educacional, sem auditoria. Não é o verificador otimizado do snarkjs.
contract Groth16Verifier {
    uint256 public constant SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 private constant BASE_FIELD =
        21888242871839275222246405745257275088696311157297823662689037894645226208583;

    uint256[2] private alpha;
    uint256[2][2] private beta;
    uint256[2][2] private gamma;
    uint256[2][2] private delta;
    uint256[2][4] private ic;
    bytes32 public immutable verificationKeyHash;

    constructor(
        uint256[2] memory alpha_,
        uint256[2][2] memory beta_,
        uint256[2][2] memory gamma_,
        uint256[2][2] memory delta_,
        uint256[2][4] memory ic_
    ) {
        require(boundedG1(alpha_) && boundedG2(beta_) && boundedG2(gamma_) && boundedG2(delta_), "Invalid key encoding");
        for (uint256 i = 0; i < 4; i++) {
            require(boundedG1(ic_[i]), "Invalid IC encoding");
            ic[i] = ic_[i];
        }
        alpha = alpha_;
        beta = beta_;
        gamma = gamma_;
        delta = delta_;
        verificationKeyHash = keccak256(abi.encode(alpha_, beta_, gamma_, delta_, ic_));
    }

    function boundedG1(uint256[2] memory p) private pure returns (bool) {
        return p[0] < BASE_FIELD && p[1] < BASE_FIELD;
    }

    function boundedG2(uint256[2][2] memory p) private pure returns (bool) {
        return p[0][0] < BASE_FIELD && p[0][1] < BASE_FIELD
            && p[1][0] < BASE_FIELD && p[1][1] < BASE_FIELD;
    }

    function ecAdd(uint256[2] memory a, uint256[2] memory b)
        private view returns (bool success, uint256[2] memory result)
    {
        uint256[4] memory data = [a[0], a[1], b[0], b[1]];
        assembly ("memory-safe") {
            success := staticcall(gas(), 6, data, 0x80, result, 0x40)
            success := and(success, eq(returndatasize(), 0x40))
        }
    }

    function ecMul(uint256[2] memory point, uint256 scalar)
        private view returns (bool success, uint256[2] memory result)
    {
        uint256[3] memory data = [point[0], point[1], scalar];
        assembly ("memory-safe") {
            success := staticcall(gas(), 7, data, 0x60, result, 0x40)
            success := and(success, eq(returndatasize(), 0x40))
        }
    }

    function setPair(
        uint256[24] memory data, uint256 offset,
        uint256[2] memory p, uint256[2][2] memory q
    ) private pure {
        data[offset] = p[0];
        data[offset + 1] = p[1];
        // G2 já está na ordem [imaginário, real] exigida pela EIP-197.
        data[offset + 2] = q[0][0];
        data[offset + 3] = q[0][1];
        data[offset + 4] = q[1][0];
        data[offset + 5] = q[1][1];
    }

    function pairing(
        uint256[2] memory a, uint256[2][2] memory b,
        uint256[2] memory c, uint256[2] memory vkx
    ) private view returns (bool) {
        uint256[24] memory data;
        uint256[2] memory negativeA = [a[0], a[1] == 0 ? 0 : BASE_FIELD - a[1]];
        setPair(data, 0, negativeA, b);
        setPair(data, 6, alpha, beta);
        setPair(data, 12, vkx, gamma);
        setPair(data, 18, c, delta);
        uint256[1] memory result;
        bool success;
        assembly ("memory-safe") {
            success := staticcall(gas(), 8, data, 0x300, result, 0x20)
            success := and(success, eq(returndatasize(), 0x20))
        }
        return success && result[0] == 1;
    }

    function verifyProof(
        uint256[2] calldata a, uint256[2][2] calldata b,
        uint256[2] calldata c, uint256[3] calldata publicSignals
    ) external view returns (bool) {
        if (!boundedG1(a) || !boundedG2(b) || !boundedG1(c)) return false;
        uint256[2] memory vkx = ic[0];
        for (uint256 i = 0; i < 3; i++) {
            // Sem esta checagem, x e x + SCALAR_FIELD poderiam ser confundidos.
            if (publicSignals[i] >= SCALAR_FIELD) return false;
            (bool ok, uint256[2] memory term) = ecMul(ic[i + 1], publicSignals[i]);
            if (!ok) return false;
            (ok, vkx) = ecAdd(vkx, term);
            if (!ok) return false;
        }
        // e(-A,B) * e(alpha,beta) * e(vkx,gamma) * e(C,delta) == 1.
        // As precompiladas também validam os pontos e o subgrupo G2.
        return pairing(a, b, c, vkx);
    }
}
```
<!-- fim-codigo -->

## Contrato consumidor completo

O construtor fixa o compromisso e o intervalo esperados. `submitProof` não aceita
um intervalo arbitrário só porque veio em uma prova válida. A declaração é
comparada antes da verificação criptográfica.

Qualquer conta pode submeter uma cópia da prova. Não há afirmação de identidade,
recompensa, pagamento ou propriedade da prova. O booleano `verified` só evita
registrar duas vezes esta mesma declaração; não é um esquema geral de nullifiers
nem uma proteção contra reutilização em outros contratos.

<!-- codigo: zkp/exemplos/circom/contracts/HealthRangeRegistry.sol -->
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IRangeVerifier {
    function verifyProof(
        uint256[2] calldata a, uint256[2][2] calldata b,
        uint256[2] calldata c, uint256[3] calldata publicSignals
    ) external view returns (bool);
}

/// @notice Registra uma prova sobre um compromisso e intervalo definidos antes da submissão.
/// @dev Não contém prontuários, papéis de usuário, recompensas ou listas de permissão.
contract HealthRangeRegistry {
    uint256 private constant SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;
    IRangeVerifier public immutable verifier;
    uint256 public immutable commitment;
    uint256 public immutable minimum;
    uint256 public immutable maximum;
    bool public verified;

    error StatementMismatch();
    error InvalidProof();
    error AlreadyVerified();
    event RangeVerified(uint256 commitment, uint256 minimum, uint256 maximum);

    constructor(address verifier_, uint256 commitment_, uint256 minimum_, uint256 maximum_) {
        require(verifier_.code.length > 0, "Verifier must be a contract");
        require(commitment_ < SCALAR_FIELD, "Non-canonical commitment");
        require(minimum_ <= maximum_ && maximum_ <= 100, "Invalid interval");
        verifier = IRangeVerifier(verifier_);
        commitment = commitment_;
        minimum = minimum_;
        maximum = maximum_;
    }

    function submitProof(
        uint256[2] calldata a, uint256[2][2] calldata b,
        uint256[2] calldata c, uint256[3] calldata publicSignals
    ) external {
        if (verified) revert AlreadyVerified();
        if (publicSignals[0] != commitment || publicSignals[1] != minimum || publicSignals[2] != maximum) {
            revert StatementMismatch();
        }
        if (!verifier.verifyProof(a, b, c, publicSignals)) revert InvalidProof();
        verified = true;
        emit RangeVerified(commitment, minimum, maximum);
    }
}
```
<!-- fim-codigo -->

## Adaptar a chave e a prova

Snarkjs escreve os coeficientes de G2 como `[real, imaginário]`. A EIP-197 recebe
`[imaginário, real]`. `solidityKey` e `solidityProof`, definidos integralmente em
[CONFIGURACAO.md](../CONFIGURACAO.md), fazem a inversão uma única vez. Inverter de
novo faz uma prova válida falhar. Os testes unitários cobrem esse formato.

O script de deploy completo lê a chave e a declaração escolhidas localmente:

<!-- codigo: zkp/exemplos/circom/lib/deploy.cjs -->
```javascript
"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const { directory, read, prepared } = require("./files.cjs");
const { solidityKey, solidityProof } = require("./model.cjs");
async function deploy(hre) {
  prepared("intervalo");
  const d = directory("intervalo");
  const key = read(path.join(d, "groth16.vkey.json"));
  const proof = read(path.join(d, "groth16.proof.json"));
  const signals = read(path.join(d, "groth16.public.json"));
  // Referência escolhida antes da prova; não aceita uma declaração qualquer do provador.
  const expected = read(path.join(d, "statement.json")).publicSignals;
  assert.deepEqual(signals, expected);
  const verifier = await hre.ethers.deployContract("Groth16Verifier", solidityKey(key));
  await verifier.waitForDeployment();
  const registry = await hre.ethers.deployContract("HealthRangeRegistry", [await verifier.getAddress(), ...expected]);
  await registry.waitForDeployment();
  return { verifier, registry, args: solidityProof(proof, signals), key, expected };
}
module.exports = { deploy };
```
<!-- fim-codigo -->

A referência `statement.json` da demonstração é criada antes da geração da prova,
a partir da amostra pública. Ela não é uma fonte autenticada de dados de saúde.
Em um protocolo real, o compromisso esperado precisa vir da fonte de confiança
especificada pelo sistema, não do próprio conteúdo de uma prova arbitrária.

## Cliente completo

<!-- codigo: zkp/exemplos/circom/scripts/onchain.cjs -->
```javascript
"use strict";
const hre = require("hardhat");
const assert = require("node:assert/strict");
const { deploy } = require("../lib/deploy.cjs");
async function main() {
  const { verifier, registry, args } = await deploy(hre);
  assert.equal(await verifier.verifyProof(...args), true, "Verificador rejeitou a prova.");
  const receipt = await (await registry.submitProof(...args)).wait();
  assert.equal(await registry.verified(), true);
  console.log("Verificador:", await verifier.getAddress());
  console.log("Registro:", await registry.getAddress());
  console.log("Hash da chave de verificação:", await verifier.verificationKeyHash());
  console.log("Prova aceita:", await registry.verified());
  console.log("Gas da submissão medido nesta execução:", receipt.gasUsed.toString());
  console.log("Rede Hardhat local. Não foi enviada transação a uma rede pública.");
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
```
<!-- fim-codigo -->

## Testes de contrato completos

Os testes usam a prova real produzida por snarkjs, não um fixture que ignora a
verificação. Eles não são silenciosamente pulados quando os arquivos faltam:
primeiro execute `npm run demo -- intervalo` ou use `npm test` para gerar tudo.

<!-- codigo: zkp/exemplos/circom/test/contracts/health.cjs -->
```javascript
"use strict";
const assert = require("node:assert/strict");
const hre = require("hardhat");
const { deploy } = require("../../lib/deploy.cjs");
const { FIELD } = require("../../lib/model.cjs");

describe("Groth16 em healthcare — prova real, sem mock de verificação", function () {
  let verifier, registry, args, expected;
  before(async function () { ({ verifier, registry, args, expected } = await deploy(hre)); });

  it("aceita a prova gerada para o circuito intervalo", async function () {
    assert.equal(await verifier.verifyProof(...args), true);
  });
  it("rejeita cada sinal público adulterado", async function () {
    for (let i = 0; i < 3; i++) {
      const bad = structuredClone(args);
      bad[3][i] = (BigInt(bad[3][i]) + 1n).toString();
      assert.equal(await verifier.verifyProof(...bad), false);
    }
  });
  it("rejeita codificação não canônica do campo escalar", async function () {
    const bad = structuredClone(args);
    bad[3][0] = (BigInt(bad[3][0]) + FIELD).toString();
    assert.equal(await verifier.verifyProof(...bad), false);
  });
  it("rejeita uma prova com C trocado por A", async function () {
    const bad = structuredClone(args);
    bad[2] = bad[0];
    assert.equal(await verifier.verifyProof(...bad), false);
  });
  it("rejeita coordenada fora do campo base", async function () {
    const bad = structuredClone(args);
    bad[0][0] = "21888242871839275222246405745257275088696311157297823662689037894645226208583";
    assert.equal(await verifier.verifyProof(...bad), false);
  });
  it("uma prova válida não vale para outro compromisso esperado", async function () {
    const other = await hre.ethers.deployContract("HealthRangeRegistry", [await verifier.getAddress(),
      (BigInt(expected[0]) + 1n) % FIELD, expected[1], expected[2]]);
    await other.waitForDeployment();
    await assert.rejects(other.submitProof(...args));
    assert.equal(await other.verified(), false);
  });
  it("não registra prova inválida mesmo com sinais públicos corretos", async function () {
    const bad = structuredClone(args);
    bad[2] = bad[0];
    await assert.rejects(registry.submitProof(...bad));
    assert.equal(await registry.verified(), false);
  });
  it("registra uma prova válida e emite o evento", async function () {
    const receipt = await (await registry.submitProof(...args)).wait();
    assert.equal(await registry.verified(), true);
    const events = receipt.logs.map(log => { try { return registry.interface.parseLog(log); } catch { return null; } });
    const event = events.find(e => e && e.name === "RangeVerified");
    assert.ok(event);
    assert.equal(event.args.commitment.toString(), expected[0]);
  });
  it("não registra duas vezes a mesma declaração", async function () {
    await assert.rejects(registry.submitProof(...args));
  });
});
```
<!-- fim-codigo -->

## Comparar com o verificador gerado pelo snarkjs

O projeto também permite exportar o verificador otimizado correspondente à chave
local, sem inserir constantes fictícias na documentação:

```bash
npm run exportar:verificador
```

Esse comando cria `build/intervalo/VerifierGenerated.sol` e um Markdown com o
**código integral gerado**, `build/intervalo/VERIFICADOR-GERADO.md`. Esses arquivos
não entram automaticamente na compilação nem substituem os contratos acima.
São outra forma de estudar a implementação para a chave efetivamente gerada.
O contrato consumidor e o verificador didático já estão completos no ZIP, sem
`TODO` ou pontos de emparelhamento inventados.

[Índice](../README.md) · [Anterior](06-merkle.md) · [Próximo](08-groth16-e-plonk.md)
