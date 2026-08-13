#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { console.error(`FAIL v1.5.72 bulk workflow/admin UI smoke: ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };

const pkg = JSON.parse(read('package.json'));
const app = read('src/app.js');
const hud = read('src/ui/bulk-import-hud-view.js');
const hudCss = read('assets/css/bulk-import-hud.css');
const adminView = read('src/ui/admin-incident-monitor-view.js');
const adminCss = read('assets/css/components/admin-incident-monitor.css');
const firebase = read('src/firebase-bootstrap.js');
const functions = read('functions/index.js');
const functionsPkg = JSON.parse(read('functions/package.json'));
const rules = read('firestore.rules');
const index = read('index.html');

assert(pkg.version === '1.6.94', 'package version should be v1.6.94');
assert(functionsPkg.version === '1.6.94', 'Functions package version should match the release');
assert(pkg.qaChecks.includes('node qa/v1572_bulk_workflow_admin_audit_mobile_ui_smoke.js'), 'release QA should include v1.6.94 smoke');

assert(hud.includes('navigateToMasterAllAfterBulkAnalysis') && hud.includes("getEl('masterAllBtn')"), 'bulk HUD view should own the one-time master-all navigation');
assert(app.includes("scheduleRender: reason => scheduleRenderAll(reason"), 'app should provide a render bridge without owning bulk navigation UI');
assert(app.includes('isActiveMasteringTrack') && app.includes("suppressedByBulk = bulkMasteringActive ? 'true' : 'false'"), 'single-track processing HUD should be suppressed during multi-mastering');
assert(hud.includes('detachTrackFromMasteringBatch') && hud.includes("track.bulkMasteringSource = 'single'"), 'single remaster should detach stale bulk membership');
assert(hud.includes("const VIEW_VERSION = '1.6.94-bulk-control-eta-result-filter'"), 'bulk HUD should expose v1.6.94 batch-list continuity contract');
assert(hud.includes("stateBadge.textContent = isCurrent ? '현재 진행'"), 'active mastering row should be clearly labeled');
assert(hud.includes("row.setAttribute('aria-current', 'step')"), 'active mastering row should expose accessible current-step state');
assert(hud.includes('lastAutoScrolledTrackId') && hud.includes('scheduleCurrentTrackNavigation') && hud.includes('latestList.scrollTo'), 'bulk list should follow the current track without repeated scrolling');
assert(hudCss.includes('.bulk-import-hud[data-phase="mastering"] .bulk-import-hud-actions') && hudCss.includes('justify-content: space-between'), 'multi-mastering should keep compact batch controls while prioritizing the result list');
assert(hudCss.includes('.bulk-import-row.is-current'), 'current mastering row should be visually emphasized');
assert(index.includes('aria-description="여러 곡 분석 및 마스터링 진행 결과"'), 'bulk list should describe combined analysis and mastering results');

assert(index.includes('id="adminIncidentDensityToggle"') && index.includes('id="adminIncidentCleanupUnconfirmed"'), 'admin compact view and cleanup controls should exist');
assert(index.includes('id="adminIncidentAuditSearch"') && index.includes('id="adminIncidentAuditExport"'), 'audit search and export controls should exist');
assert(adminView.includes('function applyAdminDensityMode') && adminView.includes('foxbear:admin-incident-density'), 'compact view preference should persist');
assert(adminView.includes('function requestMailTestCleanup') && adminView.includes('requestIncidentMailTestCleanup'), 'cleanup button should call the Firebase bridge');
assert(adminView.includes('function applyAuditFilters') && adminView.includes('function exportAuditLog') && adminView.includes('function loadAuditPage'), 'audit log should support search, export, and pagination');
assert(adminCss.includes('.admin-incident-compact .admin-summary-secondary'), 'compact mode should reduce secondary UI');
assert(adminCss.includes('#adminIncidentAuditRows td::before') && adminCss.includes('content: attr(data-label)'), 'mobile audit rows should become labeled detail cards');
assert(firebase.includes('requestIncidentMailTestCleanup') && firebase.includes('getIncidentMailTestCleanupRequest'), 'Firebase bridge should expose cleanup requests');
assert(functions.includes('exports.cleanupIncidentMailTestsRequest') && functions.includes('cleanupUnconfirmedMailTests'), 'Cloud Functions should preserve and resolve old unconfirmed tests');
assert(rules.includes('match /incidentMailTestCleanupRequests/{requestId}') && rules.includes('validIncidentMailTestCleanupRequest'), 'Firestore rules should restrict cleanup requests to admins');

console.log('PASS v1.5.72 bulk workflow/admin UI smoke');
