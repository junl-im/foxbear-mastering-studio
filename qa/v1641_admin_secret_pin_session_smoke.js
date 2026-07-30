'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const index = read('index.html');
const app = read('src/app.js');
const mobileView = read('src/ui/mobile-native-view.js');
const adminController = read('src/ui/admin-access-controller.js');
const firebase = read('src/firebase-bootstrap.js');
const functions = read('functions/index.js');
const rules = read('firestore.rules');
const css = read('assets/css/components/support-settings.css');
const setup = read('FIREBASE_SETUP.md');
const pkg = JSON.parse(read('package.json'));
const forbiddenPin = ['86', '05'].join('');

assert.strictEqual(pkg.version, '1.6.41', 'release version must be v1.6.41');
assert.strictEqual(pkg.foxbearRelease.buildId, 'admin-secret-pin-session', 'admin access build id mismatch');
assert(pkg.scripts['deploy:incident'].includes('functions:unlockAdminAccess'), 'admin unlock callable must be included in incident deployment');

assert(index.includes('id="adminAccessDialog"'), 'administrator access dialog is missing');
assert(index.includes('id="adminAccessPin"'), 'administrator PIN input is missing');
assert(index.includes('type="password"'), 'administrator PIN must use a password input');
assert(index.includes('Firebase 서버에서만 확인'), 'server-side secret guidance is missing');
assert(!index.includes(forbiddenPin), 'administrator PIN must never be embedded in HTML');
assert(css.includes('.admin-access-field input'), 'administrator access input styling is missing');

assert(mobileView.includes("['admin-monitor', '🔐', '관리자 모니터링'"), 'settings administrator monitor action is missing');
assert(app.includes("case 'admin-monitor'"), 'administrator monitor settings action handler is missing');
assert(app.includes('getAdminAccessController'), 'administrator access controller bridge is missing');
assert(adminController.includes('async function submit'), 'administrator access submission handler is missing');
assert(adminController.includes('bridge.unlockAdminAccess(pin)'), 'administrator access must use the Firebase bridge');
assert(adminController.includes('state.adminUnlockBusy'), 'administrator authentication re-entry guard is missing');
assert(adminController.includes('openMonitor()'), 'successful administrator access must open monitoring');
assert(!app.includes(forbiddenPin), 'administrator PIN must never be embedded in client application code');
assert(!adminController.includes(forbiddenPin), 'administrator PIN must never be embedded in the administrator controller');

assert(firebase.includes('unlockAdminAccess'), 'Firebase bridge must expose administrator unlock');
assert(firebase.includes("httpsCallable(bridgeState.functions, 'unlockAdminAccess'"), 'administrator unlock must use Firebase callable functions');
assert(firebase.includes('expiresAtMs > Date.now()'), 'client administrator profile must reject expired sessions');
assert(!firebase.includes(forbiddenPin), 'administrator PIN must never be embedded in Firebase client bridge');

assert(functions.includes("defineSecret('FOXBEAR_ADMIN_ACCESS_PIN')"), 'administrator PIN must be stored in Firebase Secret Manager');
assert(functions.includes('process.env.FOXBEAR_ADMIN_REQUIRE_APP_CHECK'), 'optional App Check enforcement environment flag is missing');
assert(functions.includes('timingSafeEqual'), 'constant-time administrator PIN comparison is missing');
assert(functions.includes('ADMIN_ACCESS_ATTEMPT_LIMIT = 5'), 'administrator PIN attempt limit is missing');
assert(functions.includes('ADMIN_ACCESS_LOCK_MS = 15 * 60 * 1000'), 'administrator PIN lockout window is missing');
assert(functions.includes('ADMIN_ACCESS_SESSION_MS = 8 * 60 * 60 * 1000'), 'temporary administrator session duration is missing');
assert(functions.includes("role: 'admin-session'"), 'temporary administrator role is missing');
assert(functions.includes('expiresAt: Timestamp.fromMillis(expiresAt)'), 'server-issued administrator session expiry is missing');
assert(functions.includes('exports.unlockAdminAccess = onCall'), 'administrator unlock callable export is missing');
assert(!functions.includes(`configuredPin = '${forbiddenPin}'`), 'administrator PIN must not be hardcoded in Functions');

assert(rules.includes("'expiresAt' in get(/databases/$(database)/documents/siteAdmins/$(request.auth.uid)).data"), 'Firestore administrator expiry rule is missing');
assert(rules.includes('.data.expiresAt > request.time'), 'Firestore must reject expired administrator sessions');
assert(rules.includes('allow list, create, update, delete: if false;'), 'clients must not write siteAdmins documents directly');

assert(setup.includes('FOXBEAR_ADMIN_ACCESS_PIN'), 'Firebase setup must document administrator secret provisioning');
assert(!setup.includes(forbiddenPin), 'administrator PIN value must not be committed to setup documentation');

console.log('v1.6.41 administrator Secret Manager PIN session smoke PASS');
