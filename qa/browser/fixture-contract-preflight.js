#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const FIXTURE_CONTRACTS = Object.freeze([
  {
    name: 'bulk-mastering-hud',
    checks: [
      ...[
        'bulkImportHud',
        'bulkImportHudTitle',
        'bulkImportHudText',
        'bulkImportHudList',
        'bulkImportHudMasterAll',
        'bulkImportHudCancel',
        'bulkImportHudRetryFailed',
        'bulkImportHudFilter'
      ].map(value => ({ file: 'index.html', type: 'markup-id', value })),
      ...[
        '.bulk-import-hud',
        '.bulk-import-hud-filter-wrap',
        '.bulk-import-row',
        '.bulk-import-row-meter',
        '.bulk-import-row-percent'
      ].map(value => ({ file: 'assets/css/bulk-import-hud.css', type: 'contains', value }))
    ]
  },
  {
    name: 'download-options-sheet',
    checks: [
      ...[
        'download-options-panel-v1574',
        'download-format-families',
        'download-options-list',
        'download-format-option',
        'download-options-actions-primary'
      ].map(value => ({ file: 'src/ui/download-dialog-view.js', type: 'contains', value })),
      ...[
        '.download-options-panel-v1574',
        '.download-format-families',
        '.download-options-list',
        '.download-format-option',
        '.download-options-actions-primary'
      ].map(value => ({ file: 'assets/css/download-dialog.css', type: 'contains', value }))
    ]
  },
  {
    name: 'runtime-health-release-header',
    checks: [
      { file: 'index.html', type: 'markup-id', value: 'headerSettingsHost' },
      { file: 'src/ui/mobile-native-view.js', type: 'contains', value: "id: 'mobileNativeQuickToggle'" },
      ...[
        'data-release-label="version-button"',
        'data-release-label="program-eyebrow"',
        'brand-command-bar',
        'brand-command-left',
        'brand-command-build',
        'brand-command-device',
        'brand-command-studio',
        'brand-right-actions',
        'designer-mini'
      ].map(value => ({ file: 'index.html', type: 'contains', value })),
      ...[
        '.brand-command-bar',
        '.brand-command-left',
        '.brand-command-build',
        '.brand-command-device',
        '.brand-command-studio',
        '.brand-right-actions',
        '.designer-mini'
      ].map(value => ({ file: 'assets/css/header-command-bar.css', type: 'contains', value }))
    ]
  },
  {
    name: 'pwa-runtime-recovery',
    checks: [
      { file: 'src/boot/runtime-health.js', type: 'contains', value: 'FoxBearRuntimeHealth' },
      { file: 'src/app.js', type: 'contains', value: 'FoxBearWakeLockController' },
      { file: 'src/app.js', type: 'contains', value: 'navigator.serviceWorker.register' },
      { file: 'src/boot/service-worker-recovery-service.js', type: 'contains', value: 'FoxBearServiceWorkerRecoveryService' },
      { file: 'src/boot/service-worker-update-service.js', type: 'contains', value: 'FoxBearServiceWorkerUpdateService' },
      { file: 'sw.js', type: 'contains', value: 'const CACHE_NAME =' }
    ]
  },
  {
    name: 'admin-operations-panel',
    checks: [
      ...['adminIncidentHealthHero', 'adminIncidentHistoryDetails', 'adminIncidentAuditDetails'].map(value => ({ file: 'index.html', type: 'markup-id', value })),
      { file: 'src/ui/admin-incident-monitor-view.js', type: 'contains', value: 'adminIncidentCompact' },
      { file: 'src/ui/admin-incident-monitor-view.js', type: 'contains', value: 'applyAdminDensityMode' },
      { file: 'assets/css/components/admin-incident-monitor.css', type: 'contains', value: '.admin-incident-health-hero' },
      { file: 'assets/css/components/admin-incident-monitor.css', type: 'contains', value: '.admin-incident-compact' }
    ]
  },
  {
    name: 'quality-recovery-diagnostics',
    checks: [
      { file: 'src/app.js', type: 'contains', value: 'FoxBearMasteringDiagnostics' },
      { file: 'src/app.js', type: 'contains', value: 'recoveryProfileId' },
      { file: 'src/app.js', type: 'contains', value: 'quality-recovery-finalizer' },
      { file: 'src/audio/mastering-orchestrator-service.js', type: 'contains', value: 'quality recovery' },
      { file: 'qa/browser/quality-recovery-profiles-playwright.spec.js', type: 'contains', value: 'preserves the first render' }
    ]
  }
]);

function matchesMarkupId(source, value) {
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\bid\\s*=\\s*["']${escaped}["']`).test(source);
}

function scanFixtureContracts(options = {}) {
  const root = path.resolve(options.root || PROJECT_ROOT);
  const contracts = options.contracts || FIXTURE_CONTRACTS;
  const sourceCache = new Map();
  const violations = [];

  const readSource = relative => {
    const file = path.resolve(root, relative);
    if (sourceCache.has(file)) return sourceCache.get(file);
    let source = null;
    try { source = fs.readFileSync(file, 'utf8'); } catch (_) {}
    sourceCache.set(file, source);
    return source;
  };

  for (const contract of contracts) {
    for (const check of contract.checks || []) {
      const source = readSource(check.file);
      if (source == null) {
        violations.push({
          contract: contract.name,
          code: 'FIXTURE_SOURCE_MISSING',
          file: check.file,
          value: check.value,
          guidance: 'Restore the fixture source file or update the contract to the current UI implementation.'
        });
        continue;
      }
      const matched = check.type === 'markup-id'
        ? matchesMarkupId(source, check.value)
        : source.includes(String(check.value));
      if (matched) continue;
      violations.push({
        contract: contract.name,
        code: check.type === 'markup-id' ? 'FIXTURE_DOM_ID_MISSING' : 'FIXTURE_TOKEN_MISSING',
        file: check.file,
        value: check.value,
        guidance: 'Update the shared visual fixture and its contract together with the production markup/style change.'
      });
    }
  }
  return violations;
}

function formatFixtureContractViolations(violations) {
  return violations.map(item => `${item.file} [${item.code}] ${item.contract}: ${item.value}\n    Fix: ${item.guidance}`);
}

function assertFixtureContracts(options = {}) {
  const violations = scanFixtureContracts(options);
  if (!violations.length) return [];
  const error = new Error(`Browser fixture contract preflight rejected ${violations.length} stale production contract(s).\n${formatFixtureContractViolations(violations).join('\n')}`);
  error.code = 'FOXBEAR_BROWSER_FIXTURE_CONTRACT_FAILED';
  error.violations = violations;
  throw error;
}

if (require.main === module) {
  try {
    assertFixtureContracts();
    console.log('PASS browser fixture contracts: production markup and styles match shared visual fixtures');
  } catch (error) {
    console.error(`FAIL ${error.message || error}`);
    process.exitCode = 1;
  }
}

module.exports = {
  FIXTURE_CONTRACTS,
  PROJECT_ROOT,
  assertFixtureContracts,
  formatFixtureContractViolations,
  matchesMarkupId,
  scanFixtureContracts
};
