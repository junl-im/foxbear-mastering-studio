const fs = require('fs');

function must(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
}

const app = fs.readFileSync('src/app.js', 'utf8');
const css = fs.readFileSync('assets/css/studio.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

must(app.includes('function openUploadPicker'), 'upload picker dispatcher missing');
must(app.includes('showOpenFilePicker'), 'system file picker fallback missing');
must(app.includes('showDirectoryPicker'), 'system directory picker fallback missing');
must(app.includes('collectFilesFromDirectoryHandle'), 'directory traversal helper missing');
must(app.includes("openUploadPicker('file')"), 'file tile does not use robust picker helper');
must(app.includes("openUploadPicker('folder')"), 'folder tile does not use robust picker helper');
must(app.includes('supportsDirectoryInput'), 'directory input support detector missing');
must(app.includes('clickNativeFileInput'), 'native input click fallback missing');
must(css.includes('input[type="file"].hidden'), 'file input mobile hidden override missing');
must(!css.match(/input\[type="file"\]\.hidden[\s\S]{0,220}display:\s*none/i), 'file input still force-hidden in hotfix block');
must(html.includes('id="fileInput"') && html.includes('id="folderInput"'), 'file/folder inputs missing');
must(html.includes('webkitdirectory') && html.includes('directory'), 'folder input directory attributes missing');
must(sw.includes('networkFirst(request)'), 'service worker navigation network-first update missing');
must(sw.includes('staleWhileRevalidate(request)'), 'service worker stale-while-revalidate missing');

console.log('PASS file/folder open hotfix smoke');
