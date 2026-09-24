# Módulo 4 — Comparação e seleção cifrada

[Percurso](../README.md) · [Instalação](../INSTALACAO.md)


## Recursos usados

| Recurso | O que é | Por que usar |
|---|---|---|
| TFHE-rs | Biblioteca de operações cifradas | Comparar os percentuais sem recuperá-los antes |
| `FheBool` | Booleano cifrado | Representar o resultado de uma comparação |
| `if_then_else` | Seleção a partir de um booleano cifrado | Escolher uma parcela sem um `if` sobre plaintext |
| `FheUint32` | Inteiro cifrado | Acumular a contagem e a soma selecionada |

## 1. Defina a operação

Para cada percentual, calcule a condição `valor > limiar`. Use o resultado para
somar `1` à contagem quando a condição for verdadeira e `0` caso contrário.
Para a soma filtrada, selecione o próprio valor ou zero.

```text
valor:              20   38   20   20
valor > 30:          0    1    0    0
parcela selecionada: 0   38    0    0
```

No programa, essas respostas intermediárias continuam cifradas. A tabela acima
é apenas a referência em claro da amostra pública.

## 2. Leia o código completo

<!-- codigo: exemplos/tfhe-rs/src/bin/selecionar.rs -->
Arquivo: [`exemplos/tfhe-rs/src/bin/selecionar.rs`](../exemplos/tfhe-rs/src/bin/selecionar.rs).

```rust
use std::error::Error;
use std::path::Path;
use tfhe::prelude::*;
use tfhe::{generate_keys, set_server_key, ConfigBuilder, FheUint32};
use fhe_healthcare::ler_amostra;

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 3 { return Err("Uso: selecionar AMOSTRA.csv LIMIAR".into()); }
    let valores = ler_amostra(Path::new(&args[1]))?;
    let limiar: u32 = args[2].parse()?;
    if limiar > 100 { return Err("Use um limiar entre 0 e 100".into()); }
    let (chave_cliente, chave_avaliacao) = generate_keys(ConfigBuilder::default().build());
    let cifradas: Vec<FheUint32> = valores.iter()
        .map(|&v| FheUint32::try_encrypt(v, &chave_cliente))
        .collect::<Result<_, _>>()?;
    let zero = FheUint32::try_encrypt(0u32, &chave_cliente)?;
    let um = FheUint32::try_encrypt(1u32, &chave_cliente)?;
    set_server_key(chave_avaliacao);
    let mut quantidade = zero.clone();
    let mut soma = zero.clone();
    for valor in &cifradas {
        let acima = valor.gt(limiar);
        let indicador = acima.if_then_else(&um, &zero);
        let parcela = acima.if_then_else(valor, &zero);
        quantidade = &quantidade + &indicador;
        soma = &soma + &parcela;
    }
    let total: u32 = soma.decrypt(&chave_cliente);
    let contagem: u32 = quantidade.decrypt(&chave_cliente);
    let selecionados: Vec<u32> = valores.into_iter().filter(|&v| v > limiar).collect();
    assert_eq!(total, selecionados.iter().sum::<u32>());
    assert_eq!(contagem as usize, selecionados.len());
    println!("Limiar numerico: {limiar}");
    println!("Quantidade acima do limiar: {contagem}");
    println!("Soma acima do limiar: {total}");
    Ok(())
}
```
<!-- /codigo -->

`gt` significa *greater than*: maior que. Seu resultado é `FheBool`, não `bool`.
Rust não pode usar esse objeto diretamente como condição de um `if` convencional.

`acima.if_then_else(&um, &zero)` cria um inteiro cifrado igual a 1 ou 0.
`acima.if_then_else(valor, &zero)` seleciona o percentual ou zero. Somar esses
resultados produz a contagem e a soma do subconjunto sem decifrar as condições.

O limiar é público. As comparações são feitas entre um valor cifrado e uma
constante pública; isso não revela automaticamente qual comparação foi verdadeira.

## 3. Execute

```bash
cd "$FHE_ROADMAP_ROOT"
cargo run --release --manifest-path exemplos/tfhe-rs/Cargo.toml \
  --bin selecionar -- dados/processado/amostra.csv 30
```

Saída esperada:

```text
Limiar numerico: 30
Quantidade acima do limiar: 1
Soma acima do limiar: 38
```

Mude o último argumento para `20`. Como a comparação é estrita, os valores
iguais a 20 não entram: a contagem continua 1. Com limiar `100`, contagem e soma
são zero.

A soma de um grupo de tamanho 1 revela o valor selecionado. O objetivo aqui é
compreender a operação, não afirmar que qualquer estatística publicada preserva
a privacidade dos indivíduos.

## Referências

[TFHE-rs — operações](https://docs.zama.org/tfhe-rs/fhe-computation/operations) · [FheBool — API](https://docs.rs/tfhe/1.8.1/tfhe/struct.FheBool.html)
