#!/usr/bin/env bash
# Optional local developer convenience. This script must never make npm install,
# CI, archive verification, or a non-Git checkout fail.
set -u

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd)" || exit 0
cd "$root_dir" 2>/dev/null || exit 0

is_truthy() {
  case "${1:-}" in
    1|true|TRUE|yes|YES|on|ON) return 0 ;;
    *) return 1 ;;
  esac
}

if { is_truthy "${CI:-}" || is_truthy "${GITHUB_ACTIONS:-}"; } && ! is_truthy "${FOXBEAR_INSTALL_GIT_HOOKS:-}"; then
  echo "[FoxBear] CI detected; optional Git hook installation skipped."
  exit 0
fi

if ! command -v git >/dev/null 2>&1; then
  echo "[FoxBear] Git is unavailable; optional hook installation skipped."
  exit 0
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[FoxBear] Git worktree not found; optional hook installation skipped."
  exit 0
fi

hook_dir="$root_dir/.githooks"
hook_file="$hook_dir/pre-commit"
if [ ! -f "$hook_file" ]; then
  echo "[FoxBear] $hook_file is missing; optional hook installation skipped."
  exit 0
fi

if ! chmod +x "$hook_file" 2>/dev/null; then
  echo "[FoxBear] Unable to mark the optional pre-commit hook executable; skipped."
  exit 0
fi

if ! git config core.hooksPath .githooks >/dev/null 2>&1; then
  echo "[FoxBear] Unable to configure the optional Git hooks path; skipped."
  exit 0
fi

echo "[FoxBear] Local Git hooks enabled from .githooks."
exit 0
