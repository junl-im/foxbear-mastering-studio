FoxBear v1.6.100 - Spectrum deletion-only CI hotfix

WHY
GitHub Actions run 31779362660 fails Source Hygiene because these retired files are still tracked in commit 5da37527a0bc2e860de461894f85747465626b07:
  src/ui/spectrum-visualizer.js
  assets/css/spectrum-visualizer.css

WINDOWS / GITHUB DESKTOP
1. Extract this hotfix anywhere INSIDE the FoxBear repository (repo root is recommended).
2. Run APPLY_SPECTRUM_DELETE_NO_GIT.cmd.
3. It must print PASS for BOTH files.
4. Open GitHub Desktop.
5. Confirm BOTH paths are shown as Deleted.
6. Commit the deletions with: Remove retired spectrum visualizer assets
7. Push origin.

IMPORTANT
- Git CLI is NOT required.
- Merely copying or committing this helper does NOT fix CI.
- The commit pushed to GitHub must contain BOTH file deletions.
- Do not weaken Source Hygiene or restore these files; the UI was intentionally retired.
