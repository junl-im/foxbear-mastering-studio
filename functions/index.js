'use strict';

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
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
const TIME_ZONE = 'Asia/Seoul';
const DUPLICATE_WINDOW_MS = 30 * 60 * 1000;
const RESERVATION_WINDOW_MS = 5 * 60 * 1000;
const DELIVERY_LEASE_MS = 4 * 60 * 1000;
const DAILY_EMAIL_LIMIT = 40;
const MAX_DELIVERY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = Object.freeze([10 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000]);
const REPORT_TTL_DAYS = 30;
const STATE_TTL_DAYS = 45;

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

function retryDelayMs(attemptCount) {
  const index = Math.max(0, Math.min(RETRY_DELAYS_MS.length - 1, Number(attemptCount || 1) - 1));
  return RETRY_DELAYS_MS[index];
}

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: ALERT_SENDER, pass: GMAIL_APP_PASSWORD.value() }
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

function buildDailySummaryMail(reports, dateKey) {
  const items = Array.isArray(reports) ? reports : [];
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
  const subject = `[FoxBear 일일 오류 요약] ${dateKey} · ${items.length}건`;
  const lines = [
    `FoxBear 일일 오류 요약 (${dateKey}, KST)`, '',
    `전체: ${items.length}건`,
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
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#191919"><h2>FoxBear 일일 오류 요약</h2><p><strong>${escapeHtml(dateKey)} KST</strong> · 전체 ${items.length}건</p><p>Fatal ${severityCounts.fatal} / Error ${severityCounts.error} / Warning ${severityCounts.warning}</p><h3>분류별</h3><table style="border-collapse:collapse"><tr><th>분류</th><th>건수</th></tr>${categoryRows}</table><h3>반복 오류 지문</h3><table style="border-collapse:collapse"><tr><th>지문</th><th>건수</th><th>분류</th><th>메시지</th></tr>${fingerprintRows}</table><p style="color:#666">개인 오디오, 파일명, 원본 PCM은 집계 대상에 포함되지 않습니다.</p></body></html>`;
  return { subject, text: lines.join('\n'), html };
}

async function reserveDelivery(reportRef, options = {}) {
  const now = Date.now();
  const reportId = reportRef.id;
  return db.runTransaction(async transaction => {
    const reportSnapshot = await transaction.get(reportRef);
    if (!reportSnapshot.exists) return { allowed: false, reason: 'missing' };
    const data = reportSnapshot.data() || {};
    const delivery = data.delivery || {};
    const attemptCount = Math.max(0, Number(delivery.attemptCount || 0));
    if (delivery.status === 'emailed') return { allowed: false, reason: 'already-emailed' };
    if (attemptCount >= MAX_DELIVERY_ATTEMPTS) return { allowed: false, reason: 'attempt-limit' };
    const leaseUntil = timestampMillis(delivery.leaseUntil);
    if (['sending', 'retrying'].includes(delivery.status) && leaseUntil > now) return { allowed: false, reason: 'delivery-locked' };
    const nextRetryAt = timestampMillis(delivery.nextRetryAt);
    if (options.retry && !options.manual && nextRetryAt && nextRetryAt > now) return { allowed: false, reason: 'retry-not-due' };

    const fingerprintRef = db.collection('incidentMailState').doc(`fingerprint_${safeKey(data.fingerprint)}`);
    const dailyRef = db.collection('incidentMailState').doc(`daily_${utcDateKey()}`);
    const [fingerprintSnapshot, dailySnapshot] = await Promise.all([
      transaction.get(fingerprintRef), transaction.get(dailyRef)
    ]);
    const fingerprintState = fingerprintSnapshot.data() || {};
    const dailyState = dailySnapshot.data() || {};
    const lastSentAt = timestampMillis(fingerprintState.lastSentAt);
    const reservedAt = timestampMillis(fingerprintState.reservedAt);
    const reservationId = cleanText(fingerprintState.reservationId || '', 180);
    if (lastSentAt && now - lastSentAt < DUPLICATE_WINDOW_MS) {
      transaction.update(reportRef, {
        delivery: { ...delivery, status: 'suppressed-duplicate', reason: 'fingerprint-cooldown', checkedAt: FieldValue.serverTimestamp() },
        expiresAt: Timestamp.fromMillis(now + REPORT_TTL_DAYS * 86400000)
      });
      return { allowed: false, reason: 'duplicate' };
    }
    if (reservedAt && now - reservedAt < RESERVATION_WINDOW_MS && reservationId && reservationId !== reportId) {
      return { allowed: false, reason: 'fingerprint-locked' };
    }
    const sentCount = Math.max(0, Number(dailyState.sentCount || 0));
    const reservedCount = Math.max(0, Number(dailyState.reservedCount || 0));
    if (sentCount + reservedCount >= DAILY_EMAIL_LIMIT) {
      const rateStatus = options.retry ? 'failed' : 'suppressed-rate-limit';
      transaction.update(reportRef, {
        delivery: {
          ...delivery,
          status: rateStatus,
          reason: 'daily-email-limit',
          nextRetryAt: options.retry ? Timestamp.fromMillis(now + 2 * 60 * 60 * 1000) : null,
          checkedAt: FieldValue.serverTimestamp()
        },
        expiresAt: Timestamp.fromMillis(now + REPORT_TTL_DAYS * 86400000)
      });
      return { allowed: false, reason: 'daily-limit' };
    }
    transaction.set(fingerprintRef, {
      reservationId: reportId,
      reservedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now + STATE_TTL_DAYS * 86400000)
    }, { merge: true });
    transaction.set(dailyRef, {
      dateKey: utcDateKey(),
      sentCount,
      reservedCount: reservedCount + 1,
      lastReservedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now + STATE_TTL_DAYS * 86400000)
    }, { merge: true });
    transaction.update(reportRef, {
      delivery: {
        ...delivery,
        status: options.retry ? 'retrying' : 'sending',
        reason: '',
        attemptCount,
        leaseUntil: Timestamp.fromMillis(now + DELIVERY_LEASE_MS),
        checkedAt: FieldValue.serverTimestamp()
      },
      expiresAt: Timestamp.fromMillis(now + REPORT_TTL_DAYS * 86400000)
    });
    return { allowed: true, data, delivery, attemptCount, fingerprintRef, dailyRef };
  });
}

async function finalizeDelivery(reportRef, reservation, outcome = {}) {
  const now = Date.now();
  const attemptCount = reservation.attemptCount + 1;
  return db.runTransaction(async transaction => {
    const [dailySnapshot, fingerprintSnapshot] = await Promise.all([
      transaction.get(reservation.dailyRef),
      transaction.get(reservation.fingerprintRef)
    ]);
    const dailyState = dailySnapshot.data() || {};
    const fingerprintState = fingerprintSnapshot.data() || {};
    const reservedCount = Math.max(0, Number(dailyState.reservedCount || 0));
    const sentCount = Math.max(0, Number(dailyState.sentCount || 0));
    const ownsReservation = cleanText(fingerprintState.reservationId || '', 180) === reportRef.id;
    const dailyUpdate = {
      dateKey: utcDateKey(),
      sentCount: sentCount + (outcome.ok ? 1 : 0),
      reservedCount: Math.max(0, reservedCount - 1),
      expiresAt: Timestamp.fromMillis(now + STATE_TTL_DAYS * 86400000)
    };
    transaction.set(reservation.dailyRef, dailyUpdate, { merge: true });

    if (outcome.ok) {
      transaction.update(reportRef, {
        delivery: {
          status: 'emailed', reason: '', attemptCount,
          messageId: cleanText(outcome.messageId || '', 240),
          checkedAt: FieldValue.serverTimestamp()
        },
        expiresAt: Timestamp.fromMillis(now + REPORT_TTL_DAYS * 86400000)
      });
      transaction.set(reservation.fingerprintRef, {
        reservationId: FieldValue.delete(), reservedAt: FieldValue.delete(),
        lastSentAt: FieldValue.serverTimestamp(), lastReportId: reportRef.id,
        expiresAt: Timestamp.fromMillis(now + STATE_TTL_DAYS * 86400000)
      }, { merge: true });
      return { status: 'emailed', attemptCount };
    }

    const terminal = attemptCount >= MAX_DELIVERY_ATTEMPTS;
    transaction.update(reportRef, {
      delivery: {
        status: 'failed',
        reason: cleanText(outcome.error?.code || outcome.error?.name || 'smtp-error', 80),
        message: cleanText(outcome.error?.message || outcome.error, 500),
        attemptCount,
        terminal,
        nextRetryAt: terminal ? null : Timestamp.fromMillis(now + retryDelayMs(attemptCount)),
        checkedAt: FieldValue.serverTimestamp()
      },
      expiresAt: Timestamp.fromMillis(now + REPORT_TTL_DAYS * 86400000)
    });
    if (ownsReservation) {
      transaction.set(reservation.fingerprintRef, {
        reservationId: FieldValue.delete(), reservedAt: FieldValue.delete(),
        lastFailureAt: FieldValue.serverTimestamp(), lastFailureReportId: reportRef.id,
        expiresAt: Timestamp.fromMillis(now + STATE_TTL_DAYS * 86400000)
      }, { merge: true });
    }
    return { status: 'failed', attemptCount, terminal };
  });
}

async function processIncidentReport(reportRef, options = {}) {
  const reservation = await reserveDelivery(reportRef, options);
  if (!reservation.allowed) return { ok: false, skipped: true, reason: reservation.reason };
  const mail = buildMail(reservation.data, reportRef.id);
  try {
    const info = await createTransport().sendMail({
      from: `FoxBear Incident Monitor <${ALERT_SENDER}>`,
      to: ALERT_RECIPIENT,
      subject: mail.subject,
      text: mail.text,
      html: mail.html
    });
    const result = await finalizeDelivery(reportRef, reservation, { ok: true, messageId: info.messageId });
    return { ok: true, ...result };
  } catch (error) {
    const result = await finalizeDelivery(reportRef, reservation, { ok: false, error });
    console.error('FoxBear incident email failed', { reportId: reportRef.id, attemptCount: result.attemptCount, error: cleanText(error?.message || error, 300) });
    return { ok: false, ...result };
  }
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
  const now = Date.now();
  const snapshot = await db.collection('incidentReports')
    .where('delivery.status', '==', 'failed')
    .limit(20)
    .get();
  const due = snapshot.docs.filter(docSnapshot => {
    const delivery = docSnapshot.data()?.delivery || {};
    return !delivery.terminal && Number(delivery.attemptCount || 0) < MAX_DELIVERY_ATTEMPTS
      && (!delivery.nextRetryAt || timestampMillis(delivery.nextRetryAt) <= now);
  }).slice(0, 8);
  for (const docSnapshot of due) {
    await processIncidentReport(docSnapshot.ref, { retry: true });
  }
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
  const adminSnapshot = uid ? await db.collection('siteAdmins').doc(uid).get() : null;
  if (!adminSnapshot?.exists || adminSnapshot.data()?.active !== true) {
    await requestRef.set({ status: 'rejected', reason: 'admin-required', checkedAt: FieldValue.serverTimestamp() }, { merge: true });
    return;
  }
  const reportRef = db.collection('incidentReports').doc(reportId);
  const result = await processIncidentReport(reportRef, { retry: true, manual: true });
  await requestRef.set({
    status: result.ok ? 'emailed' : result.skipped ? 'skipped' : 'failed',
    reason: cleanText(result.reason || result.status || '', 100),
    checkedAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + STATE_TTL_DAYS * 86400000)
  }, { merge: true });
});

exports.sendDailyIncidentSummary = onSchedule({
  schedule: '0 9 * * *', timeZone: TIME_ZONE, region: REGION,
  secrets: [GMAIL_APP_PASSWORD], retryCount: 0, maxInstances: 1,
  timeoutSeconds: 180, memory: '256MiB'
}, async () => {
  const range = kstDayRange(new Date(), -1);
  const stateRef = db.collection('incidentMailState').doc(`summary_${safeKey(range.dateKey)}`);
  const reserved = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(stateRef);
    const current = snapshot.data() || {};
    if (current.status === 'emailed') return false;
    const reservedAt = timestampMillis(current.reservedAt);
    if (current.status === 'reserved' && reservedAt && Date.now() - reservedAt < DELIVERY_LEASE_MS) return false;
    transaction.set(stateRef, {
      status: 'reserved', dateKey: range.dateKey, reservedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + STATE_TTL_DAYS * 86400000)
    }, { merge: true });
    return true;
  });
  if (!reserved) return;
  try {
    const snapshot = await db.collection('incidentReports')
      .where('createdAt', '>=', range.start)
      .where('createdAt', '<', range.end)
      .limit(500)
      .get();
    const reports = snapshot.docs.map(item => item.data() || {});
    const mail = buildDailySummaryMail(reports, range.dateKey);
    const info = await createTransport().sendMail({
      from: `FoxBear Incident Monitor <${ALERT_SENDER}>`,
      to: ALERT_RECIPIENT,
      subject: mail.subject,
      text: mail.text,
      html: mail.html
    });
    await stateRef.set({
      status: 'emailed', count: reports.length,
      messageId: cleanText(info.messageId || '', 240),
      checkedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + STATE_TTL_DAYS * 86400000)
    }, { merge: true });
  } catch (error) {
    await stateRef.set({
      status: 'failed', reason: cleanText(error?.code || error?.name || 'summary-error', 80),
      message: cleanText(error?.message || error, 500),
      checkedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + STATE_TTL_DAYS * 86400000)
    }, { merge: true });
    console.error('FoxBear daily incident summary failed', cleanText(error?.message || error, 300));
  }
});

exports.__test = Object.freeze({
  cleanText, escapeHtml, safeKey, buildMail, buildDailySummaryMail,
  utcDateKey, kstDayRange, retryDelayMs
});
