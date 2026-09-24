#!/usr/bin/env python3
"""Seleciona ejection_fraction do CSV da UCI, sem preencher ausencias."""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
from decimal import Decimal, InvalidOperation
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FONTE = ROOT / "dados/fonte/heart_failure_primeiros8.csv"
COLUNA = "ejection_fraction"
LIMITE_REGISTROS = 299

def ler_fonte(path: Path) -> list[dict[str, int]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or COLUNA not in reader.fieldnames:
            raise ValueError("CSV sem a coluna ejection_fraction")
        result = []
        for source_row, row in enumerate(reader, 1):
            value = (row.get(COLUNA) or "").strip()
            try:
                decimal = Decimal(value)
            except InvalidOperation as exc:
                raise ValueError(f"Linha {source_row}: percentual ausente ou invalido") from exc
            if not decimal.is_finite() or decimal != decimal.to_integral_value():
                raise ValueError(f"Linha {source_row}: percentual deve ser inteiro")
            if not 0 <= decimal <= 100:
                raise ValueError(f"Linha {source_row}: percentual fora de 0..100")
            result.append({"source_row": source_row, COLUNA: int(decimal)})
        if not 1 <= len(result) <= LIMITE_REGISTROS:
            raise ValueError("Use de 1 a 299 registros")
        return result

def gerar(fonte: Path, destino: Path, limite: int = 4, inicio: int = 1) -> dict:
    registros = ler_fonte(fonte)
    if inicio < 1 or limite < 2 or inicio + limite - 1 > len(registros):
        raise ValueError("Selecione pelo menos duas linhas existentes")
    selected = registros[inicio - 1:inicio - 1 + limite]
    values = [r[COLUNA] for r in selected]
    info = {
        "dataset": "Heart Failure Clinical Records",
        "dataset_id": 519,
        "dataset_doi": "10.24432/C5Z89R",
        "source_url": "https://archive.ics.uci.edu/ml/machine-learning-databases/00519/heart_failure_clinical_records_dataset.csv",
        "license": "CC BY 4.0",
        "source_sha256": hashlib.sha256(fonte.read_bytes()).hexdigest(),
        "source_records_available": len(registros),
        "variable": COLUNA,
        "unit": "%",
        "source_rows": [r["source_row"] for r in selected],
        "values": values,
        "count": len(values),
        "sum": sum(values),
        "mean": sum(values) / len(values),
        "sum_squares": sum(v * v for v in values),
        "population_variance": sum(v * v for v in values) / len(values) - (sum(values) / len(values)) ** 2,
        "public_reference_only": True,
    }
    destino.mkdir(parents=True, exist_ok=True)
    with (destino / "amostra.csv").open("w", encoding="utf-8", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=["source_row", COLUNA], lineterminator="\n")
        writer.writeheader()
        writer.writerows(selected)
    (destino / "amostra.json").write_text(json.dumps(info, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return info

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fonte", type=Path, default=FONTE)
    parser.add_argument("--destino", type=Path, default=ROOT / "dados/processado")
    parser.add_argument("--limite", type=int, default=4)
    parser.add_argument("--inicio", type=int, default=1, help="Posicao do primeiro registro, sem cabecalho")
    args = parser.parse_args()
    try:
        info = gerar(args.fonte, args.destino, args.limite, args.inicio)
    except (OSError, ValueError) as exc:
        parser.exit(1, f"Erro: {exc}\n")
    print(f"Registros: {info['count']}")
    print(f"Soma: {info['sum']}")
    print(f"Media (%): {info['mean']:.2f}")
    print("Dados publicos da UCI. Sem uso clinico.")

if __name__ == "__main__":
    main()
