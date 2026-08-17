"""Regression tests for the one-way DeepSeek Harness plugin mirror."""

from __future__ import annotations

import shutil
import tempfile
import unittest
from pathlib import Path

from scripts import sync_plugins


ROOT = Path(__file__).resolve().parents[1]


class MirrorManifestTests(unittest.TestCase):
    """Make mirror drift a deterministic repository-check failure."""

    def test_repository_manifest_covers_the_complete_mirror(self) -> None:
        self.assertEqual(sync_plugins.manifest_violations(), [])

    def test_hash_and_inventory_drift_are_reported(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            checkout = Path(temporary)
            shutil.copytree(ROOT / "plugins", checkout / "plugins")
            source = checkout / "plugins" / "kersor-viewer" / "src" / "fold.ts"
            source.write_text(source.read_text(encoding="utf-8") + "// drift\n", encoding="utf-8")
            extra = checkout / "plugins" / "ui-kersor-viewer" / "tests" / "unlisted.spec.ts"
            extra.write_text("export {}\n", encoding="utf-8")
            build_map = checkout / "plugins" / "kersor-viewer" / "lib" / "index.js.map"
            build_map.write_text("{}\n", encoding="utf-8")
            build_info = checkout / "plugins" / "kersor-viewer" / "lib" / "tsconfig.tsbuildinfo"
            build_info.write_text("{}\n", encoding="utf-8")

            violations = sync_plugins.manifest_violations(
                checkout,
                checkout / "plugins" / "dsh-mirror.json",
            )
            self.assertTrue(any("fold.ts: content differs" in item for item in violations))
            self.assertTrue(any("unlisted.spec.ts: mirrored file is absent" in item for item in violations))
            self.assertFalse(any("index.js.map" in item for item in violations))
            self.assertFalse(any("tsconfig.tsbuildinfo" in item for item in violations))

    def test_ci_uses_the_manifest_pinned_dsh_toolchain(self) -> None:
        workflow = (ROOT / ".github" / "workflows" / "validate.yml").read_text(
            encoding="utf-8"
        )
        self.assertIn("ref: ${{ steps.dsh-source.outputs.revision }}", workflow)
        self.assertIn("node-version: ${{ steps.dsh-source.outputs.node }}", workflow)
        self.assertIn("version: ${{ steps.dsh-source.outputs.pnpm }}", workflow)
        self.assertIn("pnpm install --frozen-lockfile", workflow)
        self.assertIn("packages/extensions/kersor-viewer/tests", workflow)
        self.assertIn("packages/extensions/ui-kersor-viewer/tests", workflow)


if __name__ == "__main__":
    unittest.main()
