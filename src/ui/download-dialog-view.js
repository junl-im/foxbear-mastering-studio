// FoxBear AI Mastering Studio Pro v1.4.21 - download dialog view builder
'use strict';

(function attachFoxBearDownloadDialogView(global) {
    function showDownloadOptionsDialog(track, deps = {}) {
        const {
            getDownloadEnvironmentInfo,
            getDownloadFormatOptions,
            prepareTrackDownloadBlob,
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
                version: '1.5.7',
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
        title.textContent = env.restricted ? '카카오/인앱 저장 · 공유' : '다운로드 / 공유';
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

        const warning = document.createElement('p');
        warning.className = 'download-options-warning show';
        warning.textContent = displayProfile.initialWarning || (env.restricted
            ? '공유/저장을 먼저 누르세요. 안 되면 저장 도움을 사용하세요.'
            : '포맷을 선택한 뒤 다운로드 버튼을 눌러주세요.');

        const listLabel = document.createElement('span');
        listLabel.className = 'download-options-section-label';
        listLabel.textContent = '확장자 / 품질 선택';

        const list = document.createElement('div');
        list.className = 'download-options-list selectable';
        const options = getDownloadFormatOptions();
        let selectedFormat = track.outFormat && options.some(option => option.format === track.outFormat) ? track.outFormat : options[0].format;

        const selectedSummary = document.createElement('div');
        selectedSummary.className = 'download-options-selected-summary';

        const updateSelectedSummary = () => {
            const selected = options.find(option => option.format === selectedFormat) || options[0];
            selectedSummary.textContent = `${selected.label} ${selected.detail} · 버튼을 눌러야 저장/공유가 시작됩니다.`;
        };

        const setSelected = format => {
            selectedFormat = format;
            Array.from(list.querySelectorAll('.download-format-option')).forEach(button => {
                const active = button.dataset.format === selectedFormat;
                button.classList.toggle('current', active);
                button.setAttribute('aria-pressed', String(active));
            });
            updateSelectedSummary();
            const selected = options.find(option => option.format === selectedFormat);
            warning.classList.add('show');
            warning.textContent = selected ? `${selected.label} ${selected.detail} 선택됨 · ${env.restricted ? '공유/저장 먼저 누르세요.' : '다운로드 또는 파일 공유를 누르세요.'}` : '포맷을 선택했습니다.';
            renderReceipt(primaryAction, null, selected ? `${selected.label} ${selected.detail} 준비됨` : '포맷 선택됨');
        };

        options.forEach(option => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `download-format-option ${option.format === selectedFormat ? 'current' : ''}`;
            button.dataset.format = option.format;
            button.setAttribute('aria-pressed', String(option.format === selectedFormat));
            const main = document.createElement('span');
            main.textContent = option.label;
            const sub = document.createElement('b');
            sub.textContent = option.detail;
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
        download.textContent = flow?.primaryLabel || actionLabel(primaryAction);
        applyActionMeta(download, primaryAction, true);
        const share = document.createElement('button');
        share.type = 'button';
        share.className = `btn-secondary download-options-share ${env.shareFiles ? '' : 'is-limited'}`;
        share.textContent = actionLabel(secondaryAction);
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
        actions.append(download, share, help, moreToggle);

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

        const allButtons = () => [download, share, help, moreToggle, copy, close, ...Array.from(list.querySelectorAll('button')), ...Array.from(fallbackActions.querySelectorAll('button'))];
        const setBusy = busy => {
            allButtons().forEach(button => { button.disabled = Boolean(busy); });
            panel.classList.toggle('working', Boolean(busy));
        };

        const prepareSelected = async statusText => {
            setBusy(true);
            warning.classList.add('show');
            warning.textContent = statusText;
            renderReceipt(primaryAction, null, statusText);
            return prepareTrackDownloadBlob(track, selectedFormat);
        };

        const markDone = () => {
            track.downloadAttention = false;
            foxBearHaptic('download');
            clearNativeBadgeIfDone();
            state.busy = false;
            renderAll({ keepDetailAudio: true });
        };

        const openAssistForExport = exported => {
            showDownloadAssist(URL.createObjectURL(exported.blob), exported.fileName, exported.blob.type || 'audio/*', exported.blob, deps);
        };

        const runDownloadFlow = async () => {
            const exported = await prepareSelected(selectedFormat === track.outFormat ? '현재 완성 파일을 준비합니다.' : '선택한 포맷으로 변환 중입니다.');
            // compatibility anchor: isRestrictedDownloadBrowser() && supportsWebShareFiles
            const restrictedShareFirstCandidate = isRestrictedDownloadBrowser() && typeof supportsWebShareFiles === 'function' && supportsWebShareFiles(exported.blob, exported.fileName);
            if (isRestrictedDownloadBrowser()) {
                if (restrictedShareFirstCandidate) {
                    warning.textContent = '카카오/인앱 브라우저에서는 기기 공유/저장창을 먼저 엽니다.';
                    try {
                        // compatibility anchor: await shareDownloadFile(exported.blob, exported.fileName)
            await shareDownloadFile(exported.blob, exported.fileName, deps);
                        renderReceipt('share', exported, '공유/저장창을 열었습니다.');
                        closeDownloadOptionsDialog(backdrop);
                        markDone();
                        return;
                    } catch (shareError) {
                        console.warn('restricted browser share-first failed:', shareError);
                        openAssistForExport(exported);
                        renderReceipt('assist', exported, '공유 실패 후 저장 도움으로 전환했습니다.');
                        warning.textContent = '공유/저장이 취소되었거나 막혔습니다. 저장 도움창의 파일 열기 또는 외부 브라우저 안내를 사용하세요.';
                    }
                } else {
                    openAssistForExport(exported);
                    renderReceipt('assist', exported, '파일 공유 제한으로 저장 도움을 열었습니다.');
                    warning.textContent = '이 카카오/인앱 브라우저는 파일 공유가 제한됩니다. 저장 도움창을 사용하세요.';
                }
                markDone();
                return;
            }
            renderReceipt('download', exported, '다운로드를 시작했습니다.');
            closeDownloadOptionsDialog(backdrop);
            downloadBlob(exported.blob, exported.fileName, deps);
            markDone();
        };

        const runShareFlow = async () => {
            const exported = await prepareSelected(selectedFormat === track.outFormat ? '공유할 파일을 준비합니다.' : '공유용 파일로 변환 중입니다.');
            if (!supportsWebShareDownloadFiles() || !supportsWebShareFiles(exported.blob, exported.fileName)) {
                openAssistForExport(exported);
                renderReceipt('assist', exported, '파일 공유 제한으로 저장 도움을 열었습니다.');
                warning.textContent = '이 브라우저는 파일 공유가 제한됩니다. 저장 도움창을 열었습니다.';
                return;
            }
            await shareDownloadFile(exported.blob, exported.fileName, deps);
            renderReceipt('share', exported, '공유/저장창을 열었습니다.');
            markDone();
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

        const bindActionButton = (button, action, label) => {
            button.addEventListener('click', async () => {
                try {
                    await runAction(action);
                } catch (error) {
                    console.warn(`${label || action} flow failed:`, error);
                    warning.classList.add('show');
                    warning.textContent = getErrorMessage(error, `${label || actionLabel(action)} 작업에 실패했습니다.`);
                    renderReceipt(action, null, warning.textContent);
                    if (action === 'share') {
                        try {
                            const fallback = await prepareTrackDownloadBlob(track, selectedFormat);
                            openAssistForExport(fallback);
                        } catch (fallbackError) {
                            console.warn('share fallback assist failed:', fallbackError);
                        }
                    }
                } finally {
                    setBusy(false);
                }
            });
        };

        bindActionButton(download, primaryAction, download.textContent);
        bindActionButton(share, secondaryAction, share.textContent);
        bindActionButton(help, tertiaryAction, help.textContent);

        close.addEventListener('click', () => closeDownloadOptionsDialog(backdrop));
        backdrop.addEventListener('click', event => { if (event.target === backdrop) closeDownloadOptionsDialog(backdrop); });
        panel.append(close, title, name, envBox, flowCard, compactHintBar, warning, receipt, checklistPanel, listLabel, list, selectedSummary, actions, fallbackActions, guide);
        backdrop.appendChild(panel);
        document.body.appendChild(backdrop);
        document.body.classList.add('download-options-open');
        requestAnimationFrame(() => panel.focus());
    }

    global.FoxBearDownloadDialogView = Object.freeze({ showDownloadOptionsDialog });
})(window);
