'use strict';

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore');
const nodemailer = require('nodemailer');

initializeApp();

const db = getFirestore();
const GMAIL_APP_PASSWORD = defineSecret('FOXBEAR_GMAIL_APP_PASSWORD');
const ALERT_RECIPIENT = 'mcwoogi@gmail.com';
const ALERT_SENDER = 'mcwoogi@gmail.com';
const REGION = 'asia-northeast3';
const DUPLICATE_WINDOW_MS = 30 * 60 * 1000;
const RESERVATION_WINDOW_MS = 5 * 60 * 1000;
const DAILY_EMAIL_LIMIT = 40;
const REPORT_TTL_DAYS = 30;
const STATE_TTL_DAYS = 2;

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

function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
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

async function reserveDelivery(data, reportRef) {
  const now = Date.now();
  const fingerprintRef = db.collection('incidentMailState').doc(`fingerprint_${safeKey(data.fingerprint)}`);
  const dailyRef = db.collection('incidentMailState').doc(`daily_${utcDateKey()}`);
  return db.runTransaction(async transaction => {
    const [fingerprintSnapshot, dailySnapshot] = await Promise.all([
      transaction.get(fingerprintRef), transaction.get(dailyRef)
    ]);
    const fingerprintState = fingerprintSnapshot.data() || {};
    const dailyState = dailySnapshot.data() || {};
    const lastSentAt = timestampMillis(fingerprintState.lastSentAt);
    const reservedAt = timestampMillis(fingerprintState.reservedAt);
    if ((lastSentAt && now - lastSentAt < DUPLICATE_WINDOW_MS) || (reservedAt && now - reservedAt < RESERVATION_WINDOW_MS)) {
      transaction.update(reportRef, {
        delivery: { status: 'suppressed-duplicate', reason: 'fingerprint-cooldown', checkedAt: FieldValue.serverTimestamp() },
        expiresAt: Timestamp.fromMillis(now + REPORT_TTL_DAYS * 86400000)
      });
      return { allowed: false, reason: 'duplicate' };
    }
    const sentCount = Math.max(0, Number(dailyState.sentCount || 0));
    if (sentCount >= DAILY_EMAIL_LIMIT) {
      transaction.update(reportRef, {
        delivery: { status: 'suppressed-rate-limit', reason: 'daily-email-limit', checkedAt: FieldValue.serverTimestamp() },
        expiresAt: Timestamp.fromMillis(now + REPORT_TTL_DAYS * 86400000)
      });
      return { allowed: false, reason: 'daily-limit' };
    }
    transaction.set(fingerprintRef, {
      reservationId: safeKey(reportRef.id, 'report'),
      reservedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now + STATE_TTL_DAYS * 86400000)
    }, { merge: true });
    transaction.set(dailyRef, {
      dateKey: utcDateKey(), sentCount: sentCount + 1,
      lastReservedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now + STATE_TTL_DAYS * 86400000)
    }, { merge: true });
    transaction.update(reportRef, {
      delivery: { status: 'reserved', reason: '', checkedAt: FieldValue.serverTimestamp() },
      expiresAt: Timestamp.fromMillis(now + REPORT_TTL_DAYS * 86400000)
    });
    return { allowed: true, fingerprintRef };
  });
}

exports.sendIncidentEmail = onDocumentCreated({
  document: 'incidentReports/{reportId}', region: REGION,
  secrets: [GMAIL_APP_PASSWORD], retry: false, maxInstances: 3,
  timeoutSeconds: 60, memory: '256MiB'
}, async event => {
  const snapshot = event.data;
  if (!snapshot) return;
  const data = snapshot.data() || {};
  const reportRef = snapshot.ref;
  const reservation = await reserveDelivery(data, reportRef);
  if (!reservation.allowed) return;
  const transport = nodemailer.createTransport({
    service: 'gmail', auth: { user: ALERT_SENDER, pass: GMAIL_APP_PASSWORD.value() }
  });
  const mail = buildMail(data, event.params.reportId);
  try {
    const info = await transport.sendMail({
      from: `FoxBear Incident Monitor <${ALERT_SENDER}>`, to: ALERT_RECIPIENT,
      subject: mail.subject, text: mail.text, html: mail.html
    });
    const now = Date.now();
    await Promise.all([
      reportRef.update({
        delivery: { status: 'emailed', reason: '', messageId: cleanText(info.messageId || '', 240), checkedAt: FieldValue.serverTimestamp() },
        expiresAt: Timestamp.fromMillis(now + REPORT_TTL_DAYS * 86400000)
      }),
      reservation.fingerprintRef.set({
        lastSentAt: FieldValue.serverTimestamp(), lastReportId: event.params.reportId,
        expiresAt: Timestamp.fromMillis(now + STATE_TTL_DAYS * 86400000)
      }, { merge: true })
    ]);
  } catch (error) {
    await reportRef.update({
      delivery: {
        status: 'failed', reason: cleanText(error?.code || error?.name || 'smtp-error', 80),
        message: cleanText(error?.message || error, 500), checkedAt: FieldValue.serverTimestamp()
      },
      expiresAt: Timestamp.fromMillis(Date.now() + REPORT_TTL_DAYS * 86400000)
    });
    throw error;
  }
});

exports.__test = Object.freeze({ cleanText, escapeHtml, safeKey, buildMail, utcDateKey });
