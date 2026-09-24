# TFHE-rs

Este projeto calcula sobre valores cifrados em Rust. A entrada é um CSV com
frações de ejeção extraídas do conjunto Heart Failure Clinical Records.

Leia a [instalação](../../INSTALACAO.md) antes de executar. Os códigos completos
estão nos módulos [2](../../modulos/02-tfhe-rs.md),
[3](../../modulos/03-aritmetica.md), [4](../../modulos/04-comparacao.md) e
[5](../../modulos/05-processos.md).

## Programas

| Arquivo | Operação |
|---|---|
| `src/main.rs` | Soma dos dois primeiros valores |
| `src/bin/estatisticas.rs` | Soma e soma dos quadrados |
| `src/bin/selecionar.rs` | Contagem e soma dos valores acima de um limiar |
| `src/bin/preparar.rs` | Geração de chaves e cifração em arquivos |
| `src/bin/calcular.rs` | Soma sem carregar a chave secreta |
| `src/bin/revelar.rs` | Decifração da soma e cálculo da média |
| `src/lib.rs` | Leitura do CSV e funções de arquivo |

## Executar

Na raiz do repositório:

```bash
export FHE_ROADMAP_ROOT="$PWD"
cargo build --release --manifest-path exemplos/tfhe-rs/Cargo.toml --bins
cargo run --release --manifest-path exemplos/tfhe-rs/Cargo.toml \
  -- dados/processado/amostra.csv
cargo run --release --manifest-path exemplos/tfhe-rs/Cargo.toml \
  --bin estatisticas -- dados/processado/amostra.csv
cargo run --release --manifest-path exemplos/tfhe-rs/Cargo.toml \
  --bin selecionar -- dados/processado/amostra.csv 30
```

A primeira soma deve retornar 58. Para os quatro registros, a soma é 98 e a
soma dos quadrados é 2644. O filtro `> 30` retorna contagem 1 e soma 38.
Média e variância são calculadas em claro após a decifração dos agregados.

Cargo instala TFHE-rs a partir do [Cargo.toml](Cargo.toml). Preserve o
`Cargo.lock` gerado para repetir a instalação. Os exemplos usam os parâmetros
padrão da biblioteca e não são uma implementação clínica.
