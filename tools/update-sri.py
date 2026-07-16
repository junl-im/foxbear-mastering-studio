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
MISPLACED_SELF_CLOSE_RE = re.compile(r'\s+/\s+(?=integrity=)')


def sri_for(path: Path) -> str:
    digest = hashlib.sha384(path.read_bytes()).digest()
    return 'sha384-' + base64.b64encode(digest).decode('ascii')


def normalize_tag_shape(tag: str) -> tuple[str, bool]:
    """Repair a slash accidentally placed before integrity and preserve void-tag style."""
    misplaced_self_close = bool(MISPLACED_SELF_CLOSE_RE.search(tag))
    normalized = MISPLACED_SELF_CLOSE_RE.sub(' ', tag)
    self_closing = misplaced_self_close or normalized.rstrip().endswith('/>')
    return normalized, self_closing


def finish_tag(tag: str, self_closing: bool) -> str:
    stripped = tag.rstrip()
    if self_closing:
        return re.sub(r'\s*/?>$', ' />', stripped)
    return re.sub(r'\s*>$', '>', stripped)


def update_tag(match: re.Match[str]) -> str:
    tag, self_closing = normalize_tag_shape(match.group(0))
    asset_match = ASSET_RE.search(tag)
    if not asset_match:
        return finish_tag(tag, self_closing)
    asset = asset_match.group(1).split('?', 1)[0]
    asset_path = ROOT / asset
    if not asset_path.is_file():
        return finish_tag(tag, self_closing)
    integrity = f'integrity="{sri_for(asset_path)}"'
    if INTEGRITY_RE.search(tag):
        return finish_tag(INTEGRITY_RE.sub(integrity, tag), self_closing)
    base = tag.rstrip()[:-2].rstrip() if self_closing and tag.rstrip().endswith('/>') else tag.rstrip()[:-1].rstrip()
    return finish_tag(f'{base} {integrity}>', self_closing)


def main() -> int:
    original = INDEX.read_text(encoding='utf-8')
    updated = TAG_RE.sub(update_tag, original)
    if updated != original:
        INDEX.write_text(updated, encoding='utf-8')
        print('Updated SRI hashes and normalized local asset tags in index.html')
    else:
        print('SRI hashes already up to date')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
