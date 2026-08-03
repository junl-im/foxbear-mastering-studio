#!/usr/bin/env node
const fs = require('fs');
const app = fs.readFileSync('src/app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('assets/css/mobile-native.css', 'utf8');
const manifest = fs.readFileSync('manifest.webmanifest', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const pkg = fs.readFileSync('package.json', 'utf8');
function must(condition, message) {
  if (!condition) {
    console.error(`FAIL mobile_native_ux_smoke: ${message}`);
    process.exit(1);
  }
}
must(app.includes("const APP_VERSION = 'Pro v1.6.50'"), 'app version should be v1.4.0');
must(html.includes('data-build="1.6.50"'), 'index build should be v1.6.50');
must(html.includes('manifest.webmanifest') && html.includes('assets/css/mobile-native.css'), 'manifest/mobile CSS links missing');
must(app.includes('function initMobileNativeUx') && app.includes('Screen Wake') === false, 'mobile native init missing');
must(app.includes('navigator.wakeLock.request') && app.includes('foxBearHaptic') && app.includes('navigator.mediaSession'), 'wake lock, haptic, or media session code missing');
must(app.includes('processPwaShareTargetLaunch') && app.includes('MOBILE_NATIVE_SHARE_QUERY'), 'share target launch importer missing');
must(app.includes('maybeRequestPersistentStorage') && app.includes('navigator.storage.persist'), 'persistent storage support missing');
must(app.includes('setNativeBadge') && app.includes('navigator.setAppBadge'), 'badging support missing');
must(app.includes('waveform-jump-chip') && app.includes('jumpDockToImportantPeak'), 'peak jump quick action missing');
must(css.includes('.mobile-native-layer') && css.includes('.mobile-native-panel') && css.includes('.waveform-jump-chip-row'), 'mobile native CSS missing');
const parsed = JSON.parse(manifest);
must(parsed.display === 'standalone' && parsed.share_target && parsed.icons && parsed.icons.length, 'PWA manifest/share target incomplete');
must(sw.includes('handleShareTarget') && sw.includes('indexedDB.open') && sw.includes('Response.redirect'), 'service worker share target handler missing');
must(pkg.includes('mobile_native_ux_smoke.js') && pkg.includes('node --check sw.js'), 'package check missing mobile native smoke or service worker syntax check');
console.log('PASS mobile native UX smoke');
