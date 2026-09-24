"""Testa a preparacao dos dados, sem FHE."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("preparar_dataset", ROOT / "scripts/preparar-dataset.py")
assert spec and spec.loader
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class DatasetTests(unittest.TestCase):
    def test_recorte_real(self):
        rows = mod.ler_fonte(mod.FONTE)
        self.assertEqual(len(rows), 8)
        self.assertEqual([r['ejection_fraction'] for r in rows], [20,38,20,20,20,40,15,60])

    def test_fixture_de_quatro(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = mod.gerar(mod.FONTE, Path(tmp))
            self.assertEqual(result['sum'], 98)
            self.assertEqual(result['mean'], 24.5)
            self.assertEqual(result['source_rows'], [1,2,3,4])
            checked = json.loads((ROOT / 'dados/processado/amostra.json').read_text())
            self.assertEqual(result, checked)

    def test_oito_registros(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = mod.gerar(mod.FONTE, Path(tmp), 8)
            self.assertEqual(result['sum'], 233)
            self.assertEqual(result['mean'], 29.125)

    def test_segundo_grupo(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = mod.gerar(mod.FONTE, Path(tmp), 4, 5)
            self.assertEqual(result['sum'], 135)
            self.assertEqual(result['mean'], 33.75)

    def test_rejeita_valores_invalidos_sem_corrigir(self):
        for value in ('', 'NaN', 'Infinity', '-1', '101', '20.5', 'abc'):
            with self.subTest(value=value), tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp) / 'test.csv'
                path.write_text('ejection_fraction,other\n' + value + ',x\n')
                with self.assertRaises(ValueError):
                    mod.ler_fonte(path)

    def test_rejeita_coluna_ausente(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'test.csv'
            path.write_text('other\n1\n')
            with self.assertRaises(ValueError): mod.ler_fonte(path)

    def test_rejeita_selecao_inexistente(self):
        with tempfile.TemporaryDirectory() as tmp:
            for limite, inicio in [(9,1), (1,1), (4,0), (4,8)]:
                with self.assertRaises(ValueError): mod.gerar(mod.FONTE, Path(tmp), limite, inicio)

if __name__ == '__main__':
    unittest.main()
