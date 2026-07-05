const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('assets/css/studio.css', 'utf8');
const dockCss = fs.readFileSync('assets/css/dock.css', 'utf8');
function must(cond, msg) { if (!cond) { console.error(msg); process.exit(1); } }
const order = [
  'bottomPreviewMasterBtn',
  'bottomPreviewMasterPreviewBtn',
  'bottomPreviewOriginalBtn',
  'bottomPreviewMasteredBtn'
].map(id => html.indexOf(`id="${id}"`));
must(order.every(i => i >= 0), 'all four dock action buttons must exist');
must(order[0] < order[1] && order[1] < order[2] && order[2] < order[3], 'dock action buttons should keep left-to-right order');
must(html.includes('추천구간 미리듣기'), 'recommended-section preview label must remain');
must(css.includes('v1.3.69 Dock actions single-line compact layout'), 'single-line dock CSS override missing');
must(css.includes('flex-wrap: nowrap !important'), 'dock controls must not wrap');
must(css.includes('min-width: max-content !important'), 'dock buttons should size to their text');
must(dockCss.includes('v1.3.69 Dock action row'), 'dock.css single-line override missing');
console.log('PASS dock action single line smoke');
