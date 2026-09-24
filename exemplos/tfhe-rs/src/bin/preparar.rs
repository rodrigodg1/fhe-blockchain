use std::error::Error;
use std::fs;
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use tfhe::prelude::*;
use tfhe::safe_serialization::safe_serialize;
use tfhe::{generate_keys, ConfigBuilder, FheUint32};
use fhe_healthcare::{ler_amostra, novo_arquivo, LIMITE_CHAVE, LIMITE_CIPHERTEXT};

fn destino_novo(path: &str) -> Result<PathBuf, Box<dyn Error>> {
    let path = Path::new(path);
    if path.components().any(|p| matches!(p, Component::ParentDir)) {
        return Err("Use diretorios sem '..' no caminho".into());
    }
    if path.exists() { return Err(format!("Diretorio ja existe: {}", path.display()).into()); }
    if let Some(parent) = path.parent().filter(|p| !p.as_os_str().is_empty()) {
        fs::create_dir_all(parent)?;
    }
    let parent = path.parent().filter(|p| !p.as_os_str().is_empty()).unwrap_or(Path::new("."));
    let name = path.file_name().ok_or("Caminho de diretorio invalido")?;
    Ok(parent.canonicalize()?.join(name))
}

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 4 { return Err("Uso: preparar AMOSTRA.csv DIR_CLIENTE DIR_SERVIDOR".into()); }
    let valores = ler_amostra(Path::new(&args[1]))?;
    let cliente = destino_novo(&args[2])?;
    let servidor = destino_novo(&args[3])?;
    if cliente.starts_with(&servidor) || servidor.starts_with(&cliente) {
        return Err("Use diretorios separados, sem aninhamento".into());
    }
    // Criar os pais pode ter criado um dos destinos.
    if cliente.exists() || servidor.exists() { return Err("Use dois diretorios novos".into()); }
    fs::create_dir(&cliente)?;
    fs::create_dir(&servidor)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&cliente, fs::Permissions::from_mode(0o700))?;
        fs::set_permissions(&servidor, fs::Permissions::from_mode(0o700))?;
    }
    let (chave_cliente, chave_avaliacao) = generate_keys(ConfigBuilder::default().build());
    safe_serialize(&chave_cliente, novo_arquivo(&cliente.join("chave_cliente.bin"))?, LIMITE_CHAVE)?;
    safe_serialize(&chave_avaliacao, novo_arquivo(&servidor.join("chave_avaliacao.bin"))?, LIMITE_CHAVE)?;
    writeln!(novo_arquivo(&cliente.join("quantidade.txt"))?, "{}", valores.len())?;
    writeln!(novo_arquivo(&servidor.join("quantidade.txt"))?, "{}", valores.len())?;
    for (i, valor) in valores.into_iter().enumerate() {
        let cifrada = FheUint32::try_encrypt(valor, &chave_cliente)?;
        safe_serialize(&cifrada, novo_arquivo(&servidor.join(format!("registro_{i:03}.bin")))?, LIMITE_CIPHERTEXT)?;
    }
    println!("Entradas cifradas. Mantenha a pasta do cliente separada.");
    Ok(())
}
