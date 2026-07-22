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
        state.adminIncidentHistoryItems = Array.isArray(state.adminIncidentHistoryItems) ? state.adminIncidentHistoryItems : [];
        state.adminIncidentHistoryNextCursor = Number(state.adminIncidentHistoryNextCursor || 0);
        state.adminIncidentHistoryHasMore = state.adminIncidentHistoryHasMore === true;
        state.adminIncidentHistoryFilter = state.adminIncidentHistoryFilter || 'all';
        bindBatchRecoveryActions();

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
                const history = Array.isArray(data?.history) ? data.history : [];
                const auditLog = Array.isArray(data?.auditLog) ? data.auditLog : [];
                const trend = summarizeHistory(history);
                const appCheck = data?.appCheck || bridge.appCheck || {};
                const operationalStatus = operations.stale ? 'stale' : (operations.status || 'unknown');
                makeSummaryCard('오늘 오류(KST)', `${safeNumber(summary.today, 0)}건`, 'firebase').forEach(node => el.adminIncidentsSummary.appendChild(node));
                makeSummaryCard('메일 운영', formatOperationsStatus(operationalStatus), ['healthy'].includes(operationalStatus) ? 'firebase' : 'warning').forEach(node => el.adminIncidentsSummary.appendChild(node));
                makeSummaryCard('장기 미발송', `${safeNumber(queue.stale, 0)}건`, queue.stale ? 'warning' : 'firebase').forEach(node => el.adminIncidentsSummary.appendChild(node));
                makeSummaryCard('최종 실패', `${safeNumber(queue.deadLetter ?? summary.deadLetter, 0)}건`, (queue.deadLetter ?? summary.deadLetter) ? 'warning' : 'firebase').forEach(node => el.adminIncidentsSummary.appendChild(node));
                makeSummaryCard('SMTP/Secret', formatSmtpStatus(smtp.status), smtp.status === 'ok' ? 'firebase' : 'warning').forEach(node => el.adminIncidentsSummary.appendChild(node));
                makeSummaryCard('오늘 발송', `${safeNumber(quota.sent, 0)}/${safeNumber(quota.limit, 40)}`, quota.reservationLeak ? 'warning' : 'firebase').forEach(node => el.adminIncidentsSummary.appendChild(node));
                makeSummaryCard('보조 경보', formatWebhookStatus(webhook), webhook.status === 'error' ? 'warning' : 'firebase').forEach(node => el.adminIncidentsSummary.appendChild(node));
                makeSummaryCard('자동 복구', formatRecovery(recovery), recovery.failed || recovery.deadLetter ? 'warning' : 'firebase').forEach(node => el.adminIncidentsSummary.appendChild(node));
                makeSummaryCard('24시간 추세', `${trend.critical}위험 · ${trend.warning}주의`, trend.critical || trend.warning ? 'warning' : 'firebase').forEach(node => el.adminIncidentsSummary.appendChild(node));
                makeSummaryCard('배포 검증', formatDeploymentStatus(deployment), deployment.status === 'healthy' && !deployment.stale ? 'firebase' : 'warning').forEach(node => el.adminIncidentsSummary.appendChild(node));
                makeSummaryCard('App Check', appCheck.ready ? '보호 중' : appCheck.configured ? '확인 필요' : '키 미설정', appCheck.ready ? 'firebase' : 'warning').forEach(node => el.adminIncidentsSummary.appendChild(node));
                if (el.adminIncidentsNotice) {
                    const protection = appCheck.ready
                        ? 'App Check 토큰이 활성화되어 있습니다.'
                        : appCheck.configured
                            ? `App Check 확인 필요: ${appCheck.error || '토큰 상태 미확인'}`
                            : 'App Check 사이트 키를 설정한 뒤 콘솔에서 점진적으로 강제 적용하세요.';
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
                    el.adminIncidentsNotice.textContent = `메일 실패는 10분·30분·2시간 간격으로 최대 3회 자동 재시도하며, 운영 점검은 15분마다 실행됩니다.${checked}${issues}${smtpDetail}${webhookDetail}${recommendationText} ${protection}`;
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
                state.adminIncidentHistoryItems = history;
                state.adminIncidentHistoryNextCursor = safeNumber(data?.historyNextCursor, 0);
                state.adminIncidentHistoryHasMore = data?.historyHasMore === true;
                state.adminIncidentHistoryFilter = 'all';
                if (el.adminIncidentHistoryFilter) el.adminIncidentHistoryFilter.value = 'all';
                renderHistory(state.adminIncidentHistoryItems);
                renderAuditLog(auditLog);
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


        function renderAuditLog(items = []) {
            if (!el.adminIncidentAuditRows) return;
            el.adminIncidentAuditRows.textContent = '';
            if (!items.length) {
                const row = document.createElement('tr');
                const cell = document.createElement('td');
                cell.colSpan = 5;
                cell.textContent = '아직 기록된 관리자 작업이 없습니다.';
                row.appendChild(cell);
                el.adminIncidentAuditRows.appendChild(row);
                return;
            }
            items.forEach(item => {
                const row = document.createElement('tr');
                [formatTime(item.at), item.uid ? `${item.uid.slice(0, 8)}…` : '-', item.action || 'unknown', item.status || 'recorded', [item.targetType, item.targetId, item.reason].filter(Boolean).join(' · ') || '-'].forEach(value => {
                    const cell = document.createElement('td');
                    cell.textContent = limitText(value, 220);
                    row.appendChild(cell);
                });
                el.adminIncidentAuditRows.appendChild(row);
            });
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

        return Object.freeze({ render, formatStatus, formatOperationsStatus, formatSmtpStatus, formatWebhookStatus, formatDeploymentStatus, summarizeHistory, collectRecommendations });
    }

    global.FoxBearAdminIncidentMonitorView = Object.freeze({ create });
})(window);
