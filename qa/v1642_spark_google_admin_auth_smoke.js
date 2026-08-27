'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const firebase = read('src/firebase-bootstrap.js');
const controllerSource = read('src/ui/admin-access-controller.js');
const rules = read('firestore.rules');
const functions = read('functions/index.js');
const setup = read('FIREBASE_SETUP.md');

assert(pkg.version === '1.7.2', 'package version must be 1.7.2');
assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(pkg.foxbearRelease?.buildId || '')), 'current release build id must remain kebab-case');
assert(pkg.scripts['deploy:spark'].includes('firebase deploy --only hosting,firestore:rules,firestore:indexes'), 'Spark deployment must avoid Cloud Functions');
assert(pkg.scripts['deploy:spark'].startsWith('npm run hosting:check && '), 'Spark deployment must run Hosting payload hygiene first');
assert(!pkg.scripts['deploy:incident'].includes('unlockAdminAccess'), 'incident deployment must not include the removed PIN unlock function');
assert(!pkg.scripts['deploy:incident'].includes('revokeAdminAccess'), 'incident deployment must not include the removed PIN revoke function');

assert(index.includes('id="adminAccessSubmit"'), 'Google administrator login action is missing');
assert(index.includes('Google 계정으로 인증'), 'Google administrator login label is missing');
assert(index.includes('id="adminAccessUid"'), 'administrator UID handoff field is missing');
assert(index.includes('id="adminAccessUidCopy"'), 'administrator UID copy action is missing');
assert(!index.includes('id="adminAccessPin"'), 'administrator PIN input must be removed');
assert(index.includes('frame-src') && index.includes('https://foxbear-music.firebaseapp.com') && index.includes('https://accounts.google.com'), 'CSP must allow the Firebase Google authentication frame and account flow');

assert(firebase.includes('GoogleAuthProvider'), 'Firebase bridge must load GoogleAuthProvider');
assert(firebase.includes('browserSessionPersistence'), 'Google administrator auth must use browser session persistence');
assert(firebase.includes('async function signInAdminWithGoogle()'), 'Google administrator sign-in bridge is missing');
assert(firebase.includes('async function signOutAdminAccess()'), 'Google administrator sign-out bridge is missing');
assert(firebase.includes("providerId === 'google.com'"), 'administrator profile must require the Google provider');
assert(!firebase.includes("httpsCallable(bridgeState.functions, 'unlockAdminAccess'"), 'client must not call the removed PIN unlock function');
assert(!firebase.includes("httpsCallable(bridgeState.functions, 'revokeAdminAccess'"), 'client must not call the removed PIN revoke function');

assert(rules.includes("request.auth.token.firebase.sign_in_provider == 'google.com'"), 'Firestore administrator reads must require Google authentication');
assert(rules.includes('request.auth.token.email_verified == true'), 'Firestore administrator reads must require a verified Google email');
assert(rules.includes('data.email == request.auth.token.email'), 'Firestore administrator document email must match the signed-in account');
assert(rules.includes("data.authProvider == 'google.com'"), 'Firestore administrator document provider must be Google');
assert(rules.includes('allow list, create, update, delete: if false;'), 'clients must not write siteAdmins documents');

const retiredAdminSecretName = ['FOXBEAR', 'ADMIN', 'ACCESS', 'PIN'].join('_');
assert(!functions.includes(retiredAdminSecretName), 'Functions source must not reference the removed admin PIN secret');
assert(!functions.includes('exports.unlockAdminAccess'), 'removed PIN unlock callable must not be exported');
assert(!functions.includes('exports.revokeAdminAccess'), 'removed PIN revoke callable must not be exported');
assert(setup.includes('Google'), 'Firebase setup must document Google administrator authentication');
assert(setup.includes('deploy:spark'), 'Firebase setup must document the Spark deployment command');

class MockElement {
  constructor() {
    this.textContent = '';
    this.hidden = false;
    this.disabled = false;
    this.dataset = {};
    this.attrs = {};
    this.listeners = {};
    this.classList = { contains: () => false };
  }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  removeAttribute(name) { delete this.attrs[name]; }
  focus() {}
}

const context = {
  console,
  setTimeout,
  clearTimeout,
  requestAnimationFrame: fn => { fn(); return 1; },
  document: { activeElement: null, visibilityState: 'visible', addEventListener() {} },
  navigator: { clipboard: { async writeText() {} } },
  addEventListener() {},
  FoxBearModalStateMachine: { focusFirst() {} }
};
context.window = context;
context.globalThis = context;
vm.runInNewContext(controllerSource, context, { filename: 'admin-access-controller.js' });
const create = context.FoxBearAdminAccessController.create;

function makeElements() {
  return {
    adminAccessDialog: new MockElement(), adminAccessClose: new MockElement(), adminAccessForm: new MockElement(),
    adminAccessSubmit: new MockElement(), adminAccessCancel: new MockElement(), adminAccessStatus: new MockElement(),
    adminAccessIdentity: new MockElement(), adminAccessEmail: new MockElement(), adminAccessUid: new MockElement(), adminAccessUidCopy: new MockElement(),
    adminSessionStatus: new MockElement(), adminSessionRefresh: new MockElement(), adminSessionLogout: new MockElement(), mobileNativeQuickToggle: new MockElement()
  };
}

(async () => {
  let monitorOpens = 0;
  let signOutCalls = 0;
  const elements = makeElements();
  const state = { firebaseIsAdmin: false, firebaseAdminProvider: '', firebaseUserId: '', modalController: null };
  context.FoxBearFirebase = {
    async signInAdminWithGoogle() { return { uid: 'google-uid', email: 'owner@example.com', displayName: 'Owner', emailVerified: true, providerId: 'google.com' }; },
    async getAdminProfile() { return { uid: 'google-uid', email: 'owner@example.com', displayName: 'Owner', emailVerified: true, providerId: 'google.com', authMethod: 'google.com', exists: true, active: true, role: 'admin' }; },
    async signOutAdminAccess() { signOutCalls += 1; return { active: false, uid: 'guest-uid' }; }
  };
  const controller = create({
    state, elements,
    openMonitor: () => { monitorOpens += 1; },
    closeMonitor() {}, updateTrigger() {}, updateUi() {}, showToast() {}, toggleSettings() {},
    setFallbackModalState() { return true; }
  });
  const granted = await controller.submit({ preventDefault() {} });
  assert(granted === true, 'registered Google administrator must be granted');
  assert(state.firebaseIsAdmin === true, 'registered Google administrator state must be active');
  assert(state.firebaseAdminProvider === 'google.com', 'administrator provider state must be Google');
  assert(elements.adminAccessEmail.textContent === 'owner@example.com', 'administrator email must be shown');
  assert(elements.adminAccessUid.textContent === 'google-uid', 'administrator UID must be shown');
  assert(monitorOpens === 1, 'administrator monitor must open after authorization');

  await controller.revokeSession({ preventDefault() {} });
  assert(signOutCalls === 1, 'administrator logout must sign out the Google account');
  assert(state.firebaseIsAdmin === false, 'administrator state must be cleared after logout');

  const deniedElements = makeElements();
  const deniedState = { firebaseIsAdmin: false, firebaseAdminProvider: '', firebaseUserId: '', modalController: null };
  context.FoxBearFirebase = {
    async signInAdminWithGoogle() { return { uid: 'unregistered-uid', email: 'other@example.com', emailVerified: true, providerId: 'google.com' }; },
    async getAdminProfile() { return { uid: 'unregistered-uid', email: 'other@example.com', emailVerified: true, providerId: 'google.com', authMethod: 'google.com', exists: false, active: false, role: '' }; },
    async signOutAdminAccess() { return { active: false, uid: 'guest' }; }
  };
  const deniedController = create({ state: deniedState, elements: deniedElements, closeMonitor() {}, updateTrigger() {}, updateUi() {}, showToast() {}, toggleSettings() {}, setFallbackModalState() { return true; } });
  const denied = await deniedController.submit({ preventDefault() {} });
  assert(denied === false, 'unregistered Google account must not receive administrator access');
  assert(deniedElements.adminAccessIdentity.hidden === false, 'unregistered Google identity must remain visible for setup');
  assert(deniedElements.adminAccessUid.textContent === 'unregistered-uid', 'unregistered Google UID must be available for Firestore registration');
  assert(deniedElements.adminAccessStatus.textContent.includes('관리자 UID 등록'), 'unregistered account must receive UID setup guidance');

  console.log('v1.6.42 Spark Google administrator authentication smoke passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
