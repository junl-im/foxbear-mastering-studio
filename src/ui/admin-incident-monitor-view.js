(function initFoxBearAdminIncidentMonitorView(global) {
    'use strict';

    function create(options = {}) {
        const state = options.state || {};
        const el = options.el || {};
        const getBridge = typeof options.getBridge === 'function' ? options.getBridge : () => global.FoxBearFirebase;
        const makeSummaryCard = options.makeSummaryCard;
        const safeNumber = options.safeNumber;
        const formatTime = options.formatTime;
        const limitText = options.limitText;
        const getFirebaseStatusNotice = options.getFirebaseStatusNotice;
        const showToast = options.showToast;
        const downloadBlob = typeof options.downloadBlob === 'function' ? options.downloadBlob : null;
        const activeCsvExports = new WeakSet();
        state.adminIncidentHistoryItems = Array.isArray(state.adminIncidentHistoryItems) ? state.adminIncidentHistoryItems : [];
        state.adminIncidentHistoryNextCursor = Number(state.adminIncidentHistoryNextCursor || 0);
        state.adminIncidentHistoryHasMore = state.adminIncidentHistoryHasMore === true;
        state.adminIncidentHistoryFilter = state.adminIncidentHistoryFilter || 'all';
        state.adminMailTestHistoryItems = Array.isArray(state.adminMailTestHistoryItems) ? state.adminMailTestHistoryItems : [];
        state.adminMailTestFilteredItems = Array.isArray(state.adminMailTestFilteredItems) ? state.adminMailTestFilteredItems : [];
        state.adminMailTestSearch = state.adminMailTestSearch || '';
        state.adminMailTestFilter = state.adminMailTestFilter || 'all';
        state.adminMailTestPeriod = state.adminMailTestPeriod || '30d';
        state.adminIncidentAuditItems = Array.isArray(state.adminIncidentAuditItems) ? state.adminIncidentAuditItems : [];
        state.adminIncidentAuditFilteredItems = Array.isArray(state.adminIncidentAuditFilteredItems) ? state.adminIncidentAuditFilteredItems : [];
        state.adminIncidentAuditNextCursor = Number(state.adminIncidentAuditNextCursor || 0);
        state.adminIncidentAuditHasMore = state.adminIncidentAuditHasMore === true;
        state.adminIncidentAuditSearch = state.adminIncidentAuditSearch || '';
        state.adminIncidentAuditFilter = state.adminIncidentAuditFilter || 'all';
        try { state.adminIncidentCompact = global.localStorage?.getItem('foxbear:admin-incident-density') === 'compact'; } catch (error) { state.adminIncidentCompact = false; }
        bindBatchRecoveryActions();
        applyAdminDensityMode(state.adminIncidentCompact);

        async function render(forceRemote) {
            if (!el.adminIncidentsSummary || !el.adminIncidentsRows) return;
            el.adminIncidentsSummary.textContent = '';
            el.adminIncidentsRows.textContent = '';
            if (!state.firebaseIsAdmin) {
                if (el.adminIncidentsNotice) {
                    el.adminIncidentsNotice.textContent = `관리자 UID로 등록된 사용자만 오류 보고서를 볼 수 있습니다.${getFirebaseStatusNotice()}`;
                }
                return;
            }
            const bridge = getBridge();
            if (!bridge || typeof bridge.getAdminIncidents !== 'function') {
                if (el.adminIncidentsNotice) el.adminIncidentsNotice.textContent = '오류 관리 API가 아직 로드되지 않았습니다.';
                return;
            }
            if (el.adminIncidentsNotice) {
                el.adminIncidentsNotice.textContent = forceRemote
                    ? '오류 보고와 메일 상태를 새로 불러오는 중입니다…'
                    : '최근 오류 보고를 불러오는 중입니다…';
            }
            try {
                const data = await bridge.getAdminIncidents({ limit: 120 });
                state.adminIncidentsRemoteError = '';
                const summary = data?.summary || {};
                const operations = data?.operations || {};
                const queue = operations.queue || {};
                const smtp = operations.smtp || {};
                const quota = operations.quota || {};
                const webhook = operations.channels?.webhook || {};
                const recovery = data?.recovery || {};
                const deployment = data?.deployment || {};
                const mailVerification = data?.mailVerification || {};
                const mailTestHistory = Array.isArray(data?.mailTestHistory) ? data.mailTestHistory : [];
                const mailTestStats = data?.mailTestStats || {};
                const operationsMailVerification = operations.mailVerification || {};
                const history = Array.isArray(data?.history) ? data.history : [];
                const auditLog = Array.isArray(data?.auditLog) ? data.auditLog : [];
                const trend = summarizeHistory(history);
                const appCheck = data?.appCheck || bridge.appCheck || {};
                const operationalStatus = operations.stale ? 'stale' : (operations.status || 'unknown');
                renderHealthHero({ operationalStatus, operations, queue, smtp, deployment, mailVerification, operationsMailVerification, mailTestStats, appCheck });
                appendSummaryCard('메일 운영', formatOperationsStatus(operationalStatus), operationalStatus === 'healthy' ? 'firebase' : 'warning', true);
                appendSummaryCard('장기 미발송', `${safeNumber(queue.stale, 0)}건`, queue.stale ? 'warning' : 'firebase', true);
                appendSummaryCard('최종 실패', `${safeNumber(queue.deadLetter ?? summary.deadLetter, 0)}건`, (queue.deadLetter ?? summary.deadLetter) ? 'warning' : 'firebase', true);
                appendSummaryCard('SMTP/Secret', formatSmtpStatus(smtp.status), smtp.status === 'ok' ? 'firebase' : 'warning', true);
                appendSummaryCard('메일 실수신', formatMailVerification(mailVerification), mailVerification.confirmedLatest && !mailVerification.stale ? 'firebase' : 'warning', true);
                appendSummaryCard('오늘 오류(KST)', `${safeNumber(summary.today, 0)}건`, 'firebase');
                appendSummaryCard('오늘 발송', `${safeNumber(quota.sent, 0)}/${safeNumber(quota.limit, 40)}`, quota.reservationLeak ? 'warning' : 'firebase');
                appendSummaryCard('보조 경보', formatWebhookStatus(webhook), webhook.status === 'error' ? 'warning' : 'firebase');
                appendSummaryCard('자동 복구', formatRecovery(recovery), recovery.failed || recovery.deadLetter ? 'warning' : 'firebase');
                appendSummaryCard('24시간 추세', `${trend.critical}위험 · ${trend.warning}주의`, trend.critical || trend.warning ? 'warning' : 'firebase');
                appendSummaryCard('배포 검증', formatDeploymentStatus(deployment), deployment.status === 'healthy' && !deployment.stale ? 'firebase' : 'warning');
                appendSummaryCard('SMTP 성공률', `${Number(mailTestStats.smtpSuccessRate || 0).toFixed(1).replace(/\.0$/, '')}%`, safeNumber(mailTestStats.failed, 0) ? 'warning' : 'firebase');
                appendSummaryCard('수신 확인률', `${Number(mailTestStats.receiptConfirmationRate || 0).toFixed(1).replace(/\.0$/, '')}%`, safeNumber(mailTestStats.receiptOverdue, 0) ? 'warning' : 'firebase');
                appendSummaryCard('수신 확인 누락', `${safeNumber(operationsMailVerification.overdueReceiptCount ?? mailTestStats.receiptOverdue, 0)}건`, safeNumber(operationsMailVerification.overdueReceiptCount ?? mailTestStats.receiptOverdue, 0) ? 'warning' : 'firebase');
                appendSummaryCard('App Check', '미사용 정책', 'firebase');
                const localIncidentStatus = global.FoxBearIncidentReporter?.getStatus?.() || {};
                const localRouteHealth = localIncidentStatus.adaptiveRouteHealth || {};
                const exploration = localRouteHealth.exploration || {};
                const callableHealth = localRouteHealth.routes?.callable || {};
                const routeLabel = exploration.active
                    ? `탐색 ${safeNumber(exploration.remaining, 0)}회 · 다음 ${exploration.nextRoute === 'hosting-rewrite' ? 'Hosting' : 'Callable'}`
                    : callableHealth.coolingDown
                        ? `Hosting 우선 · ${safeNumber(callableHealth.remainingSeconds, 0)}초`
                        : 'Callable 우선 · 자동 복구 대기';
                appendSummaryCard('현재 브라우저 경로', routeLabel, exploration.active || callableHealth.coolingDown ? 'warning' : 'firebase');
                appendSummaryCard('로컬 신고 대기열', `${safeNumber(localIncidentStatus.queued, 0)}건`, safeNumber(localIncidentStatus.queued, 0) ? 'warning' : 'firebase');
                if (el.adminIncidentsNotice) {
                    const protection = 'App Check는 사용하지 않으며 Firebase Auth와 Firestore Rules로 관리자 권한을 검증합니다.';
                    const checked = operations.checkedAt ? ` 마지막 자동 점검 ${formatTime(operations.checkedAt)}.` : ' 자동 점검 결과가 아직 없습니다.';
                    const issues = Array.isArray(operations.reasons) && operations.reasons.length
                        ? ` 감지: ${operations.reasons.map(item => item.message || item.code).filter(Boolean).slice(0, 3).join(' / ')}`
                        : '';
                    const smtpDetail = smtp.status === 'error' ? ` SMTP 오류: ${smtp.message || smtp.reason || '인증/연결 실패'}.` : '';
                    const webhookDetail = webhook.status === 'ready'
                        ? ` 보조 웹훅(${webhook.provider || 'HTTPS'})이 준비되었습니다.`
                        : webhook.status === 'error' ? ` 보조 웹훅 오류: ${webhook.reason || '설정 확인 필요'}.` : ' 보조 웹훅은 선택 사항이며 현재 미설정입니다.';
                    const recommendations = collectRecommendations(operations, deployment, history);
                    const recommendationText = recommendations.length ? ` 권장 조치: ${recommendations.slice(0, 2).join(' / ')}` : '';
                    const overdueCount = safeNumber(operationsMailVerification.overdueReceiptCount ?? mailTestStats.receiptOverdue, 0);
                    const verificationWarning = overdueCount > 0
                        ? ` SMTP 접수 후 30분 이상 수신 확인되지 않은 테스트가 ${overdueCount}건 있습니다.`
                        : mailVerification.confirmedLatest
                            ? mailVerification.stale ? ' 실제 메일 수신 확인이 7일 이상 지나 새 테스트가 필요합니다.' : ` 최근 실제 수신 확인 ${formatTime(mailVerification.lastConfirmedAt)}.`
                            : mailVerification.lastSmtpAcceptedAt ? ' SMTP 접수는 확인됐지만 받은편지함/스팸함 실수신 확인이 아직 없습니다.' : ' 실제 메일 테스트 기록이 없습니다.';
                    el.adminIncidentsNotice.textContent = `메일 실패는 10분·30분·2시간 간격으로 최대 3회 자동 재시도하며, 운영 점검은 15분마다 실행됩니다.${checked}${issues}${smtpDetail}${webhookDetail}${verificationWarning}${recommendationText} ${protection}`;
                }
                if (el.adminIncidentRecoveryStatus) {
                    el.adminIncidentRecoveryStatus.textContent = recovery.exists
                        ? `최근 ${formatTime(recovery.checkedAt)} · 시도 ${safeNumber(recovery.attempted, 0)} · 성공 ${safeNumber(recovery.emailed, 0)} · 실패 ${safeNumber(recovery.failed, 0) + safeNumber(recovery.deadLetter, 0)}`
                        : '아직 기록된 자동 복구 실행이 없습니다.';
                }
                if (el.adminIncidentDeploymentStatus) {
                    const expected = global.FoxBearBuildInfo?.productVersion || '';
                    const versionText = deployment.productVersion ? `Functions v${deployment.productVersion}` : 'Functions 버전 미확인';
                    const checkedText = deployment.checkedAt ? ` · ${formatTime(deployment.checkedAt)}` : '';
                    const mismatch = expected && deployment.productVersion && expected !== deployment.productVersion ? ` · 화면 v${expected}와 불일치` : '';
                    const indexStatus = deployment.capabilities?.indexes?.status;
                    const indexText = indexStatus && indexStatus !== 'ok' ? ` · 인덱스 ${indexStatus}` : indexStatus === 'ok' ? ' · 인덱스 정상' : '';
                    el.adminIncidentDeploymentStatus.textContent = `${versionText}${checkedText}${mismatch}${indexText}`;
                }
                state.adminIncidentLatestMailTestReportId = mailVerification.lastTestStatus === 'emailed' ? mailVerification.lastTestReportId : '';
                if (el.adminIncidentMailVerificationStatus) {
                    const confirmed = mailVerification.confirmedLatest
                        ? `실수신 확인 ${formatTime(mailVerification.lastConfirmedAt)} · ${mailVerification.lastConfirmedLocation === 'spam' ? '스팸함' : '받은편지함'}`
                        : mailVerification.lastSmtpAcceptedAt
                            ? `SMTP 접수 ${formatTime(mailVerification.lastSmtpAcceptedAt)} · 실수신 확인 필요`
                            : '실제 메일 테스트 기록이 없습니다.';
                    el.adminIncidentMailVerificationStatus.textContent = confirmed;
                    el.adminIncidentMailVerificationStatus.classList.toggle('admin-mail-verification-ok', Boolean(mailVerification.confirmedLatest && !mailVerification.stale));
                    el.adminIncidentMailVerificationStatus.classList.toggle('admin-mail-verification-warning', !mailVerification.confirmedLatest || mailVerification.stale);
                }
                if (el.adminIncidentConfirmInbox) el.adminIncidentConfirmInbox.disabled = !state.adminIncidentLatestMailTestReportId;
                if (el.adminIncidentConfirmSpam) el.adminIncidentConfirmSpam.disabled = !state.adminIncidentLatestMailTestReportId;
                state.adminMailTestHistoryItems = mailTestHistory;
                renderMailTroubleshooter(mailVerification, operationsMailVerification, mailTestHistory);
                applyMailTestFilters();
                state.adminIncidentHistoryItems = history;
                state.adminIncidentHistoryNextCursor = safeNumber(data?.historyNextCursor, 0);
                state.adminIncidentHistoryHasMore = data?.historyHasMore === true;
                state.adminIncidentHistoryFilter = 'all';
                if (el.adminIncidentHistoryFilter) el.adminIncidentHistoryFilter.value = 'all';
                renderHistory(state.adminIncidentHistoryItems);
                state.adminIncidentAuditItems = auditLog;
                state.adminIncidentAuditNextCursor = safeNumber(data?.auditLogNextCursor, 0);
                state.adminIncidentAuditHasMore = data?.auditLogHasMore === true;
                applyAuditFilters();
                updateHistoryControls();
                maybeAutoVerifyDeployment(deployment);
                const incidents = Array.isArray(data?.incidents) ? data.incidents : [];
                if (!incidents.length) {
                    appendEmptyRow('아직 수집된 오류 보고가 없습니다.');
                    return;
                }
                incidents.forEach(item => el.adminIncidentsRows.appendChild(makeRow(item)));
            } catch (error) {
                state.adminIncidentsRemoteError = error?.message || String(error);
                if (el.adminIncidentsNotice) el.adminIncidentsNotice.textContent = `오류 보고 조회 실패: ${state.adminIncidentsRemoteError}`;
                appendEmptyRow('오류 보고서를 불러오지 못했습니다.');
            }
        }

        function appendEmptyRow(message) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 6;
            cell.textContent = message;
            row.appendChild(cell);
            el.adminIncidentsRows.appendChild(row);
        }

        function makeRow(item = {}) {
            const row = document.createElement('tr');
            [formatTime(item.at), String(item.severity || 'error').toUpperCase(), item.category || 'unknown'].forEach(text => {
                const cell = document.createElement('td');
                cell.textContent = limitText(text, 160);
                row.appendChild(cell);
            });

            const messageCell = document.createElement('td');
            const message = document.createElement('strong');
            message.textContent = limitText(item.message || item.reason || '-', 220);
            const detail = document.createElement('small');
            detail.textContent = [item.code, item.fingerprint, item.appVersion, item.deliveryReason, item.deliveryMessage]
                .filter(Boolean)
                .map(value => limitText(value, 80))
                .join(' · ');
            messageCell.append(message, detail);
            row.appendChild(messageCell);

            const statusCell = document.createElement('td');
            const chip = document.createElement('span');
            const status = limitText(item.deliveryStatus || 'pending', 40);
            chip.className = `incident-delivery-chip incident-status-${status.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`;
            chip.textContent = formatStatus(status, item.attemptCount, item.terminal);
            statusCell.appendChild(chip);
            if (item.nextRetryAt && status === 'failed' && !item.terminal) {
                const retryTime = document.createElement('small');
                retryTime.textContent = `다음 자동 재시도 ${formatTime(item.nextRetryAt)}`;
                statusCell.appendChild(retryTime);
            }
            if (item.leaseUntil && ['sending', 'retrying'].includes(status)) {
                const leaseTime = document.createElement('small');
                leaseTime.textContent = `작업 임대 ${formatTime(item.leaseUntil)}까지`;
                statusCell.appendChild(leaseTime);
            }
            row.appendChild(statusCell);

            const actionCell = document.createElement('td');
            if (status === 'failed' || status === 'dead-letter') {
                const forceTerminal = status === 'dead-letter' || item.terminal === true;
                const retryButton = document.createElement('button');
                retryButton.type = 'button';
                retryButton.className = 'btn-secondary admin-incident-retry';
                retryButton.textContent = forceTerminal ? '강제 재전송' : '지금 재전송';
                retryButton.addEventListener('click', () => requestRetry(item.id, retryButton, forceTerminal));
                actionCell.appendChild(retryButton);
            } else {
                actionCell.textContent = '-';
            }
            row.appendChild(actionCell);
            return row;
        }

        function appendSummaryCard(label, value, mode, primary = false) {
            makeSummaryCard(label, value, mode).forEach(node => {
                node.classList.add(primary ? 'admin-summary-primary' : 'admin-summary-secondary');
                el.adminIncidentsSummary.appendChild(node);
            });
        }

        function formatDurationUntil(isoValue) {
            const target = Date.parse(isoValue || '');
            if (!target) return '';
            const diff = target - Date.now();
            const days = Math.ceil(Math.abs(diff) / 86400000);
            if (Math.abs(diff) < 60 * 60 * 1000) return diff >= 0 ? '1시간 이내' : '기한 경과';
            if (diff >= 0) return days <= 1 ? '내일 예정' : `${days}일 후 예정`;
            return days <= 1 ? '오늘 재검증 필요' : `${days}일 경과`;
        }

        function pickPrimaryAction(context = {}) {
            const { operationalStatus, queue = {}, smtp = {}, deployment = {}, mailVerification = {}, operationsMailVerification = {} } = context;
            const overdue = safeNumber(operationsMailVerification.overdueReceiptCount, 0);
            if (smtp.status !== 'ok') return 'Gmail 앱 비밀번호와 SMTP 인증을 먼저 확인하세요.';
            if (safeNumber(queue.deadLetter, 0) > 0) return '최종 실패 메일을 검토한 뒤 일괄 재전송하세요.';
            if (safeNumber(queue.stale, 0) > 0) return '미발송 일괄 복구로 정체 큐를 먼저 처리하세요.';
            if (overdue > 0) return 'Gmail에서 최신 테스트를 찾아 실수신 위치를 기록하세요.';
            if (!mailVerification.confirmedLatest || mailVerification.stale) return '새 실제 메일 테스트 후 받은편지함 도착을 확인하세요.';
            if (!deployment.exists || deployment.stale || deployment.status !== 'healthy') return '배포 상태 검증으로 Functions와 인덱스를 확인하세요.';
            return operationalStatus === 'healthy' ? '현재 긴급 조치는 없습니다. 주 1회 실수신 검증을 유지하세요.' : '감지된 권장 조치를 순서대로 확인하세요.';
        }

        function renderHealthHero(context = {}) {
            if (!el.adminIncidentHealthHero) return;
            const { operationalStatus, operations = {}, queue = {}, smtp = {}, deployment = {}, mailVerification = {}, operationsMailVerification = {} } = context;
            const visualStatus = operationalStatus === 'critical' ? 'critical' : operationalStatus === 'warning' ? 'warning' : operationalStatus === 'stale' ? 'stale' : operationalStatus === 'healthy' ? 'healthy' : 'unknown';
            const labels = { healthy: '정상', warning: '주의 필요', critical: '즉시 확인', stale: '점검 지연', unknown: '점검 대기' };
            const titles = {
                healthy: '메일 운영 경로가 정상입니다',
                warning: '메일 운영에서 확인할 항목이 있습니다',
                critical: '메일 운영 장애를 즉시 확인하세요',
                stale: '운영 점검 결과가 오래되었습니다',
                unknown: '메일 운영 상태를 확인하고 있습니다'
            };
            const reasons = Array.isArray(operations.reasons) ? operations.reasons.map(item => item.message || item.code).filter(Boolean) : [];
            const overdue = safeNumber(operationsMailVerification.overdueReceiptCount, 0);
            const summaryParts = [];
            if (smtp.status !== 'ok') summaryParts.push(`SMTP ${formatSmtpStatus(smtp.status)}`);
            if (safeNumber(queue.stale, 0)) summaryParts.push(`장기 미발송 ${safeNumber(queue.stale, 0)}건`);
            if (safeNumber(queue.deadLetter, 0)) summaryParts.push(`최종 실패 ${safeNumber(queue.deadLetter, 0)}건`);
            if (overdue) summaryParts.push(`수신 미확인 ${overdue}건`);
            if (deployment.exists && deployment.status !== 'healthy') summaryParts.push(`배포 ${formatDeploymentStatus(deployment)}`);
            if (!summaryParts.length && reasons.length) summaryParts.push(...reasons.slice(0, 2));
            if (!summaryParts.length) summaryParts.push('SMTP, 메일 큐, 실수신 검증과 배포 상태가 정상 범위입니다.');
            el.adminIncidentHealthHero.classList.remove('is-warning', 'is-critical', 'is-stale');
            if (visualStatus !== 'healthy' && visualStatus !== 'unknown') el.adminIncidentHealthHero.classList.add(`is-${visualStatus}`);
            if (el.adminIncidentHealthBadge) {
                el.adminIncidentHealthBadge.className = `admin-health-badge is-${visualStatus}`;
                el.adminIncidentHealthBadge.textContent = labels[visualStatus];
            }
            if (el.adminIncidentHealthTitle) el.adminIncidentHealthTitle.textContent = titles[visualStatus];
            if (el.adminIncidentHealthSummary) el.adminIncidentHealthSummary.textContent = summaryParts.join(' · ');
            if (el.adminIncidentDataFreshness) el.adminIncidentDataFreshness.textContent = operations.checkedAt ? `자동 점검 ${formatTime(operations.checkedAt)}` : '자동 점검 기록 없음';
            const dueAt = mailVerification.warningAfter || operationsMailVerification.nextVerificationDueAt || '';
            const confirmedAt = mailVerification.lastConfirmedAt || operationsMailVerification.lastConfirmedAt || '';
            if (el.adminIncidentVerificationSchedule) {
                el.adminIncidentVerificationSchedule.textContent = dueAt
                    ? `실수신 검증: ${formatDurationUntil(dueAt)} · 최근 ${confirmedAt ? formatTime(confirmedAt) : '미확인'}`
                    : '실수신 검증: 새 실제 메일 테스트가 필요합니다.';
            }
            if (el.adminIncidentPrimaryAction) el.adminIncidentPrimaryAction.textContent = `권장: ${pickPrimaryAction(context)}`;
        }

        function formatOperationsStatus(status) {
            const labels = { healthy: '정상', warning: '주의', critical: '위험', stale: '점검 지연', unknown: '점검 대기' };
            return labels[status] || status || '점검 대기';
        }

        function formatSmtpStatus(status) {
            const labels = { ok: '정상', error: '오류', unknown: '미확인' };
            return labels[status] || status || '미확인';
        }

        function formatWebhookStatus(webhook = {}) {
            const labels = { ready: '준비됨', disabled: '미설정', error: '오류', unknown: '미확인' };
            const base = labels[webhook.status] || webhook.status || '미확인';
            const provider = webhook.provider ? ` · ${webhook.provider}` : '';
            const failover = webhook.failoverReady ? ' · 이중화' : '';
            return `${base}${provider}${failover}`;
        }

        function formatRecovery(recovery = {}) {
            if (!recovery.exists) return '기록 대기';
            return `${safeNumber(recovery.emailed, 0)}성공 / ${safeNumber(recovery.failed, 0) + safeNumber(recovery.deadLetter, 0)}실패`;
        }

        function formatDeploymentStatus(deployment = {}) {
            if (!deployment.exists) return '검증 필요';
            if (deployment.stale) return '검증 만료';
            const expected = global.FoxBearBuildInfo?.productVersion || '';
            if (expected && deployment.productVersion && expected !== deployment.productVersion) return '버전 불일치';
            const labels = { healthy: '정상', warning: '주의', critical: '위험', unknown: '미확인' };
            return labels[deployment.status] || deployment.status || '미확인';
        }

        function collectRecommendations(operations = {}, deployment = {}, history = []) {
            const values = [];
            (operations.reasons || []).forEach(item => { if (item.recommendedAction) values.push(item.recommendedAction); });
            (deployment.recommendedActions || []).forEach(item => values.push(item));
            if (!values.length && history[0]?.recommendedActions) history[0].recommendedActions.forEach(item => values.push(item));
            return [...new Set(values.filter(Boolean))];
        }

        function formatMailVerification(verification = {}) {
            if (verification.confirmedLatest && !verification.stale) return '수신 확인';
            if (verification.confirmedLatest && verification.stale) return '재검증 필요';
            if (verification.lastSmtpAcceptedAt) return 'SMTP만 확인';
            return '미검증';
        }

        function renderMailTestStats(stats = {}) {
            if (!el.adminIncidentMailTestStats) return;
            const percent = value => { const number = Number(value); return Number.isFinite(number) ? number.toFixed(1).replace(/\.0$/, '') : '0'; };
            const values = [
                ['전체 테스트', `${safeNumber(stats.total, 0)}건`],
                ['SMTP 접수', `${safeNumber(stats.smtpAccepted, 0)}건 · ${percent(stats.smtpSuccessRate)}%`],
                ['실수신 확인', `${safeNumber(stats.receiptConfirmed, 0)}건 · ${percent(stats.receiptConfirmationRate)}%`],
                ['받은편지함 / 스팸', `${safeNumber(stats.inbox, 0)} / ${safeNumber(stats.spam, 0)}`],
                ['30분 초과 미확인', `${safeNumber(stats.receiptOverdue, 0)}건`]
            ];
            el.adminIncidentMailTestStats.replaceChildren(...values.map(([label, value]) => {
                const card = document.createElement('div');
                card.className = 'admin-mail-test-stat';
                const strong = document.createElement('strong');
                strong.textContent = value;
                const span = document.createElement('span');
                span.textContent = label;
                card.append(strong, span);
                return card;
            }));
        }

        function buildMailTroubleshootingSteps(verification = {}, operationsVerification = {}, items = []) {
            const latest = items[0] || {};
            const reason = String(latest.reason || verification.lastTestReason || operationsVerification.lastTestReason || '').toLowerCase();
            const overdue = safeNumber(operationsVerification.overdueReceiptCount, 0) > 0 || latest.receiptOverdue === true;
            if (!verification.lastTestAt && !latest.checkedAt) {
                return {
                    ok: false,
                    status: '실제 발송 검증이 없습니다.',
                    steps: ['설정 화면에서 실제 메일 테스트를 실행합니다.', '관리자 화면에서 SMTP 접수 시각과 Message-ID를 확인합니다.', 'Gmail 받은편지함·전체메일·스팸함에서 제목을 검색한 뒤 수신 위치를 기록합니다.']
                };
            }
            if (latest.status && latest.status !== 'emailed') {
                const steps = [];
                if (/daily-email-limit|daily-limit/.test(reason)) steps.push('KST 기준 다음 날짜까지 기다리거나 일일 발송 한도와 예약 카운터를 확인합니다.');
                else if (/secret|auth|credentials|535/.test(reason)) steps.push('FOXBEAR_GMAIL_APP_PASSWORD가 16자리 Google 앱 비밀번호인지 확인하고 Functions를 재배포합니다.');
                else if (/recipient|rejected/.test(reason)) steps.push('수신자 주소와 Gmail 차단·필터 정책을 확인합니다.');
                else steps.push('Functions 로그에서 최근 실제 메일 테스트의 오류 코드와 SMTP 응답을 확인합니다.');
                steps.push('배포 상태 검증을 실행해 Functions 버전·SMTP·Firestore 인덱스를 확인합니다.');
                steps.push('원인을 수정한 뒤 새 실제 메일 테스트를 실행합니다.');
                return { ok: false, status: `최근 테스트 실패: ${reason || latest.status}`, steps };
            }
            if (overdue) {
                return {
                    ok: false,
                    status: 'SMTP 접수 후 30분 이상 실수신 확인이 없습니다.',
                    steps: ['Gmail에서 subject:"[AI마스터링 스튜디오][메일 테스트]"로 전체메일을 검색합니다.', '받은편지함에 없으면 스팸함·휴지통·필터 및 차단 주소를 확인합니다.', '메일의 Message-ID가 관리자 화면 기록과 일치하면 받은편지함 또는 스팸함 수신 확인을 기록합니다.']
                };
            }
            if (!verification.confirmedLatest) {
                return {
                    ok: false,
                    status: 'SMTP 접수는 확인됐지만 최신 테스트의 실수신 기록이 없습니다.',
                    steps: ['Gmail 받은편지함과 스팸함에서 최신 테스트 제목을 찾습니다.', 'Message-ID가 일치하는지 확인합니다.', '도착 위치에 맞는 수신 확인 버튼을 누릅니다.']
                };
            }
            if (verification.stale) {
                return {
                    ok: false,
                    status: '마지막 실수신 검증이 7일 이상 지났습니다.',
                    steps: ['새 실제 메일 테스트를 실행합니다.', 'Gmail에서 새 테스트 메일을 확인합니다.', '새 보고서 ID에 대해 수신 확인을 기록합니다.']
                };
            }
            return { ok: true, status: `메일 실수신 경로 정상 · ${formatTime(verification.lastConfirmedAt)}`, steps: ['주 1회 실제 메일 테스트를 유지합니다.', 'SMTP 접수와 Gmail 실수신 위치를 함께 기록합니다.', '30분 초과 미확인 경고가 발생하면 즉시 전체메일과 스팸함을 점검합니다.'] };
        }

        function renderMailTroubleshooter(verification = {}, operationsVerification = {}, items = []) {
            if (!el.adminIncidentMailTroubleshooterSteps || !el.adminIncidentMailTroubleshooterStatus) return;
            const guide = buildMailTroubleshootingSteps(verification, operationsVerification, items);
            el.adminIncidentMailTroubleshooterStatus.textContent = guide.status;
            el.adminIncidentMailTroubleshooterSteps.replaceChildren(...guide.steps.map(text => {
                const item = document.createElement('li');
                item.textContent = text;
                return item;
            }));
            el.adminIncidentMailTroubleshooter?.classList.toggle('is-ok', guide.ok === true);
        }

        function matchesMailTestFilter(item = {}, filter = 'all') {
            if (filter === 'all') return true;
            if (filter === 'smtp-accepted') return item.status === 'emailed';
            if (filter === 'receipt-confirmed') return item.receiptConfirmed === true;
            if (filter === 'receipt-pending') return item.status === 'emailed' && item.receiptConfirmed !== true && item.receiptDismissed !== true;
            if (filter === 'receipt-overdue') return item.receiptOverdue === true && item.receiptDismissed !== true;
            if (filter === 'spam') return item.receiptConfirmed === true && item.receiptLocation === 'spam';
            if (filter === 'failed') return item.status !== 'emailed';
            return true;
        }

        function mailTestPeriodCutoff(period = '30d') {
            const days = { '7d': 7, '30d': 30, '90d': 90 }[period];
            return days ? Date.now() - days * 86400000 : 0;
        }

        function summarizeMailTestItems(items = []) {
            const stats = items.reduce((result, item) => {
                result.total += 1;
                if (item.status === 'emailed') result.smtpAccepted += 1;
                else if (['failed', 'dead-letter'].includes(item.status)) result.failed += 1;
                else result.other += 1;
                if (item.receiptConfirmed) {
                    result.receiptConfirmed += 1;
                    if (item.receiptLocation === 'spam') result.spam += 1;
                    else result.inbox += 1;
                } else if (item.status === 'emailed' && item.receiptDismissed !== true) {
                    result.receiptPending += 1;
                    if (item.receiptOverdue) result.receiptOverdue += 1;
                }
                return result;
            }, { total: 0, smtpAccepted: 0, failed: 0, other: 0, receiptConfirmed: 0, receiptPending: 0, receiptOverdue: 0, inbox: 0, spam: 0 });
            stats.smtpSuccessRate = stats.total ? Math.round((stats.smtpAccepted / stats.total) * 1000) / 10 : 0;
            stats.receiptConfirmationRate = stats.smtpAccepted ? Math.round((stats.receiptConfirmed / stats.smtpAccepted) * 1000) / 10 : 0;
            return stats;
        }

        function renderMailTestTrend(items = []) {
            if (!el.adminIncidentMailTestTrend) return;
            const recent = items.slice(0, 14).reverse();
            if (!recent.length) {
                el.adminIncidentMailTestTrend.textContent = '';
                if (el.adminIncidentMailTestTrendStatus) el.adminIncidentMailTestTrendStatus.textContent = '선택 기간에 테스트 기록이 없습니다.';
                return;
            }
            const bars = recent.map((item, index) => {
                const bar = document.createElement('span');
                const confirmed = item.receiptConfirmed === true;
                const dismissed = item.receiptDismissed === true;
                const spam = confirmed && item.receiptLocation === 'spam';
                const smtp = item.status === 'emailed';
                bar.className = `admin-mail-trend-bar ${spam ? 'is-spam' : confirmed ? 'is-confirmed' : dismissed ? 'is-dismissed' : smtp ? 'is-smtp' : 'is-error'}`;
                bar.style.setProperty('--trend-height', `${Math.max(24, Math.round(((index + 1) / recent.length) * 42) + (confirmed ? 44 : dismissed ? 18 : smtp ? 24 : 8))}%`);
                const stateLabel = spam ? '스팸함 확인' : confirmed ? '받은편지함 확인' : dismissed ? '관리자 정리' : smtp ? 'SMTP 접수' : '발송 실패';
                bar.dataset.label = `${formatTime(item.smtpAcceptedAt || item.checkedAt)} · ${stateLabel}`;
                bar.setAttribute('aria-label', bar.dataset.label);
                bar.tabIndex = 0;
                return bar;
            });
            el.adminIncidentMailTestTrend.replaceChildren(...bars);
            const stats = summarizeMailTestItems(items);
            if (el.adminIncidentMailTestTrendStatus) el.adminIncidentMailTestTrendStatus.textContent = `최근 ${recent.length}건 · SMTP ${stats.smtpSuccessRate}% · 실수신 ${stats.receiptConfirmationRate}%`;
        }

        function applyMailTestFilters() {
            const queryText = String(el.adminIncidentMailTestSearch?.value || state.adminMailTestSearch || '').trim().toLowerCase();
            const filter = el.adminIncidentMailTestFilter?.value || state.adminMailTestFilter || 'all';
            const period = el.adminIncidentMailTestPeriod?.value || state.adminMailTestPeriod || '30d';
            const cutoff = mailTestPeriodCutoff(period);
            state.adminMailTestSearch = queryText;
            state.adminMailTestFilter = filter;
            state.adminMailTestPeriod = period;
            const periodItems = state.adminMailTestHistoryItems.filter(item => {
                if (!cutoff) return true;
                const at = Date.parse(item.smtpAcceptedAt || item.checkedAt || '');
                return at && at >= cutoff;
            });
            state.adminMailTestFilteredItems = periodItems.filter(item => {
                if (!matchesMailTestFilter(item, filter)) return false;
                if (!queryText) return true;
                const haystack = [item.subject, item.messageId, item.reportId, item.testId, item.status, item.reason, item.receiptLocation].join(' ').toLowerCase();
                return haystack.includes(queryText);
            });
            renderMailTestStats(summarizeMailTestItems(periodItems));
            renderMailTestTrend(periodItems);
            renderMailTestHistory(state.adminMailTestFilteredItems);
            if (el.adminIncidentMailTestCount) el.adminIncidentMailTestCount.textContent = `${state.adminMailTestFilteredItems.length}/${periodItems.length}건 표시 · 전체 ${state.adminMailTestHistoryItems.length}건`;
            if (el.adminIncidentMailTestExport) el.adminIncidentMailTestExport.disabled = state.adminMailTestFilteredItems.length === 0;
        }

        function csvCell(value) {
            return `"${String(value ?? '').replace(/"/g, '""')}"`;
        }

        async function saveCsvFile(csv, fileName, button) {
            if (button && activeCsvExports.has(button)) return false;
            if (button) {
                activeCsvExports.add(button);
                button.disabled = true;
                button.setAttribute('aria-busy', 'true');
            }
            try {
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                if (downloadBlob) await downloadBlob(blob, fileName);
                else {
                    const url = URL.createObjectURL(blob);
                    const anchor = document.createElement('a');
                    anchor.href = url;
                    anchor.download = fileName;
                    anchor.rel = 'noopener noreferrer';
                    document.body.appendChild(anchor);
                    anchor.click();
                    anchor.remove();
                    setTimeout(() => { try { URL.revokeObjectURL(url); } catch (error) {} }, 60000);
                }
                return true;
            } finally {
                if (button) {
                    activeCsvExports.delete(button);
                    button.removeAttribute('aria-busy');
                    button.disabled = button === el.adminIncidentMailTestExport
                        ? (state.adminMailTestFilteredItems || []).length === 0
                        : button === el.adminIncidentAuditExport
                            ? (state.adminIncidentAuditFilteredItems || []).length === 0
                            : false;
                }
            }
        }

        async function exportMailTestHistory() {
            const items = state.adminMailTestFilteredItems || [];
            if (!items.length) {
                showToast('내보낼 실제 메일 테스트 이력이 없습니다.');
                return false;
            }
            const rows = [['테스트 시간', '상태', '사유', 'SMTP 접수 시각', '실수신 위치', '실수신 확인 시각', '제목', 'Message-ID', '보고서 ID', '테스트 ID']];
            items.forEach(item => rows.push([item.checkedAt, item.status, item.reason, item.smtpAcceptedAt, item.receiptLocation, item.receiptConfirmedAt, item.subject, item.messageId, item.reportId, item.testId]));
            const csv = '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\n');
            try {
                const saved = await saveCsvFile(csv, `ai-mastering-mail-tests-${state.adminMailTestPeriod || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`, el.adminIncidentMailTestExport);
                if (!saved) return false;
                showToast(`${items.length}건의 메일 테스트 이력을 CSV로 저장했습니다.`);
                return true;
            } catch (error) {
                showToast(`메일 테스트 CSV 저장 실패: ${error?.message || error}`);
                return false;
            }
        }

        function renderMailTestHistory(items = []) {
            if (!el.adminIncidentMailTestRows) return;
            el.adminIncidentMailTestRows.textContent = '';
            if (!items.length) {
                const row = document.createElement('tr');
                const cell = document.createElement('td');
                cell.colSpan = 4;
                cell.textContent = '선택한 기간·필터에 해당하는 실제 메일 테스트 이력이 없습니다.';
                row.appendChild(cell);
                el.adminIncidentMailTestRows.appendChild(row);
                return;
            }
            items.slice(0, 200).forEach(item => {
                const row = document.createElement('tr');
                const timeCell = document.createElement('td');
                timeCell.textContent = formatTime(item.smtpAcceptedAt || item.checkedAt);
                const smtpCell = document.createElement('td');
                const smtpChip = document.createElement('span');
                smtpChip.className = `admin-mail-status-chip ${item.status === 'emailed' ? 'is-ok' : 'is-error'}`;
                smtpChip.textContent = item.status === 'emailed' ? `SMTP 접수 · 승인 ${safeNumber(item.acceptedCount, 0)}` : `발송 실패 · ${item.reason || item.status || 'unknown'}`;
                smtpCell.appendChild(smtpChip);
                const receiptCell = document.createElement('td');
                const receiptChip = document.createElement('span');
                const receiptLabel = item.receiptConfirmed
                    ? `${item.receiptLocation === 'spam' ? '스팸함' : '받은편지함'} · ${formatTime(item.receiptConfirmedAt)}`
                    : item.receiptDismissed ? `관리자 정리 · ${formatTime(item.receiptResolvedAt)}`
                        : item.receiptOverdue ? `30분 초과 미확인 · ${formatTime(item.receiptDueAt)}`
                            : item.status === 'emailed' ? `확인 대기 · ${formatTime(item.receiptDueAt)}` : '해당 없음';
                receiptChip.className = `admin-mail-status-chip ${item.receiptConfirmed ? item.receiptLocation === 'spam' ? 'is-spam' : 'is-ok' : item.receiptDismissed ? 'is-muted' : item.receiptOverdue ? 'is-error' : 'is-pending'}`;
                receiptChip.textContent = receiptLabel;
                receiptCell.appendChild(receiptChip);
                receiptCell.classList.toggle('admin-mail-test-overdue', item.receiptOverdue === true);
                const detailCell = document.createElement('td');
                detailCell.textContent = limitText(item.subject || '-', 180);
                const detail = document.createElement('small');
                detail.textContent = limitText(item.messageId || item.reportId || '', 240);
                detailCell.appendChild(detail);
                timeCell.dataset.label = '테스트 시간';
                smtpCell.dataset.label = 'SMTP';
                receiptCell.dataset.label = '실수신';
                detailCell.dataset.label = '제목 / 식별자';
                row.append(timeCell, smtpCell, receiptCell, detailCell);
                el.adminIncidentMailTestRows.appendChild(row);
            });
        }

        function renderHistory(history = []) {
            if (!el.adminIncidentHistoryRows) return;
            el.adminIncidentHistoryRows.textContent = '';
            if (!history.length) {
                const row = document.createElement('tr');
                const cell = document.createElement('td');
                cell.colSpan = 5;
                cell.textContent = '아직 운영 이력이 없습니다.';
                row.appendChild(cell);
                el.adminIncidentHistoryRows.appendChild(row);
                return;
            }
            history.slice(0, 240).forEach(item => {
                const row = document.createElement('tr');
                const timeCell = document.createElement('td');
                timeCell.textContent = formatTime(item.checkedAt);
                const statusCell = document.createElement('td');
                statusCell.textContent = formatOperationsStatus(item.status);
                const queueCell = document.createElement('td');
                queueCell.textContent = `미발송 ${safeNumber(item.stale, 0)} · 최종 실패 ${safeNumber(item.deadLetter, 0)}`;
                const queueDetail = document.createElement('small');
                queueDetail.textContent = `대기 ${safeNumber(item.pending, 0)} · 실패 ${safeNumber(item.failed, 0)}`;
                queueCell.appendChild(queueDetail);
                const channelCell = document.createElement('td');
                channelCell.textContent = `SMTP ${item.smtpStatus || 'unknown'} · Webhook ${item.webhookStatus || 'disabled'}`;
                const channelDetail = document.createElement('small');
                channelDetail.textContent = item.alertStatus ? `경보 ${item.alertStatus}` : '경보 없음';
                channelCell.appendChild(channelDetail);
                const actionCell = document.createElement('td');
                const action = item.recommendedActions?.[0] || (item.reasonCodes?.length ? `원인 코드: ${item.reasonCodes.join(', ')}` : '추가 조치 없음');
                actionCell.textContent = action;
                if (item.recommendedActions?.length) actionCell.className = 'admin-incident-action-recommendation';
                row.append(timeCell, statusCell, queueCell, channelCell, actionCell);
                el.adminIncidentHistoryRows.appendChild(row);
            });
        }


        function formatAuditAction(action) {
            const labels = {
                'admin-access-unlock': '관리자 인증',
                'admin-access-revoke': '관리자 로그아웃'
            };
            return labels[action] || action || 'unknown';
        }

        function renderAuditLog(items = []) {
            if (!el.adminIncidentAuditRows) return;
            el.adminIncidentAuditRows.textContent = '';
            if (!items.length) {
                const row = document.createElement('tr');
                const cell = document.createElement('td');
                cell.colSpan = 5;
                cell.textContent = '검색 조건에 해당하는 관리자 작업이 없습니다.';
                row.appendChild(cell);
                el.adminIncidentAuditRows.appendChild(row);
                return;
            }
            items.forEach(item => {
                const row = document.createElement('tr');
                row.className = `admin-audit-row is-${String(item.status || 'recorded').replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`;
                const values = [
                    ['시간', formatTime(item.at)],
                    ['관리자', item.uid ? `${item.uid.slice(0, 8)}…` : '-'],
                    ['작업', formatAuditAction(item.action)],
                    ['상태', item.status || 'recorded'],
                    ['대상 / 결과', [item.targetType, item.targetId, item.reason, item.result?.succeeded ? `성공 ${item.result.succeeded}` : '', item.result?.failed ? `실패 ${item.result.failed}` : ''].filter(Boolean).join(' · ') || '-']
                ];
                values.forEach(([label, value]) => {
                    const cell = document.createElement('td');
                    cell.dataset.label = label;
                    cell.textContent = limitText(value, 220);
                    row.appendChild(cell);
                });
                el.adminIncidentAuditRows.appendChild(row);
            });
        }

        function applyAdminDensityMode(compact) {
            state.adminIncidentCompact = Boolean(compact);
            const panel = el.adminIncidentsPanel || el.adminStatsDialog;
            panel?.classList.toggle('admin-incident-compact', state.adminIncidentCompact);
            if (el.adminIncidentDensityToggle) {
                el.adminIncidentDensityToggle.setAttribute('aria-pressed', state.adminIncidentCompact ? 'true' : 'false');
                el.adminIncidentDensityToggle.textContent = state.adminIncidentCompact ? '상세 보기' : '간소화 보기';
            }
            try { global.localStorage?.setItem('foxbear:admin-incident-density', state.adminIncidentCompact ? 'compact' : 'detail'); } catch (error) {}
        }

        function matchesAuditFilter(item, filter) {
            return filter === 'all' || String(item.status || 'recorded') === filter;
        }

        function applyAuditFilters() {
            const queryText = String(el.adminIncidentAuditSearch?.value || state.adminIncidentAuditSearch || '').trim().toLowerCase();
            const filter = el.adminIncidentAuditFilter?.value || state.adminIncidentAuditFilter || 'all';
            state.adminIncidentAuditSearch = queryText;
            state.adminIncidentAuditFilter = filter;
            state.adminIncidentAuditFilteredItems = state.adminIncidentAuditItems.filter(item => {
                if (!matchesAuditFilter(item, filter)) return false;
                if (!queryText) return true;
                const haystack = [item.uid, item.action, item.status, item.targetType, item.targetId, item.reason, item.requestId].join(' ').toLowerCase();
                return haystack.includes(queryText);
            });
            renderAuditLog(state.adminIncidentAuditFilteredItems);
            if (el.adminIncidentAuditMore) el.adminIncidentAuditMore.disabled = !state.adminIncidentAuditHasMore;
            if (el.adminIncidentAuditExport) el.adminIncidentAuditExport.disabled = state.adminIncidentAuditFilteredItems.length === 0;
            if (el.adminIncidentAuditStatus) el.adminIncidentAuditStatus.textContent = `${state.adminIncidentAuditFilteredItems.length}/${state.adminIncidentAuditItems.length}건 표시${state.adminIncidentAuditHasMore ? ' · 추가 로그 있음' : ''}`;
        }

        async function loadAuditPage(reset = false) {
            const bridge = getBridge();
            if (!bridge || typeof bridge.getIncidentAdminAuditLog !== 'function') return;
            if (reset) {
                state.adminIncidentAuditItems = [];
                state.adminIncidentAuditNextCursor = 0;
                state.adminIncidentAuditHasMore = false;
            }
            if (el.adminIncidentAuditMore) el.adminIncidentAuditMore.disabled = true;
            if (el.adminIncidentAuditStatus) el.adminIncidentAuditStatus.textContent = '감사 로그를 불러오는 중입니다…';
            try {
                const page = await bridge.getIncidentAdminAuditLog({ limit: 24, before: reset ? 0 : state.adminIncidentAuditNextCursor });
                state.adminIncidentAuditItems = reset ? (page.items || []) : state.adminIncidentAuditItems.concat(page.items || []);
                state.adminIncidentAuditNextCursor = safeNumber(page.nextCursor, 0);
                state.adminIncidentAuditHasMore = page.hasMore === true;
                applyAuditFilters();
            } catch (error) {
                showToast(`감사 로그 조회 실패: ${error?.message || error}`);
                applyAuditFilters();
            }
        }

        async function exportAuditLog() {
            const items = state.adminIncidentAuditFilteredItems || [];
            if (!items.length) {
                showToast('내보낼 관리자 감사 로그가 없습니다.');
                return false;
            }
            const rows = [['시간', '관리자 UID', '작업', '상태', '대상 유형', '대상 ID', '사유', '요청 ID', '시도', '성공', '실패', '건너뜀']];
            items.forEach(item => rows.push([item.at, item.uid, item.action, item.status, item.targetType, item.targetId, item.reason, item.requestId, item.result?.attempted || 0, item.result?.succeeded || 0, item.result?.failed || 0, item.result?.skipped || 0]));
            const csv = '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\n');
            try {
                const saved = await saveCsvFile(csv, `ai-mastering-admin-audit-${new Date().toISOString().slice(0, 10)}.csv`, el.adminIncidentAuditExport);
                if (!saved) return false;
                showToast(`${items.length}건의 관리자 감사 로그를 CSV로 저장했습니다.`);
                return true;
            } catch (error) {
                showToast(`관리자 감사 로그 CSV 저장 실패: ${error?.message || error}`);
                return false;
            }
        }

        function updateHistoryControls() {
            if (el.adminIncidentHistoryMore) el.adminIncidentHistoryMore.disabled = !state.adminIncidentHistoryHasMore;
            if (el.adminIncidentHistoryStatus) {
                el.adminIncidentHistoryStatus.textContent = `${state.adminIncidentHistoryItems.length}건 표시${state.adminIncidentHistoryHasMore ? ' · 추가 이력 있음' : ''}`;
            }
        }

        async function loadHistoryPage(reset = false) {
            const bridge = getBridge();
            if (!bridge || typeof bridge.getIncidentOperationsHistory !== 'function') return;
            const filter = el.adminIncidentHistoryFilter?.value || 'all';
            if (reset) {
                state.adminIncidentHistoryItems = [];
                state.adminIncidentHistoryNextCursor = 0;
                state.adminIncidentHistoryHasMore = false;
            }
            if (el.adminIncidentHistoryMore) el.adminIncidentHistoryMore.disabled = true;
            if (el.adminIncidentHistoryStatus) el.adminIncidentHistoryStatus.textContent = '운영 이력을 불러오는 중입니다…';
            try {
                const page = await bridge.getIncidentOperationsHistory({ limit: 24, filter, before: reset ? 0 : state.adminIncidentHistoryNextCursor });
                state.adminIncidentHistoryFilter = filter;
                state.adminIncidentHistoryItems = reset ? (page.items || []) : state.adminIncidentHistoryItems.concat(page.items || []);
                state.adminIncidentHistoryNextCursor = safeNumber(page.nextCursor, 0);
                state.adminIncidentHistoryHasMore = page.hasMore === true;
                renderHistory(state.adminIncidentHistoryItems);
            } catch (error) {
                showToast(`운영 이력 조회 실패: ${error?.message || error}`);
            } finally {
                updateHistoryControls();
            }
        }

        function summarizeHistory(history = []) {
            const threshold = Date.now() - 24 * 60 * 60 * 1000;
            return history.reduce((result, item) => {
                const at = Date.parse(item.checkedAt || '');
                if (!at || at < threshold) return result;
                if (item.status === 'critical') result.critical += 1;
                else if (item.status === 'warning') result.warning += 1;
                else if (item.status === 'healthy') result.healthy += 1;
                return result;
            }, { healthy: 0, warning: 0, critical: 0 });
        }

        function bindBatchRecoveryActions() {
            if (el.adminIncidentMailTestSearch && !el.adminIncidentMailTestSearch.dataset.bound) {
                el.adminIncidentMailTestSearch.dataset.bound = '1';
                el.adminIncidentMailTestSearch.addEventListener('input', applyMailTestFilters);
            }
            if (el.adminIncidentMailTestPeriod && !el.adminIncidentMailTestPeriod.dataset.bound) {
                el.adminIncidentMailTestPeriod.dataset.bound = '1';
                el.adminIncidentMailTestPeriod.value = state.adminMailTestPeriod;
                el.adminIncidentMailTestPeriod.addEventListener('change', applyMailTestFilters);
            }
            if (el.adminIncidentMailTestFilter && !el.adminIncidentMailTestFilter.dataset.bound) {
                el.adminIncidentMailTestFilter.dataset.bound = '1';
                el.adminIncidentMailTestFilter.addEventListener('change', applyMailTestFilters);
            }
            if (el.adminIncidentMailTestExport && !el.adminIncidentMailTestExport.dataset.bound) {
                el.adminIncidentMailTestExport.dataset.bound = '1';
                el.adminIncidentMailTestExport.addEventListener('click', exportMailTestHistory);
            }
            if (el.adminIncidentDensityToggle && !el.adminIncidentDensityToggle.dataset.bound) {
                el.adminIncidentDensityToggle.dataset.bound = '1';
                el.adminIncidentDensityToggle.addEventListener('click', () => applyAdminDensityMode(!state.adminIncidentCompact));
            }
            if (el.adminIncidentCleanupUnconfirmed && !el.adminIncidentCleanupUnconfirmed.dataset.bound) {
                el.adminIncidentCleanupUnconfirmed.dataset.bound = '1';
                el.adminIncidentCleanupUnconfirmed.addEventListener('click', () => requestMailTestCleanup(el.adminIncidentCleanupUnconfirmed));
            }
            if (el.adminIncidentAuditSearch && !el.adminIncidentAuditSearch.dataset.bound) {
                el.adminIncidentAuditSearch.dataset.bound = '1';
                el.adminIncidentAuditSearch.addEventListener('input', applyAuditFilters);
            }
            if (el.adminIncidentAuditFilter && !el.adminIncidentAuditFilter.dataset.bound) {
                el.adminIncidentAuditFilter.dataset.bound = '1';
                el.adminIncidentAuditFilter.addEventListener('change', applyAuditFilters);
            }
            if (el.adminIncidentAuditMore && !el.adminIncidentAuditMore.dataset.bound) {
                el.adminIncidentAuditMore.dataset.bound = '1';
                el.adminIncidentAuditMore.addEventListener('click', () => loadAuditPage(false));
            }
            if (el.adminIncidentAuditExport && !el.adminIncidentAuditExport.dataset.bound) {
                el.adminIncidentAuditExport.dataset.bound = '1';
                el.adminIncidentAuditExport.addEventListener('click', exportAuditLog);
            }
            if (el.adminIncidentRecoverDue && !el.adminIncidentRecoverDue.dataset.bound) {
                el.adminIncidentRecoverDue.dataset.bound = '1';
                el.adminIncidentRecoverDue.addEventListener('click', () => requestBatchRecovery('recoverable', el.adminIncidentRecoverDue));
            }
            if (el.adminIncidentRecoverDead && !el.adminIncidentRecoverDead.dataset.bound) {
                el.adminIncidentRecoverDead.dataset.bound = '1';
                el.adminIncidentRecoverDead.addEventListener('click', () => requestBatchRecovery('dead-letter', el.adminIncidentRecoverDead));
            }
            if (el.adminIncidentTestWebhook && !el.adminIncidentTestWebhook.dataset.bound) {
                el.adminIncidentTestWebhook.dataset.bound = '1';
                el.adminIncidentTestWebhook.addEventListener('click', () => requestAlertChannelTest(el.adminIncidentTestWebhook));
            }
            if (el.adminIncidentHistoryFilter && !el.adminIncidentHistoryFilter.dataset.bound) {
                el.adminIncidentHistoryFilter.dataset.bound = '1';
                el.adminIncidentHistoryFilter.addEventListener('change', () => loadHistoryPage(true));
            }
            if (el.adminIncidentHistoryMore && !el.adminIncidentHistoryMore.dataset.bound) {
                el.adminIncidentHistoryMore.dataset.bound = '1';
                el.adminIncidentHistoryMore.addEventListener('click', () => loadHistoryPage(false));
            }
            if (el.adminIncidentVerifyDeployment && !el.adminIncidentVerifyDeployment.dataset.bound) {
                el.adminIncidentVerifyDeployment.dataset.bound = '1';
                el.adminIncidentVerifyDeployment.addEventListener('click', () => requestDeploymentVerification(el.adminIncidentVerifyDeployment, false));
            }
            if (el.adminIncidentConfirmInbox && !el.adminIncidentConfirmInbox.dataset.bound) {
                el.adminIncidentConfirmInbox.dataset.bound = '1';
                el.adminIncidentConfirmInbox.addEventListener('click', () => requestMailReceiptConfirmation('inbox', el.adminIncidentConfirmInbox));
            }
            if (el.adminIncidentConfirmSpam && !el.adminIncidentConfirmSpam.dataset.bound) {
                el.adminIncidentConfirmSpam.dataset.bound = '1';
                el.adminIncidentConfirmSpam.addEventListener('click', () => requestMailReceiptConfirmation('spam', el.adminIncidentConfirmSpam));
            }
        }

        async function requestMailTestCleanup(button) {
            const bridge = getBridge();
            if (!bridge || typeof bridge.requestIncidentMailTestCleanup !== 'function' || typeof bridge.getIncidentMailTestCleanupRequest !== 'function') {
                showToast('미확인 테스트 정리 API가 준비되지 않았습니다.');
                return;
            }
            const original = button?.textContent || '24시간 초과 미확인 정리';
            if (button) { button.disabled = true; button.textContent = '정리 요청 중…'; }
            try {
                const request = await bridge.requestIncidentMailTestCleanup();
                let settled = false;
                for (let index = 0; index < 30; index += 1) {
                    await new Promise(resolve => setTimeout(resolve, 1200));
                    const status = await bridge.getIncidentMailTestCleanupRequest(request.requestId).catch(() => null);
                    if (!status || ['pending', 'running', 'missing'].includes(status.status)) continue;
                    settled = true;
                    if (status.status === 'completed') {
                        const result = status.result || {};
                        showToast(`미확인 테스트 정리 완료 · ${safeNumber(result.cleaned, 0)}건 정리 · ${safeNumber(result.skipped, 0)}건 유지`);
                    } else {
                        const retryText = status.retryAfterSeconds ? ` · ${status.retryAfterSeconds}초 후 재시도` : '';
                        showToast(`미확인 테스트 정리 실패: ${status.reason || status.status}${retryText}`);
                    }
                    break;
                }
                if (!settled) showToast('미확인 테스트 정리가 서버에서 계속 진행 중입니다. 잠시 후 새로고침하세요.');
                await render(true);
            } catch (error) {
                showToast(`미확인 테스트 정리 실패: ${error?.message || error}`);
            } finally {
                if (button) { button.disabled = false; button.textContent = original; }
            }
        }

        async function requestMailReceiptConfirmation(location, button) {
            const bridge = getBridge();
            const reportId = state.adminIncidentLatestMailTestReportId || '';
            if (!reportId) {
                showToast('먼저 설정 화면에서 실제 메일 테스트를 실행하고 SMTP 접수를 확인하세요.');
                return;
            }
            if (!bridge || typeof bridge.requestIncidentMailReceiptConfirmation !== 'function') {
                showToast('메일 수신 확인 API가 준비되지 않았습니다.');
                return;
            }
            const original = button?.textContent || '메일 수신 확인';
            if (button) { button.disabled = true; button.textContent = '기록 중…'; }
            try {
                const request = await bridge.requestIncidentMailReceiptConfirmation(reportId, location);
                let settled = false;
                for (let index = 0; index < 20; index += 1) {
                    await new Promise(resolve => setTimeout(resolve, 1200));
                    const status = await bridge.getIncidentMailReceiptConfirmationRequest(request.requestId).catch(() => null);
                    if (!status || ['pending', 'running', 'missing'].includes(status.status)) continue;
                    settled = true;
                    showToast(status.status === 'completed'
                        ? `${location === 'spam' ? '스팸함' : '받은편지함'} 실수신 확인을 기록했습니다.`
                        : `메일 수신 확인 기록 실패: ${status.reason || status.status}`);
                    break;
                }
                if (!settled) showToast('수신 확인 기록이 서버에서 처리 중입니다. 잠시 후 새로고침하세요.');
                await render(true);
            } catch (error) {
                showToast(`메일 수신 확인 실패: ${error?.message || error}`);
            } finally {
                if (button) { button.disabled = false; button.textContent = original; }
            }
        }

        async function requestBatchRecovery(mode, button) {
            const bridge = getBridge();
            if (!bridge || typeof bridge.requestIncidentBatchRecovery !== 'function') {
                showToast('일괄 복구 API가 준비되지 않았습니다.');
                return;
            }
            const original = button?.textContent || '일괄 복구';
            if (button) { button.disabled = true; button.textContent = '요청 중…'; }
            try {
                const request = await bridge.requestIncidentBatchRecovery(mode);
                showToast(mode === 'dead-letter' ? '최종 실패 메일 일괄 재전송을 요청했습니다.' : '미발송 메일 일괄 복구를 요청했습니다.');
                if (request?.requestId && typeof bridge.getIncidentBatchRecoveryRequest === 'function') {
                    let settled = false;
                    for (let index = 0; index < 45; index += 1) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        const status = await bridge.getIncidentBatchRecoveryRequest(request.requestId).catch(() => null);
                        if (!status || ['pending', 'running', 'missing'].includes(status.status)) continue;
                        const result = status.result || {};
                        showToast(status.status === 'completed'
                            ? `일괄 복구 완료: 성공 ${safeNumber(result.emailed, 0)} · 실패 ${safeNumber(result.failed, 0) + safeNumber(result.deadLetter, 0)} · 건너뜀 ${safeNumber(result.skipped, 0)}`
                            : status.status === 'rejected' && status.retryAfterSeconds
                                ? `일괄 복구 요청 제한: ${status.retryAfterSeconds}초 후 다시 시도하세요.`
                                : `일괄 복구 실패: ${status.reason || status.status}`);
                        settled = true;
                        break;
                    }
                    if (!settled) {
                        showToast('일괄 복구가 서버에서 계속 진행 중입니다. 운영 상태에서 결과를 다시 확인하세요.');
                    }
                }
                await render(true);
            } catch (error) {
                showToast(`일괄 복구 요청 실패: ${error?.message || error}`);
            } finally {
                if (button) { button.disabled = false; button.textContent = original; }
            }
        }


        async function requestAlertChannelTest(button) {
            const bridge = getBridge();
            if (!bridge || typeof bridge.requestIncidentAlertChannelTest !== 'function') {
                showToast('보조 경보 테스트 API가 준비되지 않았습니다.');
                return;
            }
            const original = button?.textContent || '보조 경보 테스트';
            if (button) { button.disabled = true; button.textContent = '테스트 중…'; }
            try {
                const request = await bridge.requestIncidentAlertChannelTest();
                for (let index = 0; index < 30; index += 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    const status = await bridge.getIncidentAlertChannelTestRequest(request.requestId).catch(() => null);
                    if (!status || ['pending', 'running', 'missing'].includes(status.status)) continue;
                    if (status.status === 'completed') showToast(`보조 경보 테스트 성공: ${status.provider || 'HTTPS'} 채널이 응답했습니다.`);
                    else if (status.status === 'rejected' && status.retryAfterSeconds) showToast(`테스트 요청 제한: ${status.retryAfterSeconds}초 후 다시 시도하세요.`);
                    else showToast(`보조 경보 테스트 실패: ${status.reason || status.status}`);
                    break;
                }
                await render(true);
            } catch (error) {
                showToast(`보조 경보 테스트 요청 실패: ${error?.message || error}`);
            } finally {
                if (button) { button.disabled = false; button.textContent = original; }
            }
        }

        function maybeAutoVerifyDeployment(deployment = {}) {
            const expected = global.FoxBearBuildInfo?.productVersion || '';
            const mismatch = expected && deployment.productVersion && expected !== deployment.productVersion;
            if (state.adminIncidentDeploymentVerificationRequested || (deployment.exists && !deployment.stale && !mismatch)) return;
            state.adminIncidentDeploymentVerificationRequested = true;
            requestDeploymentVerification(null, true).catch(() => {});
        }

        async function requestDeploymentVerification(button, silent = false) {
            const bridge = getBridge();
            if (!bridge || typeof bridge.requestIncidentDeploymentVerification !== 'function') {
                if (!silent) showToast('배포 검증 API가 준비되지 않았습니다.');
                return;
            }
            const original = button?.textContent || '배포 상태 검증';
            if (button) { button.disabled = true; button.textContent = '검증 중…'; }
            try {
                const request = await bridge.requestIncidentDeploymentVerification();
                let completed = false;
                for (let index = 0; index < 40; index += 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    const status = await bridge.getIncidentDeploymentVerificationRequest(request.requestId).catch(() => null);
                    if (!status || ['pending', 'running', 'missing'].includes(status.status)) continue;
                    completed = true;
                    if (!silent) {
                        if (status.status === 'completed') showToast(`배포 검증 완료: Functions v${status.result?.productVersion || '미확인'} · ${status.result?.status || 'unknown'}`);
                        else if (status.status === 'rejected' && status.retryAfterSeconds) showToast(`배포 검증 제한: ${status.retryAfterSeconds}초 후 다시 시도하세요.`);
                        else showToast(`배포 검증 실패: ${status.reason || status.status}`);
                    }
                    break;
                }
                if (!completed && !silent) showToast('배포 검증이 서버에서 계속 진행 중입니다. 잠시 후 새로고침하세요.');
                await render(true);
            } catch (error) {
                if (!silent) showToast(`배포 검증 요청 실패: ${error?.message || error}`);
            } finally {
                if (button) { button.disabled = false; button.textContent = original; }
            }
        }

        function formatStatus(status, attemptCount = 0, terminal = false) {
            const labels = {
                pending: '대기', sending: '발송 중', retrying: '재시도 중', emailed: '발송 완료',
                failed: terminal ? '최종 실패' : '발송 실패', 'dead-letter': '최종 실패', reserved: '예약됨',
                'suppressed-duplicate': '중복 억제', 'suppressed-rate-limit': '일일 제한'
            };
            const label = labels[status] || status || '대기';
            return attemptCount ? `${label} · ${attemptCount}회` : label;
        }

        async function requestRetry(reportId, button, forceTerminal = false) {
            const bridge = getBridge();
            if (!bridge || typeof bridge.requestIncidentRetry !== 'function') {
                showToast('메일 재전송 API가 준비되지 않았습니다.');
                return;
            }
            const original = button?.textContent || '지금 재전송';
            if (button) {
                button.disabled = true;
                button.textContent = '요청 중…';
            }
            try {
                const request = await bridge.requestIncidentRetry(reportId, { forceTerminal });
                if (button) button.textContent = '재전송 요청됨';
                showToast(forceTerminal ? '최종 실패 메일의 강제 재전송을 요청했습니다.' : '메일 재전송을 요청했습니다.');
                if (request?.requestId && typeof bridge.getIncidentRetryRequest === 'function') {
                    for (let index = 0; index < 8; index += 1) {
                        await new Promise(resolve => setTimeout(resolve, 1400));
                        const status = await bridge.getIncidentRetryRequest(request.requestId).catch(() => null);
                        if (!status || ['pending', 'missing'].includes(status.status)) continue;
                        showToast(status.status === 'emailed' ? '오류 메일 재전송을 완료했습니다.' : status.status === 'rejected' && status.retryAfterSeconds ? `재전송 요청 제한: ${status.retryAfterSeconds}초 후 다시 시도하세요.` : `재전송 결과: ${status.status}`);
                        break;
                    }
                }
                await render(true);
            } catch (error) {
                showToast(`재전송 요청 실패: ${error?.message || error}`);
                if (button) {
                    button.disabled = false;
                    button.textContent = original;
                }
            }
        }

        return Object.freeze({ render, formatStatus, formatOperationsStatus, formatSmtpStatus, formatWebhookStatus, formatDeploymentStatus, summarizeHistory, collectRecommendations, buildMailTroubleshootingSteps, matchesMailTestFilter });
    }

    global.FoxBearAdminIncidentMonitorView = Object.freeze({ create });
})(window);
