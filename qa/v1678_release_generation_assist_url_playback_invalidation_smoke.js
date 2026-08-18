#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const failures = [];
const expect = (ok, message) => { if (!ok) failures.push(message); };

const delivery = read('tools/create-delivery-zips.js');
const releaseVerify = read('tools/verify-release-zip.js');
const patchVerify = read('tools/verify-patch-zip.js');
const download = read('src/download/download-service.js');
const app = read('src/app.js');
const index = read('index.html');
const recovery404 = read('404.html');

expect(pkg.version === '1.6.104', 'package version must be v1.6.104');
expect(/^[a-z0-9][a-z0-9-]*$/.test(String(pkg.foxbearRelease?.buildId || '')), 'current buildId must remain valid kebab-case');
expect(String(pkg.foxbearRelease?.assetVersion || '') === `${pkg.version}-${pkg.foxbearRelease.buildId}`, 'assetVersion must derive from current product version and buildId');
expect(delivery.includes("sync-release-metadata.js'), '--check'"), 'delivery packaging must gate on release metadata synchronization');
expect((delivery.match(/sync-release-metadata\.js'\), '--check'/g) || []).length >= 2, 'delivery packaging must verify metadata more than once around packaging');
expect(releaseVerify.includes("tools/sync-release-metadata.js'), '--check'"), 'full ZIP verifier must validate extracted release metadata');
expect(patchVerify.includes('Patch index.html does not match package release generation.'), 'patch ZIP verifier must reject stale index generation');
expect(download.includes('const isDownloadAssistUrlInUse = url =>'), 'download assist URL ownership guard is missing');
expect(download.includes("object-url-revoke-deferred-assist"), 'assist URL revoke deferral diagnostics are missing');
expect(download.includes("global.addEventListener?.('pageshow'"), 'BFCache pageshow URL lifetime refresh is missing');
expect(download.includes("panel.dataset.closing = 'true'"), 'assist closing state must allow URL revocation');
expect(app.includes('if (track.masteredUrl && !retirePlaybackObjectUrl(track, track.masteredUrl))'), 'mastered output invalidation must retire active playback URLs safely');
expect(index.includes(`data-build="${pkg.version}"`), 'index build version is stale');
expect(index.includes(`?v=${pkg.foxbearRelease.assetVersion}`), 'index asset generation is stale');
expect(recovery404.includes(`?v=${pkg.foxbearRelease.assetVersion}`), '404 recovery asset generation is stale');

if (failures.length) {
  failures.forEach(message => console.error(`FAIL ${message}`));
  process.exit(1);
}
console.log('PASS v1.6.78 release generation, assist URL lifetime, and playback-safe invalidation regression guard');
