#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
command -v git >/dev/null 2>&1 || { echo '[FoxBear] FAIL: Git is required.' >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo '[FoxBear] FAIL: Node.js is required.' >&2; exit 1; }
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$ROOT" ]] || { echo '[FoxBear] FAIL: Extract/run this inside the FoxBear Git repository.' >&2; exit 1; }
cd "$ROOT"
echo "[FoxBear] Repository: $ROOT"
if git ls-files --error-unmatch -- PATCH_MANIFEST.json >/dev/null 2>&1; then
  echo '[FoxBear] Removing tracked legacy PATCH_MANIFEST.json...'
  git rm -f -- PATCH_MANIFEST.json
  git diff --cached --name-status -- PATCH_MANIFEST.json | grep -q '^D' || { echo '[FoxBear] FAIL: deletion was not staged.' >&2; exit 1; }
  echo '[FoxBear] Creating a commit containing only PATCH_MANIFEST.json deletion...'
  if ! git commit -m 'Remove legacy PATCH_MANIFEST for strict source hygiene' -- PATCH_MANIFEST.json; then
    echo '[FoxBear] WARN: automatic commit failed, but deletion remains staged. Commit it manually, then push.' >&2
    git status --short
    exit 2
  fi
elif [[ -e PATCH_MANIFEST.json ]]; then
  echo '[FoxBear] Removing untracked legacy PATCH_MANIFEST.json...'
  rm -f -- PATCH_MANIFEST.json
else
  echo '[FoxBear] PATCH_MANIFEST.json is already absent and untracked.'
fi
[[ ! -e PATCH_MANIFEST.json ]] || { echo '[FoxBear] FAIL: PATCH_MANIFEST.json still exists.' >&2; exit 1; }
if git ls-files --error-unmatch -- PATCH_MANIFEST.json >/dev/null 2>&1; then
  echo '[FoxBear] FAIL: PATCH_MANIFEST.json is still tracked.' >&2
  exit 1
fi
node tools/check-source-hygiene.js || { echo '[FoxBear] WARN: manifest deletion is fixed, but another source-hygiene issue remains.' >&2; exit 3; }
echo '[FoxBear] PASS: PATCH_MANIFEST.json is deleted, untracked, and committed.'
git log -1 --oneline
echo '[FoxBear] Next: push this commit. Do NOT commit the hotfix ZIP itself.'
