#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootArgIndex = process.argv.indexOf('--root');
const ROOT = path.resolve(rootArgIndex >= 0 && process.argv[rootArgIndex + 1] ? process.argv[rootArgIndex + 1] : path.join(__dirname, '..'));

const { isForbidden, normalize } = require('./source-hygiene-policy');

let gitIndexInspectionSkipped = false;
function trackedFiles() {
  if (!fs.existsSync(path.join(ROOT, '.git'))) return null;
  const result = spawnSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' });
  if (result.error && result.error.code === 'ENOENT') {
    gitIndexInspectionSkipped = true;
    return null;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Unable to inspect tracked files.');
  }
  return result.stdout.split('\0').filter(Boolean).map(normalize);
}

function isWorkspaceForbidden(relative, hasGitRepo) {
  const value = normalize(relative);
  // In a Git worktree, dependency folders created by npm ci are expected local
  // artifacts after the pre-install tracked-file hygiene gate. They are still
  // forbidden when tracked, and remain forbidden in archive/non-Git checks.
  if (hasGitRepo && (value === 'node_modules' || value.startsWith('node_modules/') || value === 'functions/node_modules' || value.startsWith('functions/node_modules/'))) {
    return false;
  }
  return isForbidden(value);
}

function walkFiles(dir, output = [], hasGitRepo = false) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    const relative = normalize(path.relative(ROOT, full));
    if (entry.isSymbolicLink()) {
      output.push(`${relative} -> symlink`);
      continue;
    }
    if (entry.isDirectory()) {
      if (isWorkspaceForbidden(`${relative}/`, hasGitRepo)) {
        output.push(`${relative}/`);
        continue;
      }
      if (hasGitRepo && (relative === 'node_modules' || relative.startsWith('node_modules/') || relative === 'functions/node_modules' || relative.startsWith('functions/node_modules/'))) {
        continue;
      }
      walkFiles(full, output, hasGitRepo);
      continue;
    }
    if (isWorkspaceForbidden(relative, hasGitRepo)) output.push(relative);
  }
  return output;
}

try {
  const tracked = trackedFiles();
  // Strict hygiene is a worktree property, not only a Git-index property.
  // Always scan the physical workspace so ignored/untracked secret files such
  // as .env.production cannot disappear behind gitignore rules.
  // `git ls-files` still lists a tracked path after it was deleted only in the
  // worktree. Treat every forbidden tracked path as a failure until the deletion
  // is committed, so local release checks cannot falsely pass before CI.
  const trackedFailures = tracked ? tracked.filter(isForbidden) : [];
  const workspaceFailures = walkFiles(ROOT, [], Boolean(tracked));
  const failures = [...new Set([...trackedFailures, ...workspaceFailures])].sort();
  if (failures.length) {
    console.error('FAIL source hygiene found local, generated, or secret-like files that must not ship:');
    failures.slice(0, 50).forEach(file => {
      console.error(`  - ${file}`);
      if (process.env.GITHUB_ACTIONS === 'true') {
        const annotationFile = file.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
        console.error(`::error file=${annotationFile},title=Source hygiene violation::Remove this local/generated/secret-like path before release; commit tracked-path deletions.`);
      }
    });
    if (failures.length > 50) console.error(`  - ... ${failures.length - 50} more`);
    console.error('Repair locally, review the deletions, then commit and push:');
    console.error('  npm run source:hygiene:repair');
    console.error('  npm run source:hygiene');
    console.error('Git-only alternative:');
    const quoted = failures.slice(0, 20).map(file => JSON.stringify(file.replace(/\/$/, ''))).join(' ');
    console.error(`  git rm -r --cached --ignore-unmatch -- ${quoted}`);
    process.exit(1);
  }
  if (gitIndexInspectionSkipped) console.warn('WARN Git CLI is unavailable; verified the physical workspace only. Confirm Deleted changes in GitHub Desktop before push.');
  console.log(`PASS source hygiene verified${tracked ? ' for Git-tracked files and local workspace artifacts' : gitIndexInspectionSkipped ? ' for local workspace artifacts (Git index skipped)' : ' for archive files'}`);
} catch (error) {
  console.error(`FAIL source hygiene check: ${error?.message || error}`);
  process.exit(1);
}
