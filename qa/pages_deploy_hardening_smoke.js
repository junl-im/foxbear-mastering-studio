#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const pagesWorkflow = fs.readFileSync(path.join(root,'.github','workflows','pages.yml'),'utf8');
const fallbackWorkflowPath = path.join(root,'.github','workflows','pages-branch-fallback.yml');
const fallbackWorkflow = fs.existsSync(fallbackWorkflowPath) ? fs.readFileSync(fallbackWorkflowPath,'utf8') : '';
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const failures=[];
[
  'actions/upload-pages-artifact@v4',
  'actions/deploy-pages@v4',
  'continue-on-error: true',
  'Retry GitHub Pages deployment once',
  'cancel-in-progress: true',
  'timeout-minutes: 20',
  'bash tools/prepare-pages-site.sh'
].forEach(s=>{ if(!pagesWorkflow.includes(s)) failures.push(`pages workflow missing ${s}`); });
if(!fallbackWorkflow) failures.push('missing pages-branch-fallback.yml');
[
  'workflow_dispatch:',
  'contents: write',
  'git push --force origin HEAD:gh-pages',
  'bash tools/prepare-pages-site.sh',
  'touch .nojekyll'
].forEach(s=>{ if(fallbackWorkflow && !fallbackWorkflow.includes(s)) failures.push(`fallback workflow missing ${s}`); });
const qaChecks = JSON.stringify(pkg.qaChecks || []);
if(!qaChecks.includes('qa/pages_deploy_hardening_smoke.js')) failures.push('QA runner does not include pages_deploy_hardening_smoke.js');
if(failures.length){
  console.error('FAIL pages deploy hardening smoke');
  failures.forEach(f=>console.error('-', f));
  process.exit(1);
}
console.log('PASS pages deploy hardening smoke');
