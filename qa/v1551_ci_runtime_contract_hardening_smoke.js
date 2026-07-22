#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const release = pkg.foxbearRelease;
const index = read('index.html');
const sw = read('sw.js');
const runtimeConfig = read('src/config/app-runtime-config.js');
const buildInfo = read('src/config/build-info.js');
const syncTool = read('tools/sync-release-metadata.js');

const assetVersion = release.assetVersion;
const runtimeHealthUrl = `src/boot/runtime-health.js?v=${assetVersion}&h=${release.bootRevision}`;
const recoveryUrl = `src/boot/service-worker-recovery-service.js?v=${assetVersion}`;
const count = (text, value) => text.split(value).length - 1;

assert.strictEqual(pkg.version, '1.5.67', 'package version must be v1.5.67');
assert.strictEqual(count(index, runtimeHealthUrl), 1, 'runtime health must load exactly once');
assert.strictEqual(count(index, recoveryUrl), 1, 'service worker recovery must load exactly once');
assert(index.indexOf(runtimeHealthUrl) < index.indexOf('src/security/site-guards.js'), 'runtime health must load before site guards');
assert(index.indexOf(runtimeHealthUrl) < index.indexOf('src/app.js'), 'runtime health must load before app.js');
assert(sw.includes(`./${runtimeHealthUrl}`), 'service worker must precache current runtime health');
assert(sw.includes(`./${recoveryUrl}`), 'service worker must precache current recovery service');
assert(runtimeConfig.includes(`const ASSET_VERSION = '${assetVersion}'`), 'runtime config asset generation mismatch');
assert(buildInfo.includes(`assetVersion: '${assetVersion}'`), 'build info asset generation mismatch');
assert(sw.includes(`const CACHE_NAME = '${release.cacheName}'`), 'service worker cache generation mismatch');

const generations = [...index.matchAll(/\?v=(\d+\.\d+\.\d+-[a-z0-9][a-z0-9-]*)/g)].map(match => match[1]);
assert(generations.length > 20, 'expected local cache-busted assets in index');
assert.deepStrictEqual([...new Set(generations)], [assetVersion], 'index must contain one local asset generation only');
assert(!index.includes('1.5.49-stale-shell-generation-recovery'), 'stale v1.5.49 generation remains in index');

assert(syncTool.includes('runtime health must be loaded exactly once'), 'release validator must enforce runtime-health boot contract');
assert(syncTool.includes('service worker recovery must be loaded exactly once'), 'release validator must enforce recovery boot contract');
assert(syncTool.includes('index contains stale local asset generations'), 'release validator must reject mixed asset generations');
assert(syncTool.includes('local runtime asset is missing the current cache-busting query'), 'release validator must reject unversioned local assets');

console.log('v1.5.51 CI runtime contract hardening smoke: PASS');
