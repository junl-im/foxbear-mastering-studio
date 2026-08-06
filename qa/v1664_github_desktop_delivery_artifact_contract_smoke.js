#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
};

const pkg = json('package.json');
const handoff = json('HANDOFF_PACKAGE.json');
const hygiene = read('tools/archive-hygiene.js');
const sourceHygiene = read('tools/check-source-hygiene.js');
const delivery = read('tools/create-delivery-zips.js');
const patchVerifier = read('tools/verify-patch-zip.js');
const overwrite = read('tools/create-overwrite-zip.sh');
const release = read('tools/create-release-zip.sh');
const gate = read('tools/run-release-gate.js');
const gitignore = read('.gitignore');
const deletePaths = read('DELETE_PATHS.txt');

assert(/^\d+\.\d+\.\d+$/.test(pkg.version), 'package version must be semantic');
assert(pkg.scripts?.['source:hygiene'] === 'node tools/check-source-hygiene.js', 'source:hygiene script missing');
assert(pkg.scripts?.['package:delivery'] === 'node tools/create-delivery-zips.js', 'package:delivery script missing');
assert(pkg.scripts?.['package:verify:full'] === `node tools/verify-release-zip.js dist/foxbear-mastering-studio-v${pkg.version}-full.zip`, 'full verifier filename mismatch');
assert(pkg.scripts?.['package:verify:patch'] === `node tools/verify-patch-zip.js dist/foxbear-mastering-studio-v${pkg.version}-patch.zip`, 'patch verifier filename mismatch');
assert(delivery.includes('-full.zip') && delivery.includes('-patch.zip'), 'delivery aliases are missing');
assert(delivery.includes('check-source-hygiene.js'), 'delivery build must run source hygiene');
assert(delivery.includes("gitLines(['diff', '--name-only'"), 'patch build must select changed Git files');
assert(delivery.includes('PATCH_MANIFEST.json'), 'patch build must generate PATCH_MANIFEST.json');
assert(patchVerifier.includes('undeclared files') && patchVerifier.includes('DELETE_PATHS.txt'), 'changed-file patch verifier contract incomplete');
assert(overwrite.includes('copy_path "PATCH_NOTES.md"') && overwrite.includes('copy_path "DELETE_PATHS.txt"'), 'patch guidance files are not copied');
for (const token of ["'.git'", "'.firebase'", "'.audit-results'"]) {
  assert(hygiene.includes(token), `archive hygiene missing ${token}`);
}
assert(hygiene.includes("name === '.firebaserc'"), 'archive hygiene must reject .firebaserc');
assert(sourceHygiene.includes("'.firebaserc'") && sourceHygiene.includes("'.firebase/'") && sourceHygiene.includes("'.audit-results/'"), 'source hygiene forbidden set incomplete');
assert(gate.includes("'source:hygiene'"), 'release gate must run source:hygiene');
assert(gitignore.includes('.firebaserc') && gitignore.includes('.audit-results/'), 'local Firebase/audit paths must be ignored');
for (const item of ['.firebaserc', '.firebase/', '.audit-results/', 'qa/static-audit.txt']) {
  assert(deletePaths.includes(item), `DELETE_PATHS.txt missing ${item}`);
}
for (const file of ['tools/check-source-hygiene.js', 'tools/create-delivery-zips.js', 'tools/verify-patch-zip.js', 'PATCH_NOTES.md', 'DELETE_PATHS.txt', 'qa/v1664_github_desktop_delivery_artifact_contract_smoke.js', 'docs/V1.6.64_GITHUB_DESKTOP_DELIVERY_ARTIFACT_CONTRACT.md']) {
  assert((handoff.requiredFiles || []).includes(file), `handoff requiredFiles missing ${file}`);
}
for (const deleted of ['.firebaserc', '.firebase', '.audit-results', 'qa/static-audit.txt']) {
  assert((handoff.deletePaths || []).includes(deleted), `handoff deletePaths missing ${deleted}`);
}
assert(!fs.existsSync(path.join(ROOT, '.firebaserc')), '.firebaserc must not remain in the release source tree');
assert(!fs.existsSync(path.join(ROOT, '.firebase/hosting..cache')), 'Firebase hosting cache must not remain in the release source tree');
assert(!fs.existsSync(path.join(ROOT, 'qa/static-audit.txt')), 'generated static audit must not remain in the release source tree');

console.log('PASS v1.6.64 GitHub Desktop delivery artifact contract regression');
