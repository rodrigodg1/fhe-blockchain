#!/usr/bin/env python3
"""Atualiza blocos de código e reúne o roadmap em Markdown."""
from __future__ import annotations

import argparse
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARKER = re.compile(
    r"^<!-- codigo: ([^\n]+) -->\n.*?^<!-- /codigo -->",
    re.MULTILINE | re.DOTALL,
)
LANGUAGES = {
    ".rs": "rust", ".sol": "solidity", ".ts": "typescript",
    ".py": "python", ".json": "json", ".toml": "toml",
    ".csv": "csv", ".sh": "bash",
}
PARTS = [
    ("instalacao", "INSTALACAO.md"),
    ("configuracao", "CONFIGURACAO.md"),
    ("modulo-01", "modulos/01-fhe-e-dados.md"),
    ("modulo-02", "modulos/02-tfhe-rs.md"),
    ("modulo-03", "modulos/03-aritmetica.md"),
    ("modulo-04", "modulos/04-comparacao.md"),
    ("modulo-05", "modulos/05-processos.md"),
    ("modulo-06", "modulos/06-solidity.md"),
    ("modulo-07", "modulos/07-fhevm.md"),
    ("modulo-08", "modulos/08-experimentos.md"),
]


def source_path(relative: str) -> Path:
    path = (ROOT / relative).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        raise ValueError(f"Arquivo de código inválido: {relative}")
    return path


def expand(document: Path, text: str) -> str:
    def replace(match: re.Match[str]) -> str:
        relative = match.group(1)
        source = source_path(relative)
        language = LANGUAGES.get(source.suffix, "text")
        body = source.read_text(encoding="utf-8").rstrip("\n")
        link = Path(os.path.relpath(source, document.parent)).as_posix()
        return (
            f"<!-- codigo: {relative} -->\n"
            f"Arquivo: [`{relative}`]({link}).\n\n"
            f"```{language}\n{body}\n```\n"
            "<!-- /codigo -->"
        )
    return MARKER.sub(replace, text)


def rebase(text: str, document: Path) -> str:
    """Ajusta títulos e links fora de blocos de código para a raiz."""
    lines: list[str] = []
    in_code = False
    for line in text.splitlines():
        if line.startswith("```"):
            in_code = not in_code
            lines.append(line)
            continue
        if not in_code:
            if re.match(r"^#{1,5} ", line):
                line = "#" + line

            def link(match: re.Match[str]) -> str:
                target = match.group(2)
                if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", target) or target.startswith("#"):
                    return match.group(0)
                local, sep, anchor = target.partition("#")
                full = (document.parent / local).resolve()
                if not full.is_relative_to(ROOT):
                    raise ValueError(f"Link fora do repositório: {target}")
                new_target = full.relative_to(ROOT).as_posix()
                if sep:
                    new_target += "#" + anchor
                return f"[{match.group(1)}]({new_target})"

            line = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", link, line)
        lines.append(line)
    if in_code:
        raise ValueError(f"Bloco de código aberto: {document}")
    return "\n".join(lines).rstrip() + "\n"


def compile_roadmap(contents: dict[Path, str]) -> str:
    result = [
        "# FHE aplicada a dados de saúde\n",
        "[Início](README.md) · [Referências](REFERENCIAS.md) · [Verificações](VALIDACAO.md) · [Extensão ZKP](ZKP.md)\n",
        "Este arquivo reúne a instalação, a configuração e os oito módulos. "
        "Os mesmos textos estão disponíveis em arquivos separados. "
        "Os blocos mostram o código completo dos arquivos usados em cada etapa.\n",
        "## Percurso\n",
    ]
    for anchor, relative in PARTS:
        title = contents[ROOT / relative].splitlines()[0].lstrip("# ")
        result.append(f"- [{title}](#{anchor})")
    result.append("")
    for anchor, relative in PARTS:
        path = ROOT / relative
        result.extend([
            "---\n", f'<a id="{anchor}"></a>\n',
            rebase(contents[path], path),
        ])
    return "\n".join(result).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verificar sem escrever")
    args = parser.parse_args()
    contents: dict[Path, str] = {}
    for path in sorted(ROOT.rglob("*.md")):
        if path == ROOT / "ROADMAP.md":
            continue
        if any(part in {"node_modules", "target", ".git", "zkp"} for part in path.relative_to(ROOT).parts):
            continue
        contents[path] = expand(path, path.read_text(encoding="utf-8"))
    contents[ROOT / "ROADMAP.md"] = compile_roadmap(contents)
    changed = []
    for path, text in contents.items():
        if not path.exists() or path.read_text(encoding="utf-8") != text:
            changed.append(path.relative_to(ROOT).as_posix())
            if not args.check:
                path.write_text(text, encoding="utf-8")
    if args.check and changed:
        print("Documentos desatualizados:\n" + "\n".join(changed))
        return 1
    print("Markdown sincronizado." if not args.check else "Markdown confere com os arquivos.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError) as error:
        raise SystemExit(f"Erro: {error}") from error
