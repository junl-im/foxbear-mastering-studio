#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const RESULTS_DIR = path.join(PROJECT_ROOT, 'qa', 'browser-results');
const OUTPUT_PATH = path.join(RESULTS_DIR, 'browser-impact.json');

const RELEASE_METADATA_JSON_FILES = new Set([
  'package.json',
  'package-lock.json',
  'functions/package.json',
  'functions/package-lock.json'
]);

const ALL_BROWSER_SPECS = Object.freeze([
  'qa/browser/analysis-cancel-replacement-playback-playwright.spec.js',
  'qa/browser/bulk-35-import-master-export-playwright.spec.js',
  'qa/browser/preview-translation-playback-playwright.spec.js',
  'qa/browser/pwa-back-wakelock-sw-playwright.spec.js',
  'qa/browser/quality-recovery-profiles-playwright.spec.js',
  'qa/browser/runtime-health-playwright.spec.js',
  'qa/browser/v1573-bulk-mastering-controls-visual.spec.js',
  'qa/browser/v1574-mobile-download-batch-controls-visual.spec.js'
]);

const DOCUMENTATION_PATTERNS = Object.freeze([
  /^(?:docs\/|qa\/.*\.md$)/,
  /^(?:README|CHANGELOG|HANDOFF|STATUS|PROJECT_NOTES|RELEASE_CHECKLIST|VERSIONING|FIREBASE_SETUP|GITHUB_DESKTOP_HANDOFF)\.md$/,
  /^(?:robots\.txt|\.nojekyll)$/
]);

const STATIC_ONLY_PATTERNS = Object.freeze([
  /^functions\//,
  /^qa\/(?!browser\/).+\.js$/,
  /^tools\/(?:archive-hygiene|create-overwrite-zip|create-release-zip|prepare-pages-site|verify-handoff-state|verify-overwrite-zip|verify-release-zip)\.(?:js|sh)$/,
  /^(?:firestore\.rules|firestore\.indexes\.json|firebase\.json|\.firebaserc\.example)$/
]);

const FORCE_FULL_PATTERNS = Object.freeze([
  /^(?:package|package-lock)\.json$/,
  /^playwright\.config\.js$/,
  /^\.github\/workflows\//,
  /^qa\/browser\/(?:run-browser-e2e|run-browser-health-first|run-browser-preflight|spec-preflight|fixture-contract-preflight|select-browser-scope|retry-recovery-report|verify-retry-recovery|flaky-history)\.js$/,
  /^qa\/browser\/helpers\//,
  /^index\.html$/,
  /^manifest\.webmanifest$/,
  /^sw\.js$/,
  /^src\/(?:app\.js|boot\/(?:kakao-entry-guard|kakao-external-browser|render-scheduler)\.js|security\/|state\/|workers\/|utils\/worker-job-service\.js)/,
  /^assets\/icons\//
]);

const GENERIC_CSS_PATTERNS = Object.freeze([
  /^assets\/css\/(?:studio|layout|theme|dock-ui-repair)\.css$/,
  /^assets\/css\/components\/(?:base-components|cards|floating-overlays|forms|modal-close-system)\.css$/
]);

const CSS_SELECTOR_RULES = Object.freeze([
  {
    name: 'bulk-mastering-selector',
    pattern: /bulk-import|master-all|batch-progress|mastering-queue/i,
    specs: [
      'qa/browser/bulk-35-import-master-export-playwright.spec.js',
      'qa/browser/v1573-bulk-mastering-controls-visual.spec.js'
    ]
  },
  {
    name: 'download-selector',
    pattern: /download|export-sheet|format-option|save-assist/i,
    specs: [
      'qa/browser/bulk-35-import-master-export-playwright.spec.js',
      'qa/browser/v1574-mobile-download-batch-controls-visual.spec.js'
    ]
  },
  {
    name: 'playback-selector',
    pattern: /dock|waveform|compare|preview|playback|transport/i,
    specs: [
      'qa/browser/analysis-cancel-replacement-playback-playwright.spec.js',
      'qa/browser/preview-translation-playback-playwright.spec.js',
      'qa/browser/pwa-back-wakelock-sw-playwright.spec.js'
    ]
  },
  {
    name: 'runtime-selector',
    pattern: /runtime-health|brand-command|mobile-native|release-label|boot-status/i,
    specs: [
      'qa/browser/runtime-health-playwright.spec.js',
      'qa/browser/pwa-back-wakelock-sw-playwright.spec.js'
    ]
  },
  {
    name: 'quality-selector',
    pattern: /quality|recovery-profile|mastering-report|mastering-inspector|true-peak/i,
    specs: ['qa/browser/quality-recovery-profiles-playwright.spec.js']
  },
  {
    name: 'admin-operations-selector',
    pattern: /admin-incident|admin-health|incident-monitor|operations-audit/i,
    specs: ['qa/browser/runtime-health-playwright.spec.js']
  }
]);

const SPEC_RULES = Object.freeze([
  {
    name: 'bulk-mastering',
    pattern: /^(?:src\/ui\/bulk-import-hud-view\.js|assets\/css\/bulk-import-hud\.css|src\/audio\/(?:mastering-orchestrator-service|mastering-quality-audit-service|master-preview-job-service)\.js)$/,
    specs: [
      'qa/browser/bulk-35-import-master-export-playwright.spec.js',
      'qa/browser/v1573-bulk-mastering-controls-visual.spec.js'
    ]
  },
  {
    name: 'download-export',
    pattern: /^(?:src\/(?:download\/|ui\/download-dialog-view\.js)|assets\/css\/download-dialog\.css)$/,
    specs: [
      'qa/browser/bulk-35-import-master-export-playwright.spec.js',
      'qa/browser/v1574-mobile-download-batch-controls-visual.spec.js'
    ]
  },
  {
    name: 'quality-recovery',
    pattern: /^(?:src\/audio\/(?:quality-gate-service|inapp-mastering-safety-service|mastering-quality-audit-service)\.js|src\/config\/(?:mastering-presets|reference-targets)\.js)$/,
    specs: ['qa/browser/quality-recovery-profiles-playwright.spec.js']
  },
  {
    name: 'playback-preview',
    pattern: /^(?:src\/audio\/(?:playback-link-service|playback-transition-service|audio-context-manager|preview-translation-service|highlight-compare-inspector)\.js|src\/ui\/(?:dock-controller|waveform-compare-view|waveform-control-view)\.js|assets\/css\/(?:dock|waveform)[^/]*\.css)$/,
    specs: [
      'qa/browser/analysis-cancel-replacement-playback-playwright.spec.js',
      'qa/browser/preview-translation-playback-playwright.spec.js',
      'qa/browser/pwa-back-wakelock-sw-playwright.spec.js'
    ]
  },
  {
    name: 'runtime-mobile-header',
    pattern: /^(?:src\/ui\/mobile-native-view\.js|assets\/css\/(?:header-command-bar|mobile-native)[^/]*\.css)$/,
    specs: [
      'qa/browser/runtime-health-playwright.spec.js',
      'qa/browser/pwa-back-wakelock-sw-playwright.spec.js'
    ]
  },
  {
    name: 'runtime-health-details',
    pattern: /^(?:src\/boot\/(?:runtime-health|performance-diagnostics|release-presentation-service)\.js|src\/ui\/detail-panels-view\.js|assets\/css\/boot\/(?:runtime-health|performance-diagnostics)\.css)$/,
    specs: ['qa/browser/runtime-health-playwright.spec.js']
  },
  {
    name: 'pwa-update-recovery',
    pattern: /^(?:src\/boot\/(?:service-worker-recovery-service|service-worker-update-service|update-safety-service|session-handoff-service)\.js|assets\/css\/external-browser\.css|external-browser\.html)$/,
    specs: [
      'qa/browser/runtime-health-playwright.spec.js',
      'qa/browser/pwa-back-wakelock-sw-playwright.spec.js'
    ]
  },
  {
    name: 'admin-operations',
    pattern: /^(?:src\/ui\/admin-incident-monitor-view\.js|src\/boot\/incident-reporter\.js|assets\/css\/components\/admin-incident-monitor\.css)$/,
    specs: ['qa/browser/runtime-health-playwright.spec.js']
  },
  {
    name: 'quality-report-compare',
    pattern: /^(?:src\/audio\/(?:mastering-inspector|highlight-compare-inspector|reference-profile-service)\.js|src\/ui\/(?:detail-view|waveform-compare-view)\.js|assets\/css\/(?:waveform-compare|components\/preview-system)\.css)$/,
    specs: [
      'qa/browser/preview-translation-playback-playwright.spec.js',
      'qa/browser/quality-recovery-profiles-playwright.spec.js'
    ]
  },
  {
    name: 'import-analysis',
    pattern: /^(?:src\/audio\/(?:audio-import-capability-service|audio-decode-service|import-preflight-service|import-queue-service|analysis-cache-service|mastering-input-guard-service)\.js|src\/engines\/|src\/config\/genre-presets\.js)$/,
    specs: [
      'qa/browser/analysis-cancel-replacement-playback-playwright.spec.js',
      'qa/browser/bulk-35-import-master-export-playwright.spec.js'
    ]
  }
]);

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function releaseMetadataFromPackage(pkg = {}) {
  const release = pkg.foxbearRelease || {};
  const productVersion = String(pkg.version || '').trim();
  const buildId = String(release.buildId || '').trim();
  const assetVersion = String(release.assetVersion || (productVersion && buildId ? `${productVersion}-${buildId}` : '')).trim();
  return {
    productVersion,
    appVersion: productVersion ? `Pro v${productVersion}` : '',
    buildId,
    assetVersion,
    cacheName: String(release.cacheName || (assetVersion ? `foxbear-shell-v${assetVersion}` : '')).trim(),
    bootRevision: String(release.bootRevision || '').trim(),
    updateSafetyRevision: String(release.updateSafetyRevision || '').trim(),
    serviceWorkerRevision: String(release.serviceWorkerRevision || '').trim()
  };
}

function normalizeJsonMetadata(file, text) {
  let value;
  try { value = JSON.parse(text); } catch (_) { return null; }
  const clone = JSON.parse(JSON.stringify(value));
  if (file === 'package.json') {
    delete clone.version;
    delete clone.description;
    delete clone.foxbearRelease;
    if (clone.scripts) {
      delete clone.scripts['package:verify:overwrite'];
      delete clone.scripts['package:verify:release'];
      delete clone.scripts['package:verify:full'];
      delete clone.scripts['package:verify:patch'];
    }
  } else if (file === 'package-lock.json' || file === 'functions/package-lock.json') {
    delete clone.version;
    if (clone.packages?.['']) delete clone.packages[''].version;
  } else if (file === 'functions/package.json') {
    delete clone.version;
  }
  return JSON.stringify(clone);
}

function normalizeReleaseMetadataText(text, metadataList = []) {
  let normalized = String(text || '').replace(/\r\n/g, '\n');
  const fields = ['cacheName', 'assetVersion', 'appVersion', 'buildId', 'bootRevision', 'updateSafetyRevision', 'serviceWorkerRevision', 'productVersion'];
  for (const field of fields) {
    const values = [...new Set(metadataList.map(meta => String(meta?.[field] || '')).filter(Boolean))]
      .sort((a, b) => b.length - a.length);
    for (const value of values) normalized = normalized.replace(new RegExp(escapeRegExp(value), 'g'), `__FOXBEAR_${field.toUpperCase()}__`);
  }
  normalized = normalized
    .replace(/sha384-[A-Za-z0-9+/=]+/g, '__FOXBEAR_SRI__')
    .replace(/const LEGACY_CACHE_NAMES = \[[^\]]*\];/g, 'const LEGACY_CACHE_NAMES = [__FOXBEAR_LEGACY_CACHES__];');
  return normalized;
}

function isReleaseMetadataOnlyChange(file, beforeText, afterText, beforeMetadata, afterMetadata) {
  const normalizedFile = normalizeChangedFile(file);
  if (beforeText == null || afterText == null) return false;
  if (RELEASE_METADATA_JSON_FILES.has(normalizedFile)) {
    const beforeJson = normalizeJsonMetadata(normalizedFile, beforeText);
    const afterJson = normalizeJsonMetadata(normalizedFile, afterText);
    return beforeJson !== null && afterJson !== null && beforeJson === afterJson;
  }
  const metadata = [beforeMetadata, afterMetadata];
  return normalizeReleaseMetadataText(beforeText, metadata) === normalizeReleaseMetadataText(afterText, metadata);
}

function gitShowFile(ref, file, options = {}) {
  if (!ref || !file) return null;
  const cwd = options.cwd || PROJECT_ROOT;
  const result = spawnSync('git', ['show', `${ref}:${file}`], { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  return result.status === 0 ? String(result.stdout || '') : null;
}

function gitReleaseMetadata(ref, options = {}) {
  const text = gitShowFile(ref, 'package.json', options);
  if (text == null) return null;
  try { return releaseMetadataFromPackage(JSON.parse(text)); } catch (_) { return null; }
}

function detectMetadataOnlyFiles(files, base, head = 'HEAD', options = {}) {
  if (!base || /^0+$/.test(base) || !head) return [];
  const beforeMetadata = gitReleaseMetadata(base, options);
  const afterMetadata = gitReleaseMetadata(head, options);
  if (!beforeMetadata || !afterMetadata) return [];
  const metadataOnly = [];
  for (const file of uniqueSorted(files || [])) {
    const beforeText = gitShowFile(base, file, options);
    const afterText = gitShowFile(head, file, options);
    if (isReleaseMetadataOnlyChange(file, beforeText, afterText, beforeMetadata, afterMetadata)) metadataOnly.push(file);
  }
  return metadataOnly;
}

function normalizeChangedFile(value) {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '');
}

function uniqueSorted(values) {
  return [...new Set(values.map(normalizeChangedFile).filter(Boolean))].sort();
}

function matchesAny(file, patterns) {
  return patterns.some(pattern => pattern.test(file));
}

function isDocumentationOnlyFile(file) {
  return matchesAny(file, DOCUMENTATION_PATTERNS);
}

function isStaticOnlyFile(file) {
  return matchesAny(file, STATIC_ONLY_PATTERNS);
}

function isGenericCssFile(file) {
  return matchesAny(file, GENERIC_CSS_PATTERNS);
}

function normalizeCssSelectorMap(value) {
  const result = {};
  if (!value || typeof value !== 'object') return result;
  for (const [file, selectors] of Object.entries(value)) {
    const normalizedFile = normalizeChangedFile(file);
    if (!normalizedFile) continue;
    result[normalizedFile] = uniqueSorted(Array.isArray(selectors) ? selectors : [selectors]);
  }
  return result;
}

function selectSpecsForCssSelectors(selectors = []) {
  const normalized = uniqueSorted(selectors);
  const selected = new Set();
  const matched = [];
  const unmatched = [];
  for (const selector of normalized) {
    if (/^(?:html|body|:root|\*|\[hidden\])$/i.test(selector)) continue;
    const rules = CSS_SELECTOR_RULES.filter(rule => rule.pattern.test(selector));
    if (!rules.length) {
      unmatched.push(selector);
      continue;
    }
    for (const rule of rules) {
      matched.push(`${rule.name}: ${selector}`);
      rule.specs.forEach(spec => selected.add(spec));
    }
  }
  return { specs: [...selected].sort(), matched, unmatched };
}

function extractCssSelectorTokens(diffText = '') {
  const selectors = new Set();
  for (const rawLine of String(diffText || '').split(/\r?\n/)) {
    if (/^(?:diff --git|index |--- |\+\+\+ |@@)/.test(rawLine)) continue;
    const line = rawLine.replace(/^[ +-]/, '').trim();
    if (!line || line.startsWith('/*') || /^[a-z-]+\s*:/.test(line)) continue;
    for (const match of line.matchAll(/(?:[.#][A-Za-z_][A-Za-z0-9_-]*|\[[A-Za-z_][^\]]*\]|:root|\bbody\b|\bhtml\b)/g)) {
      selectors.add(match[0]);
    }
  }
  return [...selectors].sort();
}

function gitChangedCssSelectors(base, head = 'HEAD', options = {}) {
  if (!base || /^0+$/.test(base)) return {};
  const cwd = options.cwd || PROJECT_ROOT;
  const result = spawnSync('git', ['diff', '--unified=3', '--diff-filter=ACMRD', base, head, '--', '*.css'], { cwd, encoding: 'utf8' });
  if (result.status !== 0) return {};
  const map = {};
  let currentFile = '';
  let chunk = [];
  const flush = () => {
    if (!currentFile || !chunk.length) return;
    const tokens = extractCssSelectorTokens(chunk.join('\n'));
    if (tokens.length) map[currentFile] = uniqueSorted([...(map[currentFile] || []), ...tokens]);
    chunk = [];
  };
  for (const line of String(result.stdout || '').split(/\r?\n/)) {
    const fileMatch = line.match(/^\+\+\+ b\/(.+\.css)$/);
    if (fileMatch) {
      flush();
      currentFile = normalizeChangedFile(fileMatch[1]);
      continue;
    }
    if (/^diff --git /.test(line)) { flush(); currentFile = ''; continue; }
    if (currentFile) chunk.push(line);
  }
  flush();
  return map;
}

function selectBrowserScope(changedFiles, options = {}) {
  const files = uniqueSorted(changedFiles || []);
  const allSpecs = options.allSpecs || ALL_BROWSER_SPECS;
  const changedCssSelectors = normalizeCssSelectorMap(options.changedCssSelectors);
  const metadataOnlyFiles = new Set(uniqueSorted(options.metadataOnlyFiles || []));
  const isNonBrowserFile = file => isDocumentationOnlyFile(file) || isStaticOnlyFile(file) || metadataOnlyFiles.has(file);
  if (!files.length) {
    return {
      mode: 'full',
      runBrowser: true,
      specs: [...allSpecs],
      changedFiles: [],
      metadataOnlyFiles: [],
      reasons: ['No reliable changed-file set was available; defaulted to the complete browser suite.']
    };
  }

  if (files.every(isNonBrowserFile)) {
    return {
      mode: 'skip',
      runBrowser: false,
      specs: [],
      changedFiles: files,
      metadataOnlyFiles: [...metadataOnlyFiles].sort(),
      reasons: [`Only documentation, backend-only, packaging, dependency-light static QA, or generated release metadata changed${metadataOnlyFiles.size ? ` (${metadataOnlyFiles.size} metadata-only file(s))` : ''}.`]
    };
  }

  const forceFull = files.filter(file => !metadataOnlyFiles.has(file) && matchesAny(file, FORCE_FULL_PATTERNS));
  if (forceFull.length) {
    return {
      mode: 'full',
      runBrowser: true,
      specs: [...allSpecs],
      changedFiles: files,
      metadataOnlyFiles: [...metadataOnlyFiles].sort(),
      reasons: [`Core browser/runtime contract changed: ${forceFull.slice(0, 4).join(', ')}${forceFull.length > 4 ? ', …' : ''}`]
    };
  }

  const selected = new Set();
  const reasons = [];
  const unmatched = [];
  for (const file of files) {
    if (isNonBrowserFile(file)) continue;
    if (isGenericCssFile(file)) {
      const cssImpact = selectSpecsForCssSelectors(changedCssSelectors[file] || []);
      if (!cssImpact.specs.length || cssImpact.unmatched.length) {
        unmatched.push(`${file}${cssImpact.unmatched.length ? ` (${cssImpact.unmatched.slice(0, 3).join(', ')})` : ' (selector diff unavailable)'}`);
        continue;
      }
      cssImpact.specs.forEach(spec => selected.add(spec));
      reasons.push(...cssImpact.matched.map(reason => `${reason} in ${file}`));
      continue;
    }
    if (/^qa\/browser\/[^/]+\.spec\.js$/.test(file)) {
      selected.add(file);
      reasons.push(`Direct browser spec change: ${file}`);
      continue;
    }
    const matchingRules = SPEC_RULES.filter(rule => rule.pattern.test(file));
    if (!matchingRules.length) {
      unmatched.push(file);
      continue;
    }
    for (const rule of matchingRules) {
      rule.specs.forEach(spec => selected.add(spec));
      reasons.push(`${rule.name}: ${file}`);
    }
  }

  if (unmatched.length) {
    return {
      mode: 'full',
      runBrowser: true,
      specs: [...allSpecs],
      changedFiles: files,
      metadataOnlyFiles: [...metadataOnlyFiles].sort(),
      reasons: [`Unmapped browser-impacting file(s) require the safe full suite: ${unmatched.slice(0, 4).join(', ')}${unmatched.length > 4 ? ', …' : ''}`]
    };
  }

  const specs = [...selected].sort();
  if (!specs.length) {
    return {
      mode: 'skip',
      runBrowser: false,
      specs: [],
      changedFiles: files,
      metadataOnlyFiles: [...metadataOnlyFiles].sort(),
      reasons: ['No browser-observable files changed after applying the impact map.']
    };
  }
  return { mode: 'selected', runBrowser: true, specs, changedFiles: files, reasons, metadataOnlyFiles: [...metadataOnlyFiles].sort() };
}

function splitChangedFiles(value) {
  return uniqueSorted(String(value || '').split(/[\r\n,]+/));
}

function gitChangedFiles(base, head = 'HEAD', options = {}) {
  if (!base || /^0+$/.test(base)) return [];
  const cwd = options.cwd || PROJECT_ROOT;
  const result = spawnSync('git', ['diff', '--name-only', '--diff-filter=ACMRD', base, head], {
    cwd,
    encoding: 'utf8'
  });
  if (result.status !== 0) return [];
  return splitChangedFiles(result.stdout);
}

function changedFilesFromGitHubEvent(eventPath = process.env.GITHUB_EVENT_PATH, options = {}) {
  if (!eventPath || !fs.existsSync(eventPath)) return [];
  let event = null;
  try { event = JSON.parse(fs.readFileSync(eventPath, 'utf8')); } catch (_) { return []; }
  if (event?.before && event?.after) {
    const diff = gitChangedFiles(event.before, event.after, options);
    if (diff.length) return diff;
  }
  const commits = event?.commits || [];
  if (Number(event?.size || 0) > commits.length) return [];
  const commitFiles = [];
  for (const commit of commits) {
    commitFiles.push(...(commit.added || []), ...(commit.modified || []), ...(commit.removed || []));
  }
  return uniqueSorted(commitFiles);
}

function parseCssSelectorEnvironment(value = process.env.FOXBEAR_CHANGED_CSS_SELECTORS) {
  if (!value) return {};
  try { return normalizeCssSelectorMap(JSON.parse(value)); } catch (_) { return {}; }
}

function detectChangeContext(options = {}) {
  const files = detectChangedFiles(options);
  let base = options.base || '';
  let head = options.head || 'HEAD';
  const eventPath = options.eventPath || process.env.GITHUB_EVENT_PATH;
  if (eventPath && fs.existsSync(eventPath)) {
    try {
      const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
      base = event?.before || base;
      head = event?.after || head;
    } catch (_) {}
  }
  if (!base && !process.env.GITHUB_ACTIONS) base = 'HEAD^';

  let cssSelectors = parseCssSelectorEnvironment(options.explicitCssSelectors ?? process.env.FOXBEAR_CHANGED_CSS_SELECTORS);
  if (!Object.keys(cssSelectors).length) cssSelectors = gitChangedCssSelectors(base, head, options);
  const explicitMetadataOnly = options.metadataOnlyFiles ?? process.env.FOXBEAR_METADATA_ONLY_FILES;
  const metadataOnlyFiles = explicitMetadataOnly
    ? splitChangedFiles(Array.isArray(explicitMetadataOnly) ? explicitMetadataOnly.join('\n') : explicitMetadataOnly)
    : detectMetadataOnlyFiles(files, base, head, options);
  return { files, cssSelectors, metadataOnlyFiles, base, head };
}

function detectChangedFiles(options = {}) {
  if (Array.isArray(options.changedFiles)) return uniqueSorted(options.changedFiles);
  const explicit = options.explicitChangedFiles ?? process.env.FOXBEAR_CHANGED_FILES;
  if (explicit) return splitChangedFiles(explicit);
  const eventFiles = changedFilesFromGitHubEvent(options.eventPath, options);
  if (eventFiles.length) return eventFiles;
  if (!process.env.GITHUB_ACTIONS) {
    const local = gitChangedFiles('HEAD^', 'HEAD', options);
    if (local.length) return local;
  }
  return [];
}

function sanitizeOutput(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function appendOutput(file, key, value) {
  if (!file) return;
  fs.appendFileSync(file, `${key}=${sanitizeOutput(value)}\n`, 'utf8');
}

function renderScopeMarkdown(scope) {
  const lines = [
    '## Browser QA impact scope',
    '',
    `- Mode: **${scope.mode}**`,
    `- Browser execution: **${scope.runBrowser ? 'enabled' : 'skipped'}**`,
    `- Changed files: **${scope.changedFiles.length}**`,
    `- Selected specs: **${scope.specs.length}**`,
    `- Metadata-only files ignored: **${(scope.metadataOnlyFiles || []).length}**`,
    ''
  ];
  if (scope.reasons.length) {
    lines.push('### Reason', '');
    scope.reasons.slice(0, 8).forEach(reason => lines.push(`- ${reason}`));
    lines.push('');
  }
  if (scope.specs.length && scope.mode === 'selected') {
    lines.push('### Selected browser specs', '');
    scope.specs.forEach(spec => lines.push(`- \`${spec}\``));
    lines.push('');
  }
  return `${lines.join('\n').trim()}\n`;
}

function writeScopeArtifacts(scope, options = {}) {
  const outputPath = path.resolve(options.outputPath || OUTPUT_PATH);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), ...scope }, null, 2)}\n`, 'utf8');
  const githubOutput = options.githubOutput ?? process.env.GITHUB_OUTPUT;
  appendOutput(githubOutput, 'run_browser', scope.runBrowser ? 'true' : 'false');
  appendOutput(githubOutput, 'mode', scope.mode);
  appendOutput(githubOutput, 'specs', scope.mode === 'selected' ? scope.specs.join(' ') : '');
  appendOutput(githubOutput, 'changed_count', String(scope.changedFiles.length));
  appendOutput(githubOutput, 'reason', scope.reasons.join(' | '));
  const githubSummary = options.githubSummary ?? process.env.GITHUB_STEP_SUMMARY;
  if (githubSummary) fs.appendFileSync(githubSummary, renderScopeMarkdown(scope), 'utf8');
  return outputPath;
}

function main() {
  const context = detectChangeContext();
  const scope = selectBrowserScope(context.files, { changedCssSelectors: context.cssSelectors, metadataOnlyFiles: context.metadataOnlyFiles });
  writeScopeArtifacts(scope);
  console.log(`Browser QA impact: mode=${scope.mode}, changed=${scope.changedFiles.length}, specs=${scope.specs.length}`);
  scope.reasons.forEach(reason => console.log(`  - ${reason}`));
  scope.specs.forEach(spec => console.log(`  * ${spec}`));
}

if (require.main === module) main();

module.exports = {
  ALL_BROWSER_SPECS,
  CSS_SELECTOR_RULES,
  DOCUMENTATION_PATTERNS,
  FORCE_FULL_PATTERNS,
  GENERIC_CSS_PATTERNS,
  SPEC_RULES,
  STATIC_ONLY_PATTERNS,
  changedFilesFromGitHubEvent,
  detectMetadataOnlyFiles,
  detectChangeContext,
  detectChangedFiles,
  extractCssSelectorTokens,
  gitChangedCssSelectors,
  gitChangedFiles,
  isDocumentationOnlyFile,
  isReleaseMetadataOnlyChange,
  isGenericCssFile,
  isStaticOnlyFile,
  normalizeChangedFile,
  normalizeReleaseMetadataText,
  normalizeCssSelectorMap,
  parseCssSelectorEnvironment,
  releaseMetadataFromPackage,
  renderScopeMarkdown,
  selectBrowserScope,
  selectSpecsForCssSelectors,
  splitChangedFiles,
  writeScopeArtifacts
};
