#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { console.error(`FAIL v1.5.2 export guard low-memory smoke: ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };

const pkg = JSON.parse(read('package.json'));
const app = read('src/app.js');
const guard = read('src/download/export-guard-service.js');
const zipService = read('src/download/zip-export-service.js');
const index = read('index.html');
const sw = read('sw.js');
const browserBulk = read('qa/browser/bulk-35-import-master-export-playwright.spec.js');
const readme = read('README.md');
const handoff = read('HANDOFF.md');
const qaReport = read('qa/QA_REPORT.md');
const changelog = read('CHANGELOG.md');

assert(pkg.qaChecks.includes('node --check src/download/export-guard-service.js'), 'export guard syntax check missing');
assert(pkg.qaChecks.includes('node qa/v152_export_guard_low_memory_smoke.js'), 'v1.5.2 smoke missing from package QA');
assert(index.includes('src/download/export-guard-service.js?v=1.6.41-admin-secret-pin-session'), 'export guard not loaded in index');
assert(index.indexOf('src/download/download-service.js') < index.indexOf('src/download/export-guard-service.js'), 'export guard should load after download service');
assert(index.indexOf('src/download/export-guard-service.js') < index.indexOf('src/ui/download-dialog-view.js'), 'export guard should load before dialog/app dependencies');
assert(sw.includes('./src/download/export-guard-service.js?v=1.6.41-admin-secret-pin-session'), 'export guard not precached');
assert(guard.includes('v1.5.2-export-guard-low-memory-ux'), 'export guard version missing');
assert(guard.includes('prepareZipExportPlan'), 'zip export plan helper missing');
assert(guard.includes('validateZipBlob'), 'zip blob validation helper missing');
assert(guard.includes('getLowMemoryAdvice'), 'low-memory advice helper missing');
assert(guard.includes('classifyMemoryPressure'), 'memory pressure classifier missing');
assert(guard.includes('getExportReadiness'), 'export readiness helper missing');
assert(app.includes('getExportGuardService'), 'app export guard accessor missing');
assert(app.includes('prepareZipExportPlan?.(completed'), 'downloadZip should use export guard plan');
assert(zipService.includes('validateZipBlob?.(zipBlob'), 'delegated ZIP service should validate generated ZIP blob');
assert(app.includes('FoxBearExportGuard'), 'browser console export guard bridge missing');
assert(zipService.includes('ZIP 검증 실패'), 'ZIP validation failure UX missing');
assert(app.includes('ZIP/export 전 곡별 저장도 준비하세요'), 'low-memory UX toast missing');
assert(browserBulk.includes('FoxBearExportGuard') && browserBulk.includes('exportReadiness'), 'browser 35-track spec should inspect export readiness');
assert(readme.includes('v1.5.2') && readme.includes('Export Guard'), 'README missing v1.5.2 export guard notes');
assert(handoff.includes('v1.5.2') && handoff.includes('FoxBearExportGuard'), 'HANDOFF missing v1.5.2 handoff notes');
assert((qaReport.includes('183/183 PASS') || qaReport.includes('182/182 PASS') || qaReport.includes('178/178 PASS')) && qaReport.includes('v1.5.2'), 'QA report should record current PASS target and v1.5.2');
assert(changelog.startsWith('# v') && changelog.includes('# v1.5.2 - Export Guard + Low Memory UX'), 'CHANGELOG current heading or v1.5.2 history missing');
assert(app.split(/\r?\n/).length < 13300, 'app.js should stay below slim-down line budget');

console.log('PASS v1.5.2 export guard low-memory smoke');
