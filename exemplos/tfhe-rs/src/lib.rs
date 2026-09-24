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
