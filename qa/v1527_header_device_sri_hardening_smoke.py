#!/usr/bin/env python3
"""Regression guard for persistent device glyphs and SRI tag hardening."""
from __future__ import annotations

import importlib.util
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_module(name: str, relative: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    if spec is None or spec.loader is None:
        raise RuntimeError(f'cannot load {relative}')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    css = (ROOT / 'assets/css/header-command-bar.css').read_text(encoding='utf-8')
    app = (ROOT / 'src/app.js').read_text(encoding='utf-8')

    require('brand-command-device-icons' in html and 'class="is-screen"' in html and 'class="is-phone"' in html,
            'desktop/phone glyph markup missing from header')
    require('border-bottom: 0 !important' in css, 'header divider must remain removed')
    compact = css.split('@media (max-width: 430px)', 1)[-1]
    require(re.search(r'\.brand-command-device-icons\s*\{[^}]*display:\s*inline-flex', compact, re.S) is not None,
            'device glyphs must remain visible below 430px')
    require('renderAdminStatsTriggerContent' in app, 'runtime compatibility badge renderer missing')
    require("screen.className = 'is-screen'" in app and "phone.className = 'is-phone'" in app,
            'runtime renderer must rebuild both device glyphs after admin-state refresh')
    require('el.adminStatsTrigger.textContent = visible ?' not in app,
            'admin-state refresh must not erase structured device glyph markup')
    require('/ integrity=' not in html, 'malformed SRI slash remains in index.html')

    update_sri = load_module('foxbear_update_sri', 'tools/update-sri.py')
    verifier = load_module('foxbear_verify_sri', 'qa/verify_sri.py')
    malformed = '<link rel="stylesheet" href="assets/css/header-command-bar.css?v=test" / integrity="sha384-bad">'
    match = update_sri.TAG_RE.search(malformed)
    require(match is not None, 'SRI updater test fixture did not match')
    repaired = update_sri.update_tag(match)
    require('/ integrity=' not in repaired and repaired.endswith(' />'),
            f'SRI updater did not normalize malformed self-closing tag: {repaired}')
    require(len(update_sri.INTEGRITY_RE.findall(repaired)) == 1,
            'SRI updater must leave exactly one integrity attribute')

    missing = '<script defer src="src/app.js"></script>'
    missing_failures = verifier.validate_html(missing, ROOT)
    require(any('expected exactly one SHA-384 integrity attribute' in failure for failure in missing_failures),
            'SRI verifier did not reject a local script without integrity')
    malformed_failures = verifier.validate_html(malformed, ROOT)
    require(any('malformed self-closing slash' in failure for failure in malformed_failures),
            'SRI verifier did not reject a slash placed before integrity')
    require(verifier.validate_html(html, ROOT) == [], 'current index.html fails hardened SRI validation')

    print('PASS v1.5.27 persistent device glyph and SRI hardening smoke')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
