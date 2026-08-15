#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const firebaseSource = read('src/firebase-bootstrap.js');
const reporter = read('src/boot/incident-reporter.js');
const diagnostics = read('src/boot/incident-service-diagnostics.js');
const diagnosticsView = read('src/boot/incident-diagnostics-view-service.js');
const html = read('index.html');
const css = read('assets/css/components/support-settings.css');
const firebaseJson = JSON.parse(read('firebase.json'));
const origin = 'https://asia-northeast3-foxbear-music.cloudfunctions.net';

assert.strictEqual(pkg.version, '1.6.102');
assert(firebaseSource.includes("const INCIDENT_STATUS_FUNCTION_NAME = 'getIncidentServiceStatus';"), 'exact incident status function constant missing');
assert(firebaseSource.includes('const INCIDENT_DIRECT_PROBE_TIMEOUT_MS = 4500;'), 'bounded direct probe timeout missing');
assert(firebaseSource.includes('async function probeIncidentCallableEndpoint'), 'direct endpoint probe missing');
assert(firebaseSource.includes("credentials: 'omit'"), 'direct probe must not send browser credentials');
assert(firebaseSource.includes("'Content-Type': 'text/plain;charset=UTF-8'"), 'privacy-safe direct probe content type missing');
assert(firebaseSource.includes("body: '{}'"), 'direct probe must not include user or audio data');
assert(firebaseSource.includes('AbortController'), 'direct probe cancellation/timeout missing');
assert(!firebaseSource.includes('const internalTransport ='), 'generic functions/internal must not be forced into a network-blocked error');
assert(firebaseSource.includes('incidentStatusFunctionName: INCIDENT_STATUS_FUNCTION_NAME'), 'public bridge function-name diagnostic missing');
assert(firebaseSource.includes('probeIncidentCallableEndpoint,'), 'public bridge direct probe missing');
assert(reporter.includes('diagnosticsView.renderService(document, model)'), 'reporter must delegate service diagnostic rendering');
for (const id of ['incidentFunctionStatus', 'incidentEndpointStatus', 'incidentDirectStatus', 'incidentCspStatus']) {
  assert(diagnosticsView.includes(`${id}: model.`), `${id} diagnostics view binding missing`);
}
assert(diagnostics.includes("probe?.reachable === true && /functions\\/internal/i.test(originalCode)"), 'reachable internal errors must stay classified as server internal');
assert(diagnostics.includes("code = 'functions/not-found'"), '404/not-deployed classification missing');
assert(diagnostics.includes("code = 'FOXBEAR_INCIDENT_CALLABLE_NETWORK_BLOCKED'"), 'network/CSP classification missing');
for (const id of ['incidentFunctionStatus', 'incidentEndpointStatus', 'incidentDirectStatus', 'incidentCspStatus']) {
  assert(html.includes(`id="${id}"`), `${id} UI element missing`);
}
assert(html.includes('호출 함수: getIncidentServiceStatus'), 'exact function name is not displayed');
assert(css.includes('.incident-service-endpoint'), 'long endpoint wrapping style missing');
const metaCsp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)" \/>/)?.[1] || '';
const headerCsp = firebaseJson.hosting.headers[0].headers.find(item => item.key === 'Content-Security-Policy')?.value || '';
assert(metaCsp.includes(origin), 'HTML CSP must include the exact Functions origin');
assert(headerCsp.includes(origin), 'Hosting CSP must include the exact Functions origin');

console.log('PASS v1.6.14 incident callable endpoint, direct HTTP, and CSP diagnostics');
