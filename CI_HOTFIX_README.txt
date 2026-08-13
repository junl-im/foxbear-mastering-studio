FoxBear v1.6.95 CI Source Hygiene Hotfix

Purpose
- Remove legacy PATCH_MANIFEST.json from the working tree.
- Stage tracked delete paths with git rm so GitHub Desktop cannot miss the deletion.
- Re-run strict source hygiene before commit/push.

Windows / GitHub Desktop
1. Extract this ZIP directly over the repository root.
2. Double-click APPLY_PATCH_CLEANUP.cmd.
3. Confirm GitHub Desktop shows PATCH_MANIFEST.json as Deleted.
4. Commit and push.

macOS / Linux
1. Extract this ZIP over the repository root.
2. Run: ./APPLY_PATCH_CLEANUP.sh
3. Confirm: git status --short
4. Commit and push.

Expected result
- PATCH_MANIFEST.json does not exist.
- git ls-files PATCH_MANIFEST.json returns no entry.
- node tools/check-source-hygiene.js passes.
