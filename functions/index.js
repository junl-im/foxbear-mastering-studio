'use strict';

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore');
const nodemailer = require('nodemailer');
const { randomUUID } = require('node:crypto');

initializeApp();

const db = getFirestore();
const GMAIL_APP_PASSWORD = defineSecret('FOXBEAR_GMAIL_APP_PASSWORD');
const ALERT_RECIPIENT = 'mcwoogi@gmail.com';
const ALERT_SENDER = 'mcwoogi@gmail.com';
const MAIL_FROM_NAME = 'AI마스터링 스튜디오';
const MAIL_SUBJECT_PREFIX = '[AI마스터링 스튜디오]';
const REGION = 'asia-northeast3';
const TIME_ZONE = 'Asia/Seoul';
const DUPLICATE_WINDOW_MS = 30 * 60 * 1000;
const RESERVATION_WINDOW_MS = 5 * 60 * 1000;
const DELIVERY_LEASE_MS = 4 * 60 * 1000;
const DAILY_EMAIL_LIMIT = 40;
const MAX_DELIVERY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = Object.freeze([10 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000]);
const REPORT_TTL_DAYS = 30;
const STATE_TTL_DAYS = 45;
const INCIDENT_QUERY_BATCH = 24;
const LEGACY_SCAN_BATCH = 80;
const PENDING_GRACE_MS = 2 * 60 * 1000;
const RATE_LIMIT_RETRY_BUFFER_MS = 5 * 60 * 1000;
const DAILY_SUMMARY_PAGE_SIZE = 500;
const DAILY_SUMMARY_MAX_REPORTS = 5000;
const DAILY_SUMMARY_OFFSETS = Object.freeze([-1, -2, -3]);
const OPERATIONS_HEALTH_DOC_ID = 'mail';
const OPERATIONS_AUDIT_LEASE_MS = 4 * 60 * 1000;
const OPERATIONS_STATE_TTL_DAYS = 90;
const SMTP_HEALTHY_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const SMTP_DEGRADED_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const OPERATIONS_ALERT_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const STALE_PENDING_MS = 10 * 60 * 1000;
const STALE_OVERDUE_MS = 5 * 60 * 1000;
const DEAD_LETTER_CRITICAL_COUNT = 5;
const STALE_CRITICAL_COUNT = 3;
const INCIDENT_BATCH_RECOVERY_LIMIT = 8;
const OPERATIONS_HISTORY_COLLECTION = 'incidentOperationsHistory';
const OPERATIONS_ALERT_COLLECTION = 'incidentOperationsAlerts';
const OPERATIONS_HISTORY_BUCKET_MS = 30 * 60 * 1000;
const OPERATIONS_HISTORY_TTL_DAYS = 30;
const OPERATIONS_WEBHOOK_TIMEOUT_MS = 10000;
const OPERATIONS_WEBHOOK_ENV_NAME = 'FOXBEAR_INCIDENT_ALERT_WEBHOOK_URL';
const OPERATIONS_WEBHOOK_FALLBACK_ENV_NAME = 'FOXBEAR_INCIDENT_ALERT_WEBHOOK_FALLBACK_URL';
const OPERATIONS_WEBHOOK_RETRY_DELAYS_MS = Object.freeze([0, 800, 2400]);
const ADMIN_AUDIT_COLLECTION = 'incidentAdminAuditLog';
const ADMIN_AUDIT_TTL_DAYS = 90;
const MAIL_TEST_HISTORY_COLLECTION = 'incidentMailTestHistory';
const MAIL_RECEIPT_CONFIRMATION_COLLECTION = 'incidentMailReceiptConfirmationRequests';
const MAIL_VERIFICATION_DOC_ID = 'mailVerification';
const MAIL_TEST_HISTORY_TTL_DAYS = 90;
const MAIL_TEST_WARNING_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const PRODUCT_VERSION = '1.5.69';
const OPERATIONS_SCHEMA_VERSION = 4;
const ADMIN_ACTION_STATE_COLLECTION = 'incidentAdminActionState';
const ADMIN_ACTION_STATE_TTL_DAYS = 7;
const ADMIN_RETRY_COOLDOWN_MS = 10 * 1000;
const ADMIN_BATCH_COOLDOWN_MS = 2 * 60 * 1000;
const ADMIN_ALERT_TEST_COOLDOWN_MS = 5 * 60 * 1000;
const ADMIN_DEPLOY_VERIFY_COOLDOWN_MS = 10 * 60 * 1000;
const OPERATIONS_WEBHOOK_ALLOWED_HOSTS = Object.freeze([
  'hooks.slack.com', 'discord.com', 'discordapp.com', 'chat.googleapis.com',
  'outlook.office.com', 'webhook.office.com'
]);

function cleanText(value, maxLength = 500) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value) {
  return cleanText(value, 4000)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeKey(value, fallback = 'unknown') {
  return cleanText(value, 100).replace(/[^a-z0-9_-]/gi, '_').slice(0, 100) || fallback;
}

function emailTable(rows = []) {
  const body = rows.map(([label, value]) => `<tr><th style="width:34%;text-align:left;padding:10px 12px;border-bottom:1px solid #e8edf3;color:#52606d;font-size:13px;font-weight:700;vertical-align:top">${escapeHtml(label)}</th><td style="padding:10px 12px;border-bottom:1px solid #e8edf3;color:#17212b;font-size:14px;line-height:1.55;word-break:break-word">${escapeHtml(value ?? '-')}</td></tr>`).join('');
  return `<table role="presentation" style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #dfe7ef;border-radius:12px;overflow:hidden">${body}</table>`;
}

function buildBrandedEmailHtml(options = {}) {
  const title = escapeHtml(options.title || 'AI마스터링 스튜디오 알림');
  const eyebrow = escapeHtml(options.eyebrow || 'AI MASTERING STUDIO');
  const summary = escapeHtml(options.summary || '운영 상태를 확인하세요.');
  const badge = escapeHtml(options.badge || '알림');
  const accent = cleanText(options.accent || '#147d73', 20);
  const content = String(options.content || '');
  const footer = escapeHtml(options.footer || '개인 오디오, 파일명, 원본 PCM은 메일에 포함되지 않습니다.');
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#f3f6f9;font-family:Arial,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;color:#17212b"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${summary}</div><table role="presentation" style="width:100%;border-collapse:collapse;background:#f3f6f9"><tr><td align="center" style="padding:28px 12px"><table role="presentation" style="width:100%;max-width:680px;border-collapse:collapse;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 28px rgba(20,35,50,.10)"><tr><td style="padding:24px 28px;background:#102a2d;color:#ffffff;border-top:5px solid ${accent}"><div style="font-size:11px;letter-spacing:.16em;color:#9de3d9;font-weight:700">${eyebrow}</div><div style="margin-top:8px;font-size:24px;line-height:1.35;font-weight:800">${title}</div><div style="margin-top:12px;display:inline-block;padding:5px 10px;border-radius:999px;background:${accent};font-size:12px;font-weight:700">${badge}</div></td></tr><tr><td style="padding:26px 28px"><p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#354250">${summary}</p>${content}</td></tr><tr><td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e7edf3;color:#6b7785;font-size:12px;line-height:1.6">${footer}<br>발신자: AI마스터링 스튜디오</td></tr></table></td></tr></table></body></html>`;
}

function mailFromHeader() {
  return `${MAIL_FROM_NAME} <${ALERT_SENDER}>`;
}

function kstTimestampLabel(value = Date.now()) {
  const input = value instanceof Date ? value.getTime() : Number(value);
  const source = Number.isFinite(input) ? input : Date.now();
  const date = new Date(source + (9 * 60 * 60 * 1000));
  const pad = number => String(number).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} KST`;
}

function incidentSeverityLabel(value) {
  const severity = cleanText(value || 'error', 20).toLowerCase();
  return severity === 'fatal' ? '긴급' : severity === 'warning' ? '경고' : '오류';
}

function incidentCategoryLabel(value) {
  const category = cleanText(value || 'unknown', 40).toLowerCase();
  const labels = {
    'manual-test': '메일 테스트', runtime: '실행 오류', resource: '리소스 오류', boot: '부팅 오류',
    mastering: '마스터링 오류', 'mastering-memory': '마스터링 메모리', 'quality-recovery': '품질 복구',
    export: '내보내기 오류', 'update-safety': '업데이트 안전', 'release-mismatch': '배포 버전',
    firebase: 'Firebase', unknown: '기타 오류'
  };
  return labels[category] || category;
}

function buildIncidentSubject(data = {}, reportId = '') {
  const category = cleanText(data.category || 'unknown', 40).toLowerCase();
  if (category === 'manual-test') {
    const testId = cleanText(data.fingerprint || reportId || 'test', 80).replace(/^manual-test-/, '').slice(-18) || 'test';
    return `${MAIL_SUBJECT_PREFIX}[메일 테스트] 실제 발송 확인 · ${testId}`.slice(0, 180);
  }
  const version = cleanText(data.appVersion || 'unknown', 24);
  const shortId = safeKey(reportId || data.fingerprint || 'incident').slice(-10);
  return `${MAIL_SUBJECT_PREFIX}[오류 신고] ${incidentSeverityLabel(data.severity)} · ${incidentCategoryLabel(category)} · v${version} · ${shortId}`.slice(0, 180);
}

function recommendedActionForIssue(code) {
  const actions = {
    'secret-invalid': 'Firebase Secret Manager에서 FOXBEAR_GMAIL_APP_PASSWORD를 16자리 Google 앱 비밀번호로 다시 등록하세요.',
    'smtp-auth-failed': 'Gmail 2단계 인증과 앱 비밀번호 상태를 확인한 뒤 Secret을 교체하고 Functions를 재배포하세요.',
    'smtp-connection-failed': 'Firebase Functions 외부 네트워크와 Gmail SMTP 연결 상태를 확인하고 잠시 후 다시 검증하세요.',
    'recipient-rejected': 'ALERT_RECIPIENT 주소와 Gmail 수신 정책을 확인하세요.',
    'webhook-config-invalid': '허용된 HTTPS 웹훅 주소인지 확인하고 환경 변수를 다시 배포하세요.',
    'long-undelivered': '관리자 화면에서 미발송 일괄 복구를 실행하고 Firestore 인덱스 및 예약 함수를 확인하세요.',
    'dead-letter-present': '최종 실패 목록을 검토한 뒤 일괄 강제 재전송하고 반복 실패 원인을 확인하세요.',
    'summary-delivery-degraded': '일일 요약 상태 문서의 잠금과 SMTP 오류를 확인한 뒤 요약 함수를 재실행하세요.',
    'quota-reservation-leak': '예약 임대 만료 후 자동 회수를 기다리거나 incidentMailState의 예약 카운터를 점검하세요.',
    'deployment-version-mismatch': 'Hosting과 Functions를 같은 릴리스 버전으로 다시 배포하세요.',
    'deployment-check-stale': '관리자 화면에서 배포 상태 검증을 실행하세요.',
    'firestore-index-missing': 'firestore.indexes.json을 배포하고 Firebase Console에서 모든 인덱스가 Enabled 상태인지 확인하세요.',
    'webhook-primary-failed': '기본 웹훅 주소와 공급자 상태를 확인하고 보조 웹훅 장애 전환 결과를 점검하세요.',
    'webhook-fallback-failed': '보조 웹훅 주소와 허용 호스트를 확인하고 두 채널 중 하나 이상을 정상화하세요.'
  };
  return actions[cleanText(code, 80)] || '관리자 운영 상태와 최근 오류 기록을 확인한 뒤 관련 배포 항목을 재검증하세요.';
}


async function writeAdminAuditEvent(entry = {}) {
  const now = Date.now();
  const payload = {
    schemaVersion: 1,
    productVersion: PRODUCT_VERSION,
    uid: cleanText(entry.uid || '', 128),
    action: cleanText(entry.action || 'unknown', 80),
    requestId: cleanText(entry.requestId || '', 180),
    status: cleanText(entry.status || 'recorded', 40),
    reason: cleanText(entry.reason || '', 100),
    targetType: cleanText(entry.targetType || '', 60),
    targetId: cleanText(entry.targetId || '', 180),
    result: {
      attempted: Math.max(0, Number(entry.result?.attempted || 0)),
      succeeded: Math.max(0, Number(entry.result?.succeeded || entry.result?.emailed || 0)),
      failed: Math.max(0, Number(entry.result?.failed || 0)),
      skipped: Math.max(0, Number(entry.result?.skipped || 0))
    },
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + ADMIN_AUDIT_TTL_DAYS * 86400000)
  };
  try {
    await db.collection(ADMIN_AUDIT_COLLECTION).add(payload);
  } catch (error) {
    console.error('FoxBear administrator audit write failed', { action: payload.action, status: payload.status, error: cleanText(error?.message || error, 240) });
  }
}

function adminActionStateId(uid, action) {
  return safeKey(`${uid}_${action}`, 'admin_action').slice(0, 140);
}

async function getActiveAdmin(uid) {
  const safeUid = cleanText(uid || '', 128);
  if (!safeUid) return { active: false, uid: '' };
  const snapshot = await db.collection('siteAdmins').doc(safeUid).get();
  return { active: snapshot.exists && snapshot.data()?.active === true, uid: safeUid };
}

async function claimAdminAction(uid, action, options = {}) {
  const now = Date.now();
  const cooldownMs = Math.max(0, Number(options.cooldownMs || 0));
  const leaseMs = Math.max(30000, Number(options.leaseMs || 120000));
  const requestId = cleanText(options.requestId || createDeliveryLeaseId(), 180);
  const safeUid = cleanText(uid || '', 128);
  const safeAction = cleanText(action || 'unknown', 80);
  const stateRef = db.collection(ADMIN_ACTION_STATE_COLLECTION).doc(adminActionStateId(safeUid, safeAction));
  const result = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(stateRef);
    const current = snapshot.data() || {};
    const leaseUntil = timestampMillis(current.leaseUntil);
    const lastStartedAt = timestampMillis(current.lastStartedAt);
    if (leaseUntil > now) {
      return { allowed: false, reason: 'already-running', retryAfterSeconds: Math.max(1, Math.ceil((leaseUntil - now) / 1000)) };
    }
    if (cooldownMs && lastStartedAt && now - lastStartedAt < cooldownMs) {
      return { allowed: false, reason: 'cooldown', retryAfterSeconds: Math.max(1, Math.ceil((cooldownMs - (now - lastStartedAt)) / 1000)) };
    }
    transaction.set(stateRef, {
      schemaVersion: 1,
      uid: safeUid,
      action: safeAction,
      status: 'running',
      requestId,
      lastStartedAt: Timestamp.fromMillis(now),
      leaseUntil: Timestamp.fromMillis(now + leaseMs),
      checkedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now + ADMIN_ACTION_STATE_TTL_DAYS * 86400000)
    }, { merge: true });
    return { allowed: true };
  });
  const claim = { ...result, stateRef, requestId, uid: safeUid, action: safeAction, targetType: cleanText(options.targetType || '', 60), targetId: cleanText(options.targetId || '', 180) };
  await writeAdminAuditEvent({ ...claim, status: result.allowed ? 'started' : 'rejected', reason: result.reason || '' });
  return claim;
}

async function finishAdminAction(claim, status, details = {}) {
  if (!claim?.stateRef || !claim?.requestId) return;
  const ownsLease = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(claim.stateRef);
    const current = snapshot.data() || {};
    if (cleanText(current.requestId || '', 180) !== claim.requestId) return false;
    transaction.set(claim.stateRef, {
      status: cleanText(status || 'completed', 40),
      reason: cleanText(details.reason || '', 100),
      message: cleanText(details.message || '', 300),
      leaseUntil: null,
      lastCompletedAt: FieldValue.serverTimestamp(),
      checkedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return true;
  });
  if (!ownsLease) return;
  await writeAdminAuditEvent({
    uid: claim.uid,
    action: claim.action,
    requestId: claim.requestId,
    status: cleanText(status || 'completed', 40),
    reason: details.reason || '',
    targetType: claim.targetType || '',
    targetId: claim.targetId || '',
    result: details.result || {}
  });
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function retryDelayMs(attemptCount) {
  const index = Math.max(0, Math.min(RETRY_DELAYS_MS.length - 1, Number(attemptCount || 1) - 1));
  return RETRY_DELAYS_MS[index];
}

function normalizedGmailAppPassword() {
  const password = String(GMAIL_APP_PASSWORD.value() || '').replace(/\s+/g, '');
  if (!/^[a-z0-9]{16}$/i.test(password)) {
    const error = new Error('FOXBEAR_GMAIL_APP_PASSWORD must be the 16-character Google app password. Re-register it in Firebase Secret Manager.');
    error.code = 'FOXBEAR_GMAIL_SECRET_INVALID';
    throw error;
  }
  return password;
}

function createDeliveryLeaseId() {
  return randomUUID();
}

function incidentMessageId(reportId) {
  return `<foxbear-${safeKey(reportId, 'incident')}@foxbear-music.firebaseapp.com>`;
}

function summaryMessageId(dateKey) {
  return `<foxbear-summary-${safeKey(dateKey, 'daily')}@foxbear-music.firebaseapp.com>`;
}

function assertSmtpAccepted(info = {}) {
  const accepted = Array.isArray(info.accepted) ? info.accepted.filter(Boolean) : [];
  if (!accepted.length) {
    const error = new Error('SMTP completed without accepting the FoxBear alert recipient.');
    error.code = 'FOXBEAR_SMTP_NO_ACCEPTED_RECIPIENT';
    throw error;
  }
  return accepted.length;
}

function classifySmtpError(error) {
  const code = cleanText(error?.code || error?.responseCode || error?.name || 'smtp-error', 80);
  const message = cleanText(error?.message || error, 500);
  if (code === 'FOXBEAR_GMAIL_SECRET_INVALID') return { reason: 'secret-invalid', code, message };
  if (/EAUTH|535|534|auth/i.test(`${code} ${message}`)) return { reason: 'smtp-auth-failed', code, message };
  if (/ETIMEDOUT|ESOCKET|ECONNECTION|ECONNRESET|ENOTFOUND|timeout|network/i.test(`${code} ${message}`)) {
    return { reason: 'smtp-connection-failed', code, message };
  }
  if (code === 'FOXBEAR_SMTP_NO_ACCEPTED_RECIPIENT') return { reason: 'recipient-rejected', code, message };
  return { reason: 'smtp-check-failed', code, message };
}

function operationAlertMessageId(kind, signature, now = Date.now()) {
  const bucket = Math.floor((now + (9 * 60 * 60 * 1000)) / (6 * 60 * 60 * 1000));
  return `<foxbear-operations-${safeKey(kind, 'alert')}-${safeKey(signature, 'state')}-${bucket}@foxbear-music.firebaseapp.com>`;
}

function inspectOperationsWebhookConfig(rawValue = process.env[OPERATIONS_WEBHOOK_ENV_NAME], channel = 'primary') {
  const raw = String(rawValue || '').trim();
  if (!raw) return { status: 'disabled', provider: '', reason: 'not-configured', url: '', channel };
  try {
    const parsed = new URL(raw);
    const hostname = parsed.hostname.toLowerCase();
    if (parsed.protocol !== 'https:') throw new Error('webhook-must-use-https');
    if (parsed.username || parsed.password) throw new Error('webhook-credentials-not-allowed');
    const allowed = OPERATIONS_WEBHOOK_ALLOWED_HOSTS.some(host => hostname === host || hostname.endsWith(`.${host}`));
    if (!allowed) throw new Error('webhook-host-not-allowed');
    let provider = 'generic';
    if (hostname.includes('slack.com')) provider = 'slack';
    else if (hostname.includes('discord')) provider = 'discord';
    else if (hostname.includes('googleapis.com')) provider = 'google-chat';
    else if (hostname.includes('office.com')) provider = 'microsoft-teams';
    return { status: 'ready', provider, reason: '', url: parsed.toString(), channel };
  } catch (error) {
    return { status: 'error', provider: '', reason: cleanText(error?.message || error, 100), url: '', channel };
  }
}

function inspectOperationsWebhookChannels() {
  const primary = inspectOperationsWebhookConfig(process.env[OPERATIONS_WEBHOOK_ENV_NAME], 'primary');
  const fallback = inspectOperationsWebhookConfig(process.env[OPERATIONS_WEBHOOK_FALLBACK_ENV_NAME], 'fallback');
  const ready = [primary, fallback].filter(item => item.status === 'ready');
  const invalid = [primary, fallback].filter(item => item.status === 'error');
  return {
    status: ready.length ? 'ready' : invalid.length ? 'error' : 'disabled',
    provider: ready[0]?.provider || '',
    reason: ready.length ? '' : invalid[0]?.reason || 'not-configured',
    failoverReady: ready.length > 1,
    primary,
    fallback
  };
}

function publicWebhookConfig(config = {}) {
  return {
    status: cleanText(config.status || 'disabled', 20),
    provider: cleanText(config.provider || '', 40),
    reason: cleanText(config.reason || '', 100),
    failoverReady: config.failoverReady === true,
    primaryStatus: cleanText(config.primary?.status || config.status || 'disabled', 20),
    primaryProvider: cleanText(config.primary?.provider || config.provider || '', 40),
    fallbackStatus: cleanText(config.fallback?.status || 'disabled', 20),
    fallbackProvider: cleanText(config.fallback?.provider || '', 40)
  };
}

function buildOperationsWebhookPayload(health = {}, previous = {}, kind = 'alert', provider = 'generic') {
  const queue = health.queue || {};
  const smtp = health.smtp || {};
  const quota = health.quota || {};
  const isRecovery = kind === 'recovery';
  const isTest = kind === 'test';
  const heading = isTest ? 'FoxBear 보조 경보 채널 테스트' : isRecovery ? 'FoxBear 문제 보고 메일 시스템 복구' : `FoxBear 문제 보고 메일 운영 ${health.status === 'critical' ? '긴급' : '주의'}`;
  const issueText = Array.isArray(health.reasons) && health.reasons.length
    ? health.reasons.map(item => `- ${cleanText(item?.message || item?.code || item, 180)}`).join('\n')
    : '- 없음';
  const text = [
    `**${heading}**`,
    `상태: ${cleanText(health.status || 'unknown', 20)} (이전 ${cleanText(previous.status || 'unknown', 20)})`,
    `SMTP: ${cleanText(smtp.status || 'unknown', 20)}${smtp.reason ? ` / ${cleanText(smtp.reason, 80)}` : ''}`,
    `장기 미발송 ${Math.max(0, Number(queue.stale || 0))}건 · 최종 실패 ${Math.max(0, Number(queue.deadLetter || 0))}건`,
    `KST 발송 ${Math.max(0, Number(quota.sent || 0))}/${Math.max(0, Number(quota.limit || DAILY_EMAIL_LIMIT))} · 예약 ${Math.max(0, Number(quota.reserved || 0))}`,
    issueText
  ].join('\n').slice(0, 1900);
  return provider === 'discord' ? { content: text } : { text };
}

function webhookRetryDelay(response, attemptIndex) {
  const header = response?.headers?.get?.('retry-after');
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(5000, seconds * 1000);
  return OPERATIONS_WEBHOOK_RETRY_DELAYS_MS[Math.min(attemptIndex, OPERATIONS_WEBHOOK_RETRY_DELAYS_MS.length - 1)] || 0;
}

function isWebhookRetryableStatus(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

async function wait(ms) {
  if (ms > 0) await new Promise(resolve => setTimeout(resolve, ms));
}

async function deliverOperationsWebhook(config, health, previous, kind) {
  if (config.status !== 'ready') return { status: config.status, provider: config.provider, channel: config.channel, reason: config.reason, attempts: 0 };
  let last = { status: 'failed', provider: config.provider, channel: config.channel, reason: 'webhook-request-failed', attempts: 0 };
  for (let index = 0; index < OPERATIONS_WEBHOOK_RETRY_DELAYS_MS.length; index += 1) {
    if (index > 0) await wait(OPERATIONS_WEBHOOK_RETRY_DELAYS_MS[index]);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPERATIONS_WEBHOOK_TIMEOUT_MS);
    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'user-agent': `FoxBear-Incident-Monitor/${PRODUCT_VERSION}` },
        body: JSON.stringify(buildOperationsWebhookPayload(health, previous, kind, config.provider)),
        signal: controller.signal,
        redirect: 'error'
      });
      if (response.ok) return { status: 'delivered', provider: config.provider, channel: config.channel, reason: '', statusCode: response.status, attempts: index + 1 };
      const body = cleanText(await response.text().catch(() => ''), 240);
      last = { status: 'failed', provider: config.provider, channel: config.channel, reason: `http-${response.status}`, response: body, statusCode: response.status, attempts: index + 1 };
      if (!isWebhookRetryableStatus(response.status)) break;
      await wait(webhookRetryDelay(response, index));
    } catch (error) {
      last = { status: 'failed', provider: config.provider, channel: config.channel, reason: error?.name === 'AbortError' ? 'webhook-timeout' : 'webhook-request-failed', message: cleanText(error?.message || error, 240), attempts: index + 1 };
    } finally {
      clearTimeout(timer);
    }
  }
  return last;
}

async function sendOperationsWebhook(health = {}, previous = {}, kind = 'alert') {
  const channels = inspectOperationsWebhookChannels();
  const primary = await deliverOperationsWebhook(channels.primary, health, previous, kind);
  if (primary.status === 'delivered') return { ...primary, primary, fallback: { status: 'skipped', reason: 'primary-delivered', channel: 'fallback', attempts: 0 } };
  const fallback = await deliverOperationsWebhook(channels.fallback, health, previous, kind);
  if (fallback.status === 'delivered') return { ...fallback, failover: true, primary, fallback };
  const attempted = [primary, fallback].some(item => item.status === 'failed');
  return {
    status: attempted ? 'failed' : channels.status,
    provider: fallback.provider || primary.provider || channels.provider,
    channel: '',
    reason: attempted ? 'all-webhooks-failed' : channels.reason,
    attempts: Math.max(0, Number(primary.attempts || 0)) + Math.max(0, Number(fallback.attempts || 0)),
    primary,
    fallback
  };
}

function operationsHistoryId(now = Date.now()) {
  const bucket = Math.floor(now / OPERATIONS_HISTORY_BUCKET_MS) * OPERATIONS_HISTORY_BUCKET_MS;
  return new Date(bucket).toISOString().slice(0, 16).replace(/[-:T]/g, '');
}

async function recordOperationsTelemetry(health = {}, alert = {}, now = Date.now()) {
  const historyRef = db.collection(OPERATIONS_HISTORY_COLLECTION).doc(operationsHistoryId(now));
  const channels = alert.channels || {};
  const history = {
    schemaVersion: OPERATIONS_SCHEMA_VERSION,
    productVersion: PRODUCT_VERSION,
    status: cleanText(health.status || 'unknown', 20),
    signature: cleanText(health.signature || '', 100),
    queue: {
      stale: Math.max(0, Number(health.queue?.stale || 0)),
      deadLetter: Math.max(0, Number(health.queue?.deadLetter || 0)),
      pending: Math.max(0, Number(health.queue?.pending || 0)),
      failed: Math.max(0, Number(health.queue?.failed || 0))
    },
    quota: {
      dateKey: cleanText(health.quota?.dateKey || '', 10),
      sent: Math.max(0, Number(health.quota?.sent || 0)),
      reserved: Math.max(0, Number(health.quota?.reserved || 0))
    },
    smtpStatus: cleanText(health.smtp?.status || 'unknown', 20),
    webhookStatus: cleanText(health.channels?.webhook?.status || 'disabled', 20),
    alertStatus: cleanText(alert.status || 'skipped', 20),
    smtpAlertStatus: cleanText(channels.smtp?.status || '', 20),
    webhookAlertStatus: cleanText(channels.webhook?.status || '', 20),
    webhookAlertChannel: cleanText(channels.webhook?.channel || '', 20),
    webhookAlertAttempts: Math.max(0, Number(channels.webhook?.attempts || 0)),
    reasonCodes: Array.isArray(health.reasons) ? health.reasons.map(item => cleanText(item?.code || '', 80)).filter(Boolean).slice(0, 12) : [],
    recommendedActions: Array.isArray(health.reasons) ? health.reasons.map(item => recommendedActionForIssue(item?.code)).slice(0, 6) : [],
    checkedAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + OPERATIONS_HISTORY_TTL_DAYS * 86400000)
  };
  await historyRef.set(history, { merge: true });
  if (!alert.kind || alert.status === 'skipped') return;
  const alertId = `${operationsHistoryId(now)}_${safeKey(alert.kind, 'alert')}_${safeKey(health.signature, 'state')}`;
  await db.collection(OPERATIONS_ALERT_COLLECTION).doc(alertId).set({
    schemaVersion: 1,
    kind: cleanText(alert.kind || 'alert', 20),
    status: cleanText(alert.status || 'recorded', 20),
    operationsStatus: cleanText(health.status || 'unknown', 20),
    signature: cleanText(health.signature || '', 100),
    reasonCodes: Array.isArray(health.reasons) ? health.reasons.map(item => cleanText(item?.code || '', 80)).filter(Boolean).slice(0, 12) : [],
    channels: {
      smtp: { status: cleanText(channels.smtp?.status || '', 20), reason: cleanText(channels.smtp?.reason || '', 100) },
      webhook: { status: cleanText(channels.webhook?.status || '', 20), provider: cleanText(channels.webhook?.provider || '', 40), channel: cleanText(channels.webhook?.channel || '', 20), reason: cleanText(channels.webhook?.reason || '', 100), attempts: Math.max(0, Number(channels.webhook?.attempts || 0)) }
    },
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + OPERATIONS_HISTORY_TTL_DAYS * 86400000)
  }, { merge: true });
}

function buildOperationsAlertMail(health = {}, previous = {}, kind = 'alert') {
  const status = cleanText(health.status || 'unknown', 20);
  const isRecovery = kind === 'recovery';
  const queue = health.queue || {};
  const smtp = health.smtp || {};
  const quota = health.quota || {};
  const summaries = health.summaries || {};
  const issueMessages = Array.isArray(health.reasons)
    ? health.reasons.map(item => cleanText(item?.message || item?.code || item, 240)).filter(Boolean)
    : [];
  const subject = isRecovery
    ? `${MAIL_SUBJECT_PREFIX}[복구 완료] 메일 시스템 정상화`
    : status === 'critical'
      ? `${MAIL_SUBJECT_PREFIX}[긴급 장애] 메일 시스템 확인 필요`
      : `${MAIL_SUBJECT_PREFIX}[운영 경고] 메일 시스템 점검 필요`;
  const lines = [
    isRecovery ? 'FoxBear 문제 보고 메일 시스템이 정상 상태로 복구되었습니다.' : 'FoxBear 문제 보고 메일 시스템에서 운영 이상을 감지했습니다.',
    '',
    `현재 상태: ${status}`,
    `이전 상태: ${cleanText(previous.status || 'unknown', 20)}`,
    `SMTP: ${cleanText(smtp.status || 'unknown', 20)}${smtp.reason ? ` (${cleanText(smtp.reason, 80)})` : ''}`,
    `장기 미발송: ${Math.max(0, Number(queue.stale || 0))}건`,
    `대기/실패/최종 실패: ${Math.max(0, Number(queue.pending || 0))} / ${Math.max(0, Number(queue.failed || 0))} / ${Math.max(0, Number(queue.deadLetter || 0))}`,
    `일일 발송/예약: ${Math.max(0, Number(quota.sent || 0))} / ${Math.max(0, Number(quota.reserved || 0))} (한도 ${DAILY_EMAIL_LIMIT})`,
    `최근 요약 실패: ${Math.max(0, Number(summaries.failed || 0))}건`,
    '',
    '감지 항목:',
    ...(issueMessages.length ? issueMessages.map(item => `- ${item}`) : ['- 없음']),
    '',
    'Firebase 관리자 화면의 오류 탭에서 최신 상태를 확인하세요.'
  ];
  const rows = [
    ['현재 상태', status],
    ['SMTP', `${smtp.status || 'unknown'} ${smtp.reason || ''}`.trim()],
    ['장기 미발송', `${Math.max(0, Number(queue.stale || 0))}건`],
    ['대기', `${Math.max(0, Number(queue.pending || 0))}건`],
    ['발송 실패', `${Math.max(0, Number(queue.failed || 0))}건`],
    ['최종 실패', `${Math.max(0, Number(queue.deadLetter || 0))}건`],
    ['일일 발송/예약', `${Math.max(0, Number(quota.sent || 0))} / ${Math.max(0, Number(quota.reserved || 0))}`],
    ['요약 실패', `${Math.max(0, Number(summaries.failed || 0))}건`]
  ];
  const issueList = issueMessages.length ? issueMessages.map(item => `<li style="margin:0 0 7px">${escapeHtml(item)}</li>`).join('') : '<li>없음</li>';
  const html = buildBrandedEmailHtml({
    title: isRecovery ? '메일 시스템 복구 완료' : status === 'critical' ? '메일 시스템 긴급 장애' : '메일 시스템 운영 경고',
    summary: isRecovery ? '문제 보고 메일 시스템이 정상 상태로 돌아왔습니다.' : '운영 이상이 감지되었습니다. 아래 상태와 권장 조치를 확인하세요.',
    badge: isRecovery ? '복구 완료' : status === 'critical' ? '긴급 장애' : '운영 경고',
    accent: isRecovery ? '#147d73' : status === 'critical' ? '#b42318' : '#b7791f',
    content: `${emailTable(rows)}<h3 style="margin:24px 0 10px;font-size:16px">감지 항목</h3><ul style="margin:0;padding-left:20px;color:#354250;line-height:1.6">${issueList}</ul><p style="margin:20px 0 0;color:#52606d;font-size:13px">Firebase 관리자 화면의 오류 탭에서 최신 상태를 확인하세요.</p>`
  });
  return { subject, text: lines.join('\n'), html };
}

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    auth: { user: ALERT_SENDER, pass: normalizedGmailAppPassword() }
  });
}

function buildMail(data, reportId) {
  const category = cleanText(data.category || 'unknown', 40);
  const severity = cleanText(data.severity || 'error', 20).toUpperCase();
  const fingerprint = cleanText(data.fingerprint || 'unknown', 64);
  const appVersion = cleanText(data.appVersion || 'unknown', 24);
  const isManualTest = category === 'manual-test';
  const subject = buildIncidentSubject(data, reportId);
  const receivedAt = kstTimestampLabel(Date.now());
  const heading = isManualTest ? 'AI마스터링 스튜디오 실제 메일 발송 테스트' : 'AI마스터링 스튜디오 자동 문제 보고';
  const rows = [
    ['메일 유형', isManualTest ? '실제 발송 테스트' : '자동 문제 보고'],
    ['발신자', MAIL_FROM_NAME], ['수신자', ALERT_RECIPIENT], ['제목', subject],
    ['분류', incidentCategoryLabel(category)], ['심각도', incidentSeverityLabel(data.severity)], ['이유', data.reason], ['메시지', data.message],
    ['코드', data.code], ['앱 버전', appVersion], ['자산 버전', data.assetVersion],
    ['브라우저', data.browser], ['플랫폼', data.platform], ['화면', data.viewport],
    ['온라인', data.online === false ? '아니오' : '예'],
    ['부팅 실패/정지', `${Boolean(data.bootFailed)} / ${Boolean(data.bootStalled)}`],
    ['리소스/오류/경고', `${Number(data.resourceFailureCount || 0)} / ${Number(data.runtimeErrorCount || 0)} / ${Number(data.runtimeWarningCount || 0)}`],
    ['페이지', data.pagePath], ['지문', fingerprint], ['보고서 ID', reportId],
    ['클라이언트 시각', data.clientAt], ['서버 발송 시각', receivedAt]
  ];
  const intro = isManualTest
    ? '이 메일은 오류가 없어도 실제 Gmail SMTP 발송 경로를 확인하기 위해 사용자가 직접 실행한 테스트입니다.'
    : 'AI마스터링 스튜디오에서 자동 수집한 문제 보고입니다.';
  const text = [
    heading, '', intro, '',
    ...rows.map(([label, value]) => `${label}: ${cleanText(value, 1200) || '-'}`),
    '', `상황: ${cleanText(data.context, 2000) || '-'}`, '',
    `스택:\n${String(data.stack || '').slice(0, 4000) || '-'}`, '',
    '개인 오디오, 파일명, 원본 PCM은 이 메일에 포함되지 않습니다.'
  ].join('\n');
  const html = buildBrandedEmailHtml({
    title: heading,
    summary: intro,
    badge: isManualTest ? '실제 발송 테스트' : `${incidentSeverityLabel(data.severity)} · ${incidentCategoryLabel(category)}`,
    accent: isManualTest ? '#147d73' : data.severity === 'fatal' ? '#b42318' : '#2563a6',
    content: `${emailTable(rows)}<h3 style="margin:24px 0 10px;font-size:16px">상황</h3><pre style="white-space:pre-wrap;word-break:break-word;background:#f6f8fa;border:1px solid #e2e8f0;border-radius:10px;padding:14px;font-size:12px;line-height:1.6">${escapeHtml(data.context || '-')}</pre><h3 style="margin:24px 0 10px;font-size:16px">스택</h3><pre style="white-space:pre-wrap;word-break:break-word;background:#f6f8fa;border:1px solid #e2e8f0;border-radius:10px;padding:14px;font-size:12px;line-height:1.6">${escapeHtml(String(data.stack || '').slice(0, 4000) || '-')}</pre>`
  });
  return { subject, text, html, type: isManualTest ? 'manual-test' : 'incident' };
}

function kstDayRange(now = new Date(), offsetDays = -1) {
  const kstMs = now.getTime() + (9 * 60 * 60 * 1000);
  const kst = new Date(kstMs);
  const startKstAsUtc = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + offsetDays, 0, 0, 0, 0);
  const startMs = startKstAsUtc - (9 * 60 * 60 * 1000);
  const endMs = startMs + 24 * 60 * 60 * 1000;
  return {
    dateKey: new Date(startKstAsUtc).toISOString().slice(0, 10),
    start: Timestamp.fromMillis(startMs),
    end: Timestamp.fromMillis(endMs)
  };
}

function kstDateKey(now = new Date()) {
  return kstDayRange(now, 0).dateKey;
}

function nextKstDayRetryAt(now = Date.now()) {
  const range = kstDayRange(new Date(now), 0);
  return range.end.toMillis() + RATE_LIMIT_RETRY_BUFFER_MS;
}

function buildDailySummaryMail(reports, dateKey, options = {}) {
  const items = Array.isArray(reports) ? reports : [];
  const truncated = options.truncated === true;
  const severityCounts = { fatal: 0, error: 0, warning: 0 };
  const deliveryCounts = {};
  const categoryCounts = {};
  const fingerprints = new Map();
  for (const item of items) {
    const severity = cleanText(item.severity || 'error', 20).toLowerCase();
    if (Object.hasOwn(severityCounts, severity)) severityCounts[severity] += 1;
    const delivery = cleanText(item.delivery?.status || 'pending', 40);
    deliveryCounts[delivery] = (deliveryCounts[delivery] || 0) + 1;
    const category = cleanText(item.category || 'unknown', 40);
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    const fingerprint = cleanText(item.fingerprint || 'unknown', 64);
    const existing = fingerprints.get(fingerprint) || { count: 0, category, message: cleanText(item.message || '', 180) };
    existing.count += 1;
    fingerprints.set(fingerprint, existing);
  }
  const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topFingerprints = Array.from(fingerprints.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 8);
  const subject = `${MAIL_SUBJECT_PREFIX}[일일 요약] ${dateKey} · 오류 ${items.length}${truncated ? '+' : ''}건`;
  const lines = [
    `AI마스터링 스튜디오 일일 오류 요약 (${dateKey}, KST)`, '',
    `전체: ${items.length}${truncated ? '건 이상' : '건'}`,
    ...(truncated ? [`집계 제한: 최신 ${DAILY_SUMMARY_MAX_REPORTS}건까지만 상세 집계됨`] : []),
    `Fatal: ${severityCounts.fatal} / Error: ${severityCounts.error} / Warning: ${severityCounts.warning}`,
    `메일 상태: ${Object.entries(deliveryCounts).map(([key, value]) => `${key} ${value}`).join(', ') || '없음'}`,
    '', '분류별:',
    ...(topCategories.length ? topCategories.map(([key, value]) => `- ${key}: ${value}`) : ['- 없음']),
    '', '반복 오류 지문:',
    ...(topFingerprints.length ? topFingerprints.map(([key, value]) => `- ${key} (${value.count}건) ${value.category}: ${value.message || '-'}`) : ['- 없음']),
    '', '개인 오디오, 파일명, 원본 PCM은 집계 대상에 포함되지 않습니다.'
  ];
  const categoryRows = topCategories.map(([key, value]) => [key, `${value}건`]);
  const fingerprintList = topFingerprints.length ? topFingerprints.map(([key, value]) => `<li style="margin:0 0 8px"><strong>${escapeHtml(key)}</strong> · ${value.count}건 · ${escapeHtml(value.category)}<br><span style="color:#6b7785">${escapeHtml(value.message || '-')}</span></li>`).join('') : '<li>없음</li>';
  const html = buildBrandedEmailHtml({
    title: '일일 오류 요약',
    summary: `${dateKey} KST 기준 오류 ${items.length}${truncated ? '건 이상' : '건'}을 집계했습니다.`,
    badge: `${severityCounts.fatal} 긴급 · ${severityCounts.error} 오류 · ${severityCounts.warning} 경고`,
    accent: severityCounts.fatal ? '#b42318' : '#2563a6',
    content: `${truncated ? `<p style="padding:10px 12px;border-radius:10px;background:#fff7ed;color:#9a3412;font-size:13px">최신 ${DAILY_SUMMARY_MAX_REPORTS}건까지만 상세 집계했습니다.</p>` : ''}${emailTable(categoryRows.length ? categoryRows : [['분류', '없음']])}<h3 style="margin:24px 0 10px;font-size:16px">반복 오류 지문</h3><ul style="margin:0;padding-left:20px;line-height:1.55">${fingerprintList}</ul>`
  });
  return { subject, text: lines.join('\n'), html };
}

function isIncidentDeliveryDue(data = {}, now = Date.now()) {
  const delivery = data.delivery || {};
  const status = cleanText(delivery.status || 'pending', 40);
  const attemptCount = Math.max(0, Number(delivery.attemptCount || 0));
  if (status === 'emailed' || status === 'suppressed-duplicate') return false;
  if (attemptCount >= MAX_DELIVERY_ATTEMPTS || delivery.terminal === true) return false;
  if (status === 'failed' || status === 'suppressed-rate-limit') {
    const nextRetryAt = timestampMillis(delivery.nextRetryAt);
    if (nextRetryAt) return nextRetryAt <= now;
    const createdAt = timestampMillis(data.createdAt || data.clientAt);
    return !createdAt || createdAt <= now - PENDING_GRACE_MS;
  }
  if (status === 'sending' || status === 'retrying') {
    const leaseUntil = timestampMillis(delivery.leaseUntil);
    return !leaseUntil || leaseUntil <= now;
  }
  const createdAt = timestampMillis(data.createdAt || data.clientAt);
  return !createdAt || createdAt <= now - PENDING_GRACE_MS;
}

function incidentDueAt(data = {}) {
  const delivery = data.delivery || {};
  const status = cleanText(delivery.status || 'pending', 40);
  if (status === 'failed' || status === 'suppressed-rate-limit') return timestampMillis(delivery.nextRetryAt) || timestampMillis(data.createdAt || data.clientAt) || 0;
  if (status === 'sending' || status === 'retrying') return timestampMillis(delivery.leaseUntil) || 0;
  return timestampMillis(data.createdAt || data.clientAt) || 0;
}

async function queryIncidentStatus(status, orderField) {
  const reports = db.collection('incidentReports');
  try {
    return await reports.where('delivery.status', '==', status).orderBy(orderField, 'asc').limit(INCIDENT_QUERY_BATCH).get();
  } catch (error) {
    console.warn('FoxBear incident queue index fallback', { status, orderField, error: cleanText(error?.message || error, 220) });
    return reports.where('delivery.status', '==', status).limit(LEGACY_SCAN_BATCH).get();
  }
}

async function collectDueIncidentReports(now = Date.now()) {
  const reports = db.collection('incidentReports');
  const [pending, failed, rateLimited, sending, retrying, legacy] = await Promise.all([
    queryIncidentStatus('pending', 'createdAt'),
    queryIncidentStatus('failed', 'delivery.nextRetryAt'),
    queryIncidentStatus('suppressed-rate-limit', 'createdAt'),
    queryIncidentStatus('sending', 'delivery.leaseUntil'),
    queryIncidentStatus('retrying', 'delivery.leaseUntil'),
    reports.orderBy('createdAt', 'desc').limit(LEGACY_SCAN_BATCH).get()
  ]);
  const candidates = new Map();
  for (const snapshot of [pending, failed, rateLimited, sending, retrying, legacy]) {
    for (const docSnapshot of snapshot.docs) candidates.set(docSnapshot.id, docSnapshot);
  }
  return Array.from(candidates.values())
    .filter(docSnapshot => isIncidentDeliveryDue(docSnapshot.data() || {}, now))
    .sort((left, right) => incidentDueAt(left.data() || {}) - incidentDueAt(right.data() || {}));
}

async function countIncidentStatus(status) {
  const snapshot = await db.collection('incidentReports')
    .where('delivery.status', '==', status)
    .count()
    .get();
  return Math.max(0, Number(snapshot.data()?.count || 0));
}

async function countIncidentStatusBefore(status, field, beforeMillis) {
  const snapshot = await db.collection('incidentReports')
    .where('delivery.status', '==', status)
    .where(field, '<=', Timestamp.fromMillis(beforeMillis))
    .count()
    .get();
  return Math.max(0, Number(snapshot.data()?.count || 0));
}

function isLongUndelivered(data = {}, now = Date.now()) {
  const delivery = data.delivery || {};
  const status = cleanText(delivery.status || 'pending', 40);
  if (status === 'pending') {
    const createdAt = timestampMillis(data.createdAt || data.clientAt);
    return !createdAt || createdAt <= now - STALE_PENDING_MS;
  }
  if (status === 'failed' || status === 'suppressed-rate-limit') {
    const dueAt = timestampMillis(delivery.nextRetryAt) || timestampMillis(data.createdAt || data.clientAt);
    return !dueAt || dueAt <= now - STALE_OVERDUE_MS;
  }
  if (status === 'sending' || status === 'retrying') {
    const leaseUntil = timestampMillis(delivery.leaseUntil);
    return !leaseUntil || leaseUntil <= now - STALE_OVERDUE_MS;
  }
  return false;
}

async function loadLatestEmailedAt() {
  const reports = db.collection('incidentReports');
  try {
    const snapshot = await reports
      .where('delivery.status', '==', 'emailed')
      .orderBy('delivery.checkedAt', 'desc')
      .limit(1)
      .get();
    const item = snapshot.docs[0]?.data() || {};
    return timestampMillis(item.delivery?.checkedAt || item.createdAt || item.clientAt);
  } catch (error) {
    console.warn('FoxBear latest emailed index fallback', { error: cleanText(error?.message || error, 220) });
    const snapshot = await reports
      .where('delivery.status', '==', 'emailed')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    const item = snapshot.docs[0]?.data() || {};
    return timestampMillis(item.delivery?.checkedAt || item.createdAt || item.clientAt);
  }
}

async function loadSummaryOperations(now = new Date()) {
  const refs = DAILY_SUMMARY_OFFSETS.map(offset => {
    const range = kstDayRange(now, offset);
    return { range, ref: db.collection('incidentMailState').doc(`summary_${safeKey(range.dateKey)}`) };
  });
  const snapshots = await Promise.all(refs.map(item => item.ref.get()));
  const items = snapshots.map((snapshot, index) => {
    const data = snapshot.data() || {};
    return {
      dateKey: refs[index].range.dateKey,
      status: cleanText(data.status || 'missing', 40),
      reason: cleanText(data.reason || '', 80),
      message: cleanText(data.message || '', 240),
      checkedAt: timestampMillis(data.checkedAt || data.reservedAt),
      count: Math.max(0, Number(data.count || 0)),
      truncated: data.truncated === true
    };
  });
  const failed = items.filter(item => item.status === 'failed').length;
  const locked = items.filter(item => item.status === 'reserved' && item.checkedAt && now.getTime() - item.checkedAt > DELIVERY_LEASE_MS).length;
  const lastEmailedAt = Math.max(0, ...items.filter(item => item.status === 'emailed').map(item => item.checkedAt));
  return { items, failed, locked, lastEmailedAt };
}

async function reserveOperationsAudit(now = Date.now()) {
  const stateRef = db.collection('incidentOperations').doc(OPERATIONS_HEALTH_DOC_ID);
  const leaseId = createDeliveryLeaseId();
  const result = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(stateRef);
    const previous = snapshot.data() || {};
    const leaseUntil = timestampMillis(previous.auditLeaseUntil);
    if (previous.auditLeaseId && leaseUntil > now) return { allowed: false, reason: 'audit-locked' };
    transaction.set(stateRef, {
      auditLeaseId: leaseId,
      auditLeaseUntil: Timestamp.fromMillis(now + OPERATIONS_AUDIT_LEASE_MS),
      auditStartedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now + OPERATIONS_STATE_TTL_DAYS * 86400000)
    }, { merge: true });
    return { allowed: true, previous };
  });
  return { ...result, stateRef, leaseId };
}

function previousSmtpState(previous = {}) {
  const smtp = previous.smtp || {};
  return {
    status: cleanText(smtp.status || 'unknown', 20),
    reason: cleanText(smtp.reason || '', 80),
    code: cleanText(smtp.code || '', 80),
    message: cleanText(smtp.message || '', 500),
    checkedAt: timestampMillis(smtp.checkedAt)
  };
}

async function inspectSmtpHealth(previous = {}, degraded = false, now = Date.now()) {
  const cached = previousSmtpState(previous);
  const interval = cached.status === 'ok' && !degraded
    ? SMTP_HEALTHY_CHECK_INTERVAL_MS
    : SMTP_DEGRADED_CHECK_INTERVAL_MS;
  if (cached.checkedAt && now - cached.checkedAt < interval) return { ...cached, cached: true };
  let transport;
  try {
    transport = createTransport();
    const verified = await transport.verify();
    if (verified !== true) {
      const error = new Error('SMTP verification did not confirm readiness.');
      error.code = 'FOXBEAR_SMTP_VERIFY_FALSE';
      throw error;
    }
    return { status: 'ok', reason: '', code: '', message: '', checkedAt: now, cached: false };
  } catch (error) {
    const classified = classifySmtpError(error);
    return { status: 'error', ...classified, checkedAt: now, cached: false };
  } finally {
    try { transport?.close?.(); } catch (error) { /* no-op */ }
  }
}

function evaluateOperationsHealth(snapshot = {}) {
  const reasons = [];
  const queue = snapshot.queue || {};
  const smtp = snapshot.smtp || {};
  const summaries = snapshot.summaries || {};
  const quota = snapshot.quota || {};
  if (smtp.status !== 'ok') {
    reasons.push({ code: smtp.reason || 'smtp-unknown', severity: 'critical', message: `SMTP/Secret 점검 실패: ${smtp.message || smtp.reason || '상태 미확인'}` });
  }
  if (snapshot.channels?.webhook?.status === 'error') {
    reasons.push({ code: 'webhook-config-invalid', severity: 'warning', message: `보조 웹훅 설정 오류: ${snapshot.channels.webhook.reason || '허용되지 않은 주소'}` });
  } else if (snapshot.channels?.webhook?.primaryStatus === 'error' && snapshot.channels?.webhook?.fallbackStatus === 'ready') {
    reasons.push({ code: 'webhook-primary-failed', severity: 'warning', message: '기본 웹훅 설정이 실패해 보조 웹훅만 사용 가능한 상태입니다.' });
  }
  if (Number(queue.stale || 0) > 0) {
    reasons.push({
      code: 'long-undelivered',
      severity: Number(queue.stale || 0) >= STALE_CRITICAL_COUNT ? 'critical' : 'warning',
      message: `장기 미발송 신고 ${Number(queue.stale || 0)}건이 자동 처리 시각을 넘겼습니다.`
    });
  }
  if (Number(queue.deadLetter || 0) > 0) {
    reasons.push({
      code: 'dead-letter-present',
      severity: Number(queue.deadLetter || 0) >= DEAD_LETTER_CRITICAL_COUNT ? 'critical' : 'warning',
      message: `최종 실패 메일 ${Number(queue.deadLetter || 0)}건이 관리자 확인을 기다립니다.`
    });
  }
  if (Number(summaries.failed || 0) > 0 || Number(summaries.locked || 0) > 0) {
    reasons.push({
      code: 'summary-delivery-degraded',
      severity: Number(summaries.failed || 0) >= 2 || Number(summaries.locked || 0) > 0 ? 'critical' : 'warning',
      message: `최근 일일 요약 실패 ${Number(summaries.failed || 0)}건, 잠금 정체 ${Number(summaries.locked || 0)}건입니다.`
    });
  }
  if (Number(quota.reservationLeak || 0) > 0) {
    reasons.push({ code: 'quota-reservation-leak', severity: 'warning', message: `일일 발송 예약 ${Number(quota.reservationLeak || 0)}건이 임대 시간을 넘겼습니다.` });
  }
  const enrichedReasons = reasons.map(item => ({ ...item, recommendedAction: recommendedActionForIssue(item.code) }));
  const status = enrichedReasons.some(item => item.severity === 'critical')
    ? 'critical'
    : enrichedReasons.length ? 'warning' : 'healthy';
  const signature = safeKey(`${status}_${enrichedReasons.map(item => item.code).sort().join('_') || 'ok'}`, status);
  return { ...snapshot, status, signature, reasons: enrichedReasons };
}

async function collectOperationsHealth(previous = {}, now = Date.now()) {
  const statuses = ['pending', 'failed', 'sending', 'retrying', 'dead-letter', 'emailed', 'suppressed-rate-limit'];
  const [counts, staleCounts, summaries, lastIncidentSentAt, legacyDueReports] = await Promise.all([
    Promise.all(statuses.map(countIncidentStatus)),
    Promise.all([
      countIncidentStatusBefore('pending', 'createdAt', now - STALE_PENDING_MS),
      countIncidentStatusBefore('failed', 'delivery.nextRetryAt', now - STALE_OVERDUE_MS),
      countIncidentStatusBefore('sending', 'delivery.leaseUntil', now - STALE_OVERDUE_MS),
      countIncidentStatusBefore('retrying', 'delivery.leaseUntil', now - STALE_OVERDUE_MS)
    ]),
    loadSummaryOperations(new Date(now)),
    loadLatestEmailedAt(),
    collectDueIncidentReports(now)
  ]);
  const countByStatus = Object.fromEntries(statuses.map((status, index) => [status, counts[index]]));
  const legacyMissingCount = legacyDueReports.filter(snapshot => {
    const data = snapshot.data() || {};
    const delivery = data.delivery || {};
    const status = cleanText(delivery.status || 'pending', 40);
    if (!isLongUndelivered(data, now)) return false;
    if (status === 'pending') return !timestampMillis(data.createdAt);
    if (status === 'failed') return !timestampMillis(delivery.nextRetryAt);
    if (status === 'sending' || status === 'retrying') return !timestampMillis(delivery.leaseUntil);
    return false;
  }).length;
  const staleCount = staleCounts.reduce((total, value) => total + Math.max(0, Number(value || 0)), 0)
    + countByStatus['suppressed-rate-limit']
    + legacyMissingCount;
  const dayKey = kstDateKey(new Date(now));
  const dailySnapshot = await db.collection('incidentMailState').doc(`dailyKst_${dayKey}`).get();
  const daily = dailySnapshot.data() || {};
  const reserved = Math.max(0, Number(daily.reservedCount || 0));
  const lastReservedAt = timestampMillis(daily.lastReservedAt);
  const reservationLeak = reserved > 0 && (!lastReservedAt || lastReservedAt <= now - (DELIVERY_LEASE_MS + STALE_OVERDUE_MS)) ? reserved : 0;
  const degradedQueue = staleCount > 0 || countByStatus['dead-letter'] > 0 || summaries.failed > 0 || summaries.locked > 0 || reservationLeak > 0;
  const smtp = await inspectSmtpHealth(previous, degradedQueue, now);
  return evaluateOperationsHealth({
    checkedAt: now,
    queue: {
      pending: countByStatus.pending,
      failed: countByStatus.failed,
      sending: countByStatus.sending,
      retrying: countByStatus.retrying,
      deadLetter: countByStatus['dead-letter'],
      emailed: countByStatus.emailed,
      rateLimitedLegacy: countByStatus['suppressed-rate-limit'],
      stale: staleCount,
      staleSampleCapped: false,
      oldestStaleAt: 0
    },
    quota: {
      dateKey: dayKey,
      sent: Math.max(0, Number(daily.sentCount || 0)),
      reserved,
      limit: DAILY_EMAIL_LIMIT,
      reservationLeak
    },
    summaries,
    smtp,
    channels: { webhook: publicWebhookConfig(inspectOperationsWebhookChannels()) },
    lastIncidentSentAt
  });
}

function shouldSendOperationsAlert(health = {}, previous = {}, now = Date.now()) {
  const previousStatus = cleanText(previous.status || 'unknown', 20);
  const previousSignature = cleanText(previous.signature || '', 100);
  const lastDispatchAt = timestampMillis(previous.alert?.lastDispatchedAt || previous.alert?.lastSentAt);
  if (health.status === 'healthy') {
    return ['warning', 'critical'].includes(previousStatus) ? { send: true, kind: 'recovery' } : { send: false, reason: 'healthy' };
  }
  if (health.smtp?.status !== 'ok' && health.channels?.webhook?.status !== 'ready') return { send: false, reason: 'smtp-unavailable' };
  if (health.signature !== previousSignature) return { send: true, kind: 'alert' };
  if (!lastDispatchAt || now - lastDispatchAt >= OPERATIONS_ALERT_COOLDOWN_MS) return { send: true, kind: 'alert' };
  return { send: false, reason: 'cooldown' };
}

async function sendOperationsAlert(health, previous, decision, now = Date.now()) {
  if (!decision.send) return { status: 'skipped', reason: decision.reason || 'not-required', channels: {} };
  const mail = buildOperationsAlertMail(health, previous, decision.kind);
  let smtp = { status: 'skipped', reason: 'smtp-unavailable' };
  if (health.smtp?.status === 'ok') {
    try {
      const info = await createTransport().sendMail({
        from: mailFromHeader(),
        to: ALERT_RECIPIENT,
        messageId: operationAlertMessageId(decision.kind, health.signature, now),
        headers: { 'X-FoxBear-Operations-Status': health.status, 'X-FoxBear-Operations-Signature': health.signature, 'X-AI-Mastering-Mail-Type': 'operations' },
        subject: mail.subject,
        text: mail.text,
        html: mail.html
      });
      smtp = {
        status: 'emailed',
        reason: '',
        messageId: cleanText(info.messageId || '', 240),
        acceptedCount: assertSmtpAccepted(info),
        response: cleanText(info.response || '', 300)
      };
    } catch (error) {
      smtp = { status: 'failed', ...classifySmtpError(error) };
    }
  }
  const webhookHealth = smtp.status === 'failed'
    ? evaluateOperationsHealth({ ...health, smtp: { ...smtp, status: 'error', checkedAt: now, cached: false } })
    : health;
  const webhook = await sendOperationsWebhook(webhookHealth, previous, decision.kind);
  const delivered = smtp.status === 'emailed' || webhook.status === 'delivered';
  const attempted = smtp.status === 'failed' || webhook.status === 'failed';
  return {
    status: delivered ? 'delivered' : attempted ? 'failed' : 'recorded',
    kind: decision.kind,
    reason: delivered ? '' : attempted ? 'all-external-channels-failed' : 'firestore-only',
    channels: { smtp, webhook },
    sentAt: delivered ? now : 0,
    dispatchedAt: now
  };
}

async function finalizeOperationsAudit(reservation, health, alert, now = Date.now()) {
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(reservation.stateRef);
    const current = snapshot.data() || {};
    if (cleanText(current.auditLeaseId || '', 80) !== reservation.leaseId) return { status: 'stale-completion' };
    const smtp = health.smtp || {};
    const summaries = health.summaries || {};
    const queue = health.queue || {};
    const quota = health.quota || {};
    const patch = {
      schemaVersion: OPERATIONS_SCHEMA_VERSION,
      productVersion: PRODUCT_VERSION,
      status: health.status,
      signature: health.signature,
      reasons: health.reasons || [],
      queue: {
        ...queue,
        oldestStaleAt: queue.oldestStaleAt ? Timestamp.fromMillis(queue.oldestStaleAt) : null
      },
      quota,
      summaries: {
        failed: Math.max(0, Number(summaries.failed || 0)),
        locked: Math.max(0, Number(summaries.locked || 0)),
        lastEmailedAt: summaries.lastEmailedAt ? Timestamp.fromMillis(summaries.lastEmailedAt) : null,
        items: Array.isArray(summaries.items) ? summaries.items.slice(0, 3).map(item => ({
          ...item,
          checkedAt: item.checkedAt ? Timestamp.fromMillis(item.checkedAt) : null
        })) : []
      },
      smtp: {
        status: smtp.status || 'unknown',
        reason: smtp.reason || '',
        code: smtp.code || '',
        message: smtp.message || '',
        checkedAt: smtp.checkedAt ? Timestamp.fromMillis(smtp.checkedAt) : null,
        cached: smtp.cached === true
      },
      channels: {
        webhook: publicWebhookConfig(health.channels?.webhook || {})
      },
      lastIncidentSentAt: health.lastIncidentSentAt ? Timestamp.fromMillis(health.lastIncidentSentAt) : null,
      checkedAt: FieldValue.serverTimestamp(),
      auditLeaseId: '',
      auditLeaseUntil: null,
      expiresAt: Timestamp.fromMillis(now + OPERATIONS_STATE_TTL_DAYS * 86400000)
    };
    const previousAlert = current.alert || {};
    const previousAlertChannels = previousAlert.channels || {};
    const alertChannels = alert?.channels || {};
    patch.alert = {
      status: cleanText(alert?.status || 'skipped', 20),
      kind: cleanText(alert?.kind || previousAlert.kind || '', 20),
      signature: alert?.kind ? health.signature : cleanText(previousAlert.signature || '', 100),
      reason: cleanText(alert?.reason || '', 100),
      channels: {
        smtp: {
          status: cleanText(alertChannels.smtp?.status || previousAlertChannels.smtp?.status || '', 20),
          reason: cleanText(alertChannels.smtp?.reason || previousAlertChannels.smtp?.reason || '', 100),
          messageId: cleanText(alertChannels.smtp?.messageId || previousAlertChannels.smtp?.messageId || '', 240),
          acceptedCount: Math.max(0, Number(alertChannels.smtp?.acceptedCount || previousAlertChannels.smtp?.acceptedCount || 0))
        },
        webhook: {
          status: cleanText(alertChannels.webhook?.status || previousAlertChannels.webhook?.status || '', 20),
          provider: cleanText(alertChannels.webhook?.provider || previousAlertChannels.webhook?.provider || '', 40),
          reason: cleanText(alertChannels.webhook?.reason || previousAlertChannels.webhook?.reason || '', 100),
          statusCode: Math.max(0, Number(alertChannels.webhook?.statusCode || previousAlertChannels.webhook?.statusCode || 0)),
          channel: cleanText(alertChannels.webhook?.channel || previousAlertChannels.webhook?.channel || '', 20),
          attempts: Math.max(0, Number(alertChannels.webhook?.attempts || previousAlertChannels.webhook?.attempts || 0)),
          failover: alertChannels.webhook?.failover === true
        }
      },
      lastDispatchedAt: alert?.dispatchedAt ? Timestamp.fromMillis(alert.dispatchedAt) : previousAlert.lastDispatchedAt || null,
      lastSentAt: alert?.sentAt ? Timestamp.fromMillis(alert.sentAt) : previousAlert.lastSentAt || null,
      lastCheckedAt: FieldValue.serverTimestamp()
    };
    transaction.set(reservation.stateRef, patch, { merge: true });
    return { status: health.status };
  });
}

async function auditIncidentMailOperations() {
  const now = Date.now();
  const reservation = await reserveOperationsAudit(now);
  if (!reservation.allowed) return { ok: false, skipped: true, reason: reservation.reason };
  let health;
  let alert;
  try {
    health = await collectOperationsHealth(reservation.previous || {}, now);
    const decision = shouldSendOperationsAlert(health, reservation.previous || {}, now);
    alert = await sendOperationsAlert(health, reservation.previous || {}, decision, now);
    if (alert.channels?.smtp?.status === 'failed') {
      health = evaluateOperationsHealth({
        ...health,
        smtp: { ...alert.channels.smtp, status: 'error', checkedAt: now, cached: false }
      });
      console.error('FoxBear operations SMTP alert delivery failed', { reason: alert.channels.smtp.reason, error: alert.channels.smtp.message });
    }
    const result = await finalizeOperationsAudit(reservation, health, alert, now);
    await recordOperationsTelemetry(health, alert, now).catch(error => {
      console.error('FoxBear operations telemetry write failed', { error: cleanText(error?.message || error, 300) });
    });
    return { ok: result.status === 'healthy', status: result.status, alertStatus: alert?.status || 'skipped' };
  } catch (error) {
    const classified = {
      reason: 'operations-audit-failed',
      code: cleanText(error?.code || error?.name || 'operations-audit-error', 80),
      message: cleanText(error?.message || error, 500)
    };
    const fallback = evaluateOperationsHealth({
      checkedAt: now,
      queue: {}, quota: {}, summaries: {},
      smtp: { status: 'error', ...classified, checkedAt: now, cached: false },
      lastIncidentSentAt: 0
    });
    const fallbackAlert = { status: 'failed', reason: 'audit-failed', channels: {}, dispatchedAt: now };
    await finalizeOperationsAudit(reservation, fallback, fallbackAlert, now).catch(() => {});
    await recordOperationsTelemetry(fallback, fallbackAlert, now).catch(() => {});
    console.error('FoxBear operations audit failed', { error: cleanText(error?.message || error, 300) });
    return { ok: false, status: 'critical', reason: classified.reason };
  }
}

async function reserveDelivery(reportRef, options = {}) {
  const now = Date.now();
  const reportId = reportRef.id;
  return db.runTransaction(async transaction => {
    const reportSnapshot = await transaction.get(reportRef);
    if (!reportSnapshot.exists) return { allowed: false, reason: 'missing' };
    const data = reportSnapshot.data() || {};
    const delivery = data.delivery || {};
    const storedAttemptCount = Math.max(0, Number(delivery.attemptCount || 0));
    const forceTerminal = options.manual === true && options.forceTerminal === true;
    if (delivery.status === 'emailed') return { allowed: false, reason: 'already-emailed' };
    if ((storedAttemptCount >= MAX_DELIVERY_ATTEMPTS || delivery.terminal === true || delivery.status === 'dead-letter') && !forceTerminal) {
      return { allowed: false, reason: 'attempt-limit' };
    }
    const attemptCount = forceTerminal ? 0 : storedAttemptCount;
    const leaseUntil = timestampMillis(delivery.leaseUntil);
    if (['sending', 'retrying'].includes(delivery.status) && leaseUntil > now) return { allowed: false, reason: 'delivery-locked' };
    const nextRetryAt = timestampMillis(delivery.nextRetryAt);
    if (options.retry && !options.manual && nextRetryAt && nextRetryAt > now) return { allowed: false, reason: 'retry-not-due' };

    const dayKey = kstDateKey(new Date(now));
    const fingerprintRef = db.collection('incidentMailState').doc(`fingerprint_${safeKey(data.fingerprint)}`);
    const dailyRef = db.collection('incidentMailState').doc(`dailyKst_${dayKey}`);
    const previousReservationActive = delivery.reservationActive === true;
    const previousReservationDayKey = cleanText(delivery.reservationDayKey || '', 10);
    const previousDailyRef = previousReservationActive && previousReservationDayKey
      ? db.collection('incidentMailState').doc(`dailyKst_${safeKey(previousReservationDayKey, dayKey)}`)
      : null;
    const readRefs = [fingerprintRef, dailyRef];
    const previousDailyIsCurrent = previousDailyRef?.path === dailyRef.path;
    if (previousDailyRef && !previousDailyIsCurrent) readRefs.push(previousDailyRef);
    const snapshots = await Promise.all(readRefs.map(ref => transaction.get(ref)));
    const fingerprintSnapshot = snapshots[0];
    const dailySnapshot = snapshots[1];
    const previousDailySnapshot = previousDailyIsCurrent ? dailySnapshot : (previousDailyRef ? snapshots[2] : null);
    const fingerprintState = fingerprintSnapshot.data() || {};
    const dailyState = dailySnapshot.data() || {};
    const previousDailyState = previousDailySnapshot?.data() || {};
    const lastSentAt = timestampMillis(fingerprintState.lastSentAt);
    const reservedAt = timestampMillis(fingerprintState.reservedAt);
    const reservationId = cleanText(fingerprintState.reservationId || '', 180);
    const manualTest = data.category === 'manual-test' && data.automatic === false;
    const manualDelivery = options.manual === true;
    const reuseExistingDailyReservation = previousReservationActive && previousReservationDayKey === dayKey
      && Math.max(0, Number(dailyState.reservedCount || 0)) > 0;

    const releasePreviousDailyReservation = () => {
      if (!previousReservationActive || !previousDailyRef) return;
      const previousReservedCount = Math.max(0, Number(previousDailyState.reservedCount || 0));
      if (!previousReservedCount) return;
      transaction.set(previousDailyRef, {
        dateKey: previousReservationDayKey,
        reservedCount: previousReservedCount - 1,
        reconciledAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(now + STATE_TTL_DAYS * 86400000)
      }, { merge: true });
    };
    const clearOwnedFingerprintReservation = () => {
      if (reservationId !== reportId) return;
      transaction.set(fingerprintRef, {
        reservationId: FieldValue.delete(),
        reservedAt: FieldValue.delete(),
        expiresAt: Timestamp.fromMillis(now + STATE_TTL_DAYS * 86400000)
      }, { merge: true });
    };

    if (!manualTest && !manualDelivery && lastSentAt && now - lastSentAt < DUPLICATE_WINDOW_MS) {
      releasePreviousDailyReservation();
      clearOwnedFingerprintReservation();
      transaction.update(reportRef, {
        delivery: {
          ...delivery,
          status: 'suppressed-duplicate', reason: 'fingerprint-cooldown', message: '',
          terminal: false, leaseId: '', leaseUntil: null, nextRetryAt: null,
          reservationActive: false, reservationDayKey: '', checkedAt: FieldValue.serverTimestamp()
        },
        expiresAt: Timestamp.fromMillis(now + REPORT_TTL_DAYS * 86400000)
      });
      return { allowed: false, reason: 'duplicate' };
    }
    if (!manualDelivery && reservedAt && now - reservedAt < RESERVATION_WINDOW_MS && reservationId && reservationId !== reportId) {
      return { allowed: false, reason: 'fingerprint-locked' };
    }

    const sentCount = Math.max(0, Number(dailyState.sentCount || 0));
    const reservedCount = Math.max(0, Number(dailyState.reservedCount || 0));
    const otherReservedCount = Math.max(0, reservedCount - (reuseExistingDailyReservation ? 1 : 0));
    if (sentCount + otherReservedCount >= DAILY_EMAIL_LIMIT) {
      releasePreviousDailyReservation();
      clearOwnedFingerprintReservation();
      transaction.update(reportRef, {
        delivery: {
          ...delivery,
          status: 'failed',
          reason: 'daily-email-limit',
          message: 'KST 일일 발송 한도에 도달해 다음 한국 날짜로 자동 연기했습니다.',
          attemptCount,
          terminal: false,
          manualResetCount: Math.max(0, Number(delivery.manualResetCount || 0)) + (forceTerminal ? 1 : 0),
          leaseId: '',
          leaseUntil: null,
          reservationActive: false,
          reservationDayKey: '',
          nextRetryAt: Timestamp.fromMillis(nextKstDayRetryAt(now)),
          checkedAt: FieldValue.serverTimestamp()
        },
        expiresAt: Timestamp.fromMillis(now + REPORT_TTL_DAYS * 86400000)
      });
      return { allowed: false, reason: 'daily-limit', data };
    }

    if (previousReservationActive && !reuseExistingDailyReservation) releasePreviousDailyReservation();
    const leaseId = createDeliveryLeaseId();
    transaction.set(fingerprintRef, {
      reservationId: reportId,
      reservedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now + STATE_TTL_DAYS * 86400000)
    }, { merge: true });
    transaction.set(dailyRef, {
      dateKey: dayKey,
      sentCount,
      reservedCount: reservedCount + (reuseExistingDailyReservation ? 0 : 1),
      lastReservedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now + STATE_TTL_DAYS * 86400000)
    }, { merge: true });
    transaction.update(reportRef, {
      delivery: {
        ...delivery,
        status: options.retry ? 'retrying' : 'sending',
        reason: '',
        message: '',
        attemptCount,
        terminal: false,
        leaseId,
        leaseUntil: Timestamp.fromMillis(now + DELIVERY_LEASE_MS),
        reservationActive: true,
        reservationDayKey: dayKey,
        lastAttemptAt: FieldValue.serverTimestamp(),
        manualResetCount: Math.max(0, Number(delivery.manualResetCount || 0)) + (forceTerminal ? 1 : 0),
        checkedAt: FieldValue.serverTimestamp()
      },
      expiresAt: Timestamp.fromMillis(now + REPORT_TTL_DAYS * 86400000)
    });
    return { allowed: true, data, delivery, attemptCount, leaseId, dayKey, fingerprintRef, dailyRef };
  });
}

async function finalizeDelivery(reportRef, reservation, outcome = {}) {
  const now = Date.now();
  const attemptCount = reservation.attemptCount + 1;
  return db.runTransaction(async transaction => {
    const [reportSnapshot, dailySnapshot, fingerprintSnapshot] = await Promise.all([
      transaction.get(reportRef),
      transaction.get(reservation.dailyRef),
      transaction.get(reservation.fingerprintRef)
    ]);
    const dailyState = dailySnapshot.data() || {};
    const fingerprintState = fingerprintSnapshot.data() || {};
    const reservedCount = Math.max(0, Number(dailyState.reservedCount || 0));
    const sentCount = Math.max(0, Number(dailyState.sentCount || 0));
    const ownsFingerprintReservation = cleanText(fingerprintState.reservationId || '', 180) === reportRef.id;

    if (!reportSnapshot.exists) {
      transaction.set(reservation.dailyRef, {
        dateKey: reservation.dayKey,
        sentCount,
        reservedCount: Math.max(0, reservedCount - 1),
        reconciledAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(now + STATE_TTL_DAYS * 86400000)
      }, { merge: true });
      if (ownsFingerprintReservation) {
        transaction.set(reservation.fingerprintRef, {
          reservationId: FieldValue.delete(), reservedAt: FieldValue.delete(),
          expiresAt: Timestamp.fromMillis(now + STATE_TTL_DAYS * 86400000)
        }, { merge: true });
      }
      return { status: 'missing', attemptCount };
    }

    const currentDelivery = reportSnapshot.data()?.delivery || {};
    if (cleanText(currentDelivery.leaseId || '', 80) !== reservation.leaseId) {
      return { status: 'stale-completion', attemptCount };
    }
    const ownsDailyReservation = currentDelivery.reservationActive === true
      && cleanText(currentDelivery.reservationDayKey || '', 10) === reservation.dayKey;
    transaction.set(reservation.dailyRef, {
      dateKey: reservation.dayKey,
      sentCount: sentCount + (outcome.ok ? 1 : 0),
      reservedCount: Math.max(0, reservedCount - (ownsDailyReservation ? 1 : 0)),
      expiresAt: Timestamp.fromMillis(now + STATE_TTL_DAYS * 86400000)
    }, { merge: true });

    if (outcome.ok) {
      transaction.update(reportRef, {
        delivery: {
          status: 'emailed', reason: '', message: '', attemptCount, terminal: false,
          messageId: cleanText(outcome.messageId || '', 240),
          smtpResponse: cleanText(outcome.response || '', 300),
          acceptedCount: Math.max(0, Number(outcome.acceptedCount || 0)),
          rejectedCount: Math.max(0, Number(outcome.rejectedCount || 0)),
          subject: cleanText(outcome.subject || '', 180),
          senderName: cleanText(outcome.senderName || MAIL_FROM_NAME, 80),
          recipient: cleanText(outcome.recipient || ALERT_RECIPIENT, 180),
          mailType: cleanText(outcome.mailType || 'incident', 40),
          smtpAcceptedAt: Timestamp.fromMillis(now),
          manualResetCount: Math.max(0, Number(currentDelivery.manualResetCount || 0)),
          leaseId: '', leaseUntil: null, nextRetryAt: null,
          reservationActive: false, reservationDayKey: '',
          checkedAt: FieldValue.serverTimestamp()
        },
        expiresAt: Timestamp.fromMillis(now + REPORT_TTL_DAYS * 86400000)
      });
      if (ownsFingerprintReservation) {
        transaction.set(reservation.fingerprintRef, {
          reservationId: FieldValue.delete(), reservedAt: FieldValue.delete(),
          lastSentAt: FieldValue.serverTimestamp(), lastReportId: reportRef.id,
          expiresAt: Timestamp.fromMillis(now + STATE_TTL_DAYS * 86400000)
        }, { merge: true });
      }
      return { status: 'emailed', attemptCount };
    }

    const terminal = attemptCount >= MAX_DELIVERY_ATTEMPTS;
    transaction.update(reportRef, {
      delivery: {
        status: terminal ? 'dead-letter' : 'failed',
        reason: cleanText(outcome.error?.code || outcome.error?.name || 'smtp-error', 80),
        message: cleanText(outcome.error?.message || outcome.error, 500),
        attemptCount,
        terminal,
        nextRetryAt: terminal ? null : Timestamp.fromMillis(now + retryDelayMs(attemptCount)),
        manualResetCount: Math.max(0, Number(currentDelivery.manualResetCount || 0)),
        leaseId: '', leaseUntil: null,
        reservationActive: false, reservationDayKey: '',
        checkedAt: FieldValue.serverTimestamp()
      },
      expiresAt: Timestamp.fromMillis(now + REPORT_TTL_DAYS * 86400000)
    });
    if (ownsFingerprintReservation) {
      transaction.set(reservation.fingerprintRef, {
        reservationId: FieldValue.delete(), reservedAt: FieldValue.delete(),
        lastFailureAt: FieldValue.serverTimestamp(), lastFailureReportId: reportRef.id,
        expiresAt: Timestamp.fromMillis(now + STATE_TTL_DAYS * 86400000)
      }, { merge: true });
    }
    return { status: terminal ? 'dead-letter' : 'failed', attemptCount, terminal };
  });
}

async function processIncidentReport(reportRef, options = {}) {
  let reservation;
  try {
    reservation = await reserveDelivery(reportRef, options);
  } catch (error) {
    console.error('FoxBear incident reservation failed', { reportId: reportRef.id, error: cleanText(error?.message || error, 300) });
    return { ok: false, status: 'pending', reason: cleanText(error?.code || error?.name || 'reservation-error', 80) };
  }
  if (!reservation.allowed) {
    if (reservation.data?.category === 'manual-test') {
      const skippedMail = buildMail(reservation.data, reportRef.id);
      await recordMailTestResult(reportRef.id, reservation.data, { status: reservation.reason === 'daily-limit' ? 'failed' : 'skipped', reason: reservation.reason }, skippedMail, {}).catch(() => {});
    }
    return { ok: false, skipped: true, reason: reservation.reason };
  }
  const mail = buildMail(reservation.data, reportRef.id);
  try {
    const info = await createTransport().sendMail({
      from: mailFromHeader(),
      to: ALERT_RECIPIENT,
      messageId: incidentMessageId(reportRef.id),
      headers: {
        'X-FoxBear-Report-ID': reportRef.id,
        'X-AI-Mastering-Mail-Type': mail.type,
        ...(mail.type === 'manual-test' ? { 'X-AI-Mastering-Test-ID': cleanText(reservation.data.fingerprint || reportRef.id, 100) } : {})
      },
      subject: mail.subject,
      text: mail.text,
      html: mail.html
    });
    const acceptedCount = assertSmtpAccepted(info);
    const outcome = {
      ok: true,
      messageId: info.messageId,
      response: info.response,
      acceptedCount,
      rejectedCount: Array.isArray(info.rejected) ? info.rejected.length : 0,
      subject: mail.subject,
      senderName: MAIL_FROM_NAME,
      recipient: ALERT_RECIPIENT,
      mailType: mail.type
    };
    const result = await finalizeDelivery(reportRef, reservation, outcome);
    await recordMailTestResult(reportRef.id, reservation.data, result, mail, outcome).catch(error => console.error('FoxBear mail test history write failed', cleanText(error?.message || error, 240)));
    return { ok: result.status === 'emailed', ...result };
  } catch (error) {
    const outcome = { ok: false, error };
    const result = await finalizeDelivery(reportRef, reservation, outcome);
    await recordMailTestResult(reportRef.id, reservation.data, result, mail, outcome).catch(historyError => console.error('FoxBear mail test failure history write failed', cleanText(historyError?.message || historyError, 240)));
    console.error('FoxBear incident email failed', { reportId: reportRef.id, attemptCount: result.attemptCount, status: result.status, error: cleanText(error?.message || error, 300) });
    return { ok: false, ...result };
  }
}

async function recordMailTestResult(reportId, data = {}, result = {}, mail = {}, outcome = {}) {
  if (cleanText(data.category || '', 40) !== 'manual-test') return;
  const now = Date.now();
  const status = cleanText(result.status || (outcome.ok ? 'emailed' : 'failed'), 40);
  const payload = {
    schemaVersion: 1,
    productVersion: PRODUCT_VERSION,
    reportId: cleanText(reportId, 180),
    testId: cleanText(data.fingerprint || reportId, 100),
    status,
    reason: cleanText(result.reason || outcome.error?.code || outcome.error?.name || '', 100),
    message: cleanText(outcome.error?.message || '', 300),
    subject: cleanText(mail.subject || '', 180),
    senderName: MAIL_FROM_NAME,
    recipient: ALERT_RECIPIENT,
    messageId: cleanText(outcome.messageId || '', 240),
    acceptedCount: Math.max(0, Number(outcome.acceptedCount || 0)),
    rejectedCount: Math.max(0, Number(outcome.rejectedCount || 0)),
    smtpAcceptedAt: status === 'emailed' ? Timestamp.fromMillis(now) : null,
    checkedAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + MAIL_TEST_HISTORY_TTL_DAYS * 86400000)
  };
  await db.collection(MAIL_TEST_HISTORY_COLLECTION).doc(safeKey(reportId, `test_${now}`)).set(payload, { merge: true });
  const verificationPatch = {
    schemaVersion: 1,
    productVersion: PRODUCT_VERSION,
    status: status === 'emailed' ? 'smtp-accepted' : status,
    lastTestReportId: payload.reportId,
    lastTestStatus: status,
    lastTestReason: payload.reason,
    lastTestSubject: payload.subject,
    lastTestMessageId: payload.messageId,
    lastTestAt: Timestamp.fromMillis(now),
    warningAfter: Timestamp.fromMillis(now + MAIL_TEST_WARNING_AFTER_MS),
    checkedAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + OPERATIONS_STATE_TTL_DAYS * 86400000)
  };
  if (status === 'emailed') verificationPatch.lastSmtpAcceptedAt = Timestamp.fromMillis(now);
  await db.collection('incidentOperations').doc(MAIL_VERIFICATION_DOC_ID).set(verificationPatch, { merge: true });
}

async function confirmMailReceipt(reportId, uid, location = 'inbox') {
  const safeReportId = cleanText(reportId, 180);
  const safeLocation = location === 'spam' ? 'spam' : 'inbox';
  const reportRef = db.collection('incidentReports').doc(safeReportId);
  const reportSnapshot = await reportRef.get();
  if (!reportSnapshot.exists) return { ok: false, reason: 'report-not-found' };
  const report = reportSnapshot.data() || {};
  const delivery = report.delivery || {};
  if (report.category !== 'manual-test') return { ok: false, reason: 'not-manual-test' };
  if (delivery.status !== 'emailed') return { ok: false, reason: 'smtp-not-accepted' };
  const now = Date.now();
  const confirmation = {
    receiptConfirmed: true,
    receiptLocation: safeLocation,
    receiptConfirmedBy: cleanText(uid, 128),
    receiptConfirmedAt: Timestamp.fromMillis(now),
    checkedAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + MAIL_TEST_HISTORY_TTL_DAYS * 86400000)
  };
  await db.collection(MAIL_TEST_HISTORY_COLLECTION).doc(safeKey(safeReportId)).set(confirmation, { merge: true });
  await db.collection('incidentOperations').doc(MAIL_VERIFICATION_DOC_ID).set({
    schemaVersion: 1,
    productVersion: PRODUCT_VERSION,
    status: 'confirmed',
    lastConfirmedReportId: safeReportId,
    lastConfirmedLocation: safeLocation,
    lastConfirmedBy: cleanText(uid, 128),
    lastConfirmedAt: Timestamp.fromMillis(now),
    lastConfirmedSubject: cleanText(delivery.subject || '', 180),
    lastConfirmedMessageId: cleanText(delivery.messageId || '', 240),
    warningAfter: Timestamp.fromMillis(now + MAIL_TEST_WARNING_AFTER_MS),
    checkedAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + OPERATIONS_STATE_TTL_DAYS * 86400000)
  }, { merge: true });
  return { ok: true, status: 'confirmed', location: safeLocation, reportId: safeReportId };
}

async function collectDeadLetterReports(limitCount = INCIDENT_BATCH_RECOVERY_LIMIT) {
  const reports = db.collection('incidentReports');
  try {
    const snapshot = await reports.where('delivery.status', '==', 'dead-letter').orderBy('delivery.checkedAt', 'asc').limit(limitCount).get();
    return snapshot.docs;
  } catch (error) {
    console.warn('FoxBear dead-letter recovery index fallback', { error: cleanText(error?.message || error, 220) });
    return (await reports.where('delivery.status', '==', 'dead-letter').limit(limitCount).get()).docs;
  }
}

async function writeRecoveryRun(result = {}, now = Date.now()) {
  await db.collection('incidentOperations').doc('recovery').set({
    schemaVersion: 1,
    source: cleanText(result.source || 'unknown', 40),
    mode: cleanText(result.mode || 'recoverable', 40),
    requested: Math.max(0, Number(result.requested || 0)),
    attempted: Math.max(0, Number(result.attempted || 0)),
    emailed: Math.max(0, Number(result.emailed || 0)),
    failed: Math.max(0, Number(result.failed || 0)),
    deadLetter: Math.max(0, Number(result.deadLetter || 0)),
    skipped: Math.max(0, Number(result.skipped || 0)),
    durationMs: Math.max(0, Number(result.durationMs || 0)),
    checkedAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + OPERATIONS_STATE_TTL_DAYS * 86400000)
  }, { merge: true });
}

async function runIncidentRecoveryBatch(options = {}) {
  const startedAt = Date.now();
  const mode = options.mode === 'dead-letter' ? 'dead-letter' : 'recoverable';
  const source = cleanText(options.source || 'scheduled', 40);
  const maxItems = Math.min(Math.max(Number(options.limit || INCIDENT_BATCH_RECOVERY_LIMIT), 1), INCIDENT_BATCH_RECOVERY_LIMIT);
  const documents = mode === 'dead-letter'
    ? await collectDeadLetterReports(maxItems)
    : (await collectDueIncidentReports(startedAt)).slice(0, maxItems);
  const totals = { source, mode, requested: documents.length, attempted: 0, emailed: 0, failed: 0, deadLetter: 0, skipped: 0 };
  for (const docSnapshot of documents) {
    totals.attempted += 1;
    const result = await processIncidentReport(docSnapshot.ref, {
      retry: true,
      manual: mode === 'dead-letter',
      forceTerminal: mode === 'dead-letter'
    });
    if (result.ok || result.status === 'emailed') totals.emailed += 1;
    else if (result.status === 'dead-letter') totals.deadLetter += 1;
    else if (result.skipped) totals.skipped += 1;
    else totals.failed += 1;
  }
  totals.durationMs = Date.now() - startedAt;
  await writeRecoveryRun(totals, Date.now());
  return totals;
}

exports.sendIncidentEmail = onDocumentCreated({
  document: 'incidentReports/{reportId}', region: REGION,
  secrets: [GMAIL_APP_PASSWORD], retry: false, maxInstances: 3,
  timeoutSeconds: 60, memory: '256MiB'
}, async event => {
  if (!event.data) return;
  await processIncidentReport(event.data.ref, { retry: false });
});

exports.retryFailedIncidentEmails = onSchedule({
  schedule: 'every 15 minutes', timeZone: TIME_ZONE, region: REGION,
  secrets: [GMAIL_APP_PASSWORD], retryCount: 0, maxInstances: 1,
  timeoutSeconds: 300, memory: '256MiB'
}, async () => {
  await runIncidentRecoveryBatch({ mode: 'recoverable', source: 'scheduled', limit: INCIDENT_BATCH_RECOVERY_LIMIT });
});

exports.retryIncidentEmailRequest = onDocumentCreated({
  document: 'incidentRetryRequests/{requestId}', region: REGION,
  secrets: [GMAIL_APP_PASSWORD], retry: false, maxInstances: 2,
  timeoutSeconds: 90, memory: '256MiB'
}, async event => {
  const snapshot = event.data;
  if (!snapshot) return;
  const request = snapshot.data() || {};
  const requestRef = snapshot.ref;
  const uid = cleanText(request.uid || '', 128);
  const reportId = cleanText(request.reportId || '', 180);
  const forceTerminal = request.forceTerminal === true;
  const admin = await getActiveAdmin(uid);
  if (!admin.active) {
    await requestRef.set({ status: 'rejected', reason: 'admin-required', checkedAt: FieldValue.serverTimestamp() }, { merge: true });
    await writeAdminAuditEvent({ uid, action: 'admin-request', requestId: snapshot.id, status: 'rejected', reason: 'admin-required' });
    return;
  }
  const claim = await claimAdminAction(uid, 'incident-retry', { cooldownMs: ADMIN_RETRY_COOLDOWN_MS, leaseMs: 2 * 60 * 1000, requestId: snapshot.id, targetType: 'incident-report', targetId: reportId });
  if (!claim.allowed) {
    await requestRef.set({ status: 'rejected', reason: claim.reason, retryAfterSeconds: claim.retryAfterSeconds || 0, checkedAt: FieldValue.serverTimestamp() }, { merge: true });
    return;
  }
  try {
    const reportRef = db.collection('incidentReports').doc(reportId);
    const result = await processIncidentReport(reportRef, { retry: true, manual: true, forceTerminal });
    const status = result.ok ? 'emailed' : result.status === 'dead-letter' ? 'dead-letter' : result.skipped ? 'skipped' : 'failed';
    await requestRef.set({
      status,
      reason: cleanText(result.reason || result.status || '', 100),
      checkedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + STATE_TTL_DAYS * 86400000)
    }, { merge: true });
    await finishAdminAction(claim, status, { reason: result.reason || result.status || '' });
  } catch (error) {
    await finishAdminAction(claim, 'failed', { reason: error?.code || error?.name, message: error?.message || error });
    throw error;
  }
});

exports.retryIncidentBatchRequest = onDocumentCreated({
  document: 'incidentBatchRecoveryRequests/{requestId}', region: REGION,
  secrets: [GMAIL_APP_PASSWORD], retry: false, maxInstances: 1,
  timeoutSeconds: 300, memory: '256MiB'
}, async event => {
  const snapshot = event.data;
  if (!snapshot) return;
  const request = snapshot.data() || {};
  const requestRef = snapshot.ref;
  const uid = cleanText(request.uid || '', 128);
  const mode = request.mode === 'dead-letter' ? 'dead-letter' : 'recoverable';
  const admin = await getActiveAdmin(uid);
  if (!admin.active) {
    await requestRef.set({ status: 'rejected', reason: 'admin-required', checkedAt: FieldValue.serverTimestamp() }, { merge: true });
    await writeAdminAuditEvent({ uid, action: 'admin-request', requestId: snapshot.id, status: 'rejected', reason: 'admin-required' });
    return;
  }
  const claim = await claimAdminAction(uid, `batch-${mode}`, { cooldownMs: ADMIN_BATCH_COOLDOWN_MS, leaseMs: 6 * 60 * 1000, requestId: snapshot.id, targetType: 'incident-batch', targetId: mode });
  if (!claim.allowed) {
    await requestRef.set({ status: 'rejected', reason: claim.reason, retryAfterSeconds: claim.retryAfterSeconds || 0, checkedAt: FieldValue.serverTimestamp() }, { merge: true });
    return;
  }
  await requestRef.set({ status: 'running', reason: '', startedAt: FieldValue.serverTimestamp() }, { merge: true });
  try {
    const result = await runIncidentRecoveryBatch({ mode, source: 'admin-batch', limit: INCIDENT_BATCH_RECOVERY_LIMIT });
    await requestRef.set({
      status: 'completed',
      reason: '',
      result,
      checkedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + STATE_TTL_DAYS * 86400000)
    }, { merge: true });
    await finishAdminAction(claim, 'completed', { result: { attempted: result.attempted, succeeded: result.emailed, failed: result.failed + result.deadLetter, skipped: result.skipped } });
  } catch (error) {
    await requestRef.set({
      status: 'failed',
      reason: cleanText(error?.code || error?.name || 'batch-recovery-failed', 100),
      message: cleanText(error?.message || error, 300),
      checkedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + STATE_TTL_DAYS * 86400000)
    }, { merge: true });
    await finishAdminAction(claim, 'failed', { reason: error?.code || error?.name, message: error?.message || error });
    throw error;
  }
});


exports.testIncidentAlertChannelRequest = onDocumentCreated({
  document: 'incidentAlertTestRequests/{requestId}', region: REGION,
  secrets: [GMAIL_APP_PASSWORD], retry: false, maxInstances: 1,
  timeoutSeconds: 120, memory: '256MiB'
}, async event => {
  const snapshot = event.data;
  if (!snapshot) return;
  const request = snapshot.data() || {};
  const requestRef = snapshot.ref;
  const uid = cleanText(request.uid || '', 128);
  const admin = await getActiveAdmin(uid);
  if (!admin.active) {
    await requestRef.set({ status: 'rejected', reason: 'admin-required', checkedAt: FieldValue.serverTimestamp() }, { merge: true });
    await writeAdminAuditEvent({ uid, action: 'admin-request', requestId: snapshot.id, status: 'rejected', reason: 'admin-required' });
    return;
  }
  const claim = await claimAdminAction(uid, 'alert-channel-test', { cooldownMs: ADMIN_ALERT_TEST_COOLDOWN_MS, leaseMs: 90 * 1000, requestId: snapshot.id, targetType: 'operations-channel', targetId: 'webhook' });
  if (!claim.allowed) {
    await requestRef.set({ status: 'rejected', reason: claim.reason, retryAfterSeconds: claim.retryAfterSeconds || 0, checkedAt: FieldValue.serverTimestamp() }, { merge: true });
    return;
  }
  await requestRef.set({ status: 'running', startedAt: FieldValue.serverTimestamp() }, { merge: true });
  try {
    const config = inspectOperationsWebhookChannels();
    const health = {
      status: 'warning',
      signature: 'manual-alert-channel-test',
      queue: { stale: 0, deadLetter: 0, pending: 0, failed: 0 },
      quota: { sent: 0, reserved: 0, limit: DAILY_EMAIL_LIMIT },
      smtp: { status: 'ok', reason: '' },
      reasons: [{ code: 'manual-test', severity: 'warning', message: '관리자가 보조 경보 채널 테스트를 실행했습니다.' }]
    };
    const result = await sendOperationsWebhook(health, { status: 'healthy' }, 'test');
    const completed = result.status === 'delivered';
    await requestRef.set({
      status: completed ? 'completed' : 'failed',
      reason: cleanText(result.reason || (config.status !== 'ready' ? config.reason : ''), 100),
      provider: cleanText(result.provider || config.provider || '', 40),
      statusCode: Math.max(0, Number(result.statusCode || 0)),
      checkedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + STATE_TTL_DAYS * 86400000)
    }, { merge: true });
    await finishAdminAction(claim, completed ? 'completed' : 'failed', { reason: result.reason || config.reason });
  } catch (error) {
    await requestRef.set({ status: 'failed', reason: cleanText(error?.code || error?.name || 'alert-test-failed', 100), message: cleanText(error?.message || error, 300), checkedAt: FieldValue.serverTimestamp() }, { merge: true });
    await finishAdminAction(claim, 'failed', { reason: error?.code || error?.name, message: error?.message || error });
    throw error;
  }
});


async function probeFirestoreIndexes() {
  const probes = [
    {
      name: 'incident-failed-retry',
      run: () => db.collection('incidentReports').where('delivery.status', '==', 'failed').orderBy('delivery.nextRetryAt', 'asc').limit(1).get()
    },
    {
      name: 'incident-dead-letter-history',
      run: () => db.collection('incidentReports').where('delivery.status', '==', 'dead-letter').orderBy('delivery.checkedAt', 'desc').limit(1).get()
    },
    {
      name: 'operations-status-history',
      run: () => db.collection(OPERATIONS_HISTORY_COLLECTION).where('status', '==', 'warning').orderBy('checkedAt', 'desc').limit(1).get()
    },
    {
      name: 'operations-reason-history',
      run: () => db.collection(OPERATIONS_HISTORY_COLLECTION).where('reasonCodes', 'array-contains', 'dead-letter-present').orderBy('checkedAt', 'desc').limit(1).get()
    }
  ];
  const results = [];
  for (const probe of probes) {
    try {
      await probe.run();
      results.push({ name: probe.name, status: 'ok', reason: '' });
    } catch (error) {
      const message = cleanText(error?.message || error, 300);
      const missing = /index|FAILED_PRECONDITION|requires an index/i.test(`${error?.code || ''} ${message}`);
      results.push({ name: probe.name, status: missing ? 'missing' : 'error', reason: cleanText(error?.code || error?.name || 'query-failed', 100), message });
    }
  }
  return {
    status: results.every(item => item.status === 'ok') ? 'ok' : results.some(item => item.status === 'missing') ? 'missing' : 'error',
    probes: results
  };
}

async function inspectPostDeployHealth(now = Date.now()) {
  const snapshot = await db.collection('incidentOperations').doc(OPERATIONS_HEALTH_DOC_ID).get();
  const data = snapshot.data() || {};
  const checkedAt = timestampMillis(data.checkedAt);
  return {
    operationsStateExists: snapshot.exists,
    operationsStatus: cleanText(data.status || 'unknown', 20),
    checkedAt: checkedAt ? Timestamp.fromMillis(checkedAt) : null,
    stale: !checkedAt || now - checkedAt > 30 * 60 * 1000
  };
}

async function verifyIncidentDeployment(now = Date.now(), expectedVersion = '') {
  const expected = cleanText(expectedVersion || '', 24);
  const webhook = publicWebhookConfig(inspectOperationsWebhookChannels());
  const smtp = await inspectSmtpHealth({}, true, now);
  const indexes = await probeFirestoreIndexes();
  const postDeployHealth = await inspectPostDeployHealth(now);
  const checks = {
    productVersion: PRODUCT_VERSION,
    expectedVersion: expected,
    operationsSchemaVersion: OPERATIONS_SCHEMA_VERSION,
    smtp: { status: smtp.status, reason: smtp.reason || '', checkedAt: Timestamp.fromMillis(smtp.checkedAt || now) },
    webhook,
    batchRecovery: true,
    alertChannelTest: true,
    actionRateLimit: true,
    historyDetail: true,
    adminAuditLog: true,
    historyPagination: true,
    webhookFailover: webhook.failoverReady === true,
    mailReceiptConfirmation: true,
    mailTestHistory: true,
    brandedMailTemplate: true,
    indexes,
    postDeployHealth
  };
  const reasonCodes = [];
  if (expected && expected !== PRODUCT_VERSION) reasonCodes.push('deployment-version-mismatch');
  if (smtp.status !== 'ok') reasonCodes.push(smtp.reason || 'smtp-check-failed');
  if (webhook.status === 'error') reasonCodes.push('webhook-config-invalid');
  if (indexes.status !== 'ok') reasonCodes.push('firestore-index-missing');
  if (postDeployHealth.stale) reasonCodes.push('deployment-check-stale');
  const status = smtp.status !== 'ok' || indexes.status === 'error' ? 'critical' : reasonCodes.length ? 'warning' : 'healthy';
  const result = {
    schemaVersion: 1,
    productVersion: PRODUCT_VERSION,
    operationsSchemaVersion: OPERATIONS_SCHEMA_VERSION,
    status,
    reasonCodes,
    recommendedActions: reasonCodes.map(recommendedActionForIssue),
    checks,
    checkedAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + OPERATIONS_STATE_TTL_DAYS * 86400000)
  };
  await db.collection('incidentOperations').doc('deployment').set(result, { merge: true });
  return result;
}

exports.confirmIncidentMailReceiptRequest = onDocumentCreated({
  document: `${MAIL_RECEIPT_CONFIRMATION_COLLECTION}/{requestId}`, region: REGION,
  retry: false, maxInstances: 1, timeoutSeconds: 60, memory: '256MiB'
}, async event => {
  const snapshot = event.data;
  if (!snapshot) return;
  const request = snapshot.data() || {};
  const uid = cleanText(request.uid || '', 128);
  const admin = await getActiveAdmin(uid);
  if (!admin.active) {
    await snapshot.ref.set({ status: 'rejected', reason: 'admin-required', checkedAt: FieldValue.serverTimestamp() }, { merge: true });
    await writeAdminAuditEvent({ uid, action: 'mail-receipt-confirmation', requestId: snapshot.id, status: 'rejected', reason: 'admin-required' });
    return;
  }
  const result = await confirmMailReceipt(request.reportId, uid, request.location);
  await snapshot.ref.set({
    status: result.ok ? 'completed' : 'rejected',
    reason: cleanText(result.reason || '', 100),
    result,
    checkedAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + STATE_TTL_DAYS * 86400000)
  }, { merge: true });
  await writeAdminAuditEvent({ uid, action: 'mail-receipt-confirmation', requestId: snapshot.id, status: result.ok ? 'completed' : 'rejected', reason: result.reason || '', targetType: 'incident-report', targetId: request.reportId, result: { attempted: 1, succeeded: result.ok ? 1 : 0, failed: result.ok ? 0 : 1 } });
});

exports.verifyIncidentDeploymentRequest = onDocumentCreated({
  document: 'incidentDeploymentVerificationRequests/{requestId}', region: REGION,
  secrets: [GMAIL_APP_PASSWORD], retry: false, maxInstances: 1,
  timeoutSeconds: 90, memory: '256MiB'
}, async event => {
  const snapshot = event.data;
  if (!snapshot) return;
  const request = snapshot.data() || {};
  const requestRef = snapshot.ref;
  const uid = cleanText(request.uid || '', 128);
  const admin = await getActiveAdmin(uid);
  if (!admin.active) {
    await requestRef.set({ status: 'rejected', reason: 'admin-required', checkedAt: FieldValue.serverTimestamp() }, { merge: true });
    await writeAdminAuditEvent({ uid, action: 'admin-request', requestId: snapshot.id, status: 'rejected', reason: 'admin-required' });
    return;
  }
  const claim = await claimAdminAction(uid, 'deployment-verification', { cooldownMs: ADMIN_DEPLOY_VERIFY_COOLDOWN_MS, leaseMs: 2 * 60 * 1000, requestId: snapshot.id, targetType: 'deployment', targetId: cleanText(request.expectedVersion || '', 24) });
  if (!claim.allowed) {
    await requestRef.set({ status: 'rejected', reason: claim.reason, retryAfterSeconds: claim.retryAfterSeconds || 0, checkedAt: FieldValue.serverTimestamp() }, { merge: true });
    return;
  }
  await requestRef.set({ status: 'running', startedAt: FieldValue.serverTimestamp() }, { merge: true });
  try {
    const result = await verifyIncidentDeployment(Date.now(), request.expectedVersion || '');
    await requestRef.set({ status: 'completed', reason: '', result, checkedAt: FieldValue.serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + STATE_TTL_DAYS * 86400000) }, { merge: true });
    await finishAdminAction(claim, 'completed');
  } catch (error) {
    await requestRef.set({ status: 'failed', reason: cleanText(error?.code || error?.name || 'deployment-verification-failed', 100), message: cleanText(error?.message || error, 300), checkedAt: FieldValue.serverTimestamp() }, { merge: true });
    await finishAdminAction(claim, 'failed', { reason: error?.code || error?.name, message: error?.message || error });
    throw error;
  }
});

async function loadDailyIncidentReports(range, maxReports = DAILY_SUMMARY_MAX_REPORTS) {
  const reports = [];
  let cursor = null;
  while (reports.length < maxReports) {
    const batchLimit = Math.min(DAILY_SUMMARY_PAGE_SIZE, maxReports - reports.length);
    let query = db.collection('incidentReports')
      .where('createdAt', '>=', range.start)
      .where('createdAt', '<', range.end)
      .orderBy('createdAt', 'desc')
      .limit(batchLimit);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    for (const item of snapshot.docs) reports.push(item.data() || {});
    if (snapshot.empty || snapshot.size < batchLimit) return { reports, truncated: false };
    cursor = snapshot.docs[snapshot.docs.length - 1];
  }
  let overflowQuery = db.collection('incidentReports')
    .where('createdAt', '>=', range.start)
    .where('createdAt', '<', range.end)
    .orderBy('createdAt', 'desc')
    .startAfter(cursor)
    .limit(1);
  const overflow = await overflowQuery.get();
  return { reports, truncated: !overflow.empty };
}

async function reserveDailySummary(range) {
  const stateRef = db.collection('incidentMailState').doc(`summary_${safeKey(range.dateKey)}`);
  const leaseId = createDeliveryLeaseId();
  const result = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(stateRef);
    const current = snapshot.data() || {};
    if (current.status === 'emailed') return { allowed: false, reason: 'already-emailed' };
    const reservedAt = timestampMillis(current.reservedAt);
    if (current.status === 'reserved' && reservedAt && Date.now() - reservedAt < DELIVERY_LEASE_MS) {
      return { allowed: false, reason: 'summary-locked' };
    }
    transaction.set(stateRef, {
      status: 'reserved',
      dateKey: range.dateKey,
      leaseId,
      reservedAt: FieldValue.serverTimestamp(),
      attemptCount: Math.max(0, Number(current.attemptCount || 0)) + 1,
      reason: '',
      message: '',
      expiresAt: Timestamp.fromMillis(Date.now() + STATE_TTL_DAYS * 86400000)
    }, { merge: true });
    return { allowed: true };
  });
  return { ...result, stateRef, leaseId, range };
}

async function finalizeDailySummary(reservation, patch) {
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(reservation.stateRef);
    const current = snapshot.data() || {};
    if (cleanText(current.leaseId || '', 80) !== reservation.leaseId) return { status: 'stale-completion' };
    transaction.set(reservation.stateRef, {
      ...patch,
      leaseId: '',
      checkedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + STATE_TTL_DAYS * 86400000)
    }, { merge: true });
    return { status: patch.status };
  });
}

async function sendDailySummaryForRange(range) {
  const reservation = await reserveDailySummary(range);
  if (!reservation.allowed) return { ok: false, skipped: true, reason: reservation.reason };
  try {
    const { reports, truncated } = await loadDailyIncidentReports(range);
    const mail = buildDailySummaryMail(reports, range.dateKey, { truncated });
    const info = await createTransport().sendMail({
      from: mailFromHeader(),
      to: ALERT_RECIPIENT,
      messageId: summaryMessageId(range.dateKey),
      headers: { 'X-FoxBear-Summary-Date': range.dateKey, 'X-AI-Mastering-Mail-Type': 'daily-summary' },
      subject: mail.subject,
      text: mail.text,
      html: mail.html
    });
    const acceptedCount = assertSmtpAccepted(info);
    const result = await finalizeDailySummary(reservation, {
      status: 'emailed',
      count: reports.length,
      truncated,
      acceptedCount,
      reason: '',
      message: '',
      messageId: cleanText(info.messageId || '', 240)
    });
    return { ok: result.status === 'emailed', ...result, count: reports.length, truncated };
  } catch (error) {
    const result = await finalizeDailySummary(reservation, {
      status: 'failed',
      reason: cleanText(error?.code || error?.name || 'summary-error', 80),
      message: cleanText(error?.message || error, 500)
    });
    console.error('FoxBear daily incident summary failed', {
      dateKey: range.dateKey,
      status: result.status,
      error: cleanText(error?.message || error, 300)
    });
    return { ok: false, ...result };
  }
}

exports.sendDailyIncidentSummary = onSchedule({
  schedule: '0 9,12,15,18,21 * * *', timeZone: TIME_ZONE, region: REGION,
  secrets: [GMAIL_APP_PASSWORD], retryCount: 0, maxInstances: 1,
  timeoutSeconds: 300, memory: '256MiB'
}, async () => {
  const now = new Date();
  for (const offset of DAILY_SUMMARY_OFFSETS) {
    await sendDailySummaryForRange(kstDayRange(now, offset));
  }
});

exports.auditIncidentMailOperations = onSchedule({
  schedule: 'every 15 minutes', timeZone: TIME_ZONE, region: REGION,
  secrets: [GMAIL_APP_PASSWORD], retryCount: 0, maxInstances: 1,
  timeoutSeconds: 240, memory: '256MiB'
}, async () => {
  await auditIncidentMailOperations();
});


exports.verifyIncidentPostDeployHealth = onSchedule({
  schedule: 'every 6 hours', timeZone: TIME_ZONE, region: REGION,
  secrets: [GMAIL_APP_PASSWORD], retryCount: 0, maxInstances: 1,
  timeoutSeconds: 180, memory: '256MiB'
}, async () => {
  await verifyIncidentDeployment(Date.now(), PRODUCT_VERSION);
});

exports.__test = Object.freeze({
  cleanText, escapeHtml, safeKey, mailFromHeader, kstTimestampLabel, incidentSeverityLabel, incidentCategoryLabel,
  buildIncidentSubject, buildMail, buildDailySummaryMail, buildBrandedEmailHtml, emailTable, incidentMessageId, summaryMessageId,
  kstDayRange, kstDateKey, nextKstDayRetryAt, retryDelayMs,
  isIncidentDeliveryDue, incidentDueAt, isLongUndelivered,
  normalizedGmailAppPassword, assertSmtpAccepted, classifySmtpError,
  operationAlertMessageId, buildOperationsAlertMail, evaluateOperationsHealth,
  shouldSendOperationsAlert, inspectOperationsWebhookConfig, publicWebhookConfig,
  buildOperationsWebhookPayload, operationsHistoryId, recommendedActionForIssue, adminActionStateId,
  inspectOperationsWebhookChannels, isWebhookRetryableStatus, webhookRetryDelay, confirmMailReceipt
});
