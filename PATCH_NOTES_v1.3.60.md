# Patch Notes — FoxBear AI Mastering Studio Pro v1.3.60

## Fixed
- Restored robust file/folder loading with a hybrid picker path.
- Improved hidden file input CSS so native picker activation is not suppressed by negative z-index/clipping.
- Enlarged mobile upload tiles to keep 파일열기/폴더열기 visible and tappable.
- Expanded hover/touch help tooltips across Dock, preview controls, sliders, snapshots, and admin controls.
- Separated button feature groups into `마스터링 엔진` and `비교 · 관리 도구`.
- Added handling for `abDifferenceListen` in utility feature toggles.

## Validation
- `npm run check` passed after patch.
- SRI hashes in `index.html` were regenerated for changed app/CSS assets.
- Service worker cache key was bumped to `foxbear-shell-v1.3.60-upload-tooltip-hotfix`.
