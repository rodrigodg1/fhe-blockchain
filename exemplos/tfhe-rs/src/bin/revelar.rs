use std::error::Error;
use std::fs;
use std::path::Path;
use tfhe::prelude::*;
use tfhe::safe_serialization::safe_deserialize;
use tfhe::{ClientKey, FheUint32};
use fhe_healthcare::{abrir_limitado, LIMITE_CHAVE, LIMITE_CIPHERTEXT};

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 3 { return Err("Uso: revelar DIR_CLIENTE RESULTADO.bin".into()); }
    let dir = Path::new(&args[1]);
    let chave_cliente: ClientKey = safe_deserialize(
        abrir_limitado(&dir.join("chave_cliente.bin"), LIMITE_CHAVE)?, LIMITE_CHAVE)?;
    let resultado: FheUint32 = safe_deserialize(
        abrir_limitado(Path::new(&args[2]), LIMITE_CIPHERTEXT)?, LIMITE_CIPHERTEXT)?;
    let quantidade: u32 = fs::read_to_string(dir.join("quantidade.txt"))?.trim().parse()?;
    if quantidade == 0 || quantidade > 299 { return Err("Use de 1 a 299 registros".into()); }
    let soma: u32 = resultado.decrypt(&chave_cliente);
    println!("Soma: {soma}");
    println!("Quantidade: {quantidade}");
    println!("Media da fracao de ejecao (%): {:.2}", f64::from(soma) / f64::from(quantidade));
    Ok(())
}
