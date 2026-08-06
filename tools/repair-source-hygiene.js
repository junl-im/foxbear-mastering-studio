#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const rootArgIndex = process.argv.indexOf('--root');
const ROOT = path.resolve(rootArgIndex >= 0 && process.argv[rootArgIndex + 1]
  ? process.argv[rootArgIndex + 1]
  : path.join(__dirname, '..'));

const ciRepairAllowed = process.env.FOXBEAR_ALLOW_CI_HYGIENE_REPAIR === '1';
if (process.env.GITHUB_ACTIONS === 'true' && !ciRepairAllowed) {
  console.error('FAIL source hygiene repair is disabled in GitHub Actions. CI must report committed hygiene violations instead of hiding them.');
  process.exit(1);
}

const REPAIRABLE_PATHS = Object.freeze([
  '.firebaserc',
  '.firebase',
  '.audit-results',
  'dist',
  'qa/static-audit.txt',
  'qa/browser-check.txt',
  'qa/static-check.txt',
  'PATCH_MANIFEST.json'
]);

function resolveInsideRoot(relative) {
  const normalized = String(relative || '').replace(/\\/g, '/').replace(/^\.\//, '');
  const target = path.resolve(ROOT, normalized);
  const relativeFromRoot = path.relative(ROOT, target);
  if (!normalized || relativeFromRoot.startsWith('..') || path.isAbsolute(relativeFromRoot)) {
    throw new Error(`Refusing unsafe cleanup path: ${relative}`);
  }
  return { normalized, target };
}

function removePath(relative) {
  const { normalized, target } = resolveInsideRoot(relative);
  if (!fs.existsSync(target)) return false;
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) fs.unlinkSync(target);
  else fs.rmSync(target, { recursive: stat.isDirectory(), force: true });
  console.log(`REMOVE source hygiene path: ${normalized}`);
  return true;
}

try {
  const removed = REPAIRABLE_PATHS.filter(removePath);
  console.log(`PASS source hygiene repair ${removed.length ? `removed ${removed.length} path(s)` : 'found nothing to remove'}`);
} catch (error) {
  console.error(`FAIL source hygiene repair: ${error?.message || error}`);
  process.exit(1);
}
