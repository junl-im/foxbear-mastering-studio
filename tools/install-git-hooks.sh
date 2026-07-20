#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"

if [[ ! -d .git ]]; then
  echo "[FoxBear] .git directory not found; hook installation skipped."
  exit 0
fi

git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
echo "[FoxBear] Git hooks enabled from .githooks."
