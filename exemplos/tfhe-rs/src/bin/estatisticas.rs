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
