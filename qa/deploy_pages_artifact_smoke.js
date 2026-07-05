#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, '.github', 'workflows', 'pages.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

const requiredRootFiles = ['index.html', 'manifest.webmanifest', 'sw.js'];
const requiredDirs = ['assets', 'src', 'vendor'];
const failures = [];

for (const file of requiredRootFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing root file ${file}`);
  const copyPattern = new RegExp(`cp\\s+\\"?\\$?\\{?file\\}?\\"?|cp\\s+${file.replace('.', '\\.')}`);
  if (!workflow.includes(file)) failures.push(`workflow does not reference ${file}`);
}

for (const dir of requiredDirs) {
  if (!fs.existsSync(path.join(root, dir))) failures.push(`missing root directory ${dir}`);
  if (!workflow.includes(dir)) failures.push(`workflow does not reference ${dir}`);
}

const requiredSnippets = [
  'actions/configure-pages@v5',
  'actions/upload-pages-artifact@v5',
  'actions/deploy-pages@v5',
  'name: github-pages',
  'artifact_name: github-pages',
  'include-hidden-files: true',
  'find _site -type l',
  'find _site -type f -links +1',
  'touch _site/.nojekyll',
  'set -euo pipefail'
];

for (const snippet of requiredSnippets) {
  if (!workflow.includes(snippet)) failures.push(`workflow missing snippet: ${snippet}`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!packageJson.scripts?.check?.includes('qa/deploy_pages_artifact_smoke.js')) {
  failures.push('npm run check does not include deploy_pages_artifact_smoke.js');
}

if (failures.length) {
  console.error('FAIL deploy pages artifact smoke');
  for (const failure of failures) console.error('-', failure);
  process.exit(1);
}

console.log('PASS deploy pages artifact smoke');
