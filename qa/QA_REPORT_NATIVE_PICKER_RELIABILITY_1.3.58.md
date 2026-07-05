# QA Report - v1.3.58 Native File/Folder Picker Reliability

## Scope
- Verify that file/folder open tiles no longer depend on a JS-only programmatic click path.
- Verify that mobile/PWA/in-app browsers can trigger native file picker through a direct label-to-input activation path.
- Verify that keyboard fallback and drag/drop path remain available.

## Checks
- `fileDrop` is a native `<label for="fileInput">`.
- `folderDrop` is a native `<label for="folderInput">`.
- File/folder inputs use `native-picker-input` visual hiding instead of display-none hiding.
- Legacy tile click handlers that directly call `openUploadPicker()` were removed from the primary tap path.
- `bindNativeUploadLabel()` keeps haptic/active styling and keyboard fallback.
- Existing broad audio extension accept list remains on file and folder input.

## Result
PASS
