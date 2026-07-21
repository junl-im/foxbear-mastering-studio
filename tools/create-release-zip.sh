#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node "${ROOT_DIR}/tools/sync-release-metadata.js" --check
node "${ROOT_DIR}/tools/verify-handoff-state.js"
VERSION="$(node -e "const p=require('${ROOT_DIR}/package.json'); console.log(p.version || 'dev')")"
OUTPUT_DIR="${ROOT_DIR}/dist"
OUTPUT_FILE="${OUTPUT_DIR}/foxbear-mastering-studio-v${VERSION}-release.zip"

mkdir -p "${OUTPUT_DIR}"
rm -f "${OUTPUT_FILE}"

cd "${ROOT_DIR}"

SYMLINKS="$(find . -type l \
  -not -path './.git/*' \
  -not -path './node_modules/*' \
  -not -path '*/node_modules/*' \
  -not -path './dist/*' \
  -not -path './qa/browser-results/*' \
  -not -path './test-results/*' \
  -not -path './playwright-report/*' \
  -not -path './coverage/*' -print)"
if [ -n "${SYMLINKS}" ]; then
  echo "Release source contains symbolic links:" >&2
  printf '%s\n' "${SYMLINKS}" >&2
  exit 1
fi
zip -qr "${OUTPUT_FILE}" . \
  -x '.git/*' \
  -x '.firebase/*' \
  -x '.firebaserc' \
  -x 'node_modules/*' \
  -x '*/node_modules/*' \
  -x 'dist/*' \
  -x 'qa/browser-results/*' \
  -x 'qa/browser-results' \
  -x 'test-results/*' \
  -x 'test-results' \
  -x 'playwright-report/*' \
  -x 'playwright-report' \
  -x 'coverage/*' \
  -x 'coverage' \
  -x '*/__pycache__/*' \
  -x '__pycache__/*' \
  -x '*.pyc' \
  -x '*.pyo' \
  -x '*.zip' \
  -x '*.log' \
  -x '*.tmp' \
  -x '*.trace' \
  -x 'qa/static-audit*.txt' \
  -x 'qa/browser-check*.txt' \
  -x 'qa/static-check*.txt' \
  -x '.foxbear-e2e-probe-*.txt' \
  -x '.last-run.json' \
  -x '.DS_Store'

node "${ROOT_DIR}/tools/verify-release-zip.js" "${OUTPUT_FILE}"

echo "Created ${OUTPUT_FILE}"
