#!/usr/bin/env python3
"""Baixa o CSV completo da UCI e confere o recorte incluido no pacote."""
from __future__ import annotations
import csv
import io
import hashlib
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
URL = "https://archive.ics.uci.edu/ml/machine-learning-databases/00519/heart_failure_clinical_records_dataset.csv"
DESTINO = ROOT / "dados/original/heart_failure_clinical_records_dataset.csv"
MAX_BYTES = 1_000_000

def main() -> None:
    if DESTINO.exists():
        raise ValueError("Arquivo existente; download cancelado")
    request = urllib.request.Request(URL, headers={"User-Agent": "fhe-healthcare-roadmap/2.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        raw = response.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ValueError("Resposta excede o limite de tamanho")
    rows = list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))
    if len(rows) != 299:
        raise ValueError("Esperados 299 registros")
    with (ROOT / "dados/fonte/heart_failure_primeiros8.csv").open(encoding="utf-8", newline="") as handle:
        supplied = list(csv.DictReader(handle))
    if rows[:8] != supplied:
        raise ValueError("As oito primeiras linhas diferem do recorte")
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    with DESTINO.open("xb") as handle:
        handle.write(raw)
    meta = {"source_url": URL, "sha256": hashlib.sha256(raw).hexdigest(), "records": len(rows)}
    DESTINO.with_suffix(".metadata.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print("CSV salvo; recorte conferido:", DESTINO)
    print("SHA-256:", meta["sha256"])

if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, urllib.error.URLError) as exc:
        print(f"Falha no download: {exc}", file=sys.stderr)
        raise SystemExit(1)
