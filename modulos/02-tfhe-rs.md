# Módulo 2 — Chaves e soma com TFHE-rs

[Percurso](../README.md) · [Instalação](../INSTALACAO.md)


## Recursos usados

| Recurso | O que é | Por que usar |
|---|---|---|
| Rust | Linguagem compilada | Executar diretamente a biblioteca da Zama |
| Cargo | Gerenciador de projetos e dependências Rust | Compilar e selecionar os executáveis |
| TFHE-rs 1.8.1 | Biblioteca de FHE | Cifrar inteiros, somar e decifrar o resultado |
| `FheUint32` | Inteiro cifrado sem sinal de 32 bits | Manter o mesmo tipo nos cálculos seguintes |

## 1. Veja a estrutura do projeto

```text
exemplos/tfhe-rs/
  Cargo.toml
  src/
    lib.rs
    main.rs
    bin/
      estatisticas.rs
      selecionar.rs
      preparar.rs
      calcular.rs
      revelar.rs
```

`Cargo.toml` declara as dependências. `main.rs` é o programa padrão;
`lib.rs` contém funções compartilhadas. Os demais arquivos são executáveis
selecionados com `--bin`.

### Cargo.toml completo

<!-- codigo: exemplos/tfhe-rs/Cargo.toml -->
Arquivo: [`exemplos/tfhe-rs/Cargo.toml`](../exemplos/tfhe-rs/Cargo.toml).

```toml
[package]
name = "fhe-healthcare"
version = "0.4.0"
edition = "2021"
default-run = "fhe-healthcare"
publish = false

[dependencies]
tfhe = { version = "=1.8.1", features = ["integer"] }
```
<!-- /codigo -->

A feature `integer` habilita a API de inteiros. O sinal `=` fixa TFHE-rs em 1.8.1.
Cargo cria um `Cargo.lock` na primeira resolução das dependências.

## 2. Leia o programa de soma

O programa lê a amostra do módulo 1, cifra seus dois primeiros valores e soma
`20 + 38`. A função de cálculo recebe somente valores cifrados.

### main.rs completo

<!-- codigo: exemplos/tfhe-rs/src/main.rs -->
Arquivo: [`exemplos/tfhe-rs/src/main.rs`](../exemplos/tfhe-rs/src/main.rs).

```rust
use std::error::Error;
use std::path::Path;

use fhe_healthcare::ler_amostra;
use tfhe::prelude::*;
use tfhe::{generate_keys, set_server_key, ConfigBuilder, FheUint32};

// Esta funcao recebe apenas valores cifrados.
fn somar_no_servidor(a: &FheUint32, b: &FheUint32) -> FheUint32 {
    a + b
}

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 2 {
        return Err("Uso: fhe-healthcare AMOSTRA.csv".into());
    }
    let valores = ler_amostra(Path::new(&args[1]))?;
    if valores.len() < 2 {
        return Err("Use pelo menos dois registros".into());
    }

    // Cliente: gerar as chaves e cifrar os dois primeiros valores.
    let config = ConfigBuilder::default().build();
    let (chave_cliente, chave_avaliacao) = generate_keys(config);
    let a = FheUint32::try_encrypt(valores[0], &chave_cliente)?;
    let b = FheUint32::try_encrypt(valores[1], &chave_cliente)?;

    // Servidor: calcular sem usar a chave de decifracao.
    set_server_key(chave_avaliacao);
    let resultado = somar_no_servidor(&a, &b);

    // Cliente: recuperar a soma e comparar com o calculo em claro.
    let soma: u32 = resultado.decrypt(&chave_cliente);
    assert_eq!(soma, valores[0] + valores[1]);
    println!("Soma dos dois primeiros valores: {soma}");
    Ok(())
}
```
<!-- /codigo -->

### Como o programa funciona

`use` importa nomes. `tfhe::prelude::*` traz os traits necessários para métodos
como cifrar e decifrar. Um trait descreve operações que um tipo implementa.

`ConfigBuilder::default().build()` usa a configuração padrão. `generate_keys`
cria a chave do cliente e a chave de avaliação. `try_encrypt` cifra cada inteiro;
`set_server_key` configura a chave de avaliação no contexto de execução.

`somar_no_servidor` aplica `+` a dois `FheUint32`. O retorno continua cifrado.
`decrypt` recupera um `u32` usando a chave do cliente. `assert_eq!` compara esse
resultado com a soma conhecida da amostra.

`&a` empresta uma referência a `a`; não copia o objeto inteiro. `?` devolve ao
chamador um erro ocorrido na operação. `Result<(), Box<dyn Error>>` indica que
`main` termina sem valor ou com um erro.

Cliente e servidor ainda são etapas do mesmo processo. Separá-los em executáveis
será o assunto do módulo 5.

## 3. Conheça o código compartilhado

O import `fhe_healthcare::ler_amostra` vem do arquivo completo abaixo.
Além de ler o CSV, ele reúne os auxiliares de arquivo usados no módulo 5.

### lib.rs completo

<!-- codigo: exemplos/tfhe-rs/src/lib.rs -->
Arquivo: [`exemplos/tfhe-rs/src/lib.rs`](../exemplos/tfhe-rs/src/lib.rs).

```rust
//! Le CSV e arquivos da mesma geracao de chaves.
//! Nao aceita com seguranca arquivos arbitrarios de terceiros.
use std::collections::HashSet;
use std::fs::{self, File, OpenOptions};
use std::io::{self, BufReader};
use std::path::Path;

pub const LIMITE_CHAVE: u64 = 1 << 30;
pub const LIMITE_CIPHERTEXT: u64 = 1 << 26;
pub const MAX_REGISTROS: usize = 299;

pub fn novo_arquivo(path: &Path) -> io::Result<File> {
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)] {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    options.open(path)
}

pub fn abrir_limitado(path: &Path, limite: u64) -> io::Result<BufReader<File>> {
    let file = File::open(path)?;
    if file.metadata()?.len() > limite {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "Arquivo excede o limite"));
    }
    Ok(BufReader::new(file))
}

pub fn ler_amostra(path: &Path) -> Result<Vec<u32>, Box<dyn std::error::Error>> {
    if fs::metadata(path)?.len() > 1_000_000 {
        return Err("CSV excede o limite".into());
    }
    let text = fs::read_to_string(path)?;
    let mut lines = text.lines();
    if lines.next().map(str::trim) != Some("source_row,ejection_fraction") {
        return Err("Use o CSV gerado por scripts/preparar-dataset.py".into());
    }
    let mut values = Vec::new();
    let mut seen = HashSet::new();
    for line in lines {
        let fields: Vec<&str> = line.split(',').collect();
        if fields.len() != 2 { return Err("Linha CSV invalida".into()); }
        let id: u32 = fields[0].trim().parse()?;
        let value: u32 = fields[1].trim().parse()?;
        if id == 0 || !seen.insert(id) || value > 100 {
            return Err("Linha invalida, duplicada ou percentual fora de 0..100".into());
        }
        values.push(value);
    }
    if values.is_empty() || values.len() > MAX_REGISTROS {
        return Err("Use entre 1 e 299 registros".into());
    }
    Ok(values)
}
```
<!-- /codigo -->

`ler_amostra` verifica o cabeçalho, linhas repetidas, tamanho da amostra e intervalo
dos percentuais. Ela retorna os valores em `Vec<u32>`, um vetor de inteiros em claro.
A cifração só acontece depois, em `main`.

Os auxiliares de arquivo limitam o tamanho da leitura e evitam sobrescrita. Os
limites são limites de entrada e saída, não parâmetros de segurança criptográfica.

## 4. Execute

```bash
cd "$FHE_ROADMAP_ROOT"
cargo run --release --manifest-path exemplos/tfhe-rs/Cargo.toml \
  -- dados/processado/amostra.csv
```

Saída esperada:

```text
Soma dos dois primeiros valores: 58
```

Para usar o segundo recorte preparado no módulo 1:

```bash
cargo run --release --manifest-path exemplos/tfhe-rs/Cargo.toml \
  -- dados/grupo2/amostra.csv
```

Agora os dois primeiros valores são `20` e `40`; a soma deve ser `60`.
A lógica FHE é a mesma. Apenas o arquivo de entrada mudou.

## Referências

[TFHE-rs — primeiros passos](https://docs.zama.org/tfhe-rs/get-started/quick-start) · [Geração de chaves](https://docs.zama.org/tfhe-rs/fhe-computation/compute/configure-and-generate-keys) · [Livro Rust](https://doc.rust-lang.org/book/)
