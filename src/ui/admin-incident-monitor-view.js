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
                const appCheck = data?.appCheck || bridge.appCheck || {};
                const operationalStatus = operations.stale ? 'stale' : (operations.status || 'unknown');
                makeSummaryCard('오늘 오류(KST)', `${safeNumber(summary.today, 0)}건`, 'firebase').forEach(node => el.adminIncidentsSummary.appendChild(node));
                makeSummaryCard('메일 운영', formatOperationsStatus(operationalStatus), ['healthy'].includes(operationalStatus) ? 'firebase' : 'warning').forEach(node => el.adminIncidentsSummary.appendChild(node));
                makeSummaryCard('장기 미발송', `${safeNumber(queue.stale, 0)}건`, queue.stale ? 'warning' : 'firebase').forEach(node => el.adminIncidentsSummary.appendChild(node));
                makeSummaryCard('최종 실패', `${safeNumber(queue.deadLetter ?? summary.deadLetter, 0)}건`, (queue.deadLetter ?? summary.deadLetter) ? 'warning' : 'firebase').forEach(node => el.adminIncidentsSummary.appendChild(node));
                makeSummaryCard('SMTP/Secret', formatSmtpStatus(smtp.status), smtp.status === 'ok' ? 'firebase' : 'warning').forEach(node => el.adminIncidentsSummary.appendChild(node));
                makeSummaryCard('오늘 발송', `${safeNumber(quota.sent, 0)}/${safeNumber(quota.limit, 40)}`, quota.reservationLeak ? 'warning' : 'firebase').forEach(node => el.adminIncidentsSummary.appendChild(node));
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
                    el.adminIncidentsNotice.textContent = `메일 실패는 10분·30분·2시간 간격으로 최대 3회 자동 재시도하며, 운영 점검은 15분마다 실행됩니다.${checked}${issues}${smtpDetail} ${protection}`;
                }
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
                        showToast(status.status === 'emailed' ? '오류 메일 재전송을 완료했습니다.' : `재전송 결과: ${status.status}`);
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

        return Object.freeze({ render, formatStatus, formatOperationsStatus, formatSmtpStatus });
    }

    global.FoxBearAdminIncidentMonitorView = Object.freeze({ create });
})(window);
