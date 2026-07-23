#!/usr/bin/env node
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const css = fs.readFileSync('assets/css/studio.css', 'utf8') + '\n' + fs.readFileSync('assets/css/dock.css', 'utf8');
function must(condition, message) {
  if (!condition) {
    console.error(`FAIL mobile_dock_layout_smoke: ${message}`);
    process.exit(1);
  }
}
must(app.includes("const APP_VERSION = 'Pro v1.5.84'"), 'app version should be v1.4.0');
must(html.includes('data-build="1.5.84"'), 'index build should be v1.5.84');
must(app.includes('function installBottomPreviewLayoutObserver()'), 'Dock layout observer installer missing');
must(app.includes('new ResizeObserver(scheduleBottomPreviewLayoutSync)'), 'ResizeObserver should track Dock size changes');
must(app.includes('window.visualViewport.addEventListener'), 'visualViewport listeners missing');
must(app.includes("window.addEventListener('orientationchange'"), 'orientationchange listener missing');
must(app.includes("window.addEventListener('pageshow'"), 'pageshow listener missing');
must(app.includes("setProperty('--bottom-preview-panel-bottom'"), 'download panel bottom CSS variable missing');
must(css.includes('v1.3.54 Dock Player Polish') || css.includes('v1.3.52 Mobile Dock Layout Final QA'), 'final Dock CSS block missing');
must(css.includes('--bottom-preview-panel-bottom'), 'panel bottom variable not consumed by CSS');
must(css.includes('max-height: min(50dvh, 276px)'), 'mobile Dock max-height guard missing');
must(css.includes('.bottom-preview-translation-btn') && css.includes('white-space: nowrap !important'), 'button no-wrap guard missing');
must(css.includes('body.bottom-preview-active .download-options-backdrop'), 'download backdrop Dock offset missing');
must(css.includes('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 6px minmax(0, 1fr) minmax(0, 1fr)'), 'mobile Dock 4-button layout guard missing');
console.log('PASS mobile dock layout smoke');
