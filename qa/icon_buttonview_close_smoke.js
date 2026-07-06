const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }
function must(condition, message) { if (!condition) { console.error(`FAIL icon button view close smoke: ${message}`); process.exit(1); } }
const html = read('index.html');
const app = read('src/app.js');
const css = read('assets/css/studio.css');
const sw = read('sw.js');
const manifest = JSON.parse(read('manifest.webmanifest'));
const pkg = JSON.parse(read('package.json'));
must(pkg.version === '1.3.83', 'package version should be 1.3.83');
must(html.includes('data-build="1.3.83"'), 'index build should be v1.3.83');
must(app.includes("const APP_VERSION = 'Pro v1.3.83'"), 'app version should be Pro v1.3.83');
must(app.includes("const SHARED_DSP_PROFILE_VERSION = 'v1.3.83-pc-dock-modal-hardfix'"), 'DSP slug should be v1.3.83');
must(html.includes('assets/icons/foxbear-icon-512.png?v=1.3.83-pc-dock-modal-hardfix'), '512 icon link should use new icon');
must(html.includes('assets/icons/apple-touch-icon.png?v=1.3.83-pc-dock-modal-hardfix'), 'apple touch icon should use generated icon');
must(html.includes('data-feature-dialog-close="true"'), 'feature dialog close button must have explicit close hook');
must(app.includes('function closeFeatureDialogFromEvent'), 'hard close event helper missing');
must(app.includes("hardSetModalState(el.featureDialog, true, 'feature-dialog-open')"), 'openFeatureDialog must hard-sync modal pointer events');
must(app.includes("['pointerup', 'click', 'touchend']"), 'feature dialog fallback must cover pointer/mouse/click/touch close paths');
must(css.includes('v1.3.83 PC Dock / Modal Hard Fix'), 'CSS close repair section missing');
must(css.includes('#featureDialogClose') && css.includes('pointer-events: auto'), 'close button z-index/pointer fix missing');
must(!/PATCH_NOTES_v1\.3\.80\.md/.test(fs.readdirSync(root).join('\n')), 'no per-version patch notes should be created');
const iconSizes = new Set(manifest.icons.map(icon => icon.sizes));
['48x48','72x72','96x96','128x128','144x144','152x152','180x180','192x192','384x384','512x512'].forEach(size => must(iconSizes.has(size), `manifest missing icon size ${size}`));
['foxbear-icon-16.png','foxbear-icon-32.png','foxbear-icon-192.png','foxbear-icon-512.png','apple-touch-icon.png','foxbear-music.png'].forEach(name => {
  must(fs.existsSync(path.join(root, 'assets/icons', name)), `missing generated icon ${name}`);
  must(sw.includes(`./assets/icons/${name}`), `service worker should precache ${name}`);
});
console.log('PASS icon button view close smoke');
