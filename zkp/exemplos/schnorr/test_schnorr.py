import dataclasses
import json
import secrets
import unittest
from schnorr import (P, Q, G, H, Statement, Proof, commit, prove, verify, encode, decode,
                     group_ok, DEFAULT_CONTEXT)


class SchnorrTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.blinding = secrets.randbelow(Q)
        cls.statement, cls.proof = prove(38, cls.blinding, DEFAULT_CONTEXT)

    def test_group_parameters(self):
        self.assertEqual(P.bit_length(), 2048)
        self.assertEqual(P, 2 * Q + 1)
        self.assertTrue(group_ok(G))
        self.assertTrue(group_ok(H))
        self.assertNotEqual(G, H)

    def test_valid_proof(self):
        self.assertTrue(verify(self.statement, self.proof))

    def test_public_json_roundtrip(self):
        s, p = decode(json.loads(json.dumps(encode(self.statement, self.proof))))
        self.assertTrue(verify(s, p))

    def test_context_tampering(self):
        s = dataclasses.replace(self.statement, context="outro-lote")
        self.assertFalse(verify(s, self.proof))

    def test_commitment_tampering(self):
        s = dataclasses.replace(self.statement, commitment=self.statement.commitment * G % P)
        self.assertFalse(verify(s, self.proof))

    def test_response_tampering(self):
        for name in ("sv", "sr"):
            p = dataclasses.replace(self.proof, **{name: (getattr(self.proof, name) + 1) % Q})
            self.assertFalse(verify(self.statement, p))

    def test_nonce_commitment_tampering(self):
        p = dataclasses.replace(self.proof, t=self.proof.t * G % P)
        self.assertFalse(verify(self.statement, p))

    def test_invalid_subgroup(self):
        for x in (0, P, P - 1, -1):
            self.assertFalse(verify(Statement(x, DEFAULT_CONTEXT), self.proof))
            self.assertFalse(verify(self.statement, dataclasses.replace(self.proof, t=x)))

    def test_noncanonical_scalar(self):
        for x in (-1, Q, self.proof.sv + Q, True):
            self.assertFalse(verify(self.statement, dataclasses.replace(self.proof, sv=x)))

    def test_fresh_proof_for_same_statement(self):
        statement, proof = prove(38, self.blinding, DEFAULT_CONTEXT)
        self.assertEqual(statement, self.statement)
        self.assertNotEqual(proof, self.proof)
        self.assertTrue(verify(statement, proof))

    def test_blinding_changes_commitment(self):
        self.assertNotEqual(commit(38, self.blinding), commit(38, (self.blinding + 1) % Q))

    def test_does_not_claim_range(self):
        statement, proof = prove(999, secrets.randbelow(Q), DEFAULT_CONTEXT)
        self.assertTrue(verify(statement, proof))  # PoK da abertura, não prova de 0..100.

    def test_json_does_not_export_secrets(self):
        data = encode(self.statement, self.proof)
        self.assertEqual(set(data["proof"]), {"t", "sv", "sr"})
        self.assertNotIn("blinding", json.dumps(data))
        self.assertNotIn("value", json.dumps(data))

    def test_malformed_json(self):
        with self.assertRaises(ValueError):
            decode({"protocol": "outro"})
        for bad in ("01", "-1", "1.0", "9" * 621, 1):
            data = encode(self.statement, self.proof)
            data["proof"]["sv"] = bad
            with self.assertRaises(ValueError):
                decode(data)


if __name__ == "__main__":
    unittest.main()
