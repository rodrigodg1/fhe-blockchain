# Módulo 3 — Soma, multiplicação e estatísticas

[Percurso](../README.md) · [Instalação](../INSTALACAO.md)


## Recursos usados

| Recurso | O que é | Por que usar |
|---|---|---|
| TFHE-rs e `FheUint32` | Biblioteca e tipo cifrado | Calcular soma e soma dos quadrados |
| `Instant`, da biblioteca padrão Rust | Relógio para medir intervalos | Separar tempo de chaves, cifração e operações |
| `safe_serialize` | Conversão de um objeto FHE em bytes com limite | Observar o tamanho de um resultado cifrado |
| `f64` | Número em ponto flutuante em claro | Calcular média e variância depois da decifração |

## 1. Separe operações cifradas e operações em claro

Para valores `x₁, ..., xₙ`, o programa calcula sob FHE:

```text
S = x₁ + ... + xₙ
Q = x₁² + ... + xₙ²
```

Depois de recuperar `S` e `Q`, calcula em claro:

```text
média = S / n
variância populacional = Q / n - média²
```

Assim, quem lê a saída recebe as somas, não apenas a média. A divisão não é
homomórfica neste exemplo; separar as etapas permite ver exatamente o que foi cifrado.

## 2. Leia o código completo

<!-- codigo: exemplos/tfhe-rs/src/bin/estatisticas.rs -->
Arquivo: [`exemplos/tfhe-rs/src/bin/estatisticas.rs`](../exemplos/tfhe-rs/src/bin/estatisticas.rs).

```rust
use std::error::Error;
use std::path::Path;
use std::time::Instant;
use tfhe::prelude::*;
use tfhe::safe_serialization::safe_serialize;
use tfhe::{generate_keys, set_server_key, ConfigBuilder, FheUint32};
use fhe_healthcare::{ler_amostra, LIMITE_CIPHERTEXT};

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 2 { return Err("Uso: estatisticas AMOSTRA.csv".into()); }
    let valores = ler_amostra(Path::new(&args[1]))?;
    let inicio = Instant::now();
    let (chave_cliente, chave_avaliacao) = generate_keys(ConfigBuilder::default().build());
    let tempo_chaves = inicio.elapsed();
    let inicio = Instant::now();
    let cifradas: Vec<FheUint32> = valores.iter()
        .map(|&v| FheUint32::try_encrypt(v, &chave_cliente))
        .collect::<Result<_, _>>()?;
    let tempo_cifracao = inicio.elapsed();
    set_server_key(chave_avaliacao);

    let inicio = Instant::now();
    let mut soma = cifradas[0].clone();
    for valor in &cifradas[1..] { soma = &soma + valor; }
    let tempo_soma = inicio.elapsed();

    let inicio = Instant::now();
    let mut quadrados = &cifradas[0] * &cifradas[0];
    for valor in &cifradas[1..] { quadrados = &quadrados + &(valor * valor); }
    let tempo_quadrados = inicio.elapsed();

    let inicio = Instant::now();
    let total: u32 = soma.decrypt(&chave_cliente);
    let total_quadrados: u32 = quadrados.decrypt(&chave_cliente);
    let tempo_decifracao = inicio.elapsed();
    assert_eq!(total, valores.iter().sum::<u32>());
    assert_eq!(total_quadrados, valores.iter().map(|v| v * v).sum::<u32>());

    // A divisao e feita em claro, depois da decifracao.
    let n = valores.len() as f64;
    let media = f64::from(total) / n;
    let variancia = f64::from(total_quadrados) / n - media * media;
    let inicio = Instant::now();
    let mut bytes = Vec::new();
    safe_serialize(&soma, &mut bytes, LIMITE_CIPHERTEXT)?;
    let tempo_serializacao = inicio.elapsed();

    println!("Registros: {}", valores.len());
    println!("Soma: {total}");
    println!("Soma dos quadrados: {total_quadrados}");
    println!("Media (%): {media:.2}");
    println!("Variancia populacional (p.p.^2): {variancia:.2}");
    println!("Chaves: {tempo_chaves:?}");
    println!("Cifracao: {tempo_cifracao:?}");
    println!("Soma: {tempo_soma:?}");
    println!("Quadrados e soma: {tempo_quadrados:?}");
    println!("Decifracao: {tempo_decifracao:?}");
    println!("Serializacao da soma: {tempo_serializacao:?}");
    println!("Soma serializada: {} bytes", bytes.len());
    Ok(())
}
```
<!-- /codigo -->

A criação do vetor `cifradas` aplica `try_encrypt` a cada valor. `collect`
reúne os ciphertexts ou devolve o primeiro erro de cifração.

O primeiro laço acumula as parcelas. O segundo multiplica cada ciphertext por
si próprio e soma os quadrados. A multiplicação é cifrado–cifrado; nenhum valor
individual é decifrado dentro dos laços.

`clone()` copia o primeiro ciphertext para iniciar o acumulador. Os operadores
`+` e `*` mantêm o resultado em `FheUint32`. Apenas as duas chamadas a `decrypt`
recuperam inteiros em claro.

## 3. Execute

```bash
cd "$FHE_ROADMAP_ROOT"
cargo run --release --manifest-path exemplos/tfhe-rs/Cargo.toml \
  --bin estatisticas -- dados/processado/amostra.csv
```

Parte numérica esperada:

```text
Registros: 4
Soma: 98
Soma dos quadrados: 2644
Media (%): 24.50
Variancia populacional (p.p.^2): 60.75
```

`p.p.` significa pontos percentuais. Como os dados são percentuais, a variância
é expressa em pontos percentuais ao quadrado. Ela descreve somente esse recorte,
não uma estimativa clínica da população.

O programa também imprime os tempos e o tamanho serializado da soma. Esses
valores dependem da máquina; não há tempos esperados fixos.

## 4. Entenda a escolha de 32 bits

Os dados preparados estão em `0..100`, mas `100² = 10.000` já não cabe em 8 bits.
Com até 299 registros, a soma dos quadrados é limitada por `299 × 10.000 = 2.990.000`,
que cabe em `u32`. Por isso usamos `FheUint32` antes de multiplicar e somar.

A aritmética inteira FHE é limitada pela largura do tipo. Não espere que uma
operação cifrada detecte overflow como uma validação de entrada. Ao mudar o tipo,
revise o maior valor intermediário, não apenas os valores originais.

## 5. Compare operações

Repita o comando e compare os intervalos impressos. O tempo de geração das chaves
não é o tempo de uma soma. A medida de quadrados inclui multiplicações e adições.
O tamanho serializado inclui somente o ciphertext da soma, não todas as chaves e entradas.

No segundo recorte, espere soma `135`, soma dos quadrados `5825`, média `33,75`
e variância `317,1875` — impressa como `317.19` pelo formato de duas casas.

## Referências

[TFHE-rs — operações](https://docs.zama.org/tfhe-rs/fhe-computation/operations) · [Serialização](https://docs.zama.org/tfhe-rs/fhe-computation/data-handling/serialization) · [Instant](https://doc.rust-lang.org/std/time/struct.Instant.html)
