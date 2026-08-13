@echo off
setlocal
cd /d "%~dp0"
node tools\apply-delete-paths.js || exit /b 1
node tools\repair-source-hygiene.js || exit /b 1
node tools\check-source-hygiene.js || exit /b 1
echo [FoxBear] Patch cleanup complete. Commit the displayed deletions in GitHub Desktop or Git.
