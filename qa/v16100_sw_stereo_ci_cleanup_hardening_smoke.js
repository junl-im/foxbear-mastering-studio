#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const sw = read('sw.js');
const app = read('src/app.js');
const worker = read('src/workers/analysis.worker.js');
const hygiene = read('tools/check-source-hygiene.js');
const hygienePolicy = read('tools/source-hygiene-policy.js');
const browserSpec = read('qa/browser/mobile-ai-admin-header-matrix-playwright.spec.js');

assert(!fs.existsSync(path.join(root, 'src/ui/spectrum-visualizer.js')), 'retired spectrum JS must be physically absent');
assert(!fs.existsSync(path.join(root, 'assets/css/spectrum-visualizer.css')), 'retired spectrum CSS must be physically absent');
assert(hygiene.includes("require('./source-hygiene-policy')") && hygienePolicy.includes("'src/ui/spectrum-visualizer.js'") && hygienePolicy.includes("'assets/css/spectrum-visualizer.css'"), 'source hygiene must reject retired spectrum assets immediately');
assert(sw.includes("LEGACY_CACHE_NAMES.slice(-RETAINED_LEGACY_SHELL_COUNT)"), 'client-aware purge must preserve the declared rollback generation count');
assert(sw.includes("name.startsWith('foxbear-shell-') && name !== CACHE_NAME"), 'exact stale-generation lookup must search all FoxBear shell caches after SW restart');
assert(/const channels = Math\.max\(1, Math\.min\(buffer\.numberOfChannels \|\| 1, 2\)\), channelBuffers/.test(app), 'worker analysis transfer must be capped to stereo');
assert(/function analyzeBuffer\(buffer\) \{\s*const channels = Math\.max\(1, Math\.min\(buffer\.numberOfChannels \|\| 1, 2\)\);/.test(app), 'main-thread analysis fallback must be capped to stereo');
assert(worker.includes('Math.min(2, Number(channels || 1)'), 'analysis worker must defensively cap incoming channels to stereo');
assert(hygiene.includes("result.error && result.error.code === 'ENOENT'"), 'source hygiene must support GitHub Desktop environments without Git CLI in PATH');
assert(browserSpec.includes('[320, 390, 430]') && browserSpec.includes("document.body.dataset.uiMode = 'ai'") && browserSpec.includes("admin.hidden = false"), 'browser QA must cover AI/admin mobile header state matrix');
console.log('PASS v1.6.100 SW restart cache, stereo analysis, cleanup hygiene, and mobile AI/admin header matrix');
