#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { getReleaseMetadata } = require('../tools/release-metadata');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { console.error(`FAIL v1.5.10 header settings relocation smoke: ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };
const meta = getReleaseMetadata();

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const view = read('src/ui/mobile-native-view.js');
const css = read('assets/css/mobile-native.css');
const browserSpec = read('qa/browser/runtime-health-playwright.spec.js');
const changelog = read('CHANGELOG.md');
const handoff = read('HANDOFF.md');
const status = read('STATUS.md');

assert(pkg.version === meta.productVersion, 'package version should match release metadata');
assert(pkg.qaChecks.includes('node qa/v1510_header_settings_relocation_smoke.js'), 'v1.6.46 smoke missing from package QA');

const designerIndex = index.indexOf('class="designer-mini designer-mini-link"');
const hostIndex = index.indexOf('id="headerSettingsHost"');
const rightActionsEnd = index.indexOf('</div>', hostIndex);
assert(designerIndex >= 0 && hostIndex > designerIndex && rightActionsEnd > hostIndex, 'settings host must follow the designer card inside the right action group');

assert(view.includes("const headerHost = doc.getElementById('headerSettingsHost')"), 'view must resolve the header settings host');
assert(view.includes("layer.dataset.placement = headerHost ? 'header' : 'floating-fallback'"), 'view must expose header/fallback placement');
assert(view.includes('(headerHost || doc.body).appendChild(layer)'), 'settings trigger must mount into the header host');
assert(view.includes('doc.body.append(bulkHudRestore, panel)'), 'panel and bulk HUD restore must remain body portals');
assert(view.includes('toggle.getBoundingClientRect()'), 'panel placement must follow the header trigger geometry');
assert(view.includes("ariaLabel: '앱 설정 열기'"), 'settings trigger accessibility label missing');

assert(css.includes('.header-settings-host'), 'header settings host CSS missing');
assert(css.includes('.mobile-native-layer[data-placement="header"]'), 'header placement CSS missing');
assert(css.includes("content: '설정'"), 'desktop settings text label missing');
assert(css.includes('position: fixed !important;') && css.includes('--mobile-native-panel-top'), 'settings panel must use a viewport-safe fixed portal');
assert(css.includes('body > .bulk-import-hud-restore'), 'bulk HUD restore must stay independent from header layout');
assert(css.includes('@media (max-width: 920px)') && css.includes('@media (max-width: 420px)'), 'responsive header settings breakpoints missing');

assert(browserSpec.includes('hostParentClass') && browserSpec.includes("placement).toBe('header')"), 'browser QA must verify header mounting');
assert(browserSpec.includes("page.locator('#mobileNativeQuickToggle').click()") && browserSpec.includes("page.locator('#mobileNativePanel')).toBeVisible()"), 'browser QA must open and verify the settings panel');

assert(changelog.startsWith(`# v${meta.productVersion} -`), 'CHANGELOG current entry missing');
assert(handoff.startsWith(`# Handoff - v${meta.productVersion}`), 'HANDOFF current entry missing');
assert(status.includes(`Product version: \`${meta.productVersion}\``) && status.includes(`Build ID: \`${meta.buildId}\``), 'STATUS current release metadata missing');

console.log('PASS v1.5.10 header settings relocation smoke');
