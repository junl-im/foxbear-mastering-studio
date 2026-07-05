const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const css = fs.readFileSync('assets/css/studio.css', 'utf8');
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL native_picker_reliability_smoke: ${message}`);
    process.exit(1);
  }
}
assert(/<label id="fileDrop"[\s\S]*?<input type="file" id="fileInput"/.test(html), 'fileDrop must contain native fileInput');
assert(/<label id="folderDrop"[\s\S]*?<input type="file" id="folderInput"/.test(html), 'folderDrop must contain native folderInput');
assert(/id="fileInput"[^>]*class="[^"]*native-picker-input/.test(html), 'fileInput must use native-picker-input class');
assert(/id="folderInput"[^>]*class="[^"]*native-picker-input/.test(html), 'folderInput must use native-picker-input class');
assert(app.includes('function bindNativeUploadLabel'), 'native label binding helper missing');
assert(app.includes("bindNativeUploadLabel(el.fileDrop, el.fileInput, 'file')"), 'file native label binding missing');
assert(app.includes("bindNativeUploadLabel(el.folderDrop, el.folderInput, 'folder')"), 'folder native label binding missing');
assert(!app.includes("el.fileDrop.addEventListener('click', () => openUploadPicker('file'))"), 'legacy JS-only file tile click path must not be used');
assert(!app.includes("el.folderDrop.addEventListener('click', () => openUploadPicker('folder'))"), 'legacy JS-only folder tile click path must not be used');
assert(css.includes('.native-picker-label'), 'native picker label CSS missing');
assert(css.includes('input[type="file"].native-picker-input'), 'native picker input CSS missing');
console.log('PASS native_picker_reliability_smoke');
