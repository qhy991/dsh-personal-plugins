import hashlib
import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "presets/modus/execution-strategies/manifest.json"
LEGACY = {
    "target-scoped-optimization": (
        ROOT / "presets/modus/experimental-profiles/t0-workload-v2/p000.md"
    ),
    "prepared-shared-optimization": (
        ROOT / "presets/modus/experimental-profiles/e1-minimal-v3/p100.md"
    ),
}


class ModusExecutionStrategyCatalogTest(unittest.TestCase):
    def test_formal_catalog_is_semantic_and_hash_bound(self):
        value = json.loads(CATALOG.read_text())
        self.assertEqual(
            set(value["strategies"]),
            {
                "target-scoped-optimization",
                "prepared-shared-optimization",
                "invariant-specialized-optimization",
            },
        )
        for strategy_id, row in value["strategies"].items():
            self.assertNotRegex(strategy_id.lower(), r"p\d{3}|e\dv\d|p2[a-z]")
            profile = CATALOG.parent / row["profile"]
            manifest_path = CATALOG.parent / row["manifest"]
            self.assertEqual(hashlib.sha256(profile.read_bytes()).hexdigest(), row["sha256"])
            manifest = json.loads(manifest_path.read_text())
            self.assertEqual(manifest["strategy_id"], strategy_id)
            self.assertEqual(manifest["sha256"], row["sha256"])
            self.assertEqual(manifest["path"], "profile.md")
            self.assertNotRegex(manifest_path.read_text().lower(), r"p\d{3}|e\dv\d|p2[a-z]")

    def test_formal_assets_preserve_frozen_profile_bytes(self):
        value = json.loads(CATALOG.read_text())
        for strategy_id, legacy in LEGACY.items():
            profile = CATALOG.parent / value["strategies"][strategy_id]["profile"]
            self.assertEqual(profile.read_bytes(), legacy.read_bytes())

    def test_invariant_specialization_is_explicitly_unqualified(self):
        value = json.loads(CATALOG.read_text())
        row = value["strategies"]["invariant-specialized-optimization"]
        manifest = json.loads((CATALOG.parent / row["manifest"]).read_text())
        profile = (CATALOG.parent / row["profile"]).read_text()
        self.assertEqual(manifest["status"], "unqualified-development-candidate")
        self.assertEqual(
            manifest["behavior_contract"]["reusable_preparation"],
            "loop-invariant-configuration-only",
        )
        self.assertRegex(
            profile,
            r"specialize loop-invariant configuration exactly\s+once",
        )
        self.assertRegex(
            profile,
            r"not a substitute\s+for repeated-data aggregation",
        )


if __name__ == "__main__":
    unittest.main()
