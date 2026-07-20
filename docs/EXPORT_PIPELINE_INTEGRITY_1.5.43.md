# v1.5.43 Export Pipeline Integrity

- Restores the ZIP export service as an actual `index.html` runtime entry instead of only precaching and testing the file.
- Makes runtime health require the ZIP guard, progress view, and export service globals.
- Fails visibly when the ZIP module is unavailable instead of silently ignoring the button click.
- Canonicalizes every local JS/CSS tag to exactly one SHA-384 integrity attribute.
- Extends archive verification so required runtime assets must exist and be loaded exactly once.
- Uses Blob inputs directly in capable browser workers, avoiding eager full-file ArrayBuffer copies before JSZip generation.
- Retains an ArrayBuffer compatibility path only where worker Blob input is unavailable.
