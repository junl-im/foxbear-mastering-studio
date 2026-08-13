#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v git >/dev/null 2>&1 || { echo '[FoxBear] FAIL: Git is required for CI hotfix cleanup.' >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo '[FoxBear] FAIL: Node.js is required for CI hotfix cleanup.' >&2; exit 1; }
git rev-parse --show-toplevel >/dev/null 2>&1 || { echo '[FoxBear] FAIL: Run this file from the extracted repository root.' >&2; exit 1; }
node tools/apply-delete-paths.js
node tools/check-source-hygiene.js
[[ ! -e PATCH_MANIFEST.json ]] || { echo '[FoxBear] FAIL: PATCH_MANIFEST.json still exists.' >&2; exit 1; }
if git ls-files --error-unmatch -- PATCH_MANIFEST.json >/dev/null 2>&1; then
  echo '[FoxBear] FAIL: PATCH_MANIFEST.json is still tracked.' >&2
  exit 1
fi
echo '[FoxBear] PASS: cleanup complete. Git deletion is staged for commit.'
git status --short
echo '[FoxBear] Commit and push the staged deletion in GitHub Desktop or Git.'
