"""Verifica a consistência da documentação com os arquivos do repositório."""
from __future__ import annotations

import re
import subprocess
import sys
import unittest
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
MARKER = re.compile(
    r"^<!-- codigo: ([^\n]+) -->\n(.*?)^<!-- /codigo -->",
    re.MULTILINE | re.DOTALL,
)


def markdown_files():
    return [
        path for path in ROOT.rglob("*.md")
        if not any(part in {"node_modules", "target", ".git"} for part in path.relative_to(ROOT).parts)
    ]


def prose(text: str) -> str:
    return re.sub(r"^```[^\n]*\n.*?^```[ \t]*$", "", text, flags=re.MULTILINE | re.DOTALL)


class DocumentationTests(unittest.TestCase):
    def test_complete_code_matches_sources(self):
        count = 0
        for document in markdown_files():
            for relative, body in MARKER.findall(document.read_text(encoding="utf-8")):
                source = ROOT / relative
                with self.subTest(document=document.name, source=relative):
                    self.assertTrue(source.is_file())
                    blocks = re.findall(r"^```[^\n]*\n(.*?)^```[ \t]*$", body, re.MULTILINE | re.DOTALL)
                    self.assertEqual(len(blocks), 1)
                    self.assertEqual(blocks[0].rstrip("\n"), source.read_text(encoding="utf-8").rstrip("\n"))
                count += 1
        self.assertGreater(count, 20)

    def test_examples_have_complete_code_in_modules(self):
        documented = set()
        for path in (ROOT / "modulos").glob("*.md"):
            documented.update(relative for relative, _ in MARKER.findall(path.read_text()))
        for path in (ROOT / "exemplos").rglob("*"):
            if not path.is_file() or path.suffix not in {".rs", ".ts", ".sol"}:
                continue
            if any(part in {"node_modules", "target", "types", "artifacts", "cache"} for part in path.parts):
                continue
            relative = path.relative_to(ROOT).as_posix()
            with self.subTest(source=relative):
                # The Hardhat configuration is explained in its own full-file document.
                if path.name == "hardhat.config.ts":
                    self.assertIn(relative, (ROOT / "CONFIGURACAO.md").read_text())
                else:
                    self.assertIn(relative, documented)

    def test_local_links_exist(self):
        for document in markdown_files():
            text = prose(document.read_text(encoding="utf-8"))
            for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", text):
                if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", target):
                    continue
                name, _, anchor = target.partition("#")
                path = (document.parent / unquote(name)).resolve() if name else document
                with self.subTest(document=document.name, target=target):
                    self.assertTrue(path.is_relative_to(ROOT))
                    self.assertTrue(path.exists(), str(path))
                    if not name and document.name == "ROADMAP.md":
                        self.assertIn(f'id="{anchor}"', text)

    def test_each_module_defines_resources(self):
        modules = sorted((ROOT / "modulos").glob("*.md"))
        self.assertEqual(len(modules), 8)
        for module in modules:
            text = module.read_text(encoding="utf-8")
            with self.subTest(module=module.name):
                self.assertIn("## Recursos usados", text)
                self.assertIn("## Referências", text)
                self.assertEqual(len(re.findall(r"^```", text, re.MULTILINE)) % 2, 0)

    def test_markdown_is_synchronized(self):
        result = subprocess.run(
            [sys.executable, str(ROOT / "scripts/sincronizar-docs.py"), "--check"],
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
