# CI Hook Lifecycle Hardening 1.5.39

## Failure

GitHub Actions failed during `npm ci` because the npm `prepare` lifecycle executed `tools/install-git-hooks.sh`, while the applied cumulative overwrite package did not contain `.githooks/pre-commit`. The script ran `chmod` under `set -e` and terminated dependency installation.

## Root cause

A local developer convenience was incorrectly attached to a mandatory package-install lifecycle. This coupled CI, archive completeness, filesystem permissions, and Git checkout shape to dependency installation.

## Fix

- Remove `prepare` from `package.json`.
- Keep `npm run hooks:install` as an explicit local command only.
- Make the installer return success when CI, Git, the hook file, permissions, or config are unavailable.
- Use `npm ci --ignore-scripts` in deployment workflows.
- Include `.githooks` in cumulative overwrite archives.
- Validate lifecycle scripts and archive-required files during the release gate.

## Reverse checks

The regression test creates a temporary Git repository without the hook, executes the installer, and requires exit code 0. It repeats the test under CI variables and with a valid hook, then verifies the configured hooks path and executable permission.
