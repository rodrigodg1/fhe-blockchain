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
