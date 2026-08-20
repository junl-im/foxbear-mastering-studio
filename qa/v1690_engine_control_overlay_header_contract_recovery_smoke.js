'use strict';

const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('src/app.js', 'utf8');
const studioCss = fs.readFileSync('assets/css/studio.css', 'utf8');
const headerCss = fs.readFileSync('assets/css/header-command-bar.css', 'utf8');
const interaction = fs.readFileSync('src/ui/engine-control-interaction-service.js', 'utf8');
const diagnostics = fs.readFileSync('src/boot/performance-diagnostics.js', 'utf8');
const browserSpec = fs.readFileSync('qa/browser/runtime-health-playwright.spec.js', 'utf8');

const engineIds = ['masterGoalSelect', 'masterStyleSelect', 'masterStrengthSelect', 'platformPresetSelect'];
for (const id of engineIds) assert(interaction.includes(`'${id}'`), `engine control diagnostics must include ${id}`);

const modalOpen = app.slice(app.indexOf('function openSelectPopup'), app.indexOf('function closeSelectPopup'));
assert(modalOpen.includes('history: false'), 'select popup must not create browser-history sentinel state');
assert(modalOpen.includes('lockScroll: false'), 'select popup must not body-lock scrolling/touch through modal controller');
assert(modalOpen.includes('closeSelectPopup();\n            syncEnhancedSelectButtons();\n            if (changed) scheduleEnhancedSelectChange(select);'), 'select popup must close before applying the change handler');
assert(interaction.includes('global.requestAnimationFrame(run)'), 'select changes must yield a frame before synchronous setting handlers run');
assert(app.includes("scheduleRenderAll('master-goal-change'"), 'master goal changes must render through the scheduler');
assert(app.includes("scheduleRenderAll('master-style-change'"), 'master style changes must render through the scheduler');
assert(app.includes("scheduleRenderAll('master-strength-change'"), 'master strength changes must render through the scheduler');
assert(app.includes("scheduleRenderAll('platform-export-preset-change'"), 'platform preset changes must render through the scheduler');
assert(interaction.includes('global.FoxBearEngineControlDiagnostics = Object.freeze'), 'engine control diagnostics API must be exposed');
assert(interaction.includes('lastDispatchDurationMs'), 'engine diagnostics must measure setting-handler duration');

const backdropRule = studioCss.match(/\.select-popup-backdrop\s*\{([\s\S]*?)\n\}/)?.[1] || '';
const listRule = studioCss.match(/\.select-popup-list\s*\{([\s\S]*?)\n\}/)?.[1] || '';
assert(backdropRule.includes('touch-action: manipulation'), 'select popup backdrop must preserve tap gestures');
assert(!backdropRule.includes('touch-action: none'), 'select popup backdrop must not disable all touch gestures');
assert(listRule.includes('touch-action: pan-y'), 'select popup list must remain vertically scrollable on touch devices');

assert(interaction.includes('FoxBearEngineControlInteraction = api'), 'engine interaction service must be exposed');
assert(diagnostics.includes('FoxBearEngineControlDiagnostics?.getSnapshot?.()'), 'performance diagnostics must capture engine control state');
assert(diagnostics.includes('engineControls,'), 'performance snapshot must expose engineControls');
assert(diagnostics.includes('engine-control-body-lock'), 'diagnostics must flag an unexpected engine popup body lock');
assert(diagnostics.includes('engine-control-change-pending'), 'diagnostics must flag a stuck engine setting dispatch');

assert(headerCss.includes('--foxbear-header-contract: flex-two-rail-v1690'), 'header stylesheet must expose a generation contract marker');
assert(browserSpec.includes("getPropertyValue('--foxbear-header-contract')"), 'Runtime Health must read the header stylesheet contract marker');
assert(browserSpec.includes("toBe('flex-two-rail-v1690')"), 'Runtime Health must fail explicitly when stale/missing header CSS is served');
assert(browserSpec.includes('leftFlex: getComputedStyle(kicker).flex'), 'initial header failure diagnostics must include left flex ownership');
assert(browserSpec.includes('actionsFlex: getComputedStyle(actions).flex'), 'initial header failure diagnostics must include action flex ownership');
assert(fs.readFileSync('index.html', 'utf8').includes('src/ui/engine-control-interaction-service.js?v=1.6.110-ui-mode-early-boot-recovery'), 'engine interaction service must load before app');
assert(fs.readFileSync('sw.js', 'utf8').includes('./src/ui/engine-control-interaction-service.js?v=1.6.110-ui-mode-early-boot-recovery'), 'engine interaction service must be precached');

console.log('PASS v1.6.90 engine-control overlay isolation + header CSS contract recovery');
