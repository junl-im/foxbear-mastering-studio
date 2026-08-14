#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootArgIndex = process.argv.indexOf('--root');
const ROOT = path.resolve(rootArgIndex >= 0 && process.argv[rootArgIndex + 1]
  ? process.argv[rootArgIndex + 1]
  : path.join(__dirname, '..'));

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
const ciRepairAllowed = process.env.FOXBEAR_ALLOW_CI_HYGIENE_REPAIR === '1';
const repairContext = String(process.env.FOXBEAR_HYGIENE_REPAIR_CONTEXT || '').trim() || 'local';
if (isGitHubActions && !ciRepairAllowed) {
  console.error('FAIL source hygiene repair is disabled in GitHub Actions unless the policy-aware ci-safe gate explicitly enables the allowlisted cleanup.');
  process.exit(1);
}

const QUIET_GITHUB_REPAIR_PATHS = new Set(['PATCH_MANIFEST.json']);

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

function annotationEscape(value) {
  return String(value || '')
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');
}

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
  const gitDir = path.join(ROOT, '.git');
  let removedViaGit = false;
  if (fs.existsSync(gitDir)) {
    const tracked = spawnSync('git', ['ls-files', '--error-unmatch', '--', normalized], { cwd: ROOT, encoding: 'utf8' });
    if (tracked.status === 0) {
      const removed = spawnSync('git', ['rm', '-r', '--ignore-unmatch', '--', normalized], { cwd: ROOT, encoding: 'utf8' });
      if (removed.status === 0) {
        removedViaGit = true;
        console.log(`REMOVE+STAGE source hygiene path: ${normalized}`);
      }
    }
  }
  if (!removedViaGit) {
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink()) fs.unlinkSync(target);
    else fs.rmSync(target, { recursive: stat.isDirectory(), force: true });
    console.log(`REMOVE source hygiene path: ${normalized}`);
  }
  if (isGitHubActions && ciRepairAllowed && !QUIET_GITHUB_REPAIR_PATHS.has(normalized)) {
    const annotationFile = annotationEscape(normalized);
    console.log(`::warning file=${annotationFile},title=Source hygiene auto-repair::Removed an allowlisted local/generated path from the ephemeral CI workspace. Commit its deletion when convenient; the release gate will continue safely.`);
  } else if (isGitHubActions && ciRepairAllowed && QUIET_GITHUB_REPAIR_PATHS.has(normalized)) {
    console.log(`INFO source hygiene auto-repair retired known legacy path without annotation: ${normalized}`);
  }
  return true;
}

try {
  const removed = REPAIRABLE_PATHS.filter(removePath);
  const detail = removed.length ? `removed ${removed.length} path(s)` : 'found nothing to remove';
  console.log(`PASS source hygiene repair (${repairContext}) ${detail}`);
} catch (error) {
  console.error(`FAIL source hygiene repair: ${error?.message || error}`);
  process.exit(1);
}
