#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT = path.join(DEFAULT_ROOT, 'dist', 'hosting');
const DEFAULT_MANIFEST = path.join(DEFAULT_ROOT, 'dist', 'hosting-manifest.json');

const PUBLIC_ROOT_FILES = Object.freeze([
  '404.html',
  'design-preview.html',
  'external-browser.html',
  'foxbear-root.json',
  'index.html',
  'manifest.webmanifest',
  'robots.txt',
  'sw.js'
]);

const PUBLIC_DIRECTORIES = Object.freeze([
  'assets',
  'src',
  'vendor'
]);

const FORBIDDEN_SEGMENTS = new Set([
  '.git',
  '.firebase',
  '.github',
  '.githooks',
  'coverage',
  'dist',
  'docs',
  'functions',
  'node_modules',
  'playwright-report',
  'qa',
  'test-results',
  'tools'
]);

const EXECUTABLE_PATTERN = /\.(?:exe|dll|bat|cmd|com|msi|scr|ps1)$/i;
const SECRET_PATTERN = /(?:^|\/)(?:\.env(?:\..*)?|[^/]+\.(?:pem|key|p12|pfx|jks|keystore))$/i;

function normalizeRelative(value) {
  return String(value || '').split(path.sep).join('/').replace(/^\.\//, '');
}

function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function assertSafePublicPath(relativePath) {
  const normalized = normalizeRelative(relativePath);
  const segments = normalized.split('/').filter(Boolean);
  if (!normalized || normalized.startsWith('/') || segments.includes('..')) {
    throw new Error(`Unsafe Hosting payload path: ${relativePath}`);
  }
  if (segments.some(segment => segment.startsWith('.'))) {
    throw new Error(`Hidden file is forbidden from Hosting payload: ${normalized}`);
  }
  if (segments.some(segment => FORBIDDEN_SEGMENTS.has(segment))) {
    throw new Error(`Private directory is forbidden from Hosting payload: ${normalized}`);
  }
  if (EXECUTABLE_PATTERN.test(normalized)) {
    throw new Error(`Executable file is forbidden from Hosting payload: ${normalized}`);
  }
  if (SECRET_PATTERN.test(normalized)) {
    throw new Error(`Secret-like file is forbidden from Hosting payload: ${normalized}`);
  }
  return normalized;
}

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function copyPublicFile(root, output, relativePath, records) {
  const normalized = assertSafePublicPath(relativePath);
  const source = path.resolve(root, normalized);
  const target = path.resolve(output, normalized);
  if (!isPathInside(root, source)) throw new Error(`Hosting source escaped repository root: ${normalized}`);
  if (!isPathInside(output, target)) throw new Error(`Hosting target escaped output root: ${normalized}`);

  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) throw new Error(`Symbolic links are forbidden from Hosting payload: ${normalized}`);
  if (!stat.isFile()) throw new Error(`Expected Hosting source file: ${normalized}`);

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  fs.chmodSync(target, stat.mode);
  records.push({ path: normalized, bytes: stat.size, sha256: hashFile(source) });
}

function walkPublicDirectory(root, output, directory, records) {
  const normalizedDirectory = assertSafePublicPath(directory);
  const sourceRoot = path.resolve(root, normalizedDirectory);
  const sourceStat = fs.lstatSync(sourceRoot);
  if (sourceStat.isSymbolicLink()) throw new Error(`Symbolic links are forbidden from Hosting payload: ${normalizedDirectory}`);
  if (!sourceStat.isDirectory()) throw new Error(`Expected Hosting source directory: ${normalizedDirectory}`);

  const walk = (absoluteDirectory, relativeDirectory) => {
    const entries = fs.readdirSync(absoluteDirectory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relativePath = normalizeRelative(path.join(relativeDirectory, entry.name));
      assertSafePublicPath(relativePath);
      const absolutePath = path.join(absoluteDirectory, entry.name);
      const stat = fs.lstatSync(absolutePath);
      if (stat.isSymbolicLink()) throw new Error(`Symbolic links are forbidden from Hosting payload: ${relativePath}`);
      if (stat.isDirectory()) walk(absolutePath, relativePath);
      else if (stat.isFile()) copyPublicFile(root, output, relativePath, records);
      else throw new Error(`Unsupported Hosting payload entry: ${relativePath}`);
    }
  };

  walk(sourceRoot, normalizedDirectory);
}

function stageHostingPayload(options = {}) {
  const root = path.resolve(options.root || DEFAULT_ROOT);
  const output = path.resolve(options.output || path.join(root, 'dist', 'hosting'));
  const manifestPath = path.resolve(options.manifestPath || path.join(path.dirname(output), 'hosting-manifest.json'));

  if (!isPathInside(root, output) || output === root) {
    throw new Error(`Hosting output must be a child of repository root: ${output}`);
  }
  if (!isPathInside(root, manifestPath)) {
    throw new Error(`Hosting manifest must be written inside repository root: ${manifestPath}`);
  }

  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });

  const records = [];
  for (const relativePath of PUBLIC_ROOT_FILES) copyPublicFile(root, output, relativePath, records);
  for (const directory of PUBLIC_DIRECTORIES) walkPublicDirectory(root, output, directory, records);
  records.sort((left, right) => left.path.localeCompare(right.path));

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    publicRoot: normalizeRelative(path.relative(root, output)),
    rootFiles: [...PUBLIC_ROOT_FILES],
    directories: [...PUBLIC_DIRECTORIES],
    fileCount: records.length,
    totalBytes: records.reduce((sum, record) => sum + record.bytes, 0),
    files: records
  };
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { root, output, manifestPath, manifest };
}

function main() {
  const result = stageHostingPayload();
  console.log(`PASS staged Firebase Hosting payload: ${result.manifest.fileCount} files / ${result.manifest.totalBytes} bytes -> ${result.manifest.publicRoot}`);
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
  DEFAULT_MANIFEST,
  DEFAULT_OUTPUT,
  DEFAULT_ROOT,
  EXECUTABLE_PATTERN,
  FORBIDDEN_SEGMENTS,
  PUBLIC_DIRECTORIES,
  PUBLIC_ROOT_FILES,
  SECRET_PATTERN,
  assertSafePublicPath,
  normalizeRelative,
  stageHostingPayload
};
