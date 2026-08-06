#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const KEYS = ['contractVersion', 'mode', 'enforced', 'reason'];
const DEFAULT_ORIGIN = 'https://foxbear-music.web.app';

function canonicalPolicy() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'app-check-policy.json'), 'utf8'));
}

function firebaseApiKey() {
  const source = fs.readFileSync(path.join(ROOT, 'src/firebase-bootstrap.js'), 'utf8');
  const value = source.match(/apiKey:\s*'([^']+)'/)?.[1] || '';
  if (!value) throw new Error('Firebase API key was not found in src/firebase-bootstrap.js.');
  return value;
}

async function readJsonResponse(response, label) {
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch (error) {
    throw new Error(`${label} returned non-JSON HTTP ${response.status}: ${text.slice(0, 180)}`);
  }
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

async function verify(options = {}) {
  const origin = String(options.origin || process.env.FOXBEAR_DEPLOYED_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, '');
  const policy = canonicalPolicy();
  const cacheBust = `foxbearPolicy=${Date.now()}`;
  const deployedClient = await readJsonResponse(await fetch(`${origin}/app-check-policy.json?${cacheBust}`, { cache: 'no-store' }), 'deployed client policy');
  const signUp = await readJsonResponse(await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(firebaseApiKey())}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true })
  }), 'Firebase anonymous authentication');
  const idToken = String(signUp.idToken || '');
  if (!idToken) throw new Error('Firebase anonymous authentication returned no idToken.');
  const callable = await readJsonResponse(await fetch(`${origin}/api/incident/status`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${idToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ data: {} })
  }), 'deployed incident status');
  const service = callable.result || callable.data || callable;
  const deployedServer = {
    contractVersion: Number(service.appCheckPolicyVersion || 0),
    mode: String(service.appCheckMode || ''),
    enforced: service.appCheckEnforced === true,
    reason: String(service.appCheckPolicyReason || '')
  };
  const expected = {
    contractVersion: Number(policy.contractVersion || 0),
    mode: String(policy.mode || ''),
    enforced: policy.enforced === true,
    reason: String(policy.reason || '')
  };
  const clientComparable = Object.fromEntries(KEYS.map(key => [key, key === 'contractVersion' ? Number(deployedClient[key] || 0) : deployedClient[key]]));
  const expectedComparable = Object.fromEntries(KEYS.map(key => [key, expected[key]]));
  const failures = [];
  if (JSON.stringify(clientComparable) !== JSON.stringify(expectedComparable)) failures.push(`client=${JSON.stringify(clientComparable)}`);
  if (JSON.stringify(deployedServer) !== JSON.stringify(expectedComparable)) failures.push(`server=${JSON.stringify(deployedServer)}`);
  if (failures.length) throw new Error(`Deployed App Check policy drift: ${failures.join(' ')}`);
  return Object.freeze({ origin, policy: expectedComparable, productVersion: service.productVersion || '' });
}

if (require.main === module) {
  verify().then(result => {
    console.log(`PASS deployed App Check policy matches at ${result.origin}: ${JSON.stringify(result.policy)} (Functions ${result.productVersion || 'unknown'})`);
  }).catch(error => {
    console.error(`FAIL deployed App Check policy verification: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { verify };
