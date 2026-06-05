# Vendored third-party browser libraries

These files are bundled locally so the production CSP can use `script-src 'self'` without allowing external CDN scripts.

- `jszip/jszip.min.js`: JSZip 3.10.1, MIT or GPLv3. See `jszip/LICENSE.markdown`.
- `lamejs/lame.min.js`: lamejs 1.2.1, LGPL-3.0. See `lamejs/LICENSE`.

Do not replace these with remote CDN URLs unless the CSP and QA report are updated intentionally.
