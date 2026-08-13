@echo off
setlocal
cd /d "%~dp0"
where git >nul 2>&1 || (echo [FoxBear] FAIL: Git is required for CI hotfix cleanup. & exit /b 1)
where node >nul 2>&1 || (echo [FoxBear] FAIL: Node.js is required for CI hotfix cleanup. & exit /b 1)
git rev-parse --show-toplevel >nul 2>&1 || (echo [FoxBear] FAIL: Run this file from the extracted repository root. & exit /b 1)
node tools\apply-delete-paths.js || exit /b 1
node tools\check-source-hygiene.js || exit /b 1
if exist PATCH_MANIFEST.json (echo [FoxBear] FAIL: PATCH_MANIFEST.json still exists. & exit /b 1)
git ls-files --error-unmatch -- PATCH_MANIFEST.json >nul 2>&1 && (echo [FoxBear] FAIL: PATCH_MANIFEST.json is still tracked. & exit /b 1)
echo [FoxBear] PASS: cleanup complete. Git deletion is staged for commit.
git status --short
echo [FoxBear] Commit and push the staged deletion in GitHub Desktop or Git.
