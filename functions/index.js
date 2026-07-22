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

function inspectOperationsWebhookConfig(rawValue = process.env[OPERATIONS_WEBHOOK_ENV_NAME]) {
  const raw = String(rawValue || '').trim();
  if (!raw) return { status: 'disabled', provider: '', reason: 'not-configured', url: '' };
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
    return { status: 'ready', provider, reason: '', url: parsed.toString() };
  } catch (error) {
    return { status: 'error', provider: '', reason: cleanText(error?.message || error, 100), url: '' };
  }
}

function publicWebhookConfig(config = {}) {
  return {
    status: cleanText(config.status || 'disabled', 20),
    provider: cleanText(config.provider || '', 40),
    reason: cleanText(config.reason || '', 100)
  };
}

function buildOperationsWebhookPayload(health = {}, previous = {}, kind = 'alert', provider = 'generic') {
  const queue = health.queue || {};
  const smtp = health.smtp || {};
  const quota = health.quota || {};
  const isRecovery = kind === 'recovery';
  const heading = isRecovery ? 'FoxBear 문제 보고 메일 시스템 복구' : `FoxBear 문제 보고 메일 운영 ${health.status === 'critical' ? '긴급' : '주의'}`;
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

async function sendOperationsWebhook(health = {}, previous = {}, kind = 'alert') {
  const config = inspectOperationsWebhookConfig();
  if (config.status !== 'ready') return { status: config.status, provider: config.provider, reason: config.reason };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPERATIONS_WEBHOOK_TIMEOUT_MS);
  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'FoxBear-Incident-Monitor/1.5.65' },
      body: JSON.stringify(buildOperationsWebhookPayload(health, previous, kind, config.provider)),
      signal: controller.signal,
      redirect: 'error'
    });
    if (!response.ok) {
      const body = cleanText(await response.text().catch(() => ''), 240);
      return { status: 'failed', provider: config.provider, reason: `http-${response.status}`, response: body, statusCode: response.status };
    }
    return { status: 'delivered', provider: config.provider, reason: '', statusCode: response.status };
  } catch (error) {
    const reason = error?.name === 'AbortError' ? 'webhook-timeout' : 'webhook-request-failed';
    return { status: 'failed', provider: config.provider, reason, message: cleanText(error?.message || error, 240) };
  } finally {
    clearTimeout(timer);
  }
}

function operationsHistoryId(now = Date.now()) {
  const bucket = Math.floor(now / OPERATIONS_HISTORY_BUCKET_MS) * OPERATIONS_HISTORY_BUCKET_MS;
  return new Date(bucket).toISOString().slice(0, 16).replace(/[-:T]/g, '');
}

async function recordOperationsTelemetry(health = {}, alert = {}, now = Date.now()) {
  const historyRef = db.collection(OPERATIONS_HISTORY_COLLECTION).doc(operationsHistoryId(now));
  const channels = alert.channels || {};
  const history = {
    schemaVersion: 1,
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
      webhook: { status: cleanText(channels.webhook?.status || '', 20), provider: cleanText(channels.webhook?.provider || '', 40), reason: cleanText(channels.webhook?.reason || '', 100) }
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
    ? '[FoxBear 운영 복구] 문제 보고 메일 시스템 정상화'
    : `[FoxBear 운영 ${status === 'critical' ? '긴급' : '주의'}] 문제 보고 메일 상태 점검`;
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
  const htmlRows = rows.map(([label, value]) => `<tr><th style="text-align:left;padding:6px 10px;border:1px solid #ddd">${escapeHtml(label)}</th><td style="padding:6px 10px;border:1px solid #ddd">${escapeHtml(value)}</td></tr>`).join('');
  const issueList = issueMessages.length ? issueMessages.map(item => `<li>${escapeHtml(item)}</li>`).join('') : '<li>없음</li>';
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#191919"><h2>${escapeHtml(subject)}</h2><table style="border-collapse:collapse">${htmlRows}</table><h3>감지 항목</h3><ul>${issueList}</ul><p>Firebase 관리자 화면의 오류 탭에서 최신 상태를 확인하세요.</p></body></html>`;
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
  const subject = `[FoxBear ${severity}] ${category} · v${appVersion} · ${fingerprint}`.slice(0, 180);
  const receivedAt = new Date().toISOString();
  const rows = [
    ['분류', category], ['심각도', severity], ['이유', data.reason], ['메시지', data.message],
    ['코드', data.code], ['앱 버전', appVersion], ['자산 버전', data.assetVersion],
    ['브라우저', data.browser], ['플랫폼', data.platform], ['화면', data.viewport],
    ['온라인', data.online === false ? '아니오' : '예'],
    ['부팅 실패/정지', `${Boolean(data.bootFailed)} / ${Boolean(data.bootStalled)}`],
    ['리소스/오류/경고', `${Number(data.resourceFailureCount || 0)} / ${Number(data.runtimeErrorCount || 0)} / ${Number(data.runtimeWarningCount || 0)}`],
    ['페이지', data.pagePath], ['지문', fingerprint], ['보고서 ID', reportId],
    ['클라이언트 시각', data.clientAt], ['서버 수신 시각', receivedAt]
  ];
  const text = [
    'FoxBear 자동 문제 보고', '',
    ...rows.map(([label, value]) => `${label}: ${cleanText(value, 1200) || '-'}`),
    '', `상황: ${cleanText(data.context, 2000) || '-'}`, '',
    `스택:\n${String(data.stack || '').slice(0, 4000) || '-'}`, '',
    '개인 오디오, 파일명, 원본 PCM은 이 보고서에 포함되지 않습니다.'
  ].join('\n');
  const htmlRows = rows.map(([label, value]) => `<tr><th style="text-align:left;padding:6px 10px;border:1px solid #ddd">${escapeHtml(label)}</th><td style="padding:6px 10px;border:1px solid #ddd">${escapeHtml(value || '-')}</td></tr>`).join('');
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#191919"><h2>FoxBear 자동 문제 보고</h2><table style="border-collapse:collapse">${htmlRows}</table><h3>상황</h3><pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px">${escapeHtml(data.context || '-')}</pre><h3>스택</h3><pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px">${escapeHtml(String(data.stack || '').slice(0, 4000) || '-')}</pre><p style="color:#666">개인 오디오, 파일명, 원본 PCM은 이 보고서에 포함되지 않습니다.</p></body></html>`;
  return { subject, text, html };
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
  const subject = `[FoxBear 일일 오류 요약] ${dateKey} · ${items.length}${truncated ? '+' : ''}건`;
  const lines = [
    `FoxBear 일일 오류 요약 (${dateKey}, KST)`, '',
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
  const categoryRows = topCategories.map(([key, value]) => `<tr><td style="padding:6px 10px;border:1px solid #ddd">${escapeHtml(key)}</td><td style="padding:6px 10px;border:1px solid #ddd">${value}</td></tr>`).join('') || '<tr><td colspan="2">없음</td></tr>';
  const fingerprintRows = topFingerprints.map(([key, value]) => `<tr><td style="padding:6px 10px;border:1px solid #ddd">${escapeHtml(key)}</td><td style="padding:6px 10px;border:1px solid #ddd">${value.count}</td><td style="padding:6px 10px;border:1px solid #ddd">${escapeHtml(value.category)}</td><td style="padding:6px 10px;border:1px solid #ddd">${escapeHtml(value.message || '-')}</td></tr>`).join('') || '<tr><td colspan="4">없음</td></tr>';
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#191919"><h2>FoxBear 일일 오류 요약</h2><p><strong>${escapeHtml(dateKey)} KST</strong> · 전체 ${items.length}${truncated ? '건 이상' : '건'}</p>${truncated ? `<p style="color:#b45309">최신 ${DAILY_SUMMARY_MAX_REPORTS}건까지만 상세 집계했습니다.</p>` : ''}<p>Fatal ${severityCounts.fatal} / Error ${severityCounts.error} / Warning ${severityCounts.warning}</p><h3>분류별</h3><table style="border-collapse:collapse"><tr><th>분류</th><th>건수</th></tr>${categoryRows}</table><h3>반복 오류 지문</h3><table style="border-collapse:collapse"><tr><th>지문</th><th>건수</th><th>분류</th><th>메시지</th></tr>${fingerprintRows}</table><p style="color:#666">개인 오디오, 파일명, 원본 PCM은 집계 대상에 포함되지 않습니다.</p></body></html>`;
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
  const status = reasons.some(item => item.severity === 'critical')
    ? 'critical'
    : reasons.length ? 'warning' : 'healthy';
  const signature = safeKey(`${status}_${reasons.map(item => item.code).sort().join('_') || 'ok'}`, status);
  return { ...snapshot, status, signature, reasons };
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
    channels: { webhook: publicWebhookConfig(inspectOperationsWebhookConfig()) },
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
        from: `FoxBear Incident Monitor <${ALERT_SENDER}>`,
        to: ALERT_RECIPIENT,
        messageId: operationAlertMessageId(decision.kind, health.signature, now),
        headers: { 'X-FoxBear-Operations-Status': health.status, 'X-FoxBear-Operations-Signature': health.signature },
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
      schemaVersion: 2,
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
          statusCode: Math.max(0, Number(alertChannels.webhook?.statusCode || previousAlertChannels.webhook?.statusCode || 0))
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
      return { allowed: false, reason: 'daily-limit' };
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
  if (!reservation.allowed) return { ok: false, skipped: true, reason: reservation.reason };
  const mail = buildMail(reservation.data, reportRef.id);
  try {
    const info = await createTransport().sendMail({
      from: `FoxBear Incident Monitor <${ALERT_SENDER}>`,
      to: ALERT_RECIPIENT,
      messageId: incidentMessageId(reportRef.id),
      headers: { 'X-FoxBear-Report-ID': reportRef.id },
      subject: mail.subject,
      text: mail.text,
      html: mail.html
    });
    const acceptedCount = assertSmtpAccepted(info);
    const result = await finalizeDelivery(reportRef, reservation, {
      ok: true,
      messageId: info.messageId,
      response: info.response,
      acceptedCount,
      rejectedCount: Array.isArray(info.rejected) ? info.rejected.length : 0
    });
    return { ok: result.status === 'emailed', ...result };
  } catch (error) {
    const result = await finalizeDelivery(reportRef, reservation, { ok: false, error });
    console.error('FoxBear incident email failed', { reportId: reportRef.id, attemptCount: result.attemptCount, status: result.status, error: cleanText(error?.message || error, 300) });
    return { ok: false, ...result };
  }
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
  const adminSnapshot = uid ? await db.collection('siteAdmins').doc(uid).get() : null;
  if (!adminSnapshot?.exists || adminSnapshot.data()?.active !== true) {
    await requestRef.set({ status: 'rejected', reason: 'admin-required', checkedAt: FieldValue.serverTimestamp() }, { merge: true });
    return;
  }
  const reportRef = db.collection('incidentReports').doc(reportId);
  const result = await processIncidentReport(reportRef, { retry: true, manual: true, forceTerminal });
  await requestRef.set({
    status: result.ok ? 'emailed' : result.status === 'dead-letter' ? 'dead-letter' : result.skipped ? 'skipped' : 'failed',
    reason: cleanText(result.reason || result.status || '', 100),
    checkedAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + STATE_TTL_DAYS * 86400000)
  }, { merge: true });
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
  const adminSnapshot = uid ? await db.collection('siteAdmins').doc(uid).get() : null;
  if (!adminSnapshot?.exists || adminSnapshot.data()?.active !== true) {
    await requestRef.set({ status: 'rejected', reason: 'admin-required', checkedAt: FieldValue.serverTimestamp() }, { merge: true });
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
  } catch (error) {
    await requestRef.set({
      status: 'failed',
      reason: cleanText(error?.code || error?.name || 'batch-recovery-failed', 100),
      message: cleanText(error?.message || error, 300),
      checkedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + STATE_TTL_DAYS * 86400000)
    }, { merge: true });
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
      from: `FoxBear Incident Monitor <${ALERT_SENDER}>`,
      to: ALERT_RECIPIENT,
      messageId: summaryMessageId(range.dateKey),
      headers: { 'X-FoxBear-Summary-Date': range.dateKey },
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

exports.__test = Object.freeze({
  cleanText, escapeHtml, safeKey, buildMail, buildDailySummaryMail, incidentMessageId, summaryMessageId,
  kstDayRange, kstDateKey, nextKstDayRetryAt, retryDelayMs,
  isIncidentDeliveryDue, incidentDueAt, isLongUndelivered,
  normalizedGmailAppPassword, assertSmtpAccepted, classifySmtpError,
  operationAlertMessageId, buildOperationsAlertMail, evaluateOperationsHealth,
  shouldSendOperationsAlert, inspectOperationsWebhookConfig, publicWebhookConfig,
  buildOperationsWebhookPayload, operationsHistoryId
});
