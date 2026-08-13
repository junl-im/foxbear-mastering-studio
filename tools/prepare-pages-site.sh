#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_DIR="${ROOT_DIR}/_site"

cd "${ROOT_DIR}"
rm -rf "${SITE_DIR}"
mkdir -p "${SITE_DIR}"

required_files=(index.html 404.html external-browser.html foxbear-root.json manifest.webmanifest sw.js)
for file in "${required_files[@]}"; do
  test -f "${file}" || { echo "Missing required deploy file: ${file}" >&2; exit 1; }
  cp "${file}" "${SITE_DIR}/${file}"
done

optional_files=(robots.txt design-preview.html CNAME)
for file in "${optional_files[@]}"; do
  if [ -f "${file}" ]; then
    cp "${file}" "${SITE_DIR}/${file}"
  fi
done

required_dirs=(assets src vendor)
for dir in "${required_dirs[@]}"; do
  test -d "${dir}" || { echo "Missing required deploy directory: ${dir}" >&2; exit 1; }
  cp -R "${dir}" "${SITE_DIR}/${dir}"
done

touch "${SITE_DIR}/.nojekyll"

test -f "${SITE_DIR}/index.html"
test -f "${SITE_DIR}/404.html"
test -f "${SITE_DIR}/external-browser.html"
test -f "${SITE_DIR}/foxbear-root.json"
test -f "${SITE_DIR}/manifest.webmanifest"
test -f "${SITE_DIR}/sw.js"
test -d "${SITE_DIR}/assets"
test -d "${SITE_DIR}/src"

if find "${SITE_DIR}" -type l -print -quit | grep -q .; then
  echo "GitHub Pages artifact must not contain symbolic links." >&2
  find "${SITE_DIR}" -type l -ls >&2
  exit 1
fi

if find "${SITE_DIR}" -type f -links +1 -print -quit | grep -q .; then
  echo "GitHub Pages artifact must not contain hard links." >&2
  find "${SITE_DIR}" -type f -links +1 -ls >&2
  exit 1
fi

echo "Static artifact file count: $(find "${SITE_DIR}" -type f | wc -l)"
echo "Static artifact size: $(du -sh "${SITE_DIR}" | cut -f1)"
find "${SITE_DIR}" -maxdepth 3 -type f | sort
