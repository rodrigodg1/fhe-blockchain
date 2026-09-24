import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type QuatroValores = [number, number, number, number];

export interface Amostra {
  dataset_id: number;
  variable: string;
  values: QuatroValores;
  source_rows: number[];
  count: number;
  sum: number;
  mean: number;
}

export function carregarAmostra(): Amostra {
  const path = process.env.HEALTHCARE_DATASET ??
    resolve(__dirname, "../../../dados/processado/amostra.json");
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (typeof raw !== "object" || raw === null) throw new Error("Amostra invalida");
  const item = raw as Amostra;
  if (item.dataset_id !== 519 || item.variable !== "ejection_fraction") {
    throw new Error("Use o dataset UCI 519 e a coluna ejection_fraction");
  }
  if (!Array.isArray(item.values) || item.values.length !== 4 ||
      !item.values.every(v => Number.isInteger(v) && v >= 0 && v <= 100)) {
    throw new Error("O contrato usa quatro percentuais inteiros em 0..100");
  }
  if (!Array.isArray(item.source_rows) || item.source_rows.length !== 4 ||
      !item.source_rows.every(v => Number.isInteger(v) && v >= 1 && v <= 299) ||
      new Set(item.source_rows).size !== 4) throw new Error("Linhas invalidas");
  const sum = item.values.reduce((a, b) => a + b, 0);
  if (item.count !== 4 || item.sum !== sum || item.mean !== sum / 4) {
    throw new Error("Resultados de referencia inconsistentes");
  }
  return item;
}

export function referencia(values: number[], threshold: number): bigint[] {
  return [
    BigInt(values.reduce((a, b) => a + b, 0)),
    BigInt(values.reduce((a, b) => a + b * b, 0)),
    BigInt(values.filter(v => v > threshold).length),
    BigInt(values.filter(v => v > threshold).reduce((a, b) => a + b, 0)),
  ];
}
