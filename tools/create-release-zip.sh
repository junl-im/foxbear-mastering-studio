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
  -x 'node_modules/*' \
  -x 'dist/*' \
  -x '*.zip' \
  -x 'check.log' \
  -x '.DS_Store'

echo "Created ${OUTPUT_FILE}"
