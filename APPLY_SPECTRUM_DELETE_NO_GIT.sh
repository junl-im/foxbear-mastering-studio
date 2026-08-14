#!/usr/bin/env sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
CUR="$SCRIPT_DIR"
ROOT=""
while [ "$CUR" != "/" ]; do
  if [ -f "$CUR/package.json" ] && [ -d "$CUR/src" ] && [ -d "$CUR/assets" ]; then
    ROOT="$CUR"
    break
  fi
  CUR=$(dirname "$CUR")
done
if [ -z "$ROOT" ]; then
  echo "[FoxBear] FAIL: Repository root not found."
  echo "Extract this folder anywhere inside the FoxBear repository, preferably at its root."
  exit 1
fi
cd "$ROOT"
echo "[FoxBear] Spectrum retirement cleanup (Git CLI not required)"
echo "[FoxBear] Repository: $ROOT"
rm -f -- src/ui/spectrum-visualizer.js assets/css/spectrum-visualizer.css
[ ! -e src/ui/spectrum-visualizer.js ] || { echo "[FoxBear] FAIL: src/ui/spectrum-visualizer.js still exists."; exit 1; }
[ ! -e assets/css/spectrum-visualizer.css ] || { echo "[FoxBear] FAIL: assets/css/spectrum-visualizer.css still exists."; exit 1; }
echo "[FoxBear] PASS: src/ui/spectrum-visualizer.js is absent."
echo "[FoxBear] PASS: assets/css/spectrum-visualizer.css is absent."
echo
echo "Next: open GitHub Desktop, confirm BOTH files are Deleted, commit them, then Push origin."
echo "Commit suggestion: Remove retired spectrum visualizer assets"
