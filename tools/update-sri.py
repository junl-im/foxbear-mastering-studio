#!/usr/bin/env python3
"""Update SHA-384 SRI hashes in index.html for local script/link assets."""
from __future__ import annotations

import base64
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'index.html'
TAG_RE = re.compile(r'<(?:script|link)\b[^>]*(?:src|href)="[^"]+"[^>]*>')
ASSET_RE = re.compile(r'(?:src|href)="([^"]+)"')
INTEGRITY_RE = re.compile(r'integrity="sha384-[^"]+"')


def sri_for(path: Path) -> str:
    digest = hashlib.sha384(path.read_bytes()).digest()
    return 'sha384-' + base64.b64encode(digest).decode('ascii')


def update_tag(match: re.Match[str]) -> str:
    tag = match.group(0)
    asset_match = ASSET_RE.search(tag)
    if not asset_match:
        return tag
    asset = asset_match.group(1).split('?', 1)[0]
    asset_path = ROOT / asset
    if not asset_path.is_file():
        return tag
    integrity = f'integrity="{sri_for(asset_path)}"'
    if INTEGRITY_RE.search(tag):
        return INTEGRITY_RE.sub(integrity, tag)
    self_closing = tag.rstrip().endswith('/>')
    base = tag.rstrip()[:-2].rstrip() if self_closing else tag.rstrip()[:-1].rstrip()
    return f"{base} {integrity}{' />' if self_closing else '>'}"


def main() -> int:
    original = INDEX.read_text(encoding='utf-8')
    updated = TAG_RE.sub(update_tag, original)
    if updated != original:
        INDEX.write_text(updated, encoding='utf-8')
        print('Updated SRI hashes in index.html')
    else:
        print('SRI hashes already up to date')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
