#!/usr/bin/env python3
"""Verifica sintaxe Python/JavaScript, JSON e cópias integrais em Markdown. Não compila Circom/Solidity."""
from pathlib import Path
import ast
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
EXCLUDED = {"node_modules", "build", "artifacts", "cache", "__pycache__"}
counts = {"Python": 0, "JavaScript": 0, "JSON": 0}
for file in sorted((ROOT / "zkp").rglob("*")):
    if not file.is_file() or any(x in EXCLUDED for x in file.relative_to(ROOT).parts):
        continue
    if file.suffix == ".py":
        ast.parse(file.read_text(encoding="utf-8"), filename=str(file))
        counts["Python"] += 1
    elif file.suffix == ".cjs":
        subprocess.run(["node", "--check", str(file)], check=True)
        counts["JavaScript"] += 1
    elif file.suffix == ".json":
        json.loads(file.read_text(encoding="utf-8"))
        counts["JSON"] += 1
subprocess.run([sys.executable, str(ROOT / "zkp/scripts/documentar.py"), "--check"], check=True)
print("Sintaxe e formatos conferidos:", counts)
print("Circom, snarkjs e Solidity exigem os comandos de integração descritos em zkp/VALIDACAO.md.")
