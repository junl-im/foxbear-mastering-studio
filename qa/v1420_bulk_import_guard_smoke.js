const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const app = read('src/app.js');
const config = read('src/config/app-runtime-config.js');
const runtime = read('src/boot/runtime-health.js');
const pkg = JSON.parse(read('package.json'));
const html = read('index.html');
const sw = read('sw.js');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL v1421 bulk import guard smoke: ${message}`);
    process.exit(1);
  }
}

assert(pkg.version === '1.4.24', 'package version should be 1.4.24');
assert(pkg.name === 'foxbear-github-pro-v1-4-24', 'package name should be v1-4-24');
assert(html.includes('data-build="1.4.24"'), 'index build should be 1.4.24');
assert(config.includes("ASSET_VERSION = '1.4.24-bulk-import-hud'"), 'asset key should be v1.4.24 bulk import guard');
assert(sw.includes("foxbear-shell-v1.4.24-bulk-import-hud"), 'service worker cache should be v1.4.24 bulk import guard');

assert(config.includes('IMPORT_ANALYSIS_CONCURRENCY: 1'), 'runtime config should force single analysis worker for bulk imports');
assert(config.includes('LARGE_IMPORT_BATCH_THRESHOLD: 12'), 'runtime config should define large import threshold');
assert(app.includes('SAFE_IMPORT_ANALYSIS_CONCURRENCY'), 'app should normalize import analysis concurrency');
assert(app.includes('const importAnalysisQueue = []'), 'app should maintain an import analysis queue');
assert(app.includes('function queueTracksForAnalysis'), 'app should queue tracks for analysis');
assert(app.includes('function runImportAnalysisPump'), 'app should pump queued analysis jobs');
assert(app.includes('importAnalysisActiveCount < SAFE_IMPORT_ANALYSIS_CONCURRENCY'), 'analysis pump should obey concurrency limit');
assert(app.includes('대량 업로드 안전 모드'), 'bulk imports should show safe mode messaging');
assert(!app.includes('const analysisJob = analyzeTrack(track);\n        track.analysisPromise = analysisJob;'), 'handleFiles should not start every analysis immediately');
assert(app.includes('FoxBearBulkImportGuard'), 'bulk import guard diagnostics should be exposed');
assert(runtime.includes("'FoxBearBulkImportGuard.getSnapshot'"), 'runtime health should check bulk import guard diagnostics');

console.log('PASS v1421 bulk import guard smoke: sequential queue prevents 35-track decode storms');
