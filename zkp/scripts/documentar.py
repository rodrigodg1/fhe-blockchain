#!/usr/bin/env python3
"""Sincroniza apenas os blocos de código integral dentro dos novos arquivos Markdown."""
from __future__ import annotations
import argparse
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
BLOCK = re.compile(r"(<!-- codigo: ([^\n]+) -->\n```[^\n]*\n)(.*?)(```\n<!-- fim-codigo -->)", re.DOTALL)


def process(check: bool) -> int:
    count, mismatches = 0, []
    for file in sorted((ROOT / "zkp").rglob("*.md")):
        if any(p in {"node_modules", "build", "artifacts", "cache"} for p in file.relative_to(ROOT).parts):
            continue
        original = file.read_text(encoding="utf-8")
        def replace(match):
            nonlocal count
            source = (ROOT / match.group(2)).resolve()
            if not source.is_relative_to(ROOT / "zkp"):
                raise ValueError("Bloco fora da nova documentação: " + str(source))
            content = source.read_text(encoding="utf-8").rstrip("\n") + "\n"
            count += 1
            if content != match.group(3):
                mismatches.append(str(file.relative_to(ROOT)) + " -> " + match.group(2))
            return match.group(1) + content + match.group(4)
        updated = BLOCK.sub(replace, original)
        if not check and updated != original:
            file.write_text(updated, encoding="utf-8")
    if check and mismatches:
        print("Blocos diferentes dos fontes:\n" + "\n".join(mismatches))
        return 1
    print(f"{count} blocos integrais conferidos" + ("." if check else " e sincronizados."))
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    raise SystemExit(process(parser.parse_args().check))
