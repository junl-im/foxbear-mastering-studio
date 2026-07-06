const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/studio.css'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'assets/css/dock.css'), 'utf8');
function assert(condition, message) {
  if (!condition) { console.error(`FAIL pc dock modal hardfix: ${message}`); process.exit(1); }
}
assert(app.includes('function installModalHardFixController'), 'modal hard fix controller missing');
assert(app.includes('installModalHardFixController();'), 'modal hard fix controller not installed before fallbacks');
assert(app.includes("['pointerup', 'click', 'touchend']"), 'modal close/open must handle pointerup click and touchend');
assert(app.includes("hardSetModalState(el.featureDialog, true, 'feature-dialog-open')"), 'feature open must hard sync DOM state');
assert(app.includes("hardSetModalState(dialog, false, 'feature-dialog-open')"), 'feature close must hard sync DOM state');
assert(app.includes("hardSetModalState(el.previewDialog, true, 'preview-dialog-open')"), 'preview open must hard sync DOM state');
assert(!/id="previewOpenBtn"[^>]*disabled/.test(html), 'preview open button must not ship disabled in HTML');
assert(app.includes('bottom-preview-play-label'), 'PC dock play button label missing');
assert(css.includes('grid-template-columns: minmax(140px, 1fr) minmax(260px, max-content)'), 'PC dock top info line must stay one row with right meta');
assert(css.includes('player-icon-play::before') && css.includes('content: none !important'), 'PC dock play icon pseudo reset missing');
assert(css.includes('min-width: 120px') && css.includes('max-width: min(42vw, 520px)'), 'genre width hardfix missing');
console.log('PASS pc dock modal hardfix smoke');
