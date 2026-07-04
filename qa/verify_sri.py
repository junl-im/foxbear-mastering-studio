#!/usr/bin/env python3
"""Validate SHA-384 SRI hashes in index.html against local assets."""
from __future__ import annotations

import base64
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'index.html'


def main() -> int:
    html = INDEX.read_text(encoding='utf-8')
    failures: list[str] = []
    tags = re.findall(r'<(?:script|link)[^>]+integrity="sha384-[^"]+"[^>]*>', html)
    for tag in tags:
        match = re.search(r'(?:src|href)="([^"]+)"', tag)
        if not match:
            continue
        asset = match.group(1).split('?', 1)[0]
        path = ROOT / asset
        if not path.is_file():
            failures.append(f'{asset}: missing local asset')
            continue
        actual = re.search(r'integrity="([^"]+)"', tag).group(1)
        expected = 'sha384-' + base64.b64encode(hashlib.sha384(path.read_bytes()).digest()).decode('ascii')
        if actual != expected:
            failures.append(f'{asset}: expected {expected}, found {actual}')
    if failures:
        print('FAIL SRI validation')
        for failure in failures:
            print('-', failure)
        return 1
    print('PASS SRI validation')
    return 0


if __name__ == '__main__':
    sys.exit(main())
