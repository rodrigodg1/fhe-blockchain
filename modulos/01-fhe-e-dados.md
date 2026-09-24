# Módulo 1 — FHE e dados de saúde

[Percurso](../README.md) · [Instalação](../INSTALACAO.md)


## Recursos usados

| Recurso | O que é | Por que usar |
|---|---|---|
| FHE | Criptografia que permite calcular sobre valores cifrados | Entender o fluxo que será programado |
| UCI Heart Failure Clinical Records | Dataset público de saúde | Usar observações reais e reproduzir o mesmo cálculo |
| Python e sua biblioteca padrão | Ferramentas para ler CSV, validar e escrever JSON | Preparar entradas sem instalar pacotes adicionais |

## 1. Entenda o fluxo

FHE significa *Fully Homomorphic Encryption*. O programa cifra os dados, executa
operações compatíveis sobre os ciphertexts e produz outro ciphertext.
A decifração recupera o resultado do cálculo.

```text
Valores em claro -> cifração -> operações FHE -> resultado cifrado -> decifração
```

Um **plaintext** é um valor em claro. Um **ciphertext** é sua representação cifrada.
A **chave de avaliação** permite executar operações; a **chave secreta** permite
decifrar. Não são a mesma chave. Esses papéis aparecem diretamente no módulo 2.

Usaremos duas camadas: TFHE-rs executa FHE em Rust; FHEVM permite expressar
operações cifradas em contratos Solidity. O programa Rust não será convertido
ou implantado como contrato.

## 2. Conheça os dados

A UCI descreve 299 registros no **Heart Failure Clinical Records**. Vamos usar
`ejection_fraction`, a porcentagem de sangue expelido a cada contração cardíaca,
conforme o dicionário do dataset. A licença e a procedência estão em
[dados/README.md](../dados/README.md).

O pacote inclui as oito primeiras linhas. A amostra padrão seleciona as quatro primeiras:

```text
Valores (%): 20, 38, 20, 20
Soma: 98
Quantidade: 4
Média (%): 24,5
```

O limiar `30`, usado adiante, é um parâmetro de comparação numérica. Não estamos
construindo um classificador ou uma regra clínica.

## 3. Prepare os arquivos

Após seguir [a instalação](../INSTALACAO.md), execute na raiz:

```bash
cd "$FHE_ROADMAP_ROOT"
python3 scripts/preparar-dataset.py
```

O script lê o CSV, seleciona linhas, valida os valores e grava dois formatos:
CSV para Rust e JSON para TypeScript. Os números não são arredondados ou substituídos.
A preparação recusa percentuais ausentes, não inteiros ou fora de `0..100`.

### Código completo da preparação

<!-- codigo: scripts/preparar-dataset.py -->
Arquivo: [`scripts/preparar-dataset.py`](../scripts/preparar-dataset.py).

```python
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
```
<!-- /codigo -->

`csv.DictReader` associa cada coluna ao seu nome. `Decimal` permite verificar
se o texto é um inteiro sem introduzir arredondamento de ponto flutuante.
`source_row` registra a posição no CSV; não representa uma pessoa identificada.
O SHA-256 identifica os bytes da fonte usada, não prova a veracidade de uma medição.

### CSV resultante

<!-- codigo: dados/processado/amostra.csv -->
Arquivo: [`dados/processado/amostra.csv`](../dados/processado/amostra.csv).

```csv
source_row,ejection_fraction
1,20
2,38
3,20
4,20
```
<!-- /codigo -->

O cabeçalho contém os nomes das colunas. Cada linha contém o número da linha de
origem e o percentual que será cifrado.

### JSON resultante

<!-- codigo: dados/processado/amostra.json -->
Arquivo: [`dados/processado/amostra.json`](../dados/processado/amostra.json).

```json
{
  "dataset": "Heart Failure Clinical Records",
  "dataset_id": 519,
  "dataset_doi": "10.24432/C5Z89R",
  "source_url": "https://archive.ics.uci.edu/ml/machine-learning-databases/00519/heart_failure_clinical_records_dataset.csv",
  "license": "CC BY 4.0",
  "source_sha256": "249a5673585edef9d66da2049f58ce9b2a93b09307de55693bf8fce10b2af9f4",
  "source_records_available": 8,
  "variable": "ejection_fraction",
  "unit": "%",
  "source_rows": [
    1,
    2,
    3,
    4
  ],
  "values": [
    20,
    38,
    20,
    20
  ],
  "count": 4,
  "sum": 98,
  "mean": 24.5,
  "sum_squares": 2644,
  "population_variance": 60.75,
  "public_reference_only": true
}
```
<!-- /codigo -->

Os campos `sum`, `mean` e `sum_squares` são referências em claro para os testes.
Eles não são resultados de uma execução FHE. Os exemplos recalculam as operações
para comparar o valor decifrado com essa referência.

## 4. Use outro recorte

```bash
cd "$FHE_ROADMAP_ROOT"
python3 scripts/preparar-dataset.py \
  --inicio 5 --limite 4 --destino dados/grupo2
```

Isso cria outra amostra, sem alterar a padrão: `[20, 40, 15, 60]`, soma `135`
e média `33,75%`. `--inicio` conta os registros a partir de 1, sem o cabeçalho.
O download opcional da fonte completa está em [dados/README.md](../dados/README.md).

Os dados de origem já são públicos. Cifrá-los neste exercício não desfaz essa
publicação; permite observar como as operações seriam feitas sobre ciphertexts.

## Referências

[UCI — dataset](https://archive.ics.uci.edu/dataset/519/heart+failure+clinical+records) · [TFHE-rs — fluxo de cálculo](https://docs.zama.org/tfhe-rs/get-started/quick-start) · [Zama — biblioteca FHE](https://docs.zama.org/protocol/protocol/overview/library)
