const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('assets/css/dock.css', 'utf8');
function must(cond, msg) { if (!cond) { console.error(msg); process.exit(1); } }
const order = [
  'bottomPreviewMasterPreviewBtn',
  'bottomPreviewMasterBtn',
  'bottomPreviewOriginalBtn',
  'bottomPreviewMasteredBtn'
].map(id => html.indexOf(`id="${id}"`));
must(order.every(i => i >= 0), 'all four dock action buttons must exist');
must(order[0] < order[1] && order[1] < order[2] && order[2] < order[3], 'dock action buttons should keep requested order');
must(html.includes('하이라이트') && html.includes('마스터링'), 'dock action labels must be updated');
must(css.includes('--foxbear-dock-contract: dedicated-owner-v16105;'), 'dedicated Dock CSS owner contract missing');
must(css.includes('grid-template-columns: minmax(0,1fr) minmax(120px,auto) minmax(0,1fr)'), 'dock controls should keep highlight/master/tabs layout');
must(css.includes('overflow-x: auto'), 'mobile dock fallback should scroll instead of wrapping');
console.log('PASS dock action single line smoke');
