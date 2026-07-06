#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(path.join(root,'.github','workflows','pages.yml'),'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const failures=[];
['index.html','manifest.webmanifest','sw.js'].forEach(file=>{ if(!fs.existsSync(path.join(root,file))) failures.push(`missing ${file}`); if(!workflow.includes(file)) failures.push(`workflow missing ${file}`); });
['assets','src','vendor'].forEach(dir=>{ if(!fs.existsSync(path.join(root,dir))) failures.push(`missing ${dir}`); if(!workflow.includes(dir)) failures.push(`workflow missing ${dir}`); });
['actions/configure-pages@v5','actions/upload-pages-artifact@v5','actions/deploy-pages@v5','artifact_name: github-pages','include-hidden-files: true','touch _site/.nojekyll','set -euo pipefail'].forEach(s=>{ if(!workflow.includes(s)) failures.push(`workflow missing ${s}`); });
const qaChecks = JSON.stringify(pkg.qaChecks || []) + String(pkg.scripts?.check || '');
if(!qaChecks.includes('qa/deploy_pages_artifact_smoke.js')) failures.push('QA runner does not include deploy_pages_artifact_smoke.js');
if(failures.length){ console.error('FAIL deploy pages artifact smoke'); failures.forEach(f=>console.error('-', f)); process.exit(1);}
console.log('PASS deploy pages artifact smoke');
