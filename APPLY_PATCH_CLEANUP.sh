#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
node tools/apply-delete-paths.js
node tools/repair-source-hygiene.js
node tools/check-source-hygiene.js
echo "[FoxBear] Patch cleanup complete. Commit the displayed deletions in GitHub Desktop or Git."
