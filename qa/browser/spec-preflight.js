#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const BROWSER_ROOT = path.join(PROJECT_ROOT, 'qa', 'browser');
const RULES = Object.freeze([
  { code: 'HTML_INNER_ASSIGNMENT', pattern: /\.innerHTML\s*=/, guidance: 'Build fixture nodes with createElement/textContent and replaceChildren.' },
  { code: 'HTML_OUTER_ASSIGNMENT', pattern: /\.outerHTML\s*=/, guidance: 'Replace the target through DOM node operations instead of parsing HTML.' },
  { code: 'HTML_ADJACENT_INSERTION', pattern: /insertAdjacentHTML\s*\(/, guidance: 'Append structured elements instead of inserting HTML strings.' },
  { code: 'DOCUMENT_WRITE', pattern: /document\.write\s*\(/, guidance: 'Create and append DOM nodes without the legacy document writer API.' },
  { code: 'STRING_EVALUATE', pattern: /\.(?:evaluate|evaluateHandle)\s*\(\s*['"`]/, guidance: 'Pass a serializable function to Playwright evaluate APIs instead of a code string.' }
]);

function listJavaScriptFiles(root = BROWSER_ROOT) {
  const files = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full);
    }
  };
  walk(root);
  return files.sort();
}

function scanBrowserSpecSafety(options = {}) {
  const root = options.root || BROWSER_ROOT;
  const files = options.files || listJavaScriptFiles(root);
  const violations = [];
  for (const file of files) {
    const relative = path.relative(PROJECT_ROOT, file).split(path.sep).join('/');
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const rule of RULES) {
        if (!rule.pattern.test(line)) continue;
        violations.push({
          code: rule.code,
          file: relative,
          line: index + 1,
          source: line.trim(),
          guidance: rule.guidance
        });
      }
    });
  }
  return violations;
}

function formatBrowserSpecViolations(violations) {
  return violations.map(item => `${item.file}:${item.line} [${item.code}] ${item.source}\n    Fix: ${item.guidance}`);
}

function assertBrowserSpecSafety(options = {}) {
  const violations = scanBrowserSpecSafety(options);
  if (!violations.length) return [];
  const error = new Error(`Browser QA preflight rejected ${violations.length} unsafe fixture sink(s).\n${formatBrowserSpecViolations(violations).join('\n')}`);
  error.code = 'FOXBEAR_BROWSER_SPEC_PREFLIGHT_FAILED';
  error.violations = violations;
  throw error;
}

if (require.main === module) {
  try {
    assertBrowserSpecSafety();
    console.log('PASS browser QA preflight: no unsafe HTML or string-evaluate sinks');
  } catch (error) {
    console.error(`FAIL ${error.message || error}`);
    process.exitCode = 1;
  }
}

module.exports = {
  BROWSER_ROOT,
  RULES,
  assertBrowserSpecSafety,
  formatBrowserSpecViolations,
  listJavaScriptFiles,
  scanBrowserSpecSafety
};
