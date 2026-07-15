#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ROOT, getReleaseMetadata, renderBuildInfo } = require('./release-metadata');

const CHECK_ONLY = process.argv.includes('--check');
const meta = getReleaseMetadata();
const buildInfoPath = path.join(ROOT, 'src/config/build-info.js');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function write(relativePath, text) {
  fs.writeFileSync(path.join(ROOT, relativePath), text);
}

function detectPrevious() {
  const existing = fs.existsSync(buildInfoPath) ? fs.readFileSync(buildInfoPath, 'utf8') : '';
  const pick = (name, fallback) => existing.match(new RegExp(`${name}: '([^']+)'`))?.[1] || fallback;
  const manifest = JSON.parse(read('manifest.webmanifest'));
  return {
    productVersion: pick('productVersion', manifest.version || meta.productVersion),
    appVersion: pick('appVersion', `Pro v${manifest.version || meta.productVersion}`),
    assetVersion: pick('assetVersion', read('index.html').match(/src\/app\.js\?v=([^"&]+)/)?.[1] || meta.assetVersion),
    cacheName: pick('cacheName', read('sw.js').match(/const CACHE_NAME = '([^']+)'/)?.[1] || meta.cacheName),
    bootRevision: pick('bootRevision', read('index.html').match(/h=(boot-sri-v\d+)/)?.[1] || meta.bootRevision),
    updateSafetyRevision: pick('updateSafetyRevision', read('index.html').match(/h=(update-safety-v\d+)/)?.[1] || meta.updateSafetyRevision),
    serviceWorkerRevision: pick('serviceWorkerRevision', read('src/app.js').match(/h=(sw-v\d+)/)?.[1] || meta.serviceWorkerRevision)
  };
}

function filesUnder(relativeDir, extension) {
  const result = [];
  const start = path.join(ROOT, relativeDir);
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (!extension || full.endsWith(extension)) result.push(full);
    }
  };
  walk(start);
  return result;
}

function replaceAll(text, from, to) {
  return from && from !== to ? text.split(from).join(to) : text;
}

function sync() {
  const previous = detectPrevious();
  const pkg = JSON.parse(read('package.json'));
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['package:verify:overwrite'] = `node tools/verify-overwrite-zip.js dist/foxbear-mastering-studio-v${meta.productVersion}-overwrite.zip`;
  pkg.scripts['package:verify:release'] = `node tools/verify-release-zip.js dist/foxbear-mastering-studio-v${meta.productVersion}-release.zip`;
  write('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
  const runtimeTargets = [
    ...filesUnder('src', '.js'),
    path.join(ROOT, 'index.html')
  ];
  const qaTargets = filesUnder('qa', '.js');

  const applyMetadataReplacements = text => {
    text = replaceAll(text, previous.assetVersion, meta.assetVersion);
    text = replaceAll(text, previous.appVersion, meta.appVersion);
    text = replaceAll(text, `v${previous.productVersion}`, `v${meta.productVersion}`);
    text = replaceAll(text, previous.productVersion, meta.productVersion);
    text = replaceAll(text, previous.bootRevision, meta.bootRevision);
    text = replaceAll(text, previous.updateSafetyRevision, meta.updateSafetyRevision);
    text = replaceAll(text, previous.serviceWorkerRevision, meta.serviceWorkerRevision);
    return text;
  };

  for (const file of runtimeTargets) {
    const text = applyMetadataReplacements(fs.readFileSync(file, 'utf8'));
    fs.writeFileSync(file, text);
  }

  // Historical QA names explain when a regression guard was introduced. Update
  // executable metadata assertions, but never rewrite PASS/FAIL labels into the
  // newest release number.
  for (const file of qaTargets) {
    let text = fs.readFileSync(file, 'utf8');
    const protectedLabels = [];
    text = text.replace(/^.*console\.(?:log|error)\([^\n]*$/gm, line => {
      const token = `__FOXBEAR_QA_LABEL_${protectedLabels.length}__`;
      protectedLabels.push(line);
      return token;
    });
    text = applyMetadataReplacements(text);
    text = text.replace(/__FOXBEAR_QA_LABEL_(\d+)__/g, (_, index) => protectedLabels[Number(index)] || '');
    fs.writeFileSync(file, text);
  }

  const manifest = JSON.parse(read('manifest.webmanifest'));
  manifest.version = meta.productVersion;
  manifest.description = `FoxBear AI Mastering Studio Pro v${meta.productVersion} (${meta.buildId}).`;
  write('manifest.webmanifest', `${JSON.stringify(manifest, null, 2)}\n`);

  const handoffPackage = JSON.parse(read('HANDOFF_PACKAGE.json'));
  handoffPackage.productVersion = meta.productVersion;
  handoffPackage.buildId = meta.buildId;
  write('HANDOFF_PACKAGE.json', `${JSON.stringify(handoffPackage, null, 2)}\n`);

  let index = read('index.html');
  index = index.replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="FoxBear AI Mastering Studio Pro v${meta.productVersion} - ${meta.buildId}" />`);
  write('index.html', index);

  let sw = read('sw.js');
  sw = replaceAll(sw, previous.assetVersion, meta.assetVersion);
  sw = replaceAll(sw, previous.bootRevision, meta.bootRevision);
  sw = replaceAll(sw, previous.updateSafetyRevision, meta.updateSafetyRevision);
  sw = sw.replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = '${meta.cacheName}';`);
  sw = sw.replace(/\/\/ FoxBear AI Mastering Studio Pro v[^\n]+/, `// FoxBear AI Mastering Studio Pro v${meta.productVersion} service worker · ${meta.buildId}`);
  const legacyMatch = sw.match(/const LEGACY_CACHE_NAMES = \[([^\]]*)\];/);
  if (legacyMatch) {
    const names = [...legacyMatch[1].matchAll(/'([^']+)'/g)]
      .map(match => match[1])
      .filter(name => name && name !== meta.cacheName);
    if (previous.cacheName && previous.cacheName !== meta.cacheName) names.push(previous.cacheName);
    const uniqueNames = [...new Set(names)].slice(-20);
    sw = sw.replace(legacyMatch[0], `const LEGACY_CACHE_NAMES = [${uniqueNames.map(name => `'${name}'`).join(', ')}];`);
  }
  write('sw.js', sw);
  fs.writeFileSync(buildInfoPath, renderBuildInfo(meta));

  const sri = spawnSync('python3', ['tools/update-sri.py'], { cwd: ROOT, stdio: 'inherit' });
  if (sri.status !== 0) process.exit(sri.status || 1);
}

function validate() {
  const failures = [];
  const expect = (condition, message) => { if (!condition) failures.push(message); };
  const pkg = JSON.parse(read('package.json'));
  const pkgLock = fs.existsSync(path.join(ROOT, 'package-lock.json')) ? JSON.parse(read('package-lock.json')) : null;
  const manifest = JSON.parse(read('manifest.webmanifest'));
  const handoffPackage = JSON.parse(read('HANDOFF_PACKAGE.json'));
  const buildInfo = read('src/config/build-info.js');
  const index = read('index.html');
  const sw = read('sw.js');
  const app = read('src/app.js');
  const updateSafety = read('src/boot/update-safety-service.js');
  const changelog = read('CHANGELOG.md');
  const readme = read('README.md');
  const handoff = read('HANDOFF.md');
  const legacyCacheList = sw.match(/const LEGACY_CACHE_NAMES = \[([^\]]*)\];/)?.[1] || '';

  expect(buildInfo === renderBuildInfo(meta), 'src/config/build-info.js is not synchronized with package.json');
  expect(manifest.version === meta.productVersion, 'manifest.webmanifest version is not synchronized');
  expect(handoffPackage.productVersion === meta.productVersion, 'HANDOFF_PACKAGE.json version is not synchronized');
  expect(handoffPackage.buildId === meta.buildId, 'HANDOFF_PACKAGE.json buildId is not synchronized');
  expect(handoffPackage.targetClient === 'GitHub Desktop', 'HANDOFF_PACKAGE.json target client is not GitHub Desktop');
  expect(manifest.description.includes(`v${meta.productVersion}`) && manifest.description.includes(meta.buildId), 'manifest.webmanifest description is not synchronized');
  expect(index.includes(`<title>FoxBear Mastering PRO v${meta.productVersion}</title>`), 'index title is not synchronized');
  expect(index.includes(`data-build="${meta.productVersion}"`), 'index data-build is not synchronized');
  expect(index.includes(`src/config/build-info.js?v=${meta.assetVersion}`), 'build-info script is not loaded with current asset version');
  expect(index.includes(`src/boot/release-presentation-service.js?v=${meta.assetVersion}`), 'release presentation service is not loaded with current asset version');
  expect(index.includes('data-release-label="version-button"') && index.includes('data-release-label="program-eyebrow"'), 'visible release labels are not centrally bound');
  expect(index.includes(`src/app.js?v=${meta.assetVersion}&h=${meta.bootRevision}`), 'app boot URL is not synchronized');
  expect(index.includes(`src/boot/update-safety-service.js?v=${meta.assetVersion}&h=${meta.updateSafetyRevision}`), 'update safety URL is not synchronized');
  expect(sw.includes(`const CACHE_NAME = '${meta.cacheName}'`), 'service worker cache name is not synchronized');
  expect(sw.includes(`./src/config/build-info.js?v=${meta.assetVersion}`), 'service worker does not precache build-info');
  expect(sw.includes(`./src/boot/release-presentation-service.js?v=${meta.assetVersion}`), 'service worker does not precache release presentation service');
  expect(!legacyCacheList.includes(`'${meta.cacheName}'`), 'current cache name must not appear in legacy cache list');
  expect(app.includes(`serviceWorkerRevision || '${meta.serviceWorkerRevision}'`) && app.includes('navigator.serviceWorker.register(resolveFoxBearScriptUrl(SERVICE_WORKER_URL))'), 'service worker registration revision is not synchronized');
  expect(updateSafety.includes(`BUILD_INFO.bootRevision || '${meta.bootRevision}'`), 'Update Safety expected boot revision fallback is not synchronized');
  expect(changelog.startsWith(`# v${meta.productVersion} -`), 'CHANGELOG latest entry does not match package version');
  expect(readme.startsWith(`# FoxBear AI Mastering Studio Pro v${meta.productVersion}`), 'README title does not match package version');
  expect(handoff.startsWith(`# Handoff - v${meta.productVersion}`), 'HANDOFF title does not match package version');
  expect(pkgLock && pkgLock.version === meta.productVersion, 'package-lock.json is missing or version is not synchronized');
  expect(pkg.scripts?.['package:verify:overwrite'] === `node tools/verify-overwrite-zip.js dist/foxbear-mastering-studio-v${meta.productVersion}-overwrite.zip`, 'package:verify:overwrite script is not synchronized');
  expect(pkg.scripts?.['package:verify:release'] === `node tools/verify-release-zip.js dist/foxbear-mastering-studio-v${meta.productVersion}-release.zip`, 'package:verify:release script is not synchronized');

  if (failures.length) {
    failures.forEach(message => console.error(`FAIL ${message}`));
    process.exit(1);
  }
  console.log(`PASS release metadata synchronized: v${meta.productVersion} / ${meta.assetVersion}`);
}

if (CHECK_ONLY) validate();
else {
  sync();
  validate();
}
