#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(path.join(root,'.github','workflows','pages.yml'),'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const failures=[];
['index.html','manifest.webmanifest','sw.js'].forEach(file=>{
  if(!fs.existsSync(path.join(root,file))) failures.push(`missing ${file}`);
});
['assets','src','vendor'].forEach(dir=>{
  if(!fs.existsSync(path.join(root,dir))) failures.push(`missing ${dir}`);
});
[
  'actions/configure-pages@v5',
  'actions/upload-pages-artifact@v4',
  'actions/deploy-pages@v4',
  'artifact_name: github-pages',
  'include-hidden-files: true',
  'bash tools/prepare-pages-site.sh',
  'cancel-in-progress: true'
].forEach(s=>{ if(!workflow.includes(s)) failures.push(`workflow missing ${s}`); });
if(!fs.existsSync(path.join(root,'tools','prepare-pages-site.sh'))) failures.push('missing tools/prepare-pages-site.sh');
const prepare = fs.existsSync(path.join(root,'tools','prepare-pages-site.sh'))
  ? fs.readFileSync(path.join(root,'tools','prepare-pages-site.sh'),'utf8')
  : '';
['index.html','manifest.webmanifest','sw.js','assets','src','vendor','touch "${SITE_DIR}/.nojekyll"','type l','-links +1'].forEach(s=>{
  if(!prepare.includes(s)) failures.push(`prepare script missing ${s}`);
});
const qaChecks = JSON.stringify(pkg.qaChecks || []) + String(pkg.scripts?.check || '');
if(!qaChecks.includes('qa/deploy_pages_artifact_smoke.js')) failures.push('QA runner does not include deploy_pages_artifact_smoke.js');
if(failures.length){ console.error('FAIL deploy pages artifact smoke'); failures.forEach(f=>console.error('-', f)); process.exit(1);}
console.log('PASS deploy pages artifact smoke');
