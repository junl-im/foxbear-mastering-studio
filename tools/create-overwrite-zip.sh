#!/usr/bin/env bash
set -euo pipefail

# Creates a cumulative overwrite package.
# It intentionally includes every runtime source/CSS/QA/workflow/tool file that can
# affect app behavior, so users can apply only the latest overwrite ZIP without
# needing to install every previous stage in sequence.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-v1.4.0-stage21}"
OUT_DIR="$ROOT_DIR/dist"
WORK_DIR="$OUT_DIR/overwrite-$VERSION"
ZIP_PATH="$OUT_DIR/foxbear-mastering-studio-$VERSION-overwrite.zip"

rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR" "$OUT_DIR"

copy_path() {
  local path="$1"
  if [ -e "$ROOT_DIR/$path" ]; then
    mkdir -p "$WORK_DIR/$(dirname "$path")"
    cp -R "$ROOT_DIR/$path" "$WORK_DIR/$path"
  fi
}

# Runtime entry files and deployment config.
copy_path "index.html"
copy_path "sw.js"
copy_path "manifest.webmanifest"
copy_path "package.json"
copy_path "firebase.json"
copy_path "firestore.rules"
copy_path "firestore.indexes.json"
copy_path ".firebaserc.example"
copy_path ".nojekyll"

# Documentation that must travel with every handoff.
copy_path "CHANGELOG.md"
copy_path "HANDOFF.md"
copy_path "PROJECT_NOTES.md"
copy_path "README.md"
copy_path "FIREBASE_SETUP.md"

# Cumulative runtime source and style layers.
copy_path "src"
copy_path "assets"
copy_path "vendor"
copy_path "qa"
copy_path "tools"
copy_path ".github/workflows"

# Keep packages small and safe.
find "$WORK_DIR" -name '.DS_Store' -delete
find "$WORK_DIR" -name 'check.log' -delete
find "$WORK_DIR" -name '*.zip' -delete

rm -f "$ZIP_PATH"
(cd "$WORK_DIR" && zip -qr "$ZIP_PATH" .)

echo "$ZIP_PATH"
