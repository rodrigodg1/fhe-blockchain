use std::error::Error;
use std::fs;
use std::path::Path;
use tfhe::safe_serialization::{safe_deserialize, safe_serialize};
use tfhe::{set_server_key, FheUint32, ServerKey};
use fhe_healthcare::{abrir_limitado, novo_arquivo, LIMITE_CHAVE, LIMITE_CIPHERTEXT, MAX_REGISTROS};

// Sem ClientKey. Use arquivos da mesma execucao de preparar.
fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 3 { return Err("Uso: calcular DIR_SERVIDOR RESULTADO.bin".into()); }
    let dir = Path::new(&args[1]);
    let quantidade: usize = fs::read_to_string(dir.join("quantidade.txt"))?.trim().parse()?;
    if quantidade == 0 || quantidade > MAX_REGISTROS { return Err("Quantidade invalida".into()); }
    let chave_avaliacao: ServerKey = safe_deserialize(
        abrir_limitado(&dir.join("chave_avaliacao.bin"), LIMITE_CHAVE)?, LIMITE_CHAVE)?;
    set_server_key(chave_avaliacao);
    let mut soma: FheUint32 = safe_deserialize(
        abrir_limitado(&dir.join("registro_000.bin"), LIMITE_CIPHERTEXT)?, LIMITE_CIPHERTEXT)?;
    for i in 1..quantidade {
        let path = dir.join(format!("registro_{i:03}.bin"));
        let valor: FheUint32 = safe_deserialize(abrir_limitado(&path, LIMITE_CIPHERTEXT)?, LIMITE_CIPHERTEXT)?;
        soma = &soma + &valor;
    }
    safe_serialize(&soma, novo_arquivo(Path::new(&args[2]))?, LIMITE_CIPHERTEXT)?;
    println!("Resultado cifrado salvo, sem decifracao.");
    Ok(())
}
