#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  EXECUTABLE_PATTERN,
  FORBIDDEN_SEGMENTS,
  PUBLIC_DIRECTORIES,
  PUBLIC_ROOT_FILES,
  SECRET_PATTERN,
  normalizeRelative,
  stageHostingPayload
} = require('./stage-hosting-payload');

const ROOT = path.resolve(__dirname, '..');
const EXPECTED_PUBLIC_ROOT = 'dist/hosting';
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'firebase.json'), 'utf8'));
const hosting = config.hosting || {};
const ignore = new Set(hosting.ignore || []);
const predeploy = Array.isArray(hosting.predeploy) ? hosting.predeploy : [];

const requiredExecutableIgnores = [
  '**/*.exe',
  '**/*.dll',
  '**/*.bat',
  '**/*.cmd',
  '**/*.com',
  '**/*.msi',
  '**/*.scr',
  '**/*.ps1'
];

function fail(message) {
  throw new Error(message);
}

function listFiles(directory, relative = '') {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const nextRelative = normalizeRelative(relative ? `${relative}/${entry.name}` : entry.name);
    const absolute = path.join(directory, entry.name);
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) fail(`Staged Hosting payload contains a symbolic link: ${nextRelative}`);
    if (stat.isDirectory()) files.push(...listFiles(absolute, nextRelative));
    else if (stat.isFile()) files.push(nextRelative);
    else fail(`Staged Hosting payload contains an unsupported entry: ${nextRelative}`);
  }
  return files;
}

function validateConfiguration() {
  if (normalizeRelative(hosting.public) !== EXPECTED_PUBLIC_ROOT) {
    fail(`Firebase Hosting public root must be ${EXPECTED_PUBLIC_ROOT}, received ${hosting.public || '(missing)'}`);
  }
  if (!predeploy.includes('npm run hosting:check')) {
    fail('Firebase Hosting predeploy must run npm run hosting:check');
  }
  const missing = requiredExecutableIgnores.filter(pattern => !ignore.has(pattern));
  if (missing.length) fail(`Firebase Hosting executable ignore rules are missing: ${missing.join(', ')}`);

  const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  if (!/^\.firebase\/$/m.test(gitignore)) fail('.gitignore must exclude the local .firebase directory');
  if (!/^dist\/$/m.test(gitignore)) fail('.gitignore must exclude generated dist payloads');
}

function validateStagedPayload(result) {
  const files = listFiles(result.output);
  const fileSet = new Set(files);
  for (const required of PUBLIC_ROOT_FILES) {
    if (!fileSet.has(required)) fail(`Staged Hosting payload is missing required file: ${required}`);
  }
  for (const directory of PUBLIC_DIRECTORIES) {
    if (!files.some(file => file.startsWith(`${directory}/`))) {
      fail(`Staged Hosting payload is missing required directory content: ${directory}/`);
    }
  }

  for (const file of files) {
    const segments = file.split('/');
    if (segments.some(segment => segment.startsWith('.') || FORBIDDEN_SEGMENTS.has(segment))) {
      fail(`Private path reached staged Hosting payload: ${file}`);
    }
    if (EXECUTABLE_PATTERN.test(file)) fail(`Executable reached staged Hosting payload: ${file}`);
    if (SECRET_PATTERN.test(file)) fail(`Secret-like file reached staged Hosting payload: ${file}`);
    const isAllowedRoot = PUBLIC_ROOT_FILES.includes(file);
    const isAllowedDirectory = PUBLIC_DIRECTORIES.some(directory => file.startsWith(`${directory}/`));
    if (!isAllowedRoot && !isAllowedDirectory) fail(`Unexpected file reached staged Hosting payload: ${file}`);
  }

  if (files.length !== result.manifest.fileCount) {
    fail(`Hosting manifest count mismatch: staged=${files.length}, manifest=${result.manifest.fileCount}`);
  }
  const manifest = JSON.parse(fs.readFileSync(result.manifestPath, 'utf8'));
  if (manifest.publicRoot !== EXPECTED_PUBLIC_ROOT || manifest.fileCount !== files.length) {
    fail('Hosting manifest is not synchronized with the staged payload');
  }

  return files;
}

function main() {
  validateConfiguration();
  const result = stageHostingPayload({ root: ROOT });
  const files = validateStagedPayload(result);
  console.log('PASS Firebase Hosting Spark executable-file hygiene verified within staged payload.');
  console.log(`PASS Firebase Hosting payload boundary verified: ${files.length} allowlisted files in ${EXPECTED_PUBLIC_ROOT}.`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`FAIL ${error?.message || error}`);
    process.exit(1);
  }
}

module.exports = {
  EXPECTED_PUBLIC_ROOT,
  listFiles,
  validateConfiguration,
  validateStagedPayload
};
