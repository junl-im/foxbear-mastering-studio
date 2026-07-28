#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const vm = require('vm');

const args = process.argv.slice(2);
const rootIndex = args.indexOf('--root');
const root = path.resolve(rootIndex >= 0 && args[rootIndex + 1] ? args[rootIndex + 1] : process.cwd());
const archiveMode = args.includes('--archive');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function listFiles(relativeDir) {
  const start = path.join(root, relativeDir);
  if (!fs.existsSync(start)) return [];
  const files = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(path.relative(root, full).split(path.sep).join('/'));
    }
  };
  walk(start);
  return files;
}

function fail(message, failures) {
  failures.push(message);
  console.error(`FAIL ${message}`);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function markdownSection(text, heading) {
  const pattern = new RegExp(`(?:^|\\n)## ${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`);
  return String(text).match(pattern)?.[1] || '';
}

const failures = [];
const warnings = [];
const manifestPath = 'HANDOFF_PACKAGE.json';
if (!exists(manifestPath)) {
  console.error(`FAIL ${manifestPath} is missing. The patch may have been extracted into the wrong folder.`);
  process.exit(1);
}

const manifest = readJson(manifestPath);
const pkg = readJson('package.json');
const lock = readJson('package-lock.json');

if (manifest.schemaVersion !== 1) fail(`unsupported handoff schema: ${manifest.schemaVersion}`, failures);
if (manifest.targetClient !== 'GitHub Desktop') fail('handoff targetClient must be GitHub Desktop', failures);
if (manifest.productVersion !== pkg.version) fail(`handoff version ${manifest.productVersion} does not match package.json ${pkg.version}`, failures);
if (manifest.buildId !== pkg.foxbearRelease?.buildId) fail('handoff buildId does not match package.json', failures);
if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) fail('package-lock.json version does not match package.json', failures);

for (const file of manifest.requiredFiles || []) {
  if (!exists(file)) fail(`required handoff file is missing: ${file}`, failures);
}
for (const prefix of manifest.requiredPrefixes || []) {
  const relativeDir = String(prefix).replace(/\/$/, '');
  if (!exists(relativeDir) || listFiles(relativeDir).length === 0) fail(`required handoff tree is missing or empty: ${prefix}`, failures);
}

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const serviceWorkerSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const localAssetTags = Array.from(indexHtml.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"[^>]*>/gi));
for (const match of localAssetTags) {
  const tag = match[0];
  const assetUrl = match[1];
  if (/^(?:[a-z]+:|\/\/|#|data:|blob:)/i.test(assetUrl)) continue;
  const assetPath = assetUrl.split(/[?#]/, 1)[0];
  if (!/\.(?:js|css)$/i.test(assetPath)) continue;
  if (!exists(assetPath)) fail(`index.html references a missing local asset: ${assetPath}`, failures);
  const integrityCount = (tag.match(/\sintegrity="[^"]*"/gi) || []).length;
  if (integrityCount !== 1) fail(`index.html asset must have exactly one integrity attribute: ${assetPath} (${integrityCount})`, failures);
}
for (const asset of manifest.requiredRuntimeAssets || []) {
  if (!exists(asset)) {
    fail(`required runtime asset is missing: ${asset}`, failures);
    continue;
  }
  if (/\.worker\.js$/i.test(asset)) {
    if (!serviceWorkerSource.includes(asset)) fail(`runtime worker is not listed in sw.js: ${asset}`, failures);
  } else {
    const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const references = indexHtml.match(new RegExp(`(?:src|href)="(?:\.\/)?${escaped}(?:[?#][^"]*)?"`, 'g')) || [];
    if (references.length !== 1) fail(`runtime entry asset must be loaded exactly once by index.html: ${asset} (${references.length})`, failures);
  }
}

if (archiveMode) {
  for (const prefix of manifest.forbiddenArchivePrefixes || []) {
    const relativeDir = String(prefix).replace(/\/$/, '');
    if (exists(relativeDir)) fail(`forbidden archive tree is present: ${prefix}`, failures);
  }
  for (const file of manifest.forbiddenArchiveFiles || []) {
    if (exists(file)) fail(`forbidden archive file is present: ${file}`, failures);
  }
}

try {
  const configPath = path.join(root, 'playwright.config.js');
  const configSource = fs.readFileSync(configPath, 'utf8');
  const moduleRecord = { exports: {} };
  const sandbox = {
    module: moduleRecord,
    exports: moduleRecord.exports,
    process: { env: { ...process.env, CI: 'true' } },
    require(request) {
      if (request === '@playwright/test') {
        const devices = new Proxy({}, { get: () => ({}) });
        return { defineConfig: value => value, devices };
      }
      throw new Error(`unsupported config dependency: ${request}`);
    }
  };
  vm.runInNewContext(configSource, sandbox, { filename: configPath });
  const config = moduleRecord.exports;
  if (!Number.isInteger(config.workers) || config.workers < 1 || config.workers > 2) {
    fail(`CI Playwright workers must resolve to 1-2, received: ${config.workers}`, failures);
  }
} catch (error) {
  fail(`unable to evaluate effective Playwright config: ${error.message}`, failures);
}

const scripts = pkg.scripts || {};
const installLifecycleNames = ['preinstall', 'install', 'postinstall', 'prepare', 'prepublish', 'prepublishOnly'];
for (const name of installLifecycleNames) {
  const value = String(scripts[name] || '');
  if (/install-git-hooks|hooks:install|core\.hooksPath/.test(value)) {
    fail(`npm lifecycle ${name} must not install optional Git hooks`, failures);
  }
}
if (Object.prototype.hasOwnProperty.call(scripts, 'prepare')) {
  fail('package.json prepare must be absent; npm ci must not depend on repository-local Git hook files', failures);
}
const releaseGateCommand = String(scripts['check:release'] || '');
const releaseGateRunner = releaseGateCommand.includes('tools/run-release-gate.js') && exists('tools/run-release-gate.js')
  ? fs.readFileSync(path.join(root, 'tools/run-release-gate.js'), 'utf8')
  : '';
if (!releaseGateCommand.includes('handoff:check') && !releaseGateRunner.includes("'handoff:check'")) {
  fail('check:release must run handoff:check', failures);
}
if (!scripts['handoff:check']) fail('package.json is missing handoff:check', failures);

const handoff = fs.readFileSync(path.join(root, 'HANDOFF.md'), 'utf8');
const desktopGuide = fs.readFileSync(path.join(root, 'GITHUB_DESKTOP_HANDOFF.md'), 'utf8');
const deliveryRules = fs.readFileSync(path.join(root, 'DELIVERY_RULES.md'), 'utf8');
const handoffCurrentRelease = markdownSection(handoff, 'Current release');
if (!handoff.startsWith(`# Handoff - v${pkg.version}`)) fail('HANDOFF.md title does not match package version', failures);
if (!handoffCurrentRelease.includes(`- Product version: \`${pkg.version}\``)) fail('HANDOFF.md Current release product version does not match package version', failures);
if (!handoffCurrentRelease.includes(`- Build ID: \`${pkg.foxbearRelease?.buildId || ''}\``)) fail('HANDOFF.md Current release build ID does not match package.json', failures);
if (!handoffCurrentRelease.includes(`- Asset version: \`${pkg.foxbearRelease?.assetVersion || ''}\``)) fail('HANDOFF.md Current release asset version does not match package.json', failures);
if (!handoffCurrentRelease.includes(`- Service worker cache: \`${pkg.foxbearRelease?.cacheName || ''}\``)) fail('HANDOFF.md Current release cache name does not match package.json', failures);
if (!handoffCurrentRelease.includes(`- Configured static/regression target: ${Array.isArray(pkg.qaChecks) ? pkg.qaChecks.length : 0} checks.`)) fail('HANDOFF.md Current release QA target does not match package.json', failures);
if (!/GitHub Desktop/i.test(handoff)) fail('HANDOFF.md does not record the GitHub Desktop workflow', failures);
if (!desktopGuide.startsWith(`# GitHub Desktop Handoff - v${pkg.version}`)) fail('GitHub Desktop guide title does not match package version', failures);
if (!/Fetch origin/i.test(desktopGuide) || !/Push origin/i.test(desktopGuide)) fail('GitHub Desktop guide is missing fetch/push workflow', failures);
for (const heading of ['## 1. 작업한 내역', '## 2. 다운로드 파일 2종', '## 3. 다음 예정 내역']) {
  if (!deliveryRules.includes(heading)) fail(`DELIVERY_RULES.md is missing required heading: ${heading}`, failures);
}

for (const workflow of ['.github/workflows/pages.yml', '.github/workflows/pages-branch-fallback.yml']) {
  const text = fs.readFileSync(path.join(root, workflow), 'utf8');
  if (!text.includes('npm ci --ignore-scripts')) fail(`${workflow} must install dependencies without npm lifecycle scripts`, failures);
  if (!text.includes('npm run check:release')) fail(`${workflow} does not run the release gate`, failures);
  if (!text.includes('browser-qa-${{ github.run_id }}-${{ github.run_attempt }}')) fail(`${workflow} does not preserve browser failure artifacts`, failures);
}

if (!archiveMode && exists('.git')) {
  const status = spawnSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' });
  if (status.status === 0 && !status.stdout.trim()) warnings.push('Git reports no changed files; confirm that the patch was applied to the intended repository.');
}

if (failures.length) process.exit(1);
warnings.forEach(message => console.warn(`WARN ${message}`));
console.log(`PASS handoff state verified: v${pkg.version} / ${manifest.targetClient}${archiveMode ? ' / archive' : ''}`);
