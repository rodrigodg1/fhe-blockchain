# Schnorr generalizado sobre um compromisso Pedersen

Python 3.10 ou superior; somente biblioteca padrão. Dentro desta pasta:

```bash
python3 schnorr.py demo
python3 schnorr.py verify saida/proof.json --context 'healthcare:amostra-publica:v1'
python3 -m unittest -v
```

A prova demonstra conhecimento de uma abertura, não faixa numérica ou origem
clínica. O contexto esperado é informado separadamente. O JSON público não
contém medida, fator de ocultação ou nonces. Os inteiros Python não são
constant-time; use o exemplo para estudo, não como biblioteca de produção.

[Explicação, equações e código integral](../../modulos/02-schnorr-pedersen.md).
