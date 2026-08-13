#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { normalizeDeletePaths } = require('./git-patch-contract');

const rootArgIndex = process.argv.indexOf('--root');
const ROOT = path.resolve(rootArgIndex >= 0 && process.argv[rootArgIndex + 1]
  ? process.argv[rootArgIndex + 1]
  : path.join(__dirname, '..'));
const contractPath = path.join(ROOT, 'DELETE_PATHS.txt');

try {
  if (!fs.existsSync(contractPath)) throw new Error('DELETE_PATHS.txt is missing.');
  const declared = normalizeDeletePaths(fs.readFileSync(contractPath, 'utf8').split(/\r?\n/).map(line => line.trim()).filter(Boolean));
  let removed = 0;
  for (const relative of declared) {
    const target = path.resolve(ROOT, relative);
    const within = path.relative(ROOT, target);
    if (!within || within.startsWith('..') || path.isAbsolute(within)) throw new Error(`Refusing unsafe delete target: ${relative}`);
    if (!fs.existsSync(target)) continue;
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink()) fs.unlinkSync(target);
    else fs.rmSync(target, { recursive: stat.isDirectory(), force: true });
    console.log(`REMOVE patch delete path: ${relative}`);
    removed += 1;
  }
  console.log(`PASS patch delete contract applied (${removed}/${declared.length} existing paths removed)`);
} catch (error) {
  console.error(`FAIL patch delete contract: ${error?.message || error}`);
  process.exit(1);
}
