#!/usr/bin/env python3
"""Confere caminhos e hashes do pacote."""
from pathlib import Path
import hashlib
import sys

root = Path(__file__).resolve().parents[1]
manifesto = root / "SHA256SUMS.txt"
def main():
    if not manifesto.exists():
        raise ValueError("SHA256SUMS.txt ausente")
    count = 0
    for line in manifesto.read_text(encoding="utf-8").splitlines():
        expected, relative = line.split("  ", 1)
        path = root / relative
        if path.is_symlink() or root not in path.resolve().parents or not path.is_file():
            raise ValueError(f"Caminho invalido: {relative}")
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != expected: raise ValueError(f"Arquivo alterado: {relative}")
        count += 1
    print(f"Integridade verificada: {count} arquivos + manifesto")
    print("Nao compila nem executa FHE.")
if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError) as exc:
        print(f"Falha: {exc}", file=sys.stderr)
        raise SystemExit(1)
