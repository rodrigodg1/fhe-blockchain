# Dados de saúde

## Origem

O conjunto **Heart Failure Clinical Records**, da UCI, contém 299 registros.
A variável `ejection_fraction` representa a fração de ejeção, expressa em
percentual. O roadmap usa essa coluna para operações numéricas, sem diagnóstico
ou previsão clínica.

Fonte: [UCI, conjunto 519](https://archive.ics.uci.edu/dataset/519/heart+failure+clinical+records).
DOI: [10.24432/C5Z89R](https://doi.org/10.24432/C5Z89R).
Licença: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Atribuição: *Heart Failure Clinical Records* [Dataset], UCI Machine Learning
Repository, 2020. Referência associada: Davide Chicco e Giuseppe Jurman (2020),
indicada na página do conjunto.

## Arquivos incluídos

| Arquivo | Conteúdo |
|---|---|
| `fonte/heart_failure_primeiros8.csv` | As primeiras oito linhas completas do CSV original |
| `processado/amostra.csv` | Número da linha de origem e fração de ejeção dos quatro primeiros registros |
| `processado/amostra.json` | Valores, origem, hash da fonte e resultados de referência |

Os oito valores são `[20, 38, 20, 20, 20, 40, 15, 60]`. A amostra padrão usa
os quatro primeiros: `[20, 38, 20, 20]`. Os dados já são públicos; cifrá-los não
remove sua disponibilidade na fonte.

O identificador `source_row` é a posição no CSV de origem, não uma identidade
clínica. O SHA-256 permite conferir os bytes da fonte usada, não autentica uma
medição médica. Os valores de referência estão em claro para comparar os cálculos.

## Preparar a amostra

Na raiz do repositório:

```bash
python3 scripts/preparar-dataset.py
```

O [módulo 1](../modulos/01-fhe-e-dados.md) contém o código completo de preparação,
o CSV e o JSON resultantes. O script não preenche valores ausentes: rejeita uma
fonte incompatível com as regras do exemplo.

Para usar o segundo grupo sem substituir a amostra padrão:

```bash
python3 scripts/preparar-dataset.py \
  --inicio 5 --limite 4 --destino dados/grupo2
```

`--inicio` conta linhas de dados a partir de 1. `--limite` define a quantidade.
Rust aceita até 299 registros; os contratos deste repositório exigem quatro.

## Baixar o conjunto completo

Esta etapa é opcional. Os oito registros incluídos bastam para os módulos.
O script abaixo usa `urllib`, `csv` e `hashlib`, da biblioteca padrão do Python.
Ele baixa o CSV oficial, confere 299 registros e compara as primeiras oito linhas
com a fonte incluída. Não substitui um arquivo já existente.


<!-- codigo: scripts/baixar-dataset.py -->
Arquivo: [`scripts/baixar-dataset.py`](../scripts/baixar-dataset.py).

```python
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
```
<!-- /codigo -->

Execute na raiz:

```bash
python3 scripts/baixar-dataset.py
python3 scripts/preparar-dataset.py \
  --fonte dados/original/heart_failure_clinical_records_dataset.csv \
  --inicio 9 --limite 4 --destino dados/grupo3
```

O segundo comando mantém uma amostra de quatro registros, compatível com os
contratos. Para explorar o conjunto completo em Rust:

```bash
python3 scripts/preparar-dataset.py \
  --fonte dados/original/heart_failure_clinical_records_dataset.csv \
  --limite 299 --destino dados/grupo-completo
cargo run --release --manifest-path exemplos/tfhe-rs/Cargo.toml \
  --bin estatisticas -- dados/grupo-completo/amostra.csv
```

Mais registros exigem mais operações FHE. Aumente o tamanho da amostra depois
de executar os exemplos com quatro valores.
