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
