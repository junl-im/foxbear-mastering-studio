#!/usr/bin/env bash
set -euo pipefail

# Creates a cumulative overwrite package.
# It intentionally includes every runtime source/CSS/QA/workflow/tool file that can
# affect app behavior, so users can apply only the latest overwrite ZIP without
# needing to install every previous stage in sequence.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node "${ROOT_DIR}/tools/sync-release-metadata.js" --check
node "${ROOT_DIR}/tools/verify-handoff-state.js"
# Default follows package.json so later patch packages do not keep stale names.
VERSION="${1:-$(node -e "const p=require('"$ROOT_DIR/package.json"'); process.stdout.write('v' + (p.version || 'dev'))")}"
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
copy_path "404.html"
copy_path "foxbear-root.json"
copy_path "external-browser.html"
copy_path "sw.js"
copy_path "manifest.webmanifest"
copy_path "package.json"
copy_path "package-lock.json"
copy_path "playwright.config.js"
copy_path "firebase.json"
copy_path "firestore.rules"
copy_path "firestore.indexes.json"
copy_path ".firebaserc.example"
copy_path ".gitignore"
copy_path ".githooks"
copy_path ".nojekyll"
copy_path "robots.txt"
copy_path "design-preview.html"

# Documentation that must travel with every handoff.
copy_path "CHANGELOG.md"
copy_path "HANDOFF.md"
copy_path "PROJECT_NOTES.md"
copy_path "README.md"
copy_path "FIREBASE_SETUP.md"
copy_path "GITHUB_DESKTOP_HANDOFF.md"
copy_path "DELIVERY_RULES.md"
copy_path "HANDOFF_PACKAGE.json"
copy_path "RELEASE_CHECKLIST.md"
copy_path "VERSIONING.md"
copy_path "STATUS.md"

# Cumulative runtime source and style layers.
copy_path "src"
copy_path "assets"
copy_path "vendor"
copy_path "docs"
copy_path "qa"
copy_path "tools"
copy_path "functions"
copy_path ".github/workflows"

# Keep packages small and safe.
find "$WORK_DIR" -name '.DS_Store' -delete
find "$WORK_DIR" -type f -name '*.log' -delete
find "$WORK_DIR" -type f -name '*.tmp' -delete
find "$WORK_DIR" -type f -name '*.trace' -delete
find "$WORK_DIR" -type f \( -name '*.pyc' -o -name '*.pyo' \) -delete
find "$WORK_DIR" -type d -name '__pycache__' -prune -exec rm -rf {} +
find "$WORK_DIR" -type d -name 'node_modules' -prune -exec rm -rf {} +
find "$WORK_DIR/qa" -maxdepth 1 -type f \( -name 'static-audit*.txt' -o -name 'browser-check*.txt' -o -name 'static-check*.txt' \) -delete
find "$WORK_DIR" -type f -name '.last-run.json' -delete
find "$WORK_DIR" -type f -name '.foxbear-e2e-probe-*.txt' -delete
find "$WORK_DIR" -name '*.zip' -delete
rm -rf "$WORK_DIR/qa/browser-results" "$WORK_DIR/qa/browser-history" "$WORK_DIR/test-results" "$WORK_DIR/playwright-report" "$WORK_DIR/coverage"

SYMLINKS="$(find "$WORK_DIR" -type l -print)"
if [ -n "$SYMLINKS" ]; then
  echo "Overwrite package contains symbolic links:" >&2
  printf '%s\n' "$SYMLINKS" >&2
  exit 1
fi

rm -f "$ZIP_PATH"
(cd "$WORK_DIR" && zip -qr "$ZIP_PATH" .)
node "$ROOT_DIR/tools/verify-overwrite-zip.js" "$ZIP_PATH"

echo "$ZIP_PATH"
