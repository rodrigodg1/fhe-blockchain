# 2. Conhecimento da abertura: Pedersen e Schnorr

## O que será provado

O provador possui uma medida `v` e um fator de ocultação `r`. Ele publica o
compromisso `C = g^v · h^r mod p` e prova que conhece uma abertura válida de `C`,
sem publicar `v` e `r`.

Este é um exemplo de **Schnorr generalizado**, com dois expoentes secretos,
transformado em prova não interativa por **Fiat–Shamir**. Não é uma implementação
byte a byte de um formato padronizado: a serialização e o domínio do transcrito
são definidos neste projeto. [Schnorr e Fiat–Shamir na RFC 8235](https://www.rfc-editor.org/rfc/rfc8235.html).

A medida padrão é 38, um dos valores públicos do repositório. O contexto padrão é
`healthcare:amostra-publica:v1`. A escolha desse contexto não autentica um exame;
ela impede reutilizar o mesmo transcrito sob outro contexto sem invalidá-lo.

**Esta prova não demonstra que `v` está entre 0 e 100.** A interface `demo` limita
a entrada para o caso de healthcare, mas o verificador não recebe essa condição
como relação. O teste `test_does_not_claim_range` prova abertura para 999 e aceita,
justamente para tornar essa diferença explícita. A prova de faixa vem no módulo 3.

## Recursos usados

`secrets` obtém aleatoriedade do sistema operacional. `hashlib` fornece SHA-256 para
o desafio e SHAKE-256 para derivar o segundo gerador. `pow(base, expoente, módulo)`
executa exponenciação modular; `dataclasses`, `json` e `argparse` organizam a API e
a execução. Tudo faz parte da biblioteca padrão do Python.

O módulo usa o primo de 2048 bits do grupo 14 da
[RFC 3526](https://www.rfc-editor.org/rfc/rfc3526.html), com `q = (p - 1) / 2`.
Usamos o subgrupo de resíduos quadráticos e `g = 4`. O gerador `h` é derivado por
hash e projeção ao subgrupo, sem escolher um expoente secreto conhecido relativo
a `g`. A derivação é pública e determinística; os fatores de ocultação não são.

## A equação

O provador escolhe nonces novos `kv` e `kr`, e calcula:

```text
T  = g^kv · h^kr mod p
c  = Hash(protocolo, contexto, parâmetros, C, T) mod q
sv = kv + c·v mod q
sr = kr + c·r mod q
```

O verificador recompõe `c` e verifica:

```text
g^sv · h^sr = T · C^c mod p
```

Substituindo `sv` e `sr`, o lado esquerdo se torna
`g^(kv+c·v) · h^(kr+c·r)`, que é exatamente `T · (g^v · h^r)^c`.
Essa identidade explica a aceitação de uma prova honesta. A resistência à
falsificação depende das hipóteses criptográficas do protocolo e do hash, não
somente dessa identidade algébrica.

O código valida subgrupo, limites dos escalares e codificações canônicas. Ele
inclui os parâmetros, o compromisso e o contexto no desafio. Não reutilize
nonces: respostas obtidas com o mesmo nonce e desafios diferentes podem revelar
segredos.

## Executar

Na raiz do repositório, com Python 3.10 ou superior:

```bash
python3 zkp/exemplos/schnorr/schnorr.py demo
python3 zkp/exemplos/schnorr/schnorr.py verify \
  zkp/exemplos/schnorr/saida/proof.json \
  --context 'healthcare:amostra-publica:v1'
python3 -m unittest discover -s zkp/exemplos/schnorr -v
```

A primeira execução mostra `Prova válida: True`. A verificação separada mostra
`PROVA VALIDA`. O arquivo JSON contém somente `protocol`, `statement` e `proof`.
Você pode mover esse JSON para outra máquina com o mesmo verificador; nenhum
arquivo privado é necessário para conferir a equação.

A CLI também aceita `--commitment` na verificação para comparar com um compromisso
previamente conhecido. Sem esse argumento, a checagem confirma conhecimento da
abertura do compromisso apresentado, não a autenticidade de um compromisso
externo. Em ambos os casos, `--context` deve corresponder ao contexto esperado.

Um teste negativo que não altera arquivos:

```bash
python3 zkp/exemplos/schnorr/schnorr.py verify \
  zkp/exemplos/schnorr/saida/proof.json \
  --context 'healthcare:outro-lote:v1'
```

O resultado esperado é `PROVA INVALIDA`, com código de saída 1.

## Código completo

<!-- codigo: zkp/exemplos/schnorr/schnorr.py -->
```python
#!/usr/bin/env python3
"""Prova de conhecimento de abertura de compromisso Pedersen, para estudo.

Usa Schnorr generalizado e Fiat-Shamir. Não prova intervalo, diagnóstico,
identidade ou origem da medida. Inteiros Python não são constant-time.
"""
from __future__ import annotations
import argparse
from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
import re
import secrets

# Primo MODP de 2048 bits, grupo 14 da RFC 3526. Q é a ordem do subgrupo.
P = int("""
FFFFFFFF FFFFFFFF C90FDAA2 2168C234 C4C6628B 80DC1CD1 29024E08 8A67CC74
020BBEA6 3B139B22 514A0879 8E3404DD EF9519B3 CD3A431B 302B0A6D F25F1437
4FE1356D 6D51C245 E485B576 625E7EC6 F44C42E9 A637ED6B 0BFF5CB6 F406B7ED
EE386BFB 5A899FA5 AE9F2411 7C4B1FE6 49286651 ECE45B3D C2007CB8 A163BF05
98DA4836 1C55D39A 69163FA8 FD24CF5F 83655D23 DCA3AD96 1C62F356 208552BB
9ED52907 7096966D 670C354E 4ABC9804 F1746C08 CA18217C 32905E46 2E36CE3B
E39E772C 180E8603 9B2783A2 EC07A28F B5C55DF0 6F4C52C9 DE2BCBF6 95581718
3995497C EA956AE5 15D22618 98FA0510 15728E5A 8AACAA68 FFFFFFFF FFFFFFFF
""".replace(" ", "").replace("\n", ""), 16)
Q = (P - 1) // 2
G = 4  # Resíduo quadrático não trivial; portanto pertence ao subgrupo de ordem Q.
WIDTH = (P.bit_length() + 7) // 8
PROTOCOL = "pedersen-schnorr-modp14-v1"
DEFAULT_CONTEXT = "healthcare:amostra-publica:v1"


def derive_h() -> int:
    """Hash-to-subgroup transparente; não escolhe H=G**segredo conhecido."""
    counter = 0
    while True:
        seed = b"fhe-blockchain/zkp/pedersen/H/v1/" + counter.to_bytes(4, "big")
        x = int.from_bytes(hashlib.shake_256(seed).digest(WIDTH), "big")
        counter += 1
        if not 2 <= x < P - 1:
            continue
        h = pow(x, 2, P)
        if h not in (1, G):
            return h


H = derive_h()


@dataclass(frozen=True)
class Statement:
    commitment: int
    context: str


@dataclass(frozen=True)
class Proof:
    t: int
    sv: int
    sr: int


def scalar_ok(x: object) -> bool:
    return type(x) is int and 0 <= x < Q


def group_ok(x: object) -> bool:
    return type(x) is int and 1 <= x < P and pow(x, Q, P) == 1


def context_bytes(context: str) -> bytes:
    if not isinstance(context, str):
        raise ValueError("Contexto deve ser texto.")
    data = context.encode("utf-8")
    if not 1 <= len(data) <= 256:
        raise ValueError("Contexto deve ter de 1 a 256 bytes UTF-8.")
    return data


def commit(value: int, blinding: int) -> int:
    if not scalar_ok(value) or not scalar_ok(blinding):
        raise ValueError("Valor e fator de ocultação devem pertencer a 0..Q-1.")
    return pow(G, value, P) * pow(H, blinding, P) % P


def challenge(statement: Statement, t: int) -> int:
    context = context_bytes(statement.context)
    transcript = bytearray(PROTOCOL.encode("ascii") + b"\x00")
    transcript.extend(len(context).to_bytes(4, "big"))
    transcript.extend(context)
    for x in (P, Q, G, H, statement.commitment, t):
        transcript.extend(x.to_bytes(WIDTH, "big"))
    return int.from_bytes(hashlib.sha256(transcript).digest(), "big") % Q


def prove(value: int, blinding: int, context: str) -> tuple[Statement, Proof]:
    context_bytes(context)
    statement = Statement(commit(value, blinding), context)
    kv, kr = secrets.randbelow(Q), secrets.randbelow(Q)
    t = commit(kv, kr)
    c = challenge(statement, t)
    proof = Proof(t=t, sv=(kv + c * value) % Q, sr=(kr + c * blinding) % Q)
    return statement, proof


def verify(statement: Statement, proof: Proof) -> bool:
    try:
        if not group_ok(statement.commitment) or not group_ok(proof.t):
            return False
        if not scalar_ok(proof.sv) or not scalar_ok(proof.sr):
            return False
        c = challenge(statement, proof.t)
        left = commit(proof.sv, proof.sr)
        right = proof.t * pow(statement.commitment, c, P) % P
        return left == right
    except (ValueError, TypeError, OverflowError, AttributeError):
        return False


def encode(statement: Statement, proof: Proof) -> dict:
    # Não serializa value, blinding, kv ou kr.
    return {"protocol": PROTOCOL,
            "statement": {"commitment": str(statement.commitment), "context": statement.context},
            "proof": {"t": str(proof.t), "sv": str(proof.sv), "sr": str(proof.sr)}}


def parse_integer(value: object) -> int:
    if not isinstance(value, str) or len(value) > 620 or re.fullmatch(r"0|[1-9][0-9]*", value) is None:
        raise ValueError("Use inteiros decimais canônicos como strings.")
    return int(value)


def decode(data: dict) -> tuple[Statement, Proof]:
    if not isinstance(data, dict) or data.get("protocol") != PROTOCOL:
        raise ValueError("Protocolo incompatível.")
    try:
        s, p = data["statement"], data["proof"]
        context_bytes(s["context"])
        statement = Statement(parse_integer(s["commitment"]), s["context"])
        proof = Proof(*(parse_integer(p[name]) for name in ("t", "sv", "sr")))
    except (KeyError, TypeError) as error:
        raise ValueError("JSON de prova incompleto.") from error
    return statement, proof


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    demo = commands.add_parser("demo", help="Prova conhecimento da abertura de uma medida pública de exemplo.")
    demo.add_argument("--value", type=int, default=38)
    demo.add_argument("--context", default=DEFAULT_CONTEXT)
    demo.add_argument("--out", type=Path, default=Path(__file__).parent / "saida" / "proof.json")
    check = commands.add_parser("verify", help="Verifica apenas o arquivo público.")
    check.add_argument("file", type=Path)
    check.add_argument("--context", required=True, help="Contexto esperado, obtido fora da prova.")
    check.add_argument("--commitment", help="Compromisso previamente conhecido, como string decimal.")
    args = parser.parse_args()
    try:
        if args.command == "demo":
            if not 0 <= args.value <= 100:
                raise ValueError("A demonstração usa uma medida inteira de 0 a 100.")
            statement, proof = prove(args.value, secrets.randbelow(Q), args.context)
            args.out.parent.mkdir(parents=True, exist_ok=True)
            args.out.write_text(json.dumps(encode(statement, proof), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            print("Prova válida:", verify(statement, proof))
            print("Arquivo público:", args.out)
            print("A prova demonstra conhecimento da abertura, não o intervalo nem a origem clínica.")
            return 0
        if args.file.stat().st_size > 16384:
            raise ValueError("Arquivo maior que o formato didático permite.")
        statement, proof = decode(json.loads(args.file.read_text(encoding="utf-8")))
        expected = args.commitment is None or statement.commitment == parse_integer(args.commitment)
        valid = expected and statement.context == args.context and verify(statement, proof)
        print("PROVA VALIDA" if valid else "PROVA INVALIDA")
        return 0 if valid else 1
    except (OSError, ValueError, TypeError) as error:
        print("Erro:", error)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
```
<!-- fim-codigo -->

## Testes completos

Os testes cobrem uma prova válida, serialização, mudança de contexto, compromisso,
resposta e nonce, elementos fora do subgrupo, escalares não canônicos e a ausência
de uma garantia de intervalo.

<!-- codigo: zkp/exemplos/schnorr/test_schnorr.py -->
```python
import dataclasses
import json
import secrets
import unittest
from schnorr import (P, Q, G, H, Statement, Proof, commit, prove, verify, encode, decode,
                     group_ok, DEFAULT_CONTEXT)


class SchnorrTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.blinding = secrets.randbelow(Q)
        cls.statement, cls.proof = prove(38, cls.blinding, DEFAULT_CONTEXT)

    def test_group_parameters(self):
        self.assertEqual(P.bit_length(), 2048)
        self.assertEqual(P, 2 * Q + 1)
        self.assertTrue(group_ok(G))
        self.assertTrue(group_ok(H))
        self.assertNotEqual(G, H)

    def test_valid_proof(self):
        self.assertTrue(verify(self.statement, self.proof))

    def test_public_json_roundtrip(self):
        s, p = decode(json.loads(json.dumps(encode(self.statement, self.proof))))
        self.assertTrue(verify(s, p))

    def test_context_tampering(self):
        s = dataclasses.replace(self.statement, context="outro-lote")
        self.assertFalse(verify(s, self.proof))

    def test_commitment_tampering(self):
        s = dataclasses.replace(self.statement, commitment=self.statement.commitment * G % P)
        self.assertFalse(verify(s, self.proof))

    def test_response_tampering(self):
        for name in ("sv", "sr"):
            p = dataclasses.replace(self.proof, **{name: (getattr(self.proof, name) + 1) % Q})
            self.assertFalse(verify(self.statement, p))

    def test_nonce_commitment_tampering(self):
        p = dataclasses.replace(self.proof, t=self.proof.t * G % P)
        self.assertFalse(verify(self.statement, p))

    def test_invalid_subgroup(self):
        for x in (0, P, P - 1, -1):
            self.assertFalse(verify(Statement(x, DEFAULT_CONTEXT), self.proof))
            self.assertFalse(verify(self.statement, dataclasses.replace(self.proof, t=x)))

    def test_noncanonical_scalar(self):
        for x in (-1, Q, self.proof.sv + Q, True):
            self.assertFalse(verify(self.statement, dataclasses.replace(self.proof, sv=x)))

    def test_fresh_proof_for_same_statement(self):
        statement, proof = prove(38, self.blinding, DEFAULT_CONTEXT)
        self.assertEqual(statement, self.statement)
        self.assertNotEqual(proof, self.proof)
        self.assertTrue(verify(statement, proof))

    def test_blinding_changes_commitment(self):
        self.assertNotEqual(commit(38, self.blinding), commit(38, (self.blinding + 1) % Q))

    def test_does_not_claim_range(self):
        statement, proof = prove(999, secrets.randbelow(Q), DEFAULT_CONTEXT)
        self.assertTrue(verify(statement, proof))  # PoK da abertura, não prova de 0..100.

    def test_json_does_not_export_secrets(self):
        data = encode(self.statement, self.proof)
        self.assertEqual(set(data["proof"]), {"t", "sv", "sr"})
        self.assertNotIn("blinding", json.dumps(data))
        self.assertNotIn("value", json.dumps(data))

    def test_malformed_json(self):
        with self.assertRaises(ValueError):
            decode({"protocol": "outro"})
        for bad in ("01", "-1", "1.0", "9" * 621, 1):
            data = encode(self.statement, self.proof)
            data["proof"]["sv"] = bad
            with self.assertRaises(ValueError):
                decode(data)


if __name__ == "__main__":
    unittest.main()
```
<!-- fim-codigo -->

## Limites desta implementação

Os inteiros grandes de Python e `pow` não oferecem a garantia constant-time de uma
biblioteca criptográfica auditada. O código é para estudar a construção e executar
testes, não para substituir uma implementação de produção. Além disso, possuir
uma abertura não certifica origem, identidade, faixa ou significado médico.

[Índice](../README.md) · [Anterior](01-zkp-ou-fhe.md) · [Próximo](03-circom-intervalo.md)
