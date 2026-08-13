FoxBear v1.6.95 - PATCH_MANIFEST deletion commit hotfix

WHY THIS EXISTS
The previous hotfix files were committed, but PATCH_MANIFEST.json itself was not deleted in commit 561ef214.
A ZIP overwrite cannot delete an existing tracked Git file by itself.

WINDOWS / GITHUB DESKTOP
1. Extract this ZIP anywhere INSIDE the local FoxBear repository (repository root is best).
2. Double-click APPLY_MANIFEST_DELETE_AND_COMMIT.cmd.
3. The script runs git rm and creates a commit containing ONLY the PATCH_MANIFEST.json deletion.
4. Open GitHub Desktop and Push origin.
5. Re-run/check GitHub Actions.

EXPECTED SUCCESS
- PATCH_MANIFEST.json no longer exists.
- git ls-files PATCH_MANIFEST.json returns nothing.
- latest local commit message is:
  Remove legacy PATCH_MANIFEST for strict source hygiene
- node tools/check-source-hygiene.js passes.

IMPORTANT
Do not merely copy/commit this hotfix script. It must be RUN once, because ZIP extraction cannot represent deletion of an existing tracked file.
