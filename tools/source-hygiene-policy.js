'use strict';

const path = require('path');

const FORBIDDEN_EXACT = Object.freeze([
  '.firebaserc',
  'qa/static-audit.txt',
  'firebase-debug.log',
  'npm-debug.log',
  'PATCH_MANIFEST.json',
  'assets/css/spectrum-visualizer.css',
  'src/ui/spectrum-visualizer.js',
  'APPLY_SPECTRUM_DELETE_NO_GIT.cmd',
  'APPLY_SPECTRUM_DELETE_NO_GIT.sh',
  'README_FIRST.txt',
  'README.txt'
]);

const FORBIDDEN_PREFIXES = Object.freeze([
  '.firebase/',
  '.audit-results/',
  'dist/',
  'node_modules/',
  'functions/node_modules/',
  'qa/browser-results/',
  'qa/browser-history/',
  'test-results/',
  'playwright-report/'
]);

const PATCH_CLEANUP_PATHS = Object.freeze([
  '.firebaserc',
  '.firebase/',
  '.audit-results/',
  'qa/static-audit.txt',
  'qa/browser-check.txt',
  'qa/static-check.txt',
  'PATCH_MANIFEST.json',
  'assets/css/spectrum-visualizer.css',
  'src/ui/spectrum-visualizer.js',
  'APPLY_SPECTRUM_DELETE_NO_GIT.cmd',
  'APPLY_SPECTRUM_DELETE_NO_GIT.sh',
  'README_FIRST.txt',
  'README.txt'
]);

const REPAIRABLE_PATHS = Object.freeze([...new Set([
  ...PATCH_CLEANUP_PATHS.map(value => value.replace(/\/$/, '')),
  'dist',
  'qa/browser-results',
  'qa/browser-history',
  'test-results',
  'playwright-report',
  'firebase-debug.log',
  'npm-debug.log'
])]);
const ONE_OFF_NO_GIT_HELPER_PATTERN = /^APPLY_(?!PATCH_CLEANUP(?:\.(?:cmd|sh))?$)[A-Z0-9_.-]*NO_GIT\.(?:cmd|sh)$/i;

function normalize(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function isSecretEnvFile(relative) {
  const name = path.posix.basename(normalize(relative));
  if (!name.startsWith('.env')) return false;
  return !/\.example$/i.test(name);
}

function isOneOffNoGitHelper(relative) {
  const value = normalize(relative);
  return !value.includes('/') && ONE_OFF_NO_GIT_HELPER_PATTERN.test(value);
}

function isForbidden(relative) {
  const value = normalize(relative);
  if (FORBIDDEN_EXACT.includes(value)) return true;
  if (FORBIDDEN_PREFIXES.some(prefix => value === prefix.slice(0, -1) || value.startsWith(prefix))) return true;
  if (/^qa\/(?:static-audit|browser-check|static-check)[^/]*\.txt$/i.test(value)) return true;
  if (isOneOffNoGitHelper(value)) return true;
  return isSecretEnvFile(value);
}

function isRepairable(relative) {
  const value = normalize(relative).replace(/\/$/, '');
  if (REPAIRABLE_PATHS.includes(value)) return true;
  if (isOneOffNoGitHelper(value)) return true;
  if (/^qa\/(?:static-audit|browser-check|static-check)[^/]*\.txt$/i.test(value)) return true;
  return false;
}

module.exports = {
  FORBIDDEN_EXACT,
  FORBIDDEN_PREFIXES,
  ONE_OFF_NO_GIT_HELPER_PATTERN,
  PATCH_CLEANUP_PATHS,
  REPAIRABLE_PATHS,
  isForbidden,
  isOneOffNoGitHelper,
  isRepairable,
  isSecretEnvFile,
  normalize
};
