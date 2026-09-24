import importlib.util
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/aplicar_incremento.py"
spec = importlib.util.spec_from_file_location("incremento", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
SOURCE = SCRIPT.parents[2]


class IncrementTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.dest = Path(self.temp.name) / "repo"
        (self.dest / "dados/processado").mkdir(parents=True)
        (self.dest / "README.md").write_text("ORIGINAL\n")
        (self.dest / "dados/processado/amostra.json").write_text("{}\n")

    def test_dry_run_does_not_write(self):
        new, same = module.apply(SOURCE, self.dest)
        self.assertGreater(new, 0)
        self.assertEqual(same, 0)
        self.assertFalse((self.dest / "ZKP.md").exists())

    def test_add_only_and_idempotent(self):
        count, _ = module.apply(SOURCE, self.dest, write=True)
        self.assertEqual((self.dest / "README.md").read_text(), "ORIGINAL\n")
        self.assertEqual((self.dest / "dados/processado/amostra.json").read_text(), "{}\n")
        new, same = module.apply(SOURCE, self.dest, write=True)
        self.assertEqual(new, 0)
        self.assertEqual(same, count)

    def test_collision_aborts_before_copy(self):
        (self.dest / "ZKP.md").write_text("EXISTENTE")
        with self.assertRaises(ValueError):
            module.apply(SOURCE, self.dest, write=True)
        self.assertEqual((self.dest / "ZKP.md").read_text(), "EXISTENTE")
        self.assertFalse((self.dest / "zkp").exists())

    def test_blocked_directory(self):
        (self.dest / "zkp").write_text("ARQUIVO")
        with self.assertRaises(ValueError):
            module.apply(SOURCE, self.dest, write=True)
        self.assertFalse((self.dest / "ZKP.md").exists())

    def test_symlink_is_rejected(self):
        outside = Path(self.temp.name) / "outside"
        outside.mkdir()
        (self.dest / "zkp").symlink_to(outside, target_is_directory=True)
        with self.assertRaises(ValueError):
            module.apply(SOURCE, self.dest, write=True)
        self.assertEqual(list(outside.iterdir()), [])

    def test_path_traversal_is_rejected(self):
        for name in ("../README.md", "/tmp/x", "README.md", "zkp/../README.md", "zkp\\x"):
            with self.assertRaises(ValueError):
                module.safe_relative(name)


if __name__ == "__main__":
    unittest.main()
