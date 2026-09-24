# Módulo 5 — Arquivos e execução em processos separados

[Percurso](../README.md) · [Instalação](../INSTALACAO.md)


## Recursos usados

| Recurso | O que é | Por que usar |
|---|---|---|
| TFHE-rs | Biblioteca de FHE | Continuar calculando com as mesmas chaves e tipos |
| `safe_serialize` e `safe_deserialize` | Conversão entre objetos FHE e bytes | Passar ciphertexts entre executáveis |
| `std::fs`, `std::io` e `std::path` | APIs de arquivos da biblioteca padrão Rust | Ler e gravar os dados sem adicionar uma API de rede |

## 1. Separe as três etapas

Até aqui, chaves, entradas e resultados estavam no mesmo processo. Agora serão
usados três programas:

```text
preparar -> arquivos cifrados -> calcular -> resultado cifrado -> revelar
```

`preparar` lê o CSV e gera os arquivos. `calcular` recebe apenas o material usado
na avaliação. `revelar` recupera o resultado usando a chave do cliente.
A operação continua sendo uma soma.

## 2. Código completo: preparar.rs

<!-- codigo: exemplos/tfhe-rs/src/bin/preparar.rs -->
Arquivo: [`exemplos/tfhe-rs/src/bin/preparar.rs`](../exemplos/tfhe-rs/src/bin/preparar.rs).

```rust
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
```
<!-- /codigo -->

O programa cria dois diretórios novos. A pasta do cliente guarda a chave secreta;
a do servidor guarda a chave de avaliação e os ciphertexts. Os dois lados conhecem
a quantidade de registros.

Os arquivos são gerados juntos para pertencerem ao mesmo conjunto de chaves.
Não misture arquivos de execuções independentes.

## 3. Código completo: calcular.rs

<!-- codigo: exemplos/tfhe-rs/src/bin/calcular.rs -->
Arquivo: [`exemplos/tfhe-rs/src/bin/calcular.rs`](../exemplos/tfhe-rs/src/bin/calcular.rs).

```rust
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
```
<!-- /codigo -->

O programa carrega `ServerKey`, configura a avaliação e soma os arquivos na ordem.
O resultado é serializado sem decifração. Os auxiliares `abrir_limitado` e
`novo_arquivo` estão em `src/lib.rs`, mostrado integralmente no
[módulo 2](02-tfhe-rs.md).

## 4. Código completo: revelar.rs

<!-- codigo: exemplos/tfhe-rs/src/bin/revelar.rs -->
Arquivo: [`exemplos/tfhe-rs/src/bin/revelar.rs`](../exemplos/tfhe-rs/src/bin/revelar.rs).

```rust
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
```
<!-- /codigo -->

A chave do cliente e o ciphertext final são reconstruídos a partir dos bytes.
Depois da decifração, a média é calculada em claro usando a quantidade de registros.

## 5. Compile e execute

Na raiz, compile todos os programas:

```bash
cd "$FHE_ROADMAP_ROOT"
cargo build --release --manifest-path exemplos/tfhe-rs/Cargo.toml --bins
```

Prepare uma rodada em diretórios novos:

```bash
./exemplos/tfhe-rs/target/release/preparar \
  dados/processado/amostra.csv \
  execucoes/rodada1/cliente execucoes/rodada1/servidor
```

A estrutura gerada será:

```text
execucoes/rodada1/
  cliente/
    chave_cliente.bin
    quantidade.txt
  servidor/
    chave_avaliacao.bin
    quantidade.txt
    registro_000.bin
    registro_001.bin
    registro_002.bin
    registro_003.bin
```

Execute o cálculo e recupere a soma:

```bash
./exemplos/tfhe-rs/target/release/calcular \
  execucoes/rodada1/servidor execucoes/rodada1/resultado.bin

./exemplos/tfhe-rs/target/release/revelar \
  execucoes/rodada1/cliente execucoes/rodada1/resultado.bin
```

Saída numérica esperada:

```text
Soma: 98
Quantidade: 4
Media da fracao de ejecao (%): 24.50
```

Os programas recusam sobrescrever os arquivos. Para repetir o fluxo, use
`rodada2` em todos os caminhos de saída; não apague uma chave ainda necessária.

## 6. Entenda o que a separação demonstra

`calcular` não recebe a pasta do cliente. Isso mostra a separação dos dados
necessários ao cálculo e à decifração. Rodar todos os programas no mesmo usuário
do sistema, porém, não isola seus arquivos contra um processo malicioso.

A serialização também não autentica arquivos. Este exemplo lê arquivos que você
acabou de gerar. O prefixo `safe` não torna qualquer conteúdo recebido da internet
confiável. A documentação da Zama descreve verificações adicionais de conformidade.

O foco aqui é observar que ciphertexts e chaves de avaliação podem ser gravados,
transportados e reutilizados por outro processo sem decifrar as entradas.

## Referências

[Zama — serialização](https://docs.zama.org/tfhe-rs/fhe-computation/data-handling/serialization) · [Rust — arquivos](https://doc.rust-lang.org/std/fs/index.html)
