#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { normalizeDeletePaths } = require('./git-patch-contract');

const rootArgIndex = process.argv.indexOf('--root');
const ROOT = path.resolve(rootArgIndex >= 0 && process.argv[rootArgIndex + 1]
  ? process.argv[rootArgIndex + 1]
  : path.join(__dirname, '..'));
const contractPath = path.join(ROOT, 'DELETE_PATHS.txt');

function normalize(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
}

function runGit(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (result.error) {
    if (allowFailure) return null;
    throw result.error;
  }
  if (result.status !== 0) {
    if (allowFailure) return null;
    throw new Error(String(result.stderr || result.stdout || `git ${args.join(' ')} failed`).trim());
  }
  return result;
}

function gitContext() {
  const probe = runGit(['rev-parse', '--show-toplevel'], { allowFailure: true });
  if (!probe) return null;
  const top = path.resolve(String(probe.stdout || '').trim());
  if (top !== ROOT) {
    throw new Error(`Patch cleanup must run from the repository root. Expected ${top}, got ${ROOT}.`);
  }
  return { top };
}

function trackedFilesFor(relative) {
  const value = normalize(relative);
  if (!value) return [];
  const result = runGit(['ls-files', '-z', '--', value]);
  return String(result.stdout || '').split('\0').filter(Boolean).map(normalize);
}

function stageTrackedDeletion(relative) {
  const tracked = trackedFilesFor(relative);
  if (!tracked.length) return 0;
  const result = runGit(['rm', '-f', '--ignore-unmatch', '--', ...tracked]);
  if (result.stdout) process.stdout.write(result.stdout);
  console.log(`STAGE patch delete path: ${relative} (${tracked.length} tracked file${tracked.length === 1 ? '' : 's'})`);
  return tracked.length;
}

try {
  if (!fs.existsSync(contractPath)) throw new Error('DELETE_PATHS.txt is missing.');
  const declared = normalizeDeletePaths(fs.readFileSync(contractPath, 'utf8').split(/\r?\n/).map(line => line.trim()).filter(Boolean));
  const git = gitContext();
  let staged = 0;
  let removed = 0;

  for (const relative of declared) {
    const target = path.resolve(ROOT, relative);
    const within = path.relative(ROOT, target);
    if (!within || within.startsWith('..') || path.isAbsolute(within)) throw new Error(`Refusing unsafe delete target: ${relative}`);

    if (git) staged += stageTrackedDeletion(relative);

    if (!fs.existsSync(target)) continue;
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink()) fs.unlinkSync(target);
    else fs.rmSync(target, { recursive: stat.isDirectory(), force: true });
    console.log(`REMOVE patch delete path: ${relative}`);
    removed += 1;
  }

  if (git) {
    const manifestTracked = trackedFilesFor('PATCH_MANIFEST.json');
    if (manifestTracked.length) throw new Error('PATCH_MANIFEST.json is still tracked after cleanup.');
  }
  if (fs.existsSync(path.join(ROOT, 'PATCH_MANIFEST.json'))) {
    throw new Error('PATCH_MANIFEST.json still exists after cleanup.');
  }

  console.log(`PASS patch delete contract applied (${staged} tracked file${staged === 1 ? '' : 's'} staged, ${removed}/${declared.length} existing paths removed)`);
} catch (error) {
  console.error(`FAIL patch delete contract: ${error?.message || error}`);
  process.exit(1);
}
