// FoxBear AI Mastering Studio Pro v1.6.78 service worker · release-generation-assist-url-playback-invalidation
'use strict';

function loadSharePolicy() {
  try {
    if (typeof importScripts === 'function') importScripts('./src/config/pwa-share-policy.js?v=1.6.78-release-generation-assist-url-playback-invalidation');
  } catch (error) {
    console.warn('share policy import fallback:', error?.message || error);
  }
  if (self.FoxBearPwaSharePolicy) return self.FoxBearPwaSharePolicy;
  const defaults = Object.freeze({ schemaVersion: 2, maxFiles: 12, maxFileBytes: 220 * 1024 * 1024, maxBatchBytes: 512 * 1024 * 1024, maxStoreBytes: 768 * 1024 * 1024, recordLimit: 8, recordTtlMs: 24 * 60 * 60 * 1000, claimLeaseMs: 2 * 60 * 1000, claimHeartbeatMs: 30 * 1000 });
  const bytes = record => Number(record?.totalBytes || 0) || (Array.isArray(record?.files) ? record.files.reduce((sum, file) => sum + Math.max(0, Number(file?.size || 0)), 0) : 0);
  const timestamp = record => Number(record?.createdAt || 0) || Number.parseInt(String(record?.key || record?.id || '').split('-', 1)[0], 10) || 0;
  const active = (record, now) => Boolean(record?.claimOwner && Number(record?.claimExpiresAt || 0) > now);
  return Object.freeze({
    version: 'inline-fallback', DEFAULTS: defaults, createPolicy: () => defaults,
    isSupportedFile(file, policy = defaults) { const size = Number(file?.size || 0); const type = String(file?.type || '').toLowerCase(); const name = String(file?.name || '').toLowerCase(); return size > 0 && size <= policy.maxFileBytes && (type.startsWith('audio/') || ['video/mp4', 'video/quicktime'].includes(type) || /\.(wav|wave|mp3|mpeg|mpga|aif|aiff|aifc|m4a|aac|flac|ogg|oga|opus|webm|weba|mp4|m4v|mov)$/.test(name)); },
    selectFiles(values = [], policy = defaults) { const files = []; let totalBytes = 0; let rejected = 0; for (const value of values) { if (files.length >= policy.maxFiles || !this.isSupportedFile(value, policy) || totalBytes + Number(value.size || 0) > policy.maxBatchBytes) { rejected += 1; continue; } files.push(value); totalBytes += Number(value.size || 0); } return Object.freeze({ files: Object.freeze(files), totalBytes, rejected }); },
    recordTimestamp: timestamp, recordBytes: bytes, activeClaim: active,
    planRetention(records = [], now = Date.now(), incomingBytes = 0, policy = defaults) { const normalized = records.map(record => ({ key: String(record?.key || record?.id || ''), createdAt: timestamp(record), totalBytes: bytes(record), activeClaim: active(record, now) })).filter(record => record.key); const availableBytes = Math.max(0, policy.maxStoreBytes - incomingBytes); const protectedRecords = normalized.filter(record => record.activeClaim); const protectedBytes = protectedRecords.reduce((sum, record) => sum + record.totalBytes, 0); const retainKeys = protectedRecords.map(record => record.key); let retainedBytes = protectedBytes; const canAccept = incomingBytes <= policy.maxBatchBytes && protectedBytes <= availableBytes && protectedRecords.length <= policy.recordLimit - 1; if (canAccept) for (const record of normalized.filter(record => !record.activeClaim && now - record.createdAt <= policy.recordTtlMs).sort((a, b) => b.createdAt - a.createdAt)) { if (retainKeys.length >= policy.recordLimit - 1) break; if (retainedBytes + record.totalBytes > availableBytes) continue; retainKeys.push(record.key); retainedBytes += record.totalBytes; } const retained = new Set(retainKeys); return Object.freeze({ canAccept, reason: canAccept ? 'ok' : 'store-budget-exceeded', retainKeys: Object.freeze(retainKeys), deleteKeys: Object.freeze(normalized.filter(record => !record.activeClaim && !retained.has(record.key)).map(record => record.key)), retainedBytes, protectedBytes, availableBytes }); },
    isQuotaExceededError(error) { return String(error?.name || '') === 'QuotaExceededError' || /quota|storage.*full|disk.*full/i.test(`${error?.name || ''} ${error?.message || ''}`); }
  });
}
const SHARE_POLICY_API = loadSharePolicy();
const SHARE_POLICY = SHARE_POLICY_API.createPolicy();

const CACHE_NAME = 'foxbear-shell-v1.6.78-release-generation-assist-url-playback-invalidation';
const CURRENT_ASSET_VERSION = '1.6.78-release-generation-assist-url-playback-invalidation';
const LEGACY_CACHE_NAMES = ['foxbear-shell-v1.5.4-boot-sri-recovery', 'foxbear-shell-v1.5.5-update-safety', 'foxbear-shell-v1.5.6-export-progress-recovery', 'foxbear-shell-v1.6.58-piano-transient-integrity', 'foxbear-shell-v1.6.59-readiness-corp-security-hardening', 'foxbear-shell-v1.6.60-bulk-zip-hud-navigation', 'foxbear-shell-v1.6.61-human-readable-download-filenames', 'foxbear-shell-v1.6.62-download-filename-preview-controls', 'foxbear-shell-v1.6.63-download-filename-review-hardening', 'foxbear-shell-v1.6.64-github-desktop-delivery-contract', 'foxbear-shell-v1.6.65-firestore-write-fencing', 'foxbear-shell-v1.6.66-static-gate-hygiene-repair', 'foxbear-shell-v1.6.67-ci-strict-hygiene-policy', 'foxbear-shell-v1.6.68-public-shell-cache-integrity', 'foxbear-shell-v1.6.69-ci-appcheck-share-target-hardening', 'foxbear-shell-v1.6.70-share-retry-policy-drift-ci-efficiency', 'foxbear-shell-v1.6.71-pwa-share-lease-handoff-deploy-policy-e2e', 'foxbear-shell-v1.6.72-ci-safe-hygiene-self-repair', 'foxbear-shell-v1.6.73-csp-memory-admission-runtime-config', 'foxbear-shell-v1.6.74-incident-admission-spark-retention-download-memory', 'foxbear-shell-v1.6.75-download-progress-admission-fallback-closure', 'foxbear-shell-v1.6.76-download-viewport-runtime-fault-diagnostics', 'foxbear-shell-v1.6.77-download-cache-budget-runtime-fault-retry-timing'];
const RETAINED_LEGACY_SHELL_COUNT = 2;
const CLIENT_SHELL_PROBE_TIMEOUT_MS = 400;
const CLIENT_SHELL_CLEANUP_COOLDOWN_MS = 2500;
const CLIENT_SHELL_REPORT_MAX_AGE_MS = 120000;
const CLIENT_SHELL_PROBE_RETRY_MS = 120;
const SHARE_DB = 'foxbear-mobile-native-share-v1';
const SHARE_STORE = 'sharedFiles';
const SHARE_QUERY = 'foxbearSharedAudio';
const SHARE_ERROR_QUERY = 'share-error';
const SHARE_MAX_FILES = 12;
const SHARE_MAX_FILE_BYTES = 220 * 1024 * 1024;
const SHARE_MAX_TOTAL_BYTES = 512 * 1024 * 1024;
const SHARE_RECORD_TTL_MS = 24 * 60 * 60 * 1000;
const SHARE_RECORD_LIMIT = 8;
const SHARE_STORE_MAX_BYTES = 768 * 1024 * 1024;
const SHARE_AUDIO_EXTENSIONS = Object.freeze(new Set([
  '.wav', '.wave', '.mp3', '.mpeg', '.mpga', '.aif', '.aiff', '.aifc',
  '.m4a', '.aac', '.flac', '.ogg', '.oga', '.opus', '.webm', '.weba',
  '.mp4', '.m4v', '.mov'
]));
const SHARE_VIDEO_AUDIO_TYPES = Object.freeze(new Set(['video/mp4', 'video/quicktime']));
const PUBLIC_AUXILIARY_HTML = new Set(['404.html', 'external-browser.html', 'design-preview.html']);
const CORE_ASSETS = [
  './',
  './index.html',
  './404.html',
  './assets/css/route-recovery.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/route-recovery.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './foxbear-root.json',
  './external-browser.html',
  './assets/css/external-browser.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './design-preview.html',
  './assets/css/design-preview.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/security/trusted-types-bootstrap.js',
  './src/boot/kakao-entry-guard.js',
  './src/boot/kakao-entry-notice.js',
  './assets/css/boot/kakao-entry-notice.css',
  './src/security/trusted-types-bootstrap.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/kakao-entry-guard.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/kakao-entry-notice.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/kakao-external-browser.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './manifest.webmanifest',
  './sw.js',
  './src/workers/wav-encoder.worker.js',
  './src/workers/mp3-encoder.worker.js',
  './src/workers/analysis.worker.js',
  './src/workers/master-finalizer.worker.js',
  './src/workers/pitch-wsola.worker.js',
  './src/workers/zip-encoder.worker.js',
  './src/workers/wav-encoder.worker.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/workers/mp3-encoder.worker.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/workers/analysis.worker.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/workers/master-finalizer.worker.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/workers/pitch-wsola.worker.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/workers/zip-encoder.worker.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/engines/pitch-engine-adapter.js',
  './assets/icons/foxbear-icon-48.png?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/icons/foxbear-icon-72.png?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/icons/foxbear-icon-96.png?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/icons/foxbear-icon-128.png?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/icons/foxbear-icon-144.png?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/icons/foxbear-icon-152.png?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/icons/foxbear-icon-180.png?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/icons/foxbear-icon-192.png?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/icons/foxbear-icon-384.png?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/icons/foxbear-icon-512.png?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/icons/foxbear-icon-16.png?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/icons/foxbear-icon-32.png?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/icons/apple-touch-icon.png?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './manifest.webmanifest?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/boot/performance-diagnostics.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/boot/runtime-health.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/boot/ui-shell-recovery.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/boot/kakao-entry-notice.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/theme.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/layout.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/components/base-components.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/components/forms.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/components/cards.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/components/preview-system.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/components/playback-link.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/studio.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/components/admin-incident-monitor.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/dock.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/dock-waveform.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/waveform-compare.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/spectrum-visualizer.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/export.css?v=1.6.78-release-generation-assist-url-playback-invalidation&h=export-progress-v156',
  './assets/css/download-dialog.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/bulk-import-hud.css?v=1.6.78-release-generation-assist-url-playback-invalidation&h=bulk-hud-close-hotfix&ui=v153',
  './assets/css/mobile-native.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/dock-ui-repair.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/components/floating-overlays.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/header-command-bar.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/components/support-settings.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/css/components/modal-close-system.css?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './vendor/jszip/jszip.min.js?v=1.6.78-release-generation-assist-url-playback-invalidation&lib=3.10.1',
  './src/config/build-info.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/release-presentation-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/runtime-fault-counters.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/session-handoff-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/incident-route-policy.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/incident-submission-identity-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/firebase-bootstrap.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/incident-support-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/incident-state-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/incident-mail-sync-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/incident-lifecycle-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/incident-recovery-sweep-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/incident-service-recovery-controller.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/incident-recovery-policy.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/incident-local-queue-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/incident-queue-coordination-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/incident-service-diagnostics.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/incident-diagnostics-view-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/incident-controls-view-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/incident-reporter.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/config/mastering-presets.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/config/genre-presets.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/config/reference-targets.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/config/app-runtime-config.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/config/pwa-share-policy.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/state/app-state.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/settings/settings-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/utils/core-utils.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/utils/worker-job-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/recommendation/recommendation-engine.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/mastering-inspector.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/highlight-compare-inspector.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/playback-link-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/playback-transition-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/playback-source-recovery-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/playback-lifecycle-recovery-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/post-master-playback-recovery-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/audio-context-manager.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/preview-translation-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/audio-import-capability-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/audio-decode-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/inapp-mastering-safety-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/import-preflight-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/import-queue-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/analysis-cache-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/memory-guard-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/mastering-memory-diagnostics-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/reference-profile-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/loudness-measurement-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/mastering-input-guard-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/mastering-quality-audit-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/quality-gate-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/mastering-orchestrator-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/master-preview-job-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/state/track-lifecycle-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/audio/waveform-control-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/ui/waveform-control-view.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/ui/spectrum-visualizer.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/ui/modal-controller.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/ui/dock-controller.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/ui/mobile-native-view.js?v=1.6.78-release-generation-assist-url-playback-invalidation&h=bulk-hud-restore-v153',
  './src/ui/admin-access-controller.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/download/file-name-policy-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/download/file-name-workflow-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/download/download-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/download/export-guard-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation&h=export-v156',
  './src/download/export-progress-view.js?v=1.6.78-release-generation-assist-url-playback-invalidation&h=export-progress-v156',
  './src/download/zip-export-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/download/export-queue-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/ui/download-dialog-view.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/ui/bulk-import-hud-view.js?v=1.6.78-release-generation-assist-url-playback-invalidation&h=bulk-hud-v153',
  './src/ui/waveform-compare-view.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/ui/detail-panels-view.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/ui/detail-view.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/ui/admin-incident-monitor-view.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/security/site-guards.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/runtime-health.js?v=1.6.78-release-generation-assist-url-playback-invalidation&h=boot-sri-v1678',
  './src/boot/ui-shell-recovery-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/update-safety-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation&h=update-safety-v1678',
  './src/boot/service-worker-update-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/service-worker-recovery-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/worker-recovery-coordinator.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/performance-diagnostics.js?v=1.6.78-release-generation-assist-url-playback-invalidation&h=boot-sri-v1678',
  './src/boot/render-scheduler.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/pwa-share-target-service.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/boot/pwa-runtime-bridge.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './src/app.js?v=1.6.78-release-generation-assist-url-playback-invalidation&h=boot-sri-v1678',
  './src/boot/worker-recovery-app-bridge.js?v=1.6.78-release-generation-assist-url-playback-invalidation',
  './assets/icons/foxbear-music.png?v=1.6.78-release-generation-assist-url-playback-invalidation'
];

const INSTALL_ASSETS = [
  ...CORE_ASSETS.filter(asset =>
    ['./', './index.html', './404.html', './foxbear-root.json', './manifest.webmanifest', './sw.js'].includes(asset)
    || ((/\.(?:js|css)(?:[?#]|$)/.test(asset) || /manifest\.webmanifest\?/.test(asset))
      && !/src\/workers\//.test(asset)
      && !/kakao-external-browser\.js/.test(asset))
  )
];
const INSTALL_ASSET_SET = new Set(INSTALL_ASSETS);
const WARM_ASSETS = CORE_ASSETS.filter(asset => !INSTALL_ASSET_SET.has(asset));
let warmCachePromise = null;
let legacyCleanupPromise = null;
let lastLegacyCleanupAt = 0;
let clientShellProbeSequence = 0;
let ignoredLateClientShellReportCount = 0;
let prunedClientShellReportCount = 0;
let clientShellProbeRetryCount = 0;
const clientShellReports = new Map();
const clientShellProbes = new Map();

async function warmFoxBearCoreCache(options = {}) {
  if (warmCachePromise) return warmCachePromise;
  const force = options.force === true;
  warmCachePromise = (async () => {
    const cache = await caches.open(CACHE_NAME);
    const failures = [];
    let cursor = 0;
    let cached = 0;
    let alreadyCached = 0;
    const worker = async () => {
      while (cursor < WARM_ASSETS.length) {
        const asset = WARM_ASSETS[cursor++];
        try {
          if (!force && await cache.match(asset)) {
            alreadyCached += 1;
            continue;
          }
          const response = await fetch(asset, { cache: 'reload' });
          if (!response || !response.ok) throw new Error(`HTTP ${response?.status || 0}`);
          await cache.put(asset, response.clone());
          cached += 1;
        } catch (error) {
          failures.push({ asset, error: error?.message || String(error) });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(6, Math.max(1, WARM_ASSETS.length)) }, worker));
    return { total: WARM_ASSETS.length, cached, alreadyCached, failed: failures.length, failures, force };
  })();
  try {
    return await warmCachePromise;
  } finally {
    warmCachePromise = null;
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(INSTALL_ASSETS);
  })());
});

function retainedLegacyShellNames() {
  return new Set(LEGACY_CACHE_NAMES.slice(-RETAINED_LEGACY_SHELL_COUNT));
}

function cacheNameForAssetVersion(assetVersion) {
  const version = String(assetVersion || '').trim();
  return version ? `foxbear-shell-v${version}` : '';
}

function rememberClientShellState(event, payload) {
  const clientId = String(event?.source?.id || payload?.clientId || '');
  if (!clientId) return false;
  const requestId = String(payload?.requestId || '');
  const probe = requestId ? clientShellProbes.get(requestId) : null;
  if (requestId && (!probe || !probe.expected.has(clientId))) {
    ignoredLateClientShellReportCount += 1;
    return false;
  }
  if (payload?.type === 'FOXBEAR_CLIENT_SHELL_INACTIVE' || payload?.active === false) {
    clientShellReports.delete(clientId);
    return true;
  }
  const assetVersion = String(payload?.assetVersion || '').trim();
  if (!assetVersion) return false;
  const report = {
    clientId,
    assetVersion,
    cacheName: String(payload?.cacheName || cacheNameForAssetVersion(assetVersion)),
    updatedAt: Date.now(),
    visibility: String(payload?.visibility || 'unknown')
  };
  clientShellReports.set(clientId, report);
  if (probe) {
    probe.responses.set(clientId, report);
    if (probe.responses.size >= probe.expected.size) probe.resolve();
  }
  return true;
}

function pruneClientShellReports(activeClientIds = null) {
  const now = Date.now();
  clientShellReports.forEach((report, clientId) => {
    const inactive = activeClientIds instanceof Set && !activeClientIds.has(clientId);
    const stale = now - Number(report?.updatedAt || 0) > CLIENT_SHELL_REPORT_MAX_AGE_MS;
    if (!inactive && !stale) return;
    clientShellReports.delete(clientId);
    prunedClientShellReportCount += 1;
  });
}

async function queryActiveClientShellVersions() {
  let windows = [];
  try { windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); } catch (error) {}
  const initialIds = new Set(windows.map(client => String(client.id || '')).filter(Boolean));
  pruneClientShellReports(initialIds);
  if (!windows.length) return { complete: true, clientCount: 0, reportedCount: 0, versions: new Set(), cacheNames: new Set(), disappearedCount: 0 };
  const requestId = `shell-probe-${Date.now().toString(36)}-${(++clientShellProbeSequence).toString(36)}`;
  const expected = new Set(initialIds);
  const responses = new Map();
  let resolveProbe = () => undefined;
  const settled = new Promise(resolve => { resolveProbe = resolve; });
  clientShellProbes.set(requestId, { expected, responses, resolve: resolveProbe });
  const postQuery = clients => {
    for (const client of clients) {
      const clientId = String(client?.id || '');
      if (!clientId || !expected.has(clientId) || responses.has(clientId)) continue;
      try { client.postMessage({ type: 'FOXBEAR_QUERY_CLIENT_SHELL_STATE', requestId, assetVersion: CURRENT_ASSET_VERSION }); } catch (error) {}
    }
  };
  postQuery(windows);
  if (responses.size < expected.size) {
    await Promise.race([settled, new Promise(resolve => setTimeout(resolve, CLIENT_SHELL_PROBE_TIMEOUT_MS))]);
  }
  let currentWindows = windows;
  try { currentWindows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); } catch (error) {}
  const currentIds = new Set(currentWindows.map(client => String(client.id || '')).filter(Boolean));
  let disappearedCount = 0;
  Array.from(expected).forEach(clientId => {
    if (currentIds.has(clientId)) return;
    expected.delete(clientId);
    responses.delete(clientId);
    disappearedCount += 1;
  });
  pruneClientShellReports(currentIds);
  if (responses.size < expected.size && currentWindows.length) {
    clientShellProbeRetryCount += 1;
    postQuery(currentWindows);
    await Promise.race([settled, new Promise(resolve => setTimeout(resolve, CLIENT_SHELL_PROBE_RETRY_MS))]);
  }
  clientShellProbes.delete(requestId);
  const complete = Array.from(expected).every(clientId => responses.has(clientId));
  const versions = new Set();
  const cacheNames = new Set();
  responses.forEach((report, clientId) => {
    if (!expected.has(clientId)) return;
    if (report.assetVersion) versions.add(report.assetVersion);
    if (report.cacheName) cacheNames.add(report.cacheName);
  });
  return { complete, clientCount: expected.size, reportedCount: responses.size, versions, cacheNames, disappearedCount };
}

async function purgeLegacyShellCaches(options = {}) {
  const names = await caches.keys();
  const retained = retainedLegacyShellNames();
  const deleted = [];
  const obsolete = names.filter(name => name.startsWith('foxbear-shell-') && name !== CACHE_NAME && !retained.has(name));
  await Promise.all(obsolete.map(async name => {
    if (await caches.delete(name)) deleted.push(name);
  }));

  let probe = null;
  if (options.probeClients === true) {
    probe = await queryActiveClientShellVersions();
    if (probe.complete) {
      const latestRollback = LEGACY_CACHE_NAMES[LEGACY_CACHE_NAMES.length - 1] || '';
      const protectedNames = new Set([latestRollback, ...probe.cacheNames].filter(Boolean));
      const optionalRetained = names.filter(name => retained.has(name) && !protectedNames.has(name));
      await Promise.all(optionalRetained.map(async name => {
        if (await caches.delete(name)) deleted.push(name);
      }));
    }
  }
  lastLegacyCleanupAt = Date.now();
  return { deleted, retained: Array.from(retained), probe };
}

function scheduleLegacyShellCleanup(reason = 'client-state') {
  if (legacyCleanupPromise) return legacyCleanupPromise;
  const elapsed = Date.now() - lastLegacyCleanupAt;
  const delay = Math.max(0, CLIENT_SHELL_CLEANUP_COOLDOWN_MS - elapsed);
  legacyCleanupPromise = new Promise(resolve => setTimeout(resolve, delay))
    .then(() => purgeLegacyShellCaches({ probeClients: true, reason }))
    .finally(() => { legacyCleanupPromise = null; });
  return legacyCleanupPromise;
}

async function matchExactAcrossShellCaches(request) {
  const names = await caches.keys();
  const retained = retainedLegacyShellNames();
  const candidates = [CACHE_NAME, ...names.filter(name => retained.has(name)).reverse()];
  for (const name of candidates) {
    try {
      const cache = await caches.open(name);
      const response = await cache.match(request);
      if (response) return response;
    } catch (error) {}
  }
  return null;
}

async function currentCachedMatch(cache, request, fallbackRequest = null) {
  return await cache.match(request) || (fallbackRequest ? await cache.match(fallbackRequest) : null) || null;
}

async function isCurrentShellHtml(response) {
  if (!response || !response.ok) return false;
  const type = String(response.headers.get('content-type') || '');
  if (!type.includes('text/html')) return false;
  try {
    const text = await response.clone().text();
    return text.includes(CURRENT_ASSET_VERSION);
  } catch (error) {
    return false;
  }
}

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await purgeLegacyShellCaches({ probeClients: false, reason: 'activate-pre-claim' });
    if (self.registration?.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (error) {}
    }
    const shareHandoff = await recoverSharedFileRecords().catch(error => ({ error: error?.message || String(error), recoveredClaims: 0, remaining: 0 }));
    await self.clients.claim();
    await broadcastShareHandoff(shareHandoff).catch(() => undefined);
    await purgeLegacyShellCaches({ probeClients: true, reason: 'activate-post-claim' });
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && (event.data.type === 'FOXBEAR_CLIENT_SHELL_STATE' || event.data.type === 'FOXBEAR_CLIENT_SHELL_INACTIVE')) {
    rememberClientShellState(event, event.data);
    if (!event.data.requestId || event.data.type === 'FOXBEAR_CLIENT_SHELL_INACTIVE') {
      event.waitUntil(scheduleLegacyShellCleanup(event.data.type).catch(() => undefined));
    }
  }
  if (event.data && event.data.type === 'FOXBEAR_GET_RELEASE_INFO') {
    const payload = { type: 'FOXBEAR_RELEASE_INFO', cacheName: CACHE_NAME, assetVersion: CACHE_NAME.replace(/^foxbear-shell-v/, ''), retainedLegacyShellCount: RETAINED_LEGACY_SHELL_COUNT, clientShellReportCount: clientShellReports.size, ignoredLateClientShellReportCount, prunedClientShellReportCount, clientShellProbeRetryCount };
    try { event.ports?.[0]?.postMessage?.(payload); } catch (error) {}
    try { if (!event.ports?.[0]) event.source?.postMessage?.(payload); } catch (error) {}
  }
  if (event.data && event.data.type === 'FOXBEAR_WARM_CACHE') {
    const force = event.data.force === true;
    event.waitUntil((force ? warmFoxBearCoreCache({ force: true }) : warmFoxBearCoreCache()).catch(error => ({
      total: WARM_ASSETS.length,
      cached: 0,
      alreadyCached: 0,
      failed: WARM_ASSETS.length,
      failures: [{ asset: '*', error: error?.message || String(error) }],
      force
    })).then(result => {
      const payload = { type: 'FOXBEAR_WARM_CACHE_DONE', cacheName: CACHE_NAME, ...result };
      try { event.ports?.[0]?.postMessage?.(payload); } catch (error) {}
      try { if (!event.ports?.[0]) event.source?.postMessage?.(payload); } catch (error) {}
    }));
  }

  if (event.data && event.data.type === 'FOXBEAR_RECOVER_SHARE_STORAGE') {
    event.waitUntil(recoverSharedFileRecords().then(result => {
      const payload = { type: 'FOXBEAR_SHARE_STORAGE_RECOVERED', cacheName: CACHE_NAME, ...result };
      try { event.ports?.[0]?.postMessage?.(payload); } catch (error) {}
      try { if (!event.ports?.[0]) event.source?.postMessage?.(payload); } catch (error) {}
    }).catch(error => {
      const payload = { type: 'FOXBEAR_SHARE_STORAGE_RECOVERED', cacheName: CACHE_NAME, error: error?.message || String(error) };
      try { event.ports?.[0]?.postMessage?.(payload); } catch (postError) {}
      try { if (!event.ports?.[0]) event.source?.postMessage?.(payload); } catch (postError) {}
    }));
  }
  if (event.data && event.data.type === 'FOXBEAR_PURGE_CACHES') {
    event.waitUntil(purgeFoxBearCaches().then(() => {
      try { event.source?.postMessage?.({ type: 'FOXBEAR_PURGE_CACHES_DONE', cacheName: CACHE_NAME }); } catch (error) {}
    }));
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const requestUrl = String(request.url || '');
  // Object/data URLs are local, ephemeral resources owned by the page that
  // created them. They must never enter CacheStorage or the SW fetch pipeline.
  if (requestUrl.startsWith('blob:') || requestUrl.startsWith('data:')) return;
  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith(handleShareTarget(request));
    return;
  }
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(isPublicAuxiliaryHtmlRequest(url)
      ? networkFirstAuxiliaryNavigation(request)
      : networkFirstNavigation(request, event.preloadResponse));
    return;
  }
  if (['script', 'style', 'worker'].includes(request.destination) || /\.(?:js|css)(?:$|\?)/.test(url.pathname + url.search)) {
    event.respondWith(networkFirstNoFallbackOnIntegrityAssets(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});

async function purgeFoxBearCaches() {
  const names = await caches.keys();
  await Promise.all(names
    .filter(name => /^foxbear-|^workbox-|^precache-/i.test(name) || LEGACY_CACHE_NAMES.includes(name))
    .map(name => caches.delete(name)));
}

async function matchCurrentOrRecovery(cache, request, fallbackRequest = null) {
  return currentCachedMatch(cache, request, fallbackRequest);
}

function getCanonicalAppRootUrl() {
  const root = new URL('./', self.registration.scope);
  root.searchParams.set('foxbearRouteRecovery', 'sw');
  return root;
}

function publicAuxiliaryHtmlName(url) {
  const root = new URL('./', self.registration.scope);
  if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) return '';
  const relative = decodeURIComponent(url.pathname.slice(root.pathname.length));
  return PUBLIC_AUXILIARY_HTML.has(relative) ? relative : '';
}

function isPublicAuxiliaryHtmlRequest(url) {
  return Boolean(publicAuxiliaryHtmlName(url));
}

function cloneNavigationResponse(response) {
  if (!response) return null;
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

async function networkFirstAuxiliaryNavigation(request) {
  const requestUrl = new URL(request.url);
  const relative = publicAuxiliaryHtmlName(requestUrl);
  if (!relative) return Response.error();
  const canonicalUrl = new URL(relative, self.registration.scope);
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request, { cache: 'no-store', redirect: 'follow' });
    if (fresh && fresh.ok) {
      cache.put(canonicalUrl.href, fresh.clone()).catch(() => undefined);
      return fresh;
    }
    const cached = await cache.match(canonicalUrl.href);
    return cloneNavigationResponse(cached) || fresh || Response.error();
  } catch (error) {
    const cached = await cache.match(canonicalUrl.href);
    return cloneNavigationResponse(cached) || Response.error();
  }
}

function isCanonicalShellRequest(url) {
  const root = new URL('./', self.registration.scope);
  const index = new URL('index.html', root);
  return url.pathname === root.pathname || url.pathname === index.pathname;
}

function requestedAssetVersion(url) {
  return String(url.searchParams.get('v') || '');
}

function isStaleAssetGeneration(url) {
  const requested = requestedAssetVersion(url);
  return Boolean(requested && requested !== CURRENT_ASSET_VERSION);
}

async function networkFirstNoFallbackOnIntegrityAssets(request) {
  const url = new URL(request.url);
  const cache = await caches.open(CACHE_NAME);
  if (isStaleAssetGeneration(url)) {
    // An already-open or BFCache-restored client can briefly request its exact
    // previous generation after the new worker claims the page. Keep the latest
    // legacy shells and return only an exact cache-key match so SRI stays valid.
    return await matchExactAcrossShellCaches(request) || Response.error();
  }
  const hasPatchBust = url.searchParams.has('h') || url.searchParams.has('ui');
  try {
    const fresh = await fetch(request, { cache: hasPatchBust ? 'no-store' : 'default' });
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone()).catch(() => undefined);
      return fresh;
    }
    return await matchCurrentOrRecovery(cache, request) || fresh || Response.error();
  } catch (error) {
    return await matchCurrentOrRecovery(cache, request) || Response.error();
  }
}

async function networkFirstNavigation(request, preloadResponse) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  const canonicalShell = isCanonicalShellRequest(url);
  const canonicalIndex = new URL('index.html', self.registration.scope).href;

  const acceptCurrentShell = async response => {
    if (!(await isCurrentShellHtml(response))) return null;
    await cache.put(canonicalIndex, response.clone()).catch(() => undefined);
    return response;
  };

  try {
    if (canonicalShell) {
      const preload = await preloadResponse;
      const validPreload = await acceptCurrentShell(preload);
      if (validPreload) return validPreload;

      const fresh = await fetch(canonicalIndex, { cache: 'no-store', redirect: 'follow' });
      const validFresh = await acceptCurrentShell(fresh);
      if (validFresh) return validFresh;

      return await currentCachedMatch(cache, canonicalIndex) || Response.error();
    }

    // Broken nested routes must never become cached application shells. Redirect
    // them to the canonical repository/app root so GitHub Pages does not loop on 404.
    return Response.redirect(getCanonicalAppRootUrl().toString(), 302);
  } catch (error) {
    if (!canonicalShell) return Response.redirect(getCanonicalAppRootUrl().toString(), 302);
    return await currentCachedMatch(cache, canonicalIndex) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const url = new URL(request.url);
  const cache = await caches.open(CACHE_NAME);
  if (isStaleAssetGeneration(url)) return await matchExactAcrossShellCaches(request) || Response.error();
  const cached = await matchCurrentOrRecovery(cache, request);
  const freshPromise = fetch(request, { cache: 'reload' }).then(response => {
    if (response && response.ok) cache.put(request, response.clone()).catch(() => undefined);
    return response;
  }).catch(() => null);
  if (cached) {
    freshPromise.catch(() => undefined);
    return cached;
  }
  const fresh = await freshPromise;
  return fresh || Response.error();
}

function openShareDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SHARE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SHARE_STORE)) db.createObjectStore(SHARE_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error || new Error('share db open failed'));
    request.onblocked = () => reject(new Error('share db open blocked'));
  });
}

function writeSharedRecord(db, record) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SHARE_STORE, 'readwrite');
    tx.objectStore(SHARE_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('share db write failed'));
    tx.onabort = () => reject(tx.error || new Error('share db write aborted'));
  });
}

async function assertShareStorageCapacity(incomingBytes = 0) {
  const estimate = await self.navigator?.storage?.estimate?.().catch?.(() => null) || null;
  const quota = Number(estimate?.quota || 0);
  const usage = Number(estimate?.usage || 0);
  const reserve = 16 * 1024 * 1024;
  if (quota > 0 && usage + Math.max(0, Number(incomingBytes || 0)) + reserve > quota) {
    const error = new Error('share-storage-quota');
    error.name = 'QuotaExceededError';
    error.code = 'share-storage-quota';
    throw error;
  }
  return Object.freeze({ quota, usage, available: quota > 0 ? Math.max(0, quota - usage) : 0 });
}

async function putSharedFiles(record) {
  await assertShareStorageCapacity(Number(record?.totalBytes || 0));
  let db = await openShareDb();
  try {
    const initialCleanup = await pruneSharedFileRecords(db, Number(record?.createdAt || Date.now()), Number(record?.totalBytes || 0));
    if (initialCleanup.canAccept === false) {
      const error = new Error(initialCleanup.reason || 'share-storage-busy');
      error.code = 'share-storage-busy';
      throw error;
    }
    try {
      await writeSharedRecord(db, record);
      return Object.freeze({ recoveredFromQuota: false, cleanup: initialCleanup });
    } catch (error) {
      if (!SHARE_POLICY_API.isQuotaExceededError(error)) throw error;
      db.close();
      db = await openShareDb();
      const aggressiveCleanup = await pruneSharedFileRecords(db, Number(record?.createdAt || Date.now()), Number(record?.totalBytes || 0), { aggressive: true });
      if (aggressiveCleanup.canAccept === false) {
        const quotaError = new Error('share-storage-quota');
        quotaError.name = 'QuotaExceededError';
        quotaError.code = 'share-storage-quota';
        throw quotaError;
      }
      await writeSharedRecord(db, record);
      return Object.freeze({ recoveredFromQuota: true, cleanup: aggressiveCleanup });
    }
  } finally {
    db.close();
  }
}

function sharedFileExtension(name = '') {
  const value = String(name || '').trim().toLowerCase();
  const dot = value.lastIndexOf('.');
  return dot >= 0 ? value.slice(dot) : '';
}

function isSupportedSharedAudioFile(file) {
  return SHARE_POLICY_API.isSupportedFile(file, SHARE_POLICY);
}

function selectSharedAudioFiles(values = []) {
  return SHARE_POLICY_API.selectFiles(values, SHARE_POLICY);
}

function shareRecordTimestamp(key = '') {
  return SHARE_POLICY_API.recordTimestamp({ key });
}

function shareRecordBytes(record = {}) {
  return SHARE_POLICY_API.recordBytes(record);
}

function planSharedRecordRetention(records = [], now = Date.now(), incomingBytes = 0) {
  return SHARE_POLICY_API.planRetention(records, now, incomingBytes, SHARE_POLICY);
}

async function listSharedRecordMetadata(db) {
  return await new Promise((resolve, reject) => {
    const records = [];
    const tx = db.transaction(SHARE_STORE, 'readonly');
    const request = tx.objectStore(SHARE_STORE).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const value = cursor.value || {};
      records.push({
        key: String(cursor.primaryKey || value.id || ''),
        createdAt: Number(value.createdAt || shareRecordTimestamp(cursor.primaryKey)),
        totalBytes: shareRecordBytes(value),
        claimOwner: String(value.claimOwner || ''),
        claimExpiresAt: Number(value.claimExpiresAt || 0)
      });
      cursor.continue();
    };
    request.onerror = () => reject(request.error || new Error('share db metadata scan failed'));
    tx.oncomplete = () => resolve(records);
    tx.onerror = () => reject(tx.error || new Error('share db metadata scan failed'));
    tx.onabort = () => reject(tx.error || new Error('share db metadata scan aborted'));
  });
}

async function pruneSharedFileRecords(db, now = Date.now(), incomingBytes = 0, options = {}) {
  const records = await listSharedRecordMetadata(db);
  let plan = planSharedRecordRetention(records, now, incomingBytes);
  if (options.aggressive === true && plan.canAccept) {
    const protectedKeys = new Set(records
      .filter(record => SHARE_POLICY_API.activeClaim(record, now))
      .map(record => record.key));
    const deleteKeys = records.filter(record => !protectedKeys.has(record.key)).map(record => record.key);
    plan = Object.freeze({ ...plan, retainKeys: Object.freeze([...protectedKeys]), deleteKeys: Object.freeze(deleteKeys), retainedBytes: plan.protectedBytes });
  }
  if (plan.deleteKeys.length) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(SHARE_STORE, 'readwrite');
      const store = tx.objectStore(SHARE_STORE);
      plan.deleteKeys.forEach(key => store.delete(key));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('share db cleanup failed'));
      tx.onabort = () => reject(tx.error || new Error('share db cleanup aborted'));
    });
  }
  return Object.freeze({
    deleted: plan.deleteKeys.length,
    retained: plan.retainKeys.length,
    retainedBytes: plan.retainedBytes,
    canAccept: plan.canAccept,
    reason: plan.reason,
    protectedBytes: plan.protectedBytes
  });
}

async function recoverSharedFileRecords(now = Date.now()) {
  const db = await openShareDb();
  try {
    const records = await listSharedRecordMetadata(db);
    const staleClaims = records.filter(record => record.claimOwner && Number(record.claimExpiresAt || 0) <= now);
    if (staleClaims.length) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(SHARE_STORE, 'readwrite');
        const store = tx.objectStore(SHARE_STORE);
        let pending = staleClaims.length;
        for (const metadata of staleClaims) {
          const request = store.get(metadata.key);
          request.onsuccess = () => {
            const value = request.result;
            if (value && Number(value.claimExpiresAt || 0) <= now) {
              delete value.claimOwner;
              delete value.claimAcquiredAt;
              delete value.claimExpiresAt;
              store.put(value);
            }
            pending -= 1;
          };
          request.onerror = () => { pending -= 1; };
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('share claim recovery failed'));
        tx.onabort = () => reject(tx.error || new Error('share claim recovery aborted'));
      });
    }
    const cleanup = await pruneSharedFileRecords(db, now, 0);
    const remaining = await listSharedRecordMetadata(db);
    return Object.freeze({ recoveredClaims: staleClaims.length, remaining: remaining.length, cleanup });
  } finally {
    db.close();
  }
}

async function broadcastShareHandoff(result = {}) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const payload = Object.freeze({
    type: 'FOXBEAR_SHARE_HANDOFF_READY',
    assetVersion: CURRENT_ASSET_VERSION,
    schemaVersion: SHARE_POLICY.schemaVersion,
    recoveredClaims: Number(result.recoveredClaims || 0),
    remaining: Number(result.remaining || 0)
  });
  clients.forEach(client => client.postMessage(payload));
  return payload;
}

function createShareRecordId(now = Date.now()) {
  const randomId = typeof self.crypto?.randomUUID === 'function'
    ? self.crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${Math.max(1, Number(now || Date.now()))}-${randomId}`;
}

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const entries = [];
    const fileFields = ['audio', 'file', 'files'];
    fileFields.forEach(field => {
      formData.getAll(field).forEach(value => {
        if (value && typeof value === 'object' && 'name' in value && value.size > 0) entries.push(value);
      });
    });
    if (!entries.length) {
      formData.forEach(value => {
        if (value && typeof value === 'object' && 'name' in value && value.size > 0) entries.push(value);
      });
    }
    const selected = selectSharedAudioFiles(entries);
    if (!selected.files.length) throw new Error('no-supported-share-files');
    const id = createShareRecordId();
    await putSharedFiles({
      id,
      createdAt: Date.now(),
      title: String(formData.get('title') || '').slice(0, 200),
      text: String(formData.get('text') || '').slice(0, 2000),
      url: String(formData.get('url') || '').slice(0, 2048),
      files: selected.files,
      totalBytes: selected.totalBytes,
      rejectedCount: selected.rejected,
      schemaVersion: SHARE_POLICY.schemaVersion
    });
    const redirectUrl = new URL('./', self.registration.scope);
    redirectUrl.searchParams.set(SHARE_QUERY, id);
    redirectUrl.searchParams.set('shareCount', String(selected.files.length));
    return Response.redirect(redirectUrl.href, 303);
  } catch (error) {
    const fallback = new URL('./', self.registration.scope);
    const errorCode = error?.message === 'no-supported-share-files'
      ? 'unsupported'
      : (error?.code === 'share-storage-quota' || SHARE_POLICY_API.isQuotaExceededError(error))
        ? 'quota'
        : error?.code === 'share-storage-busy'
          ? 'busy'
          : 'storage';
    fallback.searchParams.set(SHARE_ERROR_QUERY, errorCode);
    return Response.redirect(fallback.href, 303);
  }
}
