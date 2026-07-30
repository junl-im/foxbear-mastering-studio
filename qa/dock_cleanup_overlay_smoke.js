const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'css', 'studio.css'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(!index.includes('bottomPreviewCompareTools'), 'Dock compare tools block should be removed from index');
assert(!index.includes('bottomPreviewAbMatchBtn'), 'Dock level match button should be removed from index');
assert(!index.includes('bottomPreviewDifferenceBtn'), 'Dock difference listen button should be removed from index');
assert(app.includes('const differenceReady = false;'), 'Dock playback must not enter hidden difference-listen mode');
assert(app.includes('const gainDb = 0;'), 'Dock playback must not apply hidden loudness match gain');
assert(app.includes('function syncBottomPreviewFloatingOffset()'), 'Floating overlay offset sync function is required');
assert(app.includes("setProperty('--bottom-preview-height'"), 'Dock height CSS variable must be updated dynamically');
assert(app.includes("setProperty('--bottom-preview-floating-bottom'"), 'Floating overlay bottom CSS variable must be updated dynamically');
assert(css.includes('--bottom-preview-floating-bottom'), 'CSS must consume floating overlay bottom variable');
assert(css.includes('.bottom-preview-compare-tools') && css.includes('display: none !important'), 'Legacy compare tools CSS should be hidden defensively');
assert(index.includes('v1.6.42') && app.includes('Pro v1.6.42'), 'Version should be v1.6.42');
console.log('PASS dock cleanup overlay smoke');
