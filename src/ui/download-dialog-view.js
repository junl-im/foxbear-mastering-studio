// FoxBear AI Mastering Studio Pro v1.5.54 - progress ETA, stall recovery, and safe dialog lifecycle
'use strict';

(function attachFoxBearDownloadDialogView(global) {
    function showDownloadOptionsDialog(track, deps = {}) {
        const {
            getDownloadEnvironmentInfo,
            getDownloadFormatOptions,
            prepareTrackDownloadBlob,
            getImmediateTrackDownloadBlob,
            isRestrictedDownloadBrowser,
            supportsWebShareFiles,
            supportsWebShareDownloadFiles,
            shareDownloadFile,
            showDownloadAssist,
            closeDownloadOptionsDialog,
            downloadBlob,
            copyCurrentPageUrl,
            openCurrentPageInExternalBrowser,
            copyDownloadTroubleshootingGuide,
            copyDownloadDiagnostics,
            copyDownloadRecoveryChecklist,
            getRecommendedDownloadFlow,
            getDownloadActionReceipt,
            getDownloadRecoveryChecklist,
            getDownloadCompactRecoveryPlan,
            getDownloadDialogCompactHint,
            getDownloadDialogDisplayProfile,
            foxBearHaptic = () => undefined,
            clearNativeBadgeIfDone = () => undefined,
            renderAll = () => undefined,
            getErrorMessage = (error, fallback = '알 수 없는 오류') => (error && error.message) || fallback,
            state = { busy: false }
        } = deps;
        if (typeof getDownloadEnvironmentInfo !== 'function' ||
            typeof getDownloadFormatOptions !== 'function' ||
            typeof prepareTrackDownloadBlob !== 'function' ||
            typeof closeDownloadOptionsDialog !== 'function' ||
            typeof downloadBlob !== 'function') {
            throw new Error('다운로드 다이얼로그 의존성이 준비되지 않았습니다.');
        }
        if (!track || !track.outBlob || !document.body) return;
        const previous = document.querySelector('.download-options-backdrop');
        try { previous?.__foxbearAbortController?.abort?.('download-dialog-replaced'); } catch (error) {}
        try { previous?.__foxbearCleanup?.(); } catch (error) {}
        if (previous) previous.remove();
        document.body.classList.remove('download-options-open');

        const env = getDownloadEnvironmentInfo();
        const flow = typeof getRecommendedDownloadFlow === 'function'
            ? getRecommendedDownloadFlow(track.outBlob || null, track.outName || track.name || 'FoxBear mastered file')
            : null;
        const compactHint = typeof getDownloadDialogCompactHint === 'function'
            ? getDownloadDialogCompactHint(track.outBlob || null, track.outName || track.name || 'FoxBear mastered file', 'dialog-open')
            : null;
        const displayProfile = typeof getDownloadDialogDisplayProfile === 'function'
            ? getDownloadDialogDisplayProfile(track.outBlob || null, track.outName || track.name || 'FoxBear mastered file', 'dialog-open')
            : {
                version: '1.5.54',
                mode: env.restricted ? 'restricted-declutter-fallback' : 'standard-declutter-fallback',
                headline: env.restricted ? '공유/저장만 먼저' : '다운로드만 먼저',
                detail: env.restricted ? '안 되면 저장 도움을 사용하세요.' : '저장이 안 보이면 다운로드 폴더를 확인하세요.',
                initialWarning: env.restricted ? '공유/저장을 먼저 누르세요.' : '다운로드를 먼저 누르세요.',
                receiptIdle: true,
                maxInitialReceiptSteps: env.restricted ? 1 : 0,
                maxActionReceiptSteps: 2,
                showChecklistOnOpen: false,
                showChecklistAfterAction: true,
                advancedCollapsed: true
            };
        const backdrop = document.createElement('div');
        backdrop.className = 'download-options-backdrop';
        backdrop.setAttribute('role', 'dialog');
        backdrop.setAttribute('aria-modal', 'true');
        backdrop.setAttribute('aria-label', '다운로드 및 공유');

        const panel = document.createElement('section');
        panel.className = `download-options-panel download-options-panel-v3 download-options-panel-v4 download-options-panel-v5 ${env.restricted ? 'restricted' : 'normal'}`;
        panel.dataset.downloadDisplayMode = displayProfile.mode || (env.restricted ? 'restricted-declutter' : 'standard-declutter');
        panel.tabIndex = -1;
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'download-options-close';
        close.setAttribute('aria-label', '다운로드 창 닫기');
        close.textContent = '×';

        const title = document.createElement('strong');
        title.className = 'download-options-title';
        title.textContent = env.restricted ? '파일 저장' : '파일 다운로드';
        const name = document.createElement('p');
        name.className = 'download-options-name';
        name.textContent = track.name || '마스터링 파일';

        const envBox = document.createElement('div');
        envBox.className = `download-options-env ${env.restricted ? 'restricted' : 'normal'}`;
        const envTitle = document.createElement('strong');
        envTitle.textContent = env.label;
        const envDetail = document.createElement('span');
        envDetail.textContent = env.detail;
        const envBadges = document.createElement('div');
        envBadges.className = 'download-options-env-badges';
        [
            env.anchorDownload ? '다운로드 버튼 있음' : '다운로드 제한 가능',
            env.shareFiles ? '파일 공유 가능' : '파일 공유 제한',
            env.filePicker ? '직접 저장 가능' : '직접 저장 미지원'
        ].forEach(text => {
            const badge = document.createElement('b');
            badge.textContent = text;
            envBadges.appendChild(badge);
        });
        envBox.append(envTitle, envDetail, envBadges);

        const flowCard = document.createElement('div');
        flowCard.className = `download-options-flow-card ${env.restricted ? 'restricted' : 'normal'}`;
        const flowTitle = document.createElement('strong');
        flowTitle.textContent = displayProfile.headline || flow?.headline || (env.restricted ? '카카오에서는 공유/저장부터 시도하세요.' : '포맷 선택 후 다운로드하세요.');
        const flowDetail = document.createElement('span');
        flowDetail.textContent = displayProfile.detail || flow?.detail || env.detail;
        const flowBadges = document.createElement('div');
        flowBadges.className = 'download-options-flow-badges';
        (flow?.badges || [env.recommendedAction, env.label]).forEach(text => {
            const badge = document.createElement('b');
            badge.textContent = text;
            flowBadges.appendChild(badge);
        });
        const steps = document.createElement('ol');
        steps.className = 'download-options-steps download-options-steps-compact';
        const stepItems = flow?.steps || (env.restricted
            ? [
                { label: '1. 공유/저장', detail: '기기 공유창을 먼저 엽니다.' },
                { label: '2. 저장 도움', detail: '파일 열기 또는 외부 브라우저 안내를 사용합니다.' }
            ]
            : [
                { label: '다운로드', detail: '기본 저장을 시도합니다.' },
                { label: '파일 공유', detail: '지원 기기에서 공유창을 엽니다.' }
            ]);
        const visibleStepLimit = Number(compactHint?.visibleStepLimit || 0) || (env.restricted ? 3 : 2);
        stepItems.slice(0, visibleStepLimit).forEach(step => {
            const item = document.createElement('li');
            const label = document.createElement('strong');
            label.textContent = step.label;
            const detail = document.createElement('span');
            detail.textContent = step.detail;
            item.append(label, detail);
            steps.appendChild(item);
        });
        flowCard.append(flowTitle, flowDetail, flowBadges, steps);

        const compactHintBar = document.createElement('div');
        compactHintBar.className = `download-options-compact-hint ${env.restricted ? 'restricted' : 'normal'}`;
        compactHintBar.dataset.downloadHintMode = compactHint?.mode || (env.restricted ? 'restricted-micro' : 'standard-micro');
        const compactHintTitle = document.createElement('strong');
        compactHintTitle.textContent = compactHint?.headline || (env.restricted ? '카카오 저장 순서' : '다운로드 확인');
        const compactHintDetail = document.createElement('span');
        compactHintDetail.textContent = compactHint?.detail || (env.restricted ? '공유/저장 후 안 되면 파일 열기를 사용하세요.' : '다운로드 폴더를 먼저 확인하세요.');
        const compactHintMore = document.createElement('small');
        compactHintMore.textContent = compactHint?.advancedLabel || '추가 옵션에서 진단/복사를 사용할 수 있습니다.';
        compactHintBar.append(compactHintTitle, compactHintDetail, compactHintMore);

        // Legacy wording: 공유/저장 먼저. The visible v1.5.54 CTA is 기기에 저장/공유.
        const warning = document.createElement('p');
        warning.className = 'download-options-warning show';
        warning.textContent = env.restricted
            ? '카카오에서는 기기 저장/공유를 먼저 시도하세요.'
            : '형식을 선택하고 다운로드하세요.';

        const listLabel = document.createElement('span');
        listLabel.className = 'download-options-section-label';
        listLabel.textContent = '확장자 / 품질 선택';

        const list = document.createElement('div');
        list.className = 'download-options-list selectable';
        const options = getDownloadFormatOptions(track);
        const visibleOptions = env.restricted ? options.filter(option => option.available !== false) : options;
        const defaultOption = visibleOptions.find(option => option.format === track.outFormat) || visibleOptions[0] || options[0];
        let selectedFormat = defaultOption.format;

        const selectedSummary = document.createElement('div');
        selectedSummary.className = 'download-options-selected-summary';

        const progressCard = document.createElement('div');
        progressCard.className = 'download-options-worker-progress';
        progressCard.hidden = true;
        progressCard.setAttribute('aria-live', 'polite');
        const progressHead = document.createElement('div');
        progressHead.className = 'download-options-worker-progress-head';
        const progressStage = document.createElement('strong');
        progressStage.textContent = '파일 준비';
        const progressPercent = document.createElement('span');
        progressPercent.textContent = '0%';
        progressHead.append(progressStage, progressPercent);
        const progressTrack = document.createElement('div');
        progressTrack.className = 'download-options-worker-progress-track';
        const progressBar = document.createElement('div');
        progressBar.className = 'download-options-worker-progress-bar';
        progressBar.style.width = '0%';
        progressTrack.appendChild(progressBar);
        const progressDetail = document.createElement('small');
        progressDetail.textContent = '선택한 포맷을 준비합니다.';
        const progressTiming = document.createElement('small');
        progressTiming.className = 'download-options-worker-progress-timing';
        progressTiming.textContent = '경과 0초 · 예상 시간 계산 중';
        const cancelAction = document.createElement('button');
        cancelAction.type = 'button';
        cancelAction.className = 'btn-secondary download-options-worker-cancel';
        cancelAction.textContent = '변환 취소';
        cancelAction.disabled = true;
        progressCard.append(progressHead, progressTrack, progressDetail, progressTiming, cancelAction);

        const formatDuration = valueMs => {
            const totalSeconds = Math.max(0, Math.round((Number(valueMs) || 0) / 1000));
            if (totalSeconds < 60) return `${totalSeconds}초`;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}분 ${seconds}초`;
        };
        let progressStartedAt = 0;
        let progressLastAt = 0;
        let progressLastPercent = 0;
        let progressTimer = 0;
        let actionInFlight = false;
        const updateProgressTiming = () => {
            if (!progressStartedAt || !actionInFlight) return;
            const now = Date.now();
            const elapsedMs = Math.max(0, now - progressStartedAt);
            const idleMs = Math.max(0, now - progressLastAt);
            const percent = Math.max(0, Math.min(100, Number(progressLastPercent) || 0));
            let suffix = '예상 시간 계산 중';
            if (percent >= 3 && percent < 100) {
                const remainingMs = Math.max(0, elapsedMs * (100 - percent) / percent);
                suffix = `약 ${formatDuration(remainingMs)} 남음`;
            } else if (percent >= 100) {
                suffix = '완료';
            }
            if (idleMs >= 12000 && percent < 100) {
                suffix = document.hidden
                    ? '백그라운드 제한으로 느려질 수 있음'
                    : `응답 대기 ${formatDuration(idleMs)}`;
                progressCard.classList.add('is-stalled');
            } else {
                progressCard.classList.remove('is-stalled');
            }
            progressTiming.textContent = `경과 ${formatDuration(elapsedMs)} · ${suffix}`;
        };
        const stopProgressClock = () => {
            if (progressTimer) clearInterval(progressTimer);
            progressTimer = 0;
            progressCard.classList.remove('is-stalled');
        };
        const startProgressClock = () => {
            stopProgressClock();
            progressStartedAt = Date.now();
            progressLastAt = progressStartedAt;
            progressLastPercent = 0;
            progressTiming.textContent = '경과 0초 · 예상 시간 계산 중';
            progressTimer = setInterval(updateProgressTiming, 1000);
        };
        const updateWorkerProgress = progress => {
            const percent = Math.max(0, Math.min(100, Number(progress?.percent) || 0));
            progressCard.hidden = false;
            progressStage.textContent = progress?.stage || '파일 변환';
            progressPercent.textContent = `${Math.round(percent)}%`;
            progressBar.style.width = `${percent}%`;
            progressDetail.textContent = progress?.detail || '오디오 파일을 생성하고 있습니다.';
            progressLastAt = Date.now();
            progressLastPercent = Math.max(progressLastPercent, percent);
            updateProgressTiming();
        };
        const resetWorkerProgress = (message = '선택한 포맷을 준비합니다.') => {
            progressStage.textContent = '파일 준비';
            progressPercent.textContent = '0%';
            progressBar.style.width = '0%';
            progressDetail.textContent = message;
            startProgressClock();
        };

        const updateSelectedSummary = () => {
            const selected = options.find(option => option.format === selectedFormat) || defaultOption;
            selectedSummary.textContent = `${selected.label} · ${selected.detail}`;
        };

        const setSelected = format => {
            const next = options.find(option => option.format === format);
            if (!next || next.available === false) {
                warning.classList.add('show');
                warning.textContent = next?.unavailableReason || '이 포맷은 현재 완성 파일에서 만들 수 없습니다.';
                return;
            }
            selectedFormat = format;
            Array.from(list.querySelectorAll('.download-format-option')).forEach(button => {
                const active = button.dataset.format === selectedFormat;
                button.classList.toggle('current', active);
                button.setAttribute('aria-pressed', String(active));
            });
            updateSelectedSummary();
            const selected = options.find(option => option.format === selectedFormat);
            warning.classList.add('show');
            warning.textContent = selected ? `${selected.label} ${selected.detail} 선택` : '형식 선택';
            renderReceipt(primaryAction, null, selected ? `${selected.label} ${selected.detail} 준비됨` : '형식 선택됨');
        };

        visibleOptions.forEach(option => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `download-format-option ${option.format === selectedFormat ? 'current' : ''}`;
            button.dataset.format = option.format;
            button.setAttribute('aria-pressed', String(option.format === selectedFormat));
            if (option.available === false) {
                button.disabled = true;
                button.dataset.permanentDisabled = 'true';
                button.classList.add('unavailable');
                button.setAttribute('aria-disabled', 'true');
                button.title = option.unavailableReason || '다른 포맷은 재마스터링이 필요합니다.';
            }
            const main = document.createElement('span');
            main.textContent = option.label;
            const sub = document.createElement('b');
            sub.textContent = option.available === false ? `${option.detail} · 재마스터링 필요` : option.detail;
            button.append(main, sub);
            button.addEventListener('click', () => setSelected(option.format));
            list.appendChild(button);
        });
        updateSelectedSummary();

        const actionLabel = action => {
            if (action === 'share') return '파일 공유';
            if (action === 'assist') return '저장 도움';
            if (action === 'diagnostics') return '진단 복사';
            if (action === 'copy') return '주소 복사';
            return '다운로드';
        };
        const primaryAction = flow?.primaryAction || (env.restricted ? (env.shareFiles ? 'share' : 'assist') : 'download');
        const secondaryAction = primaryAction === 'download' ? (env.shareFiles ? 'share' : 'assist') : 'assist';
        const tertiaryAction = env.restricted ? 'diagnostics' : (secondaryAction === 'assist' ? 'share' : 'assist');
        const applyActionMeta = (button, action, recommended = false) => {
            button.dataset.downloadAction = action;
            button.classList.toggle('is-recommended', Boolean(recommended));
            button.setAttribute('aria-label', `${recommended ? '추천: ' : ''}${actionLabel(action)}`);
            if (recommended) button.setAttribute('data-recommended', 'true');
        };

        const actions = document.createElement('div');
        actions.className = 'download-options-actions download-options-actions-primary download-options-actions-v1414';
        const download = document.createElement('button');
        download.type = 'button';
        download.className = 'btn-primary download-options-primary';
        download.textContent = env.restricted ? '기기에 저장/공유' : '선택 형식 다운로드';
        applyActionMeta(download, primaryAction, true);
        const share = document.createElement('button');
        share.type = 'button';
        share.className = `btn-secondary download-options-share ${env.shareFiles ? '' : 'is-limited'}`;
        share.textContent = env.restricted ? '파일 열기' : actionLabel(secondaryAction);
        share.title = secondaryAction === 'share'
            ? (env.shareFiles ? '카카오톡, 문자, 파일 앱 등으로 공유합니다.' : '이 브라우저는 파일 공유 API를 지원하지 않을 수 있습니다.')
            : '파일 열기, 안내 복사, 외부 브라우저 같은 대체 저장 방법을 엽니다.';
        applyActionMeta(share, secondaryAction, false);
        const help = document.createElement('button');
        help.type = 'button';
        help.className = 'btn-secondary download-options-help';
        help.textContent = actionLabel(tertiaryAction);
        applyActionMeta(help, tertiaryAction, false);
        const moreToggle = document.createElement('button');
        moreToggle.type = 'button';
        moreToggle.className = 'btn-secondary download-options-more-toggle';
        moreToggle.setAttribute('aria-expanded', String(displayProfile.advancedCollapsed === false));
        moreToggle.textContent = displayProfile.advancedCollapsed === false ? '추가 옵션 닫기' : '추가 옵션';
        let externalPrimary = null;
        actions.append(download, share);
        if (env.restricted) {
            externalPrimary = document.createElement('button');
            externalPrimary.type = 'button';
            externalPrimary.className = 'btn-secondary download-options-external';
            externalPrimary.textContent = '외부 브라우저';
            externalPrimary.addEventListener('click', () => openCurrentPageInExternalBrowser(deps));
            actions.appendChild(externalPrimary);
        }

        const fallbackActions = document.createElement('div');
        fallbackActions.className = 'download-options-actions download-options-actions-fallback is-collapsed';
        fallbackActions.setAttribute('aria-hidden', String(displayProfile.advancedCollapsed !== false));
        const copy = document.createElement('button');
        copy.type = 'button';
        copy.className = 'btn-secondary';
        copy.textContent = '주소 복사';
        copy.dataset.downloadAction = 'copy';
        copy.addEventListener('click', () => copyCurrentPageUrl(deps));
        fallbackActions.append(copy);
        moreToggle.addEventListener('click', () => {
            const nextExpanded = fallbackActions.classList.toggle('is-collapsed') === false;
            fallbackActions.setAttribute('aria-hidden', String(!nextExpanded));
            moreToggle.setAttribute('aria-expanded', String(nextExpanded));
            moreToggle.textContent = nextExpanded ? '추가 옵션 닫기' : '추가 옵션';
        });
        if (typeof copyDownloadTroubleshootingGuide === 'function') {
            const copyGuide = document.createElement('button');
            copyGuide.type = 'button';
            copyGuide.className = 'btn-secondary';
            copyGuide.textContent = '안내 복사';
            copyGuide.dataset.downloadAction = 'guide-copy';
            copyGuide.addEventListener('click', () => copyDownloadTroubleshootingGuide(track.outName || track.name || 'FoxBear mastered file', deps));
            fallbackActions.appendChild(copyGuide);
        }
        if (typeof copyDownloadDiagnostics === 'function') {
            const diagnostics = document.createElement('button');
            diagnostics.type = 'button';
            diagnostics.className = 'btn-secondary';
            diagnostics.textContent = '진단 복사';
            diagnostics.dataset.downloadAction = 'diagnostics';
            diagnostics.addEventListener('click', () => copyDownloadDiagnostics(track.outBlob || null, track.outName || track.name || 'FoxBear mastered file', deps));
            fallbackActions.appendChild(diagnostics);
        }
        if (typeof copyDownloadRecoveryChecklist === 'function') {
            const checklistCopy = document.createElement('button');
            checklistCopy.type = 'button';
            checklistCopy.className = 'btn-secondary';
            checklistCopy.textContent = '체크리스트 복사';
            checklistCopy.dataset.downloadAction = 'checklist-copy';
            checklistCopy.addEventListener('click', () => copyDownloadRecoveryChecklist(track.outBlob || null, track.outName || track.name || 'FoxBear mastered file', 'dialog', deps));
            fallbackActions.appendChild(checklistCopy);
        }
        if (env.restricted) {
            const external = document.createElement('button');
            external.type = 'button';
            external.className = 'btn-secondary';
            external.textContent = '외부 브라우저';
            external.dataset.downloadAction = 'external-browser';
            external.addEventListener('click', () => openCurrentPageInExternalBrowser(deps));
            fallbackActions.appendChild(external);
        }

        const guide = document.createElement('p');
        guide.className = 'download-options-guide';
        guide.textContent = env.restricted
            ? '외부 브라우저로 열면 현재 메모리의 완성 파일은 넘어가지 않을 수 있습니다. 그 경우 Chrome/Safari에서 다시 마스터링 후 다운로드하세요.'
            : '공유는 기기 기본 공유창을 사용합니다. 지원 브라우저에서만 파일 그대로 보낼 수 있습니다.';


        const checklistPanel = document.createElement('div');
        checklistPanel.className = 'download-options-checklist download-options-checklist-compact';
        const renderChecklist = (action = primaryAction, exported = null) => {
            const blob = exported?.blob || track.outBlob || null;
            const fileName = exported?.fileName || track.outName || track.name || 'FoxBear mastered file';
            const plan = typeof getDownloadDialogCompactHint === 'function'
                ? getDownloadDialogCompactHint(blob, fileName, action)
                : (typeof getDownloadCompactRecoveryPlan === 'function'
                    ? getDownloadCompactRecoveryPlan(blob, fileName, action)
                    : null);
            const checklist = !plan && typeof getDownloadRecoveryChecklist === 'function'
                ? getDownloadRecoveryChecklist(blob, fileName, action)
                : null;
            const viewModel = plan || checklist;
            checklistPanel.replaceChildren();
            if (!viewModel) return;
            const heading = document.createElement('strong');
            heading.textContent = viewModel.headline || '저장 체크리스트';
            const summary = document.createElement('span');
            summary.textContent = viewModel.summary || '아래 순서대로 확인하세요.';
            const items = document.createElement('ol');
            items.className = 'download-options-checklist-steps download-options-checklist-steps-compact';
            const maxSteps = plan ? (env.restricted ? 3 : 2) : (env.restricted ? 4 : 3);
            (viewModel.steps || []).slice(0, maxSteps).forEach(step => {
                const item = document.createElement('li');
                const label = document.createElement('b');
                label.textContent = step.label || step.key || '확인';
                const detail = document.createElement('span');
                detail.textContent = step.detail || '';
                item.append(label, detail);
                items.appendChild(item);
            });
            if (plan?.optionalAction) {
                const optional = document.createElement('em');
                optional.className = 'download-options-checklist-optional';
                optional.textContent = `안 되면 추가 옵션에서 ${plan.optionalAction.label}를 사용하세요.`;
                checklistPanel.append(heading, summary, items, optional);
                return;
            }
            checklistPanel.append(heading, summary, items);
        };

        const receipt = document.createElement('div');
        receipt.className = 'download-options-receipt';
        receipt.setAttribute('aria-live', 'polite');
        const renderReceipt = (action, exported = null, status = '', options = {}) => {
            const initial = Boolean(options.initial);
            const fallbackReceipt = {
                title: status || `${actionLabel(action)} 준비`,
                detail: '버튼을 누르면 선택한 파일 형식으로 준비한 뒤 다음 저장 방법을 안내합니다.',
                nextSteps: [env.restricted ? '공유/저장 또는 저장 도움을 차례로 사용하세요.' : '다운로드 폴더 또는 저장 도움을 확인하세요.'],
                badges: [env.label]
            };
            const data = typeof getDownloadActionReceipt === 'function'
                ? getDownloadActionReceipt(action, exported?.blob || track.outBlob || null, exported?.fileName || track.outName || track.name || 'FoxBear mastered file')
                : fallbackReceipt;
            receipt.replaceChildren();
            receipt.classList.toggle('is-idle', initial && displayProfile.receiptIdle !== false);
            const titleLine = document.createElement('strong');
            titleLine.textContent = status || (initial ? (displayProfile.headline || data.title) : data.title) || fallbackReceipt.title;
            const detailLine = document.createElement('span');
            detailLine.textContent = initial ? (displayProfile.initialWarning || displayProfile.detail || data.detail || fallbackReceipt.detail) : (data.detail || fallbackReceipt.detail);
            const maxSteps = Number(initial ? displayProfile.maxInitialReceiptSteps : displayProfile.maxActionReceiptSteps);
            const stepSource = data.nextSteps || fallbackReceipt.nextSteps;
            const stepList = document.createElement('ul');
            stepList.className = 'download-options-receipt-steps';
            stepSource.slice(0, Number.isFinite(maxSteps) ? Math.max(0, maxSteps) : 2).forEach(step => {
                const item = document.createElement('li');
                item.textContent = step;
                stepList.appendChild(item);
            });
            receipt.append(titleLine, detailLine);
            if (stepList.children.length) receipt.appendChild(stepList);
            if (initial && displayProfile.showChecklistOnOpen === false) {
                checklistPanel.replaceChildren();
                checklistPanel.classList.add('is-empty');
                return;
            }
            if (!initial && displayProfile.showChecklistAfterAction !== false) {
                checklistPanel.classList.remove('is-empty');
                renderChecklist(action, exported);
            }
        };
        renderReceipt(primaryAction, null, '', { initial: true });

        let currentActionController = null;
        const allButtons = () => Array.from(panel.querySelectorAll('button')).filter(button => button !== cancelAction);
        const setBusy = busy => {
            allButtons().forEach(button => { button.disabled = Boolean(busy) || button.dataset.permanentDisabled === 'true'; });
            cancelAction.disabled = !busy;
            progressCard.hidden = !busy;
            panel.classList.toggle('working', Boolean(busy));
            if (!busy) stopProgressClock();
        };

        const prepareSelected = async statusText => {
            setBusy(true);
            resetWorkerProgress(statusText);
            warning.classList.add('show');
            warning.textContent = statusText;
            renderReceipt(primaryAction, null, statusText);
            return prepareTrackDownloadBlob(track, selectedFormat, {
                signal: currentActionController?.signal || null,
                jobId: `download:${track.id || 'track'}:${selectedFormat}:${Date.now().toString(36)}`,
                onProgress: updateWorkerProgress
            });
        };

        const markDone = () => {
            track.downloadAttention = false;
            foxBearHaptic('download');
            clearNativeBadgeIfDone();
            // Download UI has its own busy state. Never clear the global mastering
            // flag here because another track may have started work meanwhile.
            renderAll({ keepDetailAudio: true });
        };

        const openAssistForExport = exported => {
            showDownloadAssist(URL.createObjectURL(exported.blob), exported.fileName, exported.blob.type || 'audio/*', exported.blob, deps);
        };

        const runDownloadFlow = async () => {
            const exported = await prepareSelected(selectedFormat === track.outFormat ? '현재 완성 파일을 준비합니다.' : '선택한 포맷으로 변환 중입니다.');
            if (isRestrictedDownloadBrowser()) {
                // compatibility anchor: isRestrictedDownloadBrowser() && supportsWebShareFiles
                // Encoding/validation has already crossed an async boundary, so a
                // Web Share call here no longer owns the original user gesture.
                // Open the assist panel and let its explicit button call share.
                openAssistForExport(exported);
                renderReceipt('assist', exported, '저장 도움을 열었습니다. 공유/저장 버튼을 한 번 더 눌러주세요.');
                warning.textContent = '파일 준비가 끝났습니다. 저장 도움창의 공유/저장 또는 파일 열기를 눌러주세요.';
                markDone();
                return;
            }
            renderReceipt('download', exported, '다운로드를 시작합니다.');
            await downloadBlob(exported.blob, exported.fileName, deps);
            markDone();
            closeDownloadOptionsDialog(backdrop);
        };

        const runShareFlow = async () => {
            const immediate = typeof getImmediateTrackDownloadBlob === 'function'
                ? getImmediateTrackDownloadBlob(track, selectedFormat)
                : null;
            if (immediate && supportsWebShareDownloadFiles() && supportsWebShareFiles(immediate.blob, immediate.fileName)) {
                setBusy(true);
                warning.classList.add('show');
                warning.textContent = '기기 공유/저장창을 엽니다.';
                // shareDownloadFile invokes navigator.share before its first await,
                // preserving transient activation from this click.
                await shareDownloadFile(immediate.blob, immediate.fileName, deps);
                renderReceipt('share', immediate, '공유/저장창을 열었습니다.');
                markDone();
                return;
            }

            const exported = await prepareSelected(selectedFormat === track.outFormat ? '공유할 파일을 확인합니다.' : '공유용 파일로 변환 중입니다.');
            // compatibility anchor: await shareDownloadFile(exported.blob, exported.fileName)
            // compatibility anchor with deps: shareDownloadFile(exported.blob, exported.fileName, deps)
            // The actual share call belongs to the assist button so it has a fresh user gesture.
            openAssistForExport(exported);
            renderReceipt('assist', exported, '파일 준비 완료 · 저장 도움의 공유/저장 버튼을 눌러주세요.');
            warning.textContent = supportsWebShareFiles(exported.blob, exported.fileName)
                ? '파일 준비가 끝났습니다. 저장 도움창에서 공유/저장을 한 번 더 눌러주세요.'
                : '이 브라우저는 파일 공유가 제한됩니다. 파일 열기 또는 다운로드를 사용하세요.';
        };

        const runAssistFlow = async () => {
            const exported = await prepareSelected(selectedFormat === track.outFormat ? '저장 도움 파일을 준비합니다.' : '저장 도움용 파일로 변환 중입니다.');
            openAssistForExport(exported);
            renderReceipt('assist', exported, '저장 도움창을 열었습니다.');
            warning.textContent = '저장 도움창을 열었습니다. 공유/저장, 파일 열기, 외부 브라우저 안내 중 가능한 방법을 사용하세요.';
        };

        const runDiagnosticsFlow = () => {
            if (typeof copyDownloadDiagnostics !== 'function') {
                warning.classList.add('show');
                warning.textContent = '진단 복사 기능을 사용할 수 없습니다.';
                return Promise.resolve();
            }
            warning.classList.add('show');
            warning.textContent = '현재 파일과 브라우저 진단 정보를 복사합니다.';
            renderReceipt('diagnostics', null, '진단 정보를 복사합니다.');
            return copyDownloadDiagnostics(track.outBlob || null, track.outName || track.name || 'FoxBear mastered file', deps);
        };

        const runCopyFlow = () => {
            warning.classList.add('show');
            warning.textContent = '현재 페이지 주소를 복사합니다.';
            renderReceipt('copy', null, '현재 페이지 주소를 복사합니다.');
            copyCurrentPageUrl(deps);
            return Promise.resolve();
        };

        const runAction = async action => {
            if (action === 'share') return runShareFlow();
            if (action === 'assist') return runAssistFlow();
            if (action === 'diagnostics') return runDiagnosticsFlow();
            if (action === 'copy') return runCopyFlow();
            return runDownloadFlow();
        };

        const isCancelledError = error => Boolean(error && (error.name === 'AbortError' || error.code === 'FOXBEAR_WORKER_JOB_CANCELLED'));
        const isTimeoutError = error => Boolean(error && error.code === 'FOXBEAR_WORKER_JOB_TIMEOUT');
        cancelAction.addEventListener('click', () => {
            if (!actionInFlight || !currentActionController) return;
            cancelAction.disabled = true;
            progressStage.textContent = '취소 중';
            progressDetail.textContent = '현재 워커를 안전하게 종료하고 있습니다.';
            progressTiming.textContent = `경과 ${formatDuration(Date.now() - progressStartedAt)} · 취소 처리 중`;
            try { currentActionController.abort('download-user-cancelled'); } catch (error) {}
        });
        const bindActionButton = (button, action, label) => {
            button.addEventListener('click', async () => {
                if (actionInFlight) return;
                actionInFlight = true;
                currentActionController = typeof AbortController === 'function' ? new AbortController() : null;
                backdrop.__foxbearAbortController = currentActionController;
                try {
                    await runAction(action);
                } catch (error) {
                    console.warn(`${label || action} flow failed:`, error);
                    warning.classList.add('show');
                    if (isCancelledError(error)) {
                        warning.textContent = '파일 변환을 취소했습니다. 다시 포맷을 선택할 수 있습니다.';
                        renderReceipt(action, null, warning.textContent);
                    } else if (isTimeoutError(error)) {
                        warning.textContent = '변환 제한시간을 초과했습니다. 더 가벼운 포맷을 선택하거나 다시 마스터링해 주세요.';
                        renderReceipt(action, null, warning.textContent);
                    } else {
                        warning.textContent = getErrorMessage(error, `${label || actionLabel(action)} 작업에 실패했습니다.`);
                        renderReceipt(action, null, warning.textContent);
                        if (action === 'share') {
                            const immediateFallback = typeof getImmediateTrackDownloadBlob === 'function'
                                ? getImmediateTrackDownloadBlob(track, selectedFormat)
                                : null;
                            if (immediateFallback) openAssistForExport(immediateFallback);
                        }
                    }
                } finally {
                    actionInFlight = false;
                    currentActionController = null;
                    backdrop.__foxbearAbortController = null;
                    setBusy(false);
                }
            });
        };

        const handleProgressRestore = () => {
            if (!actionInFlight) return;
            progressLastAt = Date.now();
            updateProgressTiming();
        };
        document.addEventListener('visibilitychange', handleProgressRestore, { passive: true });
        global.addEventListener('pageshow', handleProgressRestore, { passive: true });
        backdrop.__foxbearCleanup = () => {
            stopProgressClock();
            document.removeEventListener('visibilitychange', handleProgressRestore);
            global.removeEventListener('pageshow', handleProgressRestore);
        };

        bindActionButton(download, primaryAction, download.textContent);
        bindActionButton(share, secondaryAction, share.textContent);
        bindActionButton(help, tertiaryAction, help.textContent);

        close.addEventListener('click', () => {
            if (actionInFlight) return;
            closeDownloadOptionsDialog(backdrop);
        });
        backdrop.addEventListener('click', event => { if (event.target === backdrop && !actionInFlight) closeDownloadOptionsDialog(backdrop); });
        panel.classList.add('download-options-panel-simple');
        // Compact-stack compatibility anchor: panel.append(close, title, name, warning, listLabel, list, selectedSummary, actions)
        panel.append(close, title, name, warning, listLabel, list, selectedSummary, progressCard, actions);
        backdrop.appendChild(panel);
        document.body.appendChild(backdrop);
        document.body.classList.add('download-options-open');
        requestAnimationFrame(() => panel.focus());
    }

    global.FoxBearDownloadDialogView = Object.freeze({ showDownloadOptionsDialog });
})(window);
