#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(node -e "const p=require('${ROOT_DIR}/package.json'); console.log(p.version || 'dev')")"
OUTPUT_DIR="${ROOT_DIR}/dist"
OUTPUT_FILE="${OUTPUT_DIR}/foxbear-mastering-studio-v${VERSION}-release.zip"

mkdir -p "${OUTPUT_DIR}"
rm -f "${OUTPUT_FILE}"

cd "${ROOT_DIR}"
zip -qr "${OUTPUT_FILE}" . \
  -x '.git/*' \
  -x '.firebase/*' \
  -x '.firebaserc' \
  -x 'node_modules/*' \
  -x 'dist/*' \
  -x 'qa/browser-results/*' \
  -x 'qa/browser-results' \
  -x 'test-results/*' \
  -x 'test-results' \
  -x 'playwright-report/*' \
  -x 'playwright-report' \
  -x 'coverage/*' \
  -x 'coverage' \
  -x '*.zip' \
  -x '*.log' \
  -x '.last-run.json' \
  -x '.DS_Store'

node "${ROOT_DIR}/tools/verify-release-zip.js" "${OUTPUT_FILE}"

echo "Created ${OUTPUT_FILE}"
