#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const { spawnSync } = require('child_process');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const contract = JSON.parse(fs.readFileSync('HANDOFF_PACKAGE.json', 'utf8'));
const handoff = fs.readFileSync('HANDOFF.md', 'utf8');
const desktopGuide = fs.readFileSync('GITHUB_DESKTOP_HANDOFF.md', 'utf8');
const checklist = fs.readFileSync('RELEASE_CHECKLIST.md', 'utf8');
const overwrite = fs.readFileSync('tools/create-overwrite-zip.sh', 'utf8');
const release = fs.readFileSync('tools/create-release-zip.sh', 'utf8');
const overwriteVerifier = fs.readFileSync('tools/verify-overwrite-zip.js', 'utf8');
const releaseVerifier = fs.readFileSync('tools/verify-release-zip.js', 'utf8');
const stateVerifier = fs.readFileSync('tools/verify-handoff-state.js', 'utf8');

assert.strictEqual(contract.targetClient, 'GitHub Desktop');
assert.strictEqual(contract.productVersion, pkg.version);
assert.strictEqual(contract.buildId, pkg.foxbearRelease.buildId);
assert(Array.isArray(contract.deletePaths), 'handoff contract must carry deletePaths');
for (const file of ['playwright.config.js', 'GITHUB_DESKTOP_HANDOFF.md', 'HANDOFF_PACKAGE.json', '.github/workflows/pages.yml']) {
  assert(contract.requiredFiles.includes(file), `handoff contract must require ${file}`);
}
for (const prefix of ['docs/', 'src/', 'qa/', 'tools/']) {
  assert(contract.requiredPrefixes.includes(prefix), `handoff contract must require ${prefix}`);
}
assert(contract.forbiddenArchiveFiles.includes('.firebaserc'), 'transfer archives must not carry local Firebase project binding');

assert(/GitHub Desktop/i.test(handoff), 'handoff must record GitHub Desktop usage');
assert(/Fetch origin/i.test(desktopGuide), 'desktop guide must explain fetching');
assert(/Publish branch/i.test(desktopGuide) && /Push origin/i.test(desktopGuide), 'desktop guide must explain publishing/pushing');
assert(/repository root|저장소 루트/i.test(desktopGuide), 'desktop guide must prevent nested extraction');
assert(checklist.includes('HANDOFF_PACKAGE.json.deletePaths'), 'release checklist must cover deletion instructions');

for (const required of ['.gitignore', 'robots.txt', 'design-preview.html', 'docs', 'GITHUB_DESKTOP_HANDOFF.md', 'HANDOFF_PACKAGE.json']) {
  assert(overwrite.includes(`copy_path "${required}"`), `overwrite packaging must include ${required}`);
}
assert(release.includes("-x '.firebaserc'"), 'full release must exclude local .firebaserc');
assert(release.includes('verify-release-zip.js'), 'full release must verify the generated archive');
assert(overwriteVerifier.includes('verify-handoff-state.js'), 'overwrite verifier must delegate to the package contract preflight');
assert(releaseVerifier.includes('verify-handoff-state.js'), 'release verifier must delegate to the package contract preflight');
assert(stateVerifier.includes('wrong folder') || stateVerifier.includes('wrong-folder') || stateVerifier.includes('wrong folder'), 'handoff state verifier should diagnose wrong-folder extraction');
assert(pkg.scripts['handoff:check'], 'package scripts must expose handoff:check');
assert(pkg.scripts['check:release'].includes('handoff:check'), 'release gate must run handoff:check');

const probe = spawnSync(process.execPath, ['tools/verify-handoff-state.js'], { encoding: 'utf8' });
assert.strictEqual(probe.status, 0, probe.stderr || probe.stdout);
assert(/PASS handoff state verified/.test(probe.stdout), 'handoff preflight must report success');

console.log('PASS v1.5.14 GitHub Desktop handoff and package preflight');
