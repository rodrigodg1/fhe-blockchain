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
