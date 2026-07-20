#!/usr/bin/env python3
"""Validate local JS/CSS SHA-384 SRI coverage and tag shape in index.html."""
from __future__ import annotations

import base64
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'index.html'
TAG_RE = re.compile(r'<(?:script|link)\b[^>]*(?:src|href)="[^"]+"[^>]*>', re.IGNORECASE)
ASSET_RE = re.compile(r'(?:src|href)="([^"]+)"', re.IGNORECASE)
INTEGRITY_ATTR_RE = re.compile(r'integrity="([^"]*)"', re.IGNORECASE)
MISPLACED_SELF_CLOSE_RE = re.compile(r'\s+/\s+(?=integrity=)', re.IGNORECASE)


def is_local_code_asset(asset: str) -> bool:
    value = str(asset or '').strip()
    if not value or value.startswith(('#', 'data:', 'blob:', '//')):
        return False
    if re.match(r'^[a-z][a-z0-9+.-]*:', value, re.IGNORECASE):
        return False
    clean = value.split('?', 1)[0].split('#', 1)[0].lower()
    return clean.endswith(('.js', '.css'))


def expected_sri(path: Path) -> str:
    digest = hashlib.sha384(path.read_bytes()).digest()
    return 'sha384-' + base64.b64encode(digest).decode('ascii')


def validate_html(html: str, root: Path = ROOT) -> list[str]:
    failures: list[str] = []
    seen_assets: set[str] = set()
    for tag in TAG_RE.findall(html):
        asset_match = ASSET_RE.search(tag)
        if not asset_match:
            continue
        asset_url = asset_match.group(1)
        if not is_local_code_asset(asset_url):
            continue
        asset = asset_url.split('?', 1)[0].split('#', 1)[0]
        seen_assets.add(asset)
        if MISPLACED_SELF_CLOSE_RE.search(tag):
            failures.append(f'{asset}: malformed self-closing slash before integrity')
        integrity_matches = INTEGRITY_ATTR_RE.findall(tag)
        if len(integrity_matches) != 1:
            failures.append(f'{asset}: expected exactly one SHA-384 integrity attribute, found {len(integrity_matches)}')
            continue
        if not integrity_matches[0].startswith('sha384-'):
            failures.append(f'{asset}: integrity attribute must contain one SHA-384 value')
            continue
        path = root / asset
        if not path.is_file():
            failures.append(f'{asset}: missing local asset')
            continue
        actual = integrity_matches[0]
        expected = expected_sri(path)
        if actual != expected:
            failures.append(f'{asset}: expected {expected}, found {actual}')
    if not seen_assets:
        failures.append('index.html: no local JavaScript or CSS assets were inspected')
    return failures


def main() -> int:
    failures = validate_html(INDEX.read_text(encoding='utf-8'))
    if failures:
        print('FAIL SRI validation')
        for failure in failures:
            print('-', failure)
        return 1
    print('PASS SRI validation')
    return 0


if __name__ == '__main__':
    sys.exit(main())
