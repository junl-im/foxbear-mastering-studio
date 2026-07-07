// FoxBear AI Mastering Studio Pro v1.4.11 - download dialog view builder
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
        const backdrop = document.createElement('div');
        backdrop.className = 'download-options-backdrop';
        backdrop.setAttribute('role', 'dialog');
        backdrop.setAttribute('aria-modal', 'true');
        backdrop.setAttribute('aria-label', '다운로드 및 공유');

        const panel = document.createElement('section');
        panel.className = `download-options-panel download-options-panel-v3 download-options-panel-v4 ${env.restricted ? 'restricted' : 'normal'}`;
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

        const steps = document.createElement('ol');
        steps.className = 'download-options-steps';
        const stepTexts = env.restricted
            ? [
                '카카오에서는 공유/저장을 먼저 시도하세요.',
                '공유창이 안 뜨면 저장 도움 → 파일 열기를 사용하세요.',
                '계속 실패하면 주소 복사 후 Chrome/Safari에서 다시 열어주세요.'
            ]
            : [
                '포맷을 고른 뒤 다운로드를 누르세요.',
                '다른 앱으로 보내려면 파일 공유를 사용하세요.'
            ];
        stepTexts.forEach(text => {
            const item = document.createElement('li');
            item.textContent = text;
            steps.appendChild(item);
        });

        const warning = document.createElement('p');
        warning.className = 'download-options-warning show';
        warning.textContent = env.restricted
            ? '카카오톡 안에서 다운로드가 안 보이면 정상입니다. 공유/저장 → 저장 도움 → 외부 브라우저 순서로 시도하세요.'
            : '포맷을 선택한 뒤 아래 다운로드 또는 파일 공유 버튼을 눌러주세요.';

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

        const actions = document.createElement('div');
        actions.className = 'download-options-actions download-options-actions-primary';
        const download = document.createElement('button');
        download.type = 'button';
        download.className = 'btn-primary download-options-primary';
        download.textContent = env.restricted ? '공유/저장 먼저' : '다운로드';
        const share = document.createElement('button');
        share.type = 'button';
        share.className = `btn-secondary download-options-share ${env.shareFiles ? '' : 'is-limited'}`;
        share.textContent = env.shareFiles ? '파일 공유' : '공유 확인';
        share.title = env.shareFiles ? '카카오톡, 문자, 파일 앱 등으로 공유합니다.' : '이 브라우저는 파일 공유 API를 지원하지 않을 수 있습니다.';
        actions.append(download, share);

        const fallbackActions = document.createElement('div');
        fallbackActions.className = 'download-options-actions download-options-actions-fallback';
        const help = document.createElement('button');
        help.type = 'button';
        help.className = 'btn-secondary';
        help.textContent = '저장 도움';
        const copy = document.createElement('button');
        copy.type = 'button';
        copy.className = 'btn-secondary';
        copy.textContent = '주소 복사';
        copy.addEventListener('click', copyCurrentPageUrl);
        fallbackActions.append(help, copy);
        if (typeof copyDownloadTroubleshootingGuide === 'function') {
            const copyGuide = document.createElement('button');
            copyGuide.type = 'button';
            copyGuide.className = 'btn-secondary';
            copyGuide.textContent = '안내 복사';
            copyGuide.addEventListener('click', () => copyDownloadTroubleshootingGuide(track.outName || track.name || 'FoxBear mastered file'));
            fallbackActions.appendChild(copyGuide);
        }
        if (env.restricted) {
            const external = document.createElement('button');
            external.type = 'button';
            external.className = 'btn-secondary';
            external.textContent = '외부 브라우저';
            external.addEventListener('click', openCurrentPageInExternalBrowser);
            fallbackActions.appendChild(external);
        }

        const guide = document.createElement('p');
        guide.className = 'download-options-guide';
        guide.textContent = env.restricted
            ? '외부 브라우저로 열면 현재 메모리의 완성 파일은 넘어가지 않을 수 있습니다. 그 경우 Chrome/Safari에서 다시 마스터링 후 다운로드하세요.'
            : '공유는 기기 기본 공유창을 사용합니다. 지원 브라우저에서만 파일 그대로 보낼 수 있습니다.';

        const allButtons = () => [download, share, help, copy, close, ...Array.from(list.querySelectorAll('button')), ...Array.from(fallbackActions.querySelectorAll('button'))];
        const setBusy = busy => {
            allButtons().forEach(button => { button.disabled = Boolean(busy); });
            panel.classList.toggle('working', Boolean(busy));
        };

        const prepareSelected = async statusText => {
            setBusy(true);
            warning.classList.add('show');
            warning.textContent = statusText;
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
            showDownloadAssist(URL.createObjectURL(exported.blob), exported.fileName, exported.blob.type || 'audio/*', exported.blob);
        };

        download.addEventListener('click', async () => {
            try {
                const exported = await prepareSelected(selectedFormat === track.outFormat ? '현재 완성 파일을 준비합니다.' : '선택한 포맷으로 변환 중입니다.');
                // v1.4.11 guard: isRestrictedDownloadBrowser() && supportsWebShareFiles
                const restrictedShareFirstCandidate = isRestrictedDownloadBrowser() && typeof supportsWebShareFiles === 'function' && supportsWebShareFiles(exported.blob, exported.fileName);
                if (isRestrictedDownloadBrowser()) {
                    if (restrictedShareFirstCandidate) {
                        warning.textContent = '카카오/인앱 브라우저에서는 기기 공유/저장창을 먼저 엽니다.';
                        try {
                            await shareDownloadFile(exported.blob, exported.fileName);
                            closeDownloadOptionsDialog(backdrop);
                            markDone();
                            return;
                        } catch (shareError) {
                            console.warn('restricted browser share-first failed:', shareError);
                            openAssistForExport(exported);
                            warning.textContent = '공유/저장이 취소되었거나 막혔습니다. 저장 도움창의 파일 열기 또는 외부 브라우저 안내를 사용하세요.';
                        }
                    } else {
                        openAssistForExport(exported);
                        warning.textContent = '이 카카오/인앱 브라우저는 파일 공유가 제한됩니다. 저장 도움창을 사용하세요.';
                    }
                    markDone();
                    return;
                }
                closeDownloadOptionsDialog(backdrop);
                downloadBlob(exported.blob, exported.fileName);
                markDone();
            } catch (error) {
                console.warn('download export failed:', error);
                warning.textContent = getErrorMessage(error, '다운로드 파일 생성에 실패했습니다.');
            } finally {
                setBusy(false);
            }
        });

        share.addEventListener('click', async () => {
            try {
                const exported = await prepareSelected(selectedFormat === track.outFormat ? '공유할 파일을 준비합니다.' : '공유용 파일로 변환 중입니다.');
                if (!supportsWebShareDownloadFiles() || !supportsWebShareFiles(exported.blob, exported.fileName)) {
                    openAssistForExport(exported);
                    warning.textContent = '이 브라우저는 파일 공유가 제한됩니다. 저장 도움창을 열었습니다.';
                    return;
                }
                await shareDownloadFile(exported.blob, exported.fileName);
                markDone();
            } catch (error) {
                console.warn('share export failed:', error);
                warning.textContent = getErrorMessage(error, '공유가 취소되었거나 이 브라우저에서 막혔습니다. 저장 도움 또는 다운로드를 사용해보세요.');
                try {
                    const fallback = await prepareTrackDownloadBlob(track, selectedFormat);
                    openAssistForExport(fallback);
                } catch (fallbackError) {
                    console.warn('share fallback assist failed:', fallbackError);
                }
            } finally {
                setBusy(false);
            }
        });

        help.addEventListener('click', async () => {
            try {
                const exported = await prepareSelected(selectedFormat === track.outFormat ? '저장 도움 파일을 준비합니다.' : '저장 도움용 파일로 변환 중입니다.');
                openAssistForExport(exported);
                warning.textContent = '저장 도움창을 열었습니다. 공유/저장, 파일 열기, 외부 브라우저 안내 중 가능한 방법을 사용하세요.';
            } catch (error) {
                console.warn('download assist export failed:', error);
                warning.textContent = getErrorMessage(error, '저장 도움 파일을 만들지 못했습니다.');
            } finally {
                setBusy(false);
            }
        });

        close.addEventListener('click', () => closeDownloadOptionsDialog(backdrop));
        backdrop.addEventListener('click', event => { if (event.target === backdrop) closeDownloadOptionsDialog(backdrop); });
        panel.append(close, title, name, envBox, steps, warning, listLabel, list, selectedSummary, actions, fallbackActions, guide);
        backdrop.appendChild(panel);
        document.body.appendChild(backdrop);
        document.body.classList.add('download-options-open');
        requestAnimationFrame(() => panel.focus());
    }

    global.FoxBearDownloadDialogView = Object.freeze({ showDownloadOptionsDialog });
})(window);
