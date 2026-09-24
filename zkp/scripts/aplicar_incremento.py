#!/usr/bin/env python3
"""Copia somente arquivos novos; simula por padrão e aborta se houver conflito."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil


def sha256(file: Path) -> str:
    return hashlib.sha256(file.read_bytes()).hexdigest()


def safe_relative(name: str) -> Path:
    p = PurePosixPath(name)
    if p.is_absolute() or ".." in p.parts or "\\" in name:
        raise ValueError("Caminho inseguro: " + name)
    if name != "ZKP.md" and (not p.parts or p.parts[0] != "zkp"):
        raise ValueError("Arquivo fora dos dois caminhos novos permitidos: " + name)
    return Path(*p.parts)


def payload(source_root: Path) -> list[Path]:
    source_root = source_root.resolve()
    manifest = json.loads((source_root / "zkp/MANIFESTO.json").read_text(encoding="utf-8"))
    names = manifest["files"]
    if len(names) != len(set(names)):
        raise ValueError("Manifesto com caminhos duplicados.")
    checksums = {}
    for line in (source_root / "zkp/SHA256SUMS.txt").read_text(encoding="utf-8").splitlines():
        digest, name = line.split("  ", 1)
        checksums[name] = digest
    expected = set(names) - {"zkp/SHA256SUMS.txt"}
    if set(checksums) != expected:
        raise ValueError("A lista de checksums não corresponde ao manifesto.")
    files = []
    for name in names:
        relative = safe_relative(name)
        source = source_root / relative
        if not source.resolve().is_relative_to(source_root) or source.is_symlink() or not source.is_file():
            raise ValueError("Origem inválida: " + name)
        if name != "zkp/SHA256SUMS.txt" and sha256(source) != checksums[name]:
            raise ValueError("Checksum diferente: " + name)
        files.append(relative)
    return files


def apply(source_root: Path, destination_root: Path, *, write: bool = False) -> tuple[int, int]:
    source_root, destination_root = source_root.resolve(), destination_root.resolve()
    if not (destination_root / "README.md").is_file() or not (destination_root / "dados/processado/amostra.json").is_file():
        raise ValueError("O destino deve ser a raiz do repositório existente, com README.md e dados/processado/amostra.json.")
    files = payload(source_root)
    pending, unchanged = [], 0
    # Todos os conflitos são verificados antes de escrever o primeiro arquivo.
    for relative in files:
        target = destination_root / relative
        for parent in [target, *target.parents]:
            if parent == destination_root:
                break
            if parent.is_symlink():
                raise ValueError("Destino contém link simbólico: " + str(parent))
            if parent != target and parent.exists() and not parent.is_dir():
                raise ValueError("Pasta de destino ocupada por arquivo: " + str(parent))
        if not target.resolve().is_relative_to(destination_root):
            raise ValueError("Destino fora do repositório.")
        if target.exists():
            if not target.is_file() or sha256(target) != sha256(source_root / relative):
                raise ValueError("CONFLITO: " + str(relative) + ". Nada foi sobrescrito.")
            unchanged += 1
        else:
            pending.append(relative)
    if write:
        for relative in pending:
            source, target = source_root / relative, destination_root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            # O modo exclusivo também impede sobrescrita se surgir um arquivo após a simulação.
            with source.open("rb") as origin, target.open("xb") as dest:
                shutil.copyfileobj(origin, dest)
    return len(pending), unchanged


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destino", type=Path)
    parser.add_argument("--aplicar", action="store_true", help="Copia os arquivos após todas as verificações.")
    args = parser.parse_args()
    source = Path(__file__).resolve().parents[2]
    try:
        new, same = apply(source, args.destino, write=args.aplicar)
        print(("Aplicado" if args.aplicar else "Simulação") + f": {new} arquivos novos; {same} já idênticos.")
        print("Nenhum arquivo anterior foi alterado ou removido.")
        return 0
    except (OSError, ValueError, KeyError) as error:
        print("Erro:", error)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
