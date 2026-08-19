// FoxBear AI Mastering Studio Pro v1.6.109 - download filename preview and controls
'use strict';

(function attachFoxBearDownloadDialogView(global) {
    const DOWNLOAD_QUALITY_PREFERENCES_KEY = 'foxbear:download-quality-preferences:v1';
    const VALID_QUALITY_FORMATS = Object.freeze({
        mp3: Object.freeze(['mp3_128', 'mp3_192', 'mp3_256', 'mp3_320']),
        wav: Object.freeze(['wav16', 'wav24', 'wav32float'])
    });
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const normalizeDownloadQualityPreferences = value => {
        const fallback = { mp3: 'mp3_320', wav: 'wav24', lastFormat: '' };
        const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        const mp3 = VALID_QUALITY_FORMATS.mp3.includes(source.mp3) ? source.mp3 : fallback.mp3;
        const wav = VALID_QUALITY_FORMATS.wav.includes(source.wav) ? source.wav : fallback.wav;
        const allFormats = [...VALID_QUALITY_FORMATS.mp3, ...VALID_QUALITY_FORMATS.wav];
        const lastFormat = allFormats.includes(source.lastFormat) ? source.lastFormat : fallback.lastFormat;
        return { mp3, wav, lastFormat };
    };

    const loadDownloadQualityPreferences = () => {
        try {
            return normalizeDownloadQualityPreferences(JSON.parse(global.localStorage?.getItem?.(DOWNLOAD_QUALITY_PREFERENCES_KEY) || 'null'));
        } catch (error) {
            global.FoxBearRuntimeFaultCounters?.record?.('download-preferences', 'read-failed');
            return normalizeDownloadQualityPreferences(null);
        }
    };

    const saveDownloadQualityPreferences = value => {
        const normalized = normalizeDownloadQualityPreferences(value);
        try { global.localStorage?.setItem?.(DOWNLOAD_QUALITY_PREFERENCES_KEY, JSON.stringify(normalized)); }
        catch (error) { global.FoxBearRuntimeFaultCounters?.record?.('download-preferences', 'write-failed'); }
        return normalized;
    };

    function showDownloadOptionsDialog(track, deps = {}) {
        const {
            getDownloadEnvironmentInfo,
            getDownloadFormatOptions,
            getDownloadSizeEstimate,
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
            buildMasteredFileName,
            onFileNamePreferencesChange,
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
        if (previous) global.FoxBearModalStateMachine?.setExternalLayerOpen?.(previous, false);
        if (previous) previous.remove();
        document.querySelectorAll('.download-format-quality-menu-portal').forEach(menu => menu.remove());
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
                version: '1.6.109',
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
        backdrop.__foxbearReturnFocus = document.activeElement && document.activeElement.nodeType === 1 ? document.activeElement : null;

        const panel = document.createElement('section');
        panel.className = `download-options-panel download-options-panel-v3 download-options-panel-v4 download-options-panel-v5 download-options-panel-v1574 ${env.restricted ? 'restricted' : 'normal'}`;
        panel.dataset.downloadDisplayMode = displayProfile.mode || (env.restricted ? 'restricted-declutter' : 'standard-declutter');
        panel.tabIndex = -1;
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'download-options-close foxbear-modal-close';
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

        // Legacy wording: 공유/저장 먼저. The visible v1.6.109 CTA is 기기에 저장/공유.
        const warning = document.createElement('p');
        warning.className = 'download-options-warning show';
        warning.textContent = env.restricted
            ? 'MP3 또는 WAV를 누른 뒤 음질을 선택하고 기기 저장/공유를 시도하세요.'
            : 'MP3 또는 WAV를 누르면 음질 선택 메뉴가 열립니다.';

        const listLabel = document.createElement('span');
        listLabel.className = 'download-options-section-label';
        listLabel.textContent = '파일 확장자 및 음질';

        const formatPicker = document.createElement('div');
        formatPicker.className = 'download-format-picker';
        const familyTabs = document.createElement('div');
        familyTabs.className = 'download-format-families';
        familyTabs.setAttribute('role', 'group');
        familyTabs.setAttribute('aria-label', '다운로드 파일 형식');
        const qualityMenu = document.createElement('div');
        qualityMenu.className = 'download-format-quality-menu download-format-quality-menu-portal';
        qualityMenu.hidden = true;
        qualityMenu.setAttribute('role', 'menu');
        qualityMenu.setAttribute('aria-label', '다운로드 음질 선택');
        const qualityLabel = document.createElement('span');
        qualityLabel.className = 'download-format-quality-label';
        const list = document.createElement('div');
        list.className = 'download-options-list selectable';
        list.setAttribute('role', 'none');
        qualityMenu.append(qualityLabel, list);
        formatPicker.append(familyTabs);
        const quickQualityRow = document.createElement('label');
        quickQualityRow.className = 'download-format-quick-select';
        const quickQualityLabel = document.createElement('span');
        quickQualityLabel.textContent = '음질';
        const quickQualitySelect = document.createElement('select');
        quickQualitySelect.setAttribute('aria-label', '다운로드 음질 바로 선택');
        const quickQualityHint = document.createElement('small');
        quickQualityHint.className = 'download-format-quick-select-hint';
        quickQualityRow.append(quickQualityLabel, quickQualitySelect, quickQualityHint);
        formatPicker.append(quickQualityRow);
        const options = getDownloadFormatOptions(track);
        const visibleOptions = env.restricted ? options.filter(option => option.available !== false) : options;
        let qualityPreferences = loadDownloadQualityPreferences();
        const rememberedOption = visibleOptions.find(option => option.available !== false && option.format === qualityPreferences.lastFormat);
        const defaultOption = rememberedOption || visibleOptions.find(option => option.format === track.outFormat) || visibleOptions[0] || options[0];
        if (!defaultOption) return;
        let selectedFormat = defaultOption.format;
        let activeFormatFamily = String(selectedFormat || '').startsWith('mp3') ? 'mp3' : 'wav';
        let qualityMenuOpen = false;
        let qualityMenuReturnFocus = null;
        let qualityMenuAnchor = null;
        let qualityMenuPositionFrame = 0;
        const formatFamilies = Object.freeze([
            Object.freeze({ id: 'mp3', label: 'MP3', detail: '공유 · 모바일 호환', icon: '🎧' }),
            Object.freeze({ id: 'wav', label: 'WAV', detail: '보관 · 편집 품질', icon: '🎚️' })
        ]);

        const selectedSummary = document.createElement('div');
        selectedSummary.className = 'download-options-selected-summary';

        const fileNamePolicy = global.FoxBearFileNamePolicyService || null;
        let fileNamePreferences = fileNamePolicy?.loadFileNamePreferences?.() || {
            includeMastered: true,
            includeLoudness: true,
            includeStyle: true,
            includeFormat: true,
            includePlatform: true
        };
        const fileNameCard = document.createElement('section');
        fileNameCard.className = 'download-filename-card';
        fileNameCard.setAttribute('aria-label', '다운로드 파일명 미리보기');
        const fileNameHead = document.createElement('div');
        fileNameHead.className = 'download-filename-head';
        const fileNameLabel = document.createElement('strong');
        fileNameLabel.textContent = '저장될 파일명';
        const fileNameActions = document.createElement('div');
        fileNameActions.className = 'download-filename-actions';
        const fileNameCopy = document.createElement('button');
        fileNameCopy.type = 'button';
        fileNameCopy.className = 'download-filename-copy';
        fileNameCopy.textContent = '파일명 복사';
        const fileNameSettingsToggle = document.createElement('button');
        fileNameSettingsToggle.type = 'button';
        fileNameSettingsToggle.className = 'download-filename-settings-toggle';
        fileNameSettingsToggle.textContent = '파일명 설정';
        fileNameSettingsToggle.setAttribute('aria-expanded', 'false');
        fileNameActions.append(fileNameCopy, fileNameSettingsToggle);
        fileNameHead.append(fileNameLabel, fileNameActions);
        const fileNamePreview = document.createElement('code');
        fileNamePreview.className = 'download-filename-preview';
        fileNamePreview.setAttribute('aria-live', 'polite');
        fileNamePreview.setAttribute('dir', 'auto');
        const fileNameHint = document.createElement('small');
        fileNameHint.textContent = '한글·공백·괄호는 유지하고 운영체제 금지 문자만 정리합니다.';
        const fileNameCopyStatus = document.createElement('small');
        fileNameCopyStatus.className = 'download-filename-copy-status';
        fileNameCopyStatus.setAttribute('role', 'status');
        fileNameCopyStatus.setAttribute('aria-live', 'polite');
        const fileNameSettings = document.createElement('div');
        fileNameSettings.className = 'download-filename-settings';
        fileNameSettings.hidden = true;
        const fileNameSettingsId = `download-filename-settings-${String(track.id || Date.now()).replace(/[^a-z0-9_-]+/gi, '-')}`;
        fileNameSettings.id = fileNameSettingsId;
        fileNameSettingsToggle.setAttribute('aria-controls', fileNameSettingsId);
        const fileNameSettingsIntro = document.createElement('p');
        fileNameSettingsIntro.textContent = '아래 정보는 모든 단일 다운로드·곡별 저장·ZIP 내부 파일명에 함께 적용됩니다.';
        const fileNameOptionGrid = document.createElement('div');
        fileNameOptionGrid.className = 'download-filename-option-grid';
        const fileNameOptionInputs = [];
        [
            ['includeMastered', 'mastered 표시'],
            ['includeLoudness', 'LUFS 표시'],
            ['includeStyle', '스타일 표시'],
            ['includeFormat', '음질 표시'],
            ['includePlatform', '플랫폼 표시']
        ].forEach(([key, labelText]) => {
            const label = document.createElement('label');
            label.className = 'download-filename-option';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = fileNamePreferences[key] !== false;
            label.classList.toggle('is-checked', input.checked);
            input.dataset.filenamePreference = key;
            const copy = document.createElement('span');
            copy.textContent = labelText;
            label.append(input, copy);
            fileNameOptionInputs.push(input);
            fileNameOptionGrid.appendChild(label);
        });
        const fileNameReset = document.createElement('button');
        fileNameReset.type = 'button';
        fileNameReset.className = 'download-filename-reset';
        fileNameReset.textContent = '기본 파일명으로 초기화';
        fileNameSettings.append(fileNameSettingsIntro, fileNameOptionGrid, fileNameReset);
        fileNameCard.append(fileNameHead, fileNamePreview, fileNameHint, fileNameCopyStatus, fileNameSettings);

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

        const getFormatFamily = format => String(format || '').startsWith('mp3') ? 'mp3' : 'wav';
        const getSelectedOption = () => options.find(option => option.format === selectedFormat) || defaultOption;
        const buildSelectedFileName = () => {
            const selected = getSelectedOption();
            const format = selected?.format || selectedFormat || track.outFormat || 'wav24';
            const extension = String(format).startsWith('mp3') ? 'mp3' : 'wav';
            try {
                if (typeof buildMasteredFileName === 'function') {
                    return buildMasteredFileName(track, { format, extension, preferences: fileNamePreferences }) || track.outName || track.name || `FoxBear mastered.${extension}`;
                }
                if (fileNamePolicy?.buildMasteredFileName) {
                    return fileNamePolicy.buildMasteredFileName({
                        sourceName: track.sourceFileName || track.name || 'track',
                        targetLufs: track?.outputNameMeta?.targetLufs ?? track?.finalizeInfo?.targetLufs,
                        style: track?.outputNameMeta?.style || track?.masterReport?.target?.masterStyle || 'master',
                        platform: track?.outputNameMeta?.platform || '',
                        format,
                        extension,
                        preferences: fileNamePreferences
                    });
                }
            } catch (error) {}
            return track.outName || track.name || `FoxBear mastered.${extension}`;
        };
        const updateFileNamePreview = () => {
            const nextName = buildSelectedFileName();
            fileNamePreview.textContent = nextName;
            fileNamePreview.title = nextName;
            fileNameCopyStatus.textContent = '';
        };
        const persistFileNamePreferences = nextValue => {
            fileNamePreferences = fileNamePolicy?.saveFileNamePreferences?.(nextValue) || nextValue;
            fileNameOptionInputs.forEach(input => {
                const key = input.dataset.filenamePreference;
                input.checked = fileNamePreferences[key] !== false;
                input.closest('.download-filename-option')?.classList.toggle('is-checked', input.checked);
            });
            try { onFileNamePreferencesChange?.(fileNamePreferences); } catch (error) {}
            updateFileNamePreview();
            return fileNamePreferences;
        };
        const getFamilySelection = family => {
            const selected = getSelectedOption();
            if (getFormatFamily(selected?.format) === family) return selected;
            const rememberedFormat = qualityPreferences[family];
            return options.find(option => option.format === rememberedFormat && option.available !== false) || null;
        };
        const getQualityHint = option => {
            const hints = {
                mp3_128: '가벼운 용량',
                mp3_192: '표준 음질',
                mp3_256: '고음질',
                mp3_320: '최고 음질',
                wav16: '표준 PCM',
                wav24: '스튜디오 권장',
                wav32float: '편집 여유'
            };
            return hints[option?.format] || option?.label || '';
        };
        const getPreparationHint = option => {
            if (!option) return '';
            if (option.current || option.conversionMode === 'reuse-current') return '즉시 저장';
            if (option.conversionMode === 'cached-download-variant') return '변환 파일 즉시 재사용';
            if (option.conversionMode === 'mastered-pcm-reencode') return '완료 PCM 재인코딩';
            if (option.conversionMode === 'mastered-file-transcode') return '완성 파일 변환';
            return '재마스터링 필요';
        };
        const getOptionSizeEstimate = option => {
            if (!option || typeof getDownloadSizeEstimate !== 'function') return null;
            try { return getDownloadSizeEstimate(track, option.format) || null; }
            catch (error) { return null; }
        };
        const getOptionSizeText = option => {
            const estimate = getOptionSizeEstimate(option);
            if (!estimate?.label) return '';
            return `${estimate.exact ? '' : '약 '}${estimate.label}`;
        };
        const updateSelectedSummary = () => {
            const selected = getSelectedOption();
            const sizeText = getOptionSizeText(selected);
            const preparation = getPreparationHint(selected);
            selectedSummary.textContent = `${selected.label} · ${selected.detail}${sizeText ? ` · ${sizeText}` : ''}${preparation ? ` · ${preparation}` : ''}`;
            updateFileNamePreview();
        };

        fileNameCopy.addEventListener('click', async () => {
            const value = buildSelectedFileName();
            fileNameCopy.disabled = true;
            let copied = false;
            try {
                copied = await global.FoxBearFileNameWorkflowService?.copyText?.(value, document) === true;
            } catch (error) {}
            fileNameCopyStatus.textContent = copied ? '파일명을 복사했습니다.' : '복사하지 못했습니다. 브라우저 권한을 확인하세요.';
            fileNameCopy.textContent = copied ? '복사 완료' : '다시 복사';
            global.setTimeout?.(() => {
                if (!fileNameCopy.isConnected || actionInFlight) return;
                fileNameCopy.disabled = false;
                fileNameCopy.textContent = '파일명 복사';
            }, 1400);
        });

        fileNameSettingsToggle.addEventListener('click', () => {
            const expanded = fileNameSettings.hidden;
            fileNameSettings.hidden = !expanded;
            fileNameSettingsToggle.setAttribute('aria-expanded', String(expanded));
            fileNameSettingsToggle.textContent = expanded ? '설정 닫기' : '파일명 설정';
            if (expanded) fileNameOptionInputs[0]?.focus?.({ preventScroll: true });
        });
        fileNameOptionInputs.forEach(input => {
            input.addEventListener('change', () => {
                const next = { ...fileNamePreferences };
                fileNameOptionInputs.forEach(optionInput => {
                    next[optionInput.dataset.filenamePreference] = optionInput.checked;
                });
                persistFileNamePreferences(next);
            });
        });
        fileNameReset.addEventListener('click', () => {
            const reset = fileNamePolicy?.resetFileNamePreferences?.() || {
                includeMastered: true,
                includeLoudness: true,
                includeStyle: true,
                includeFormat: true,
                includePlatform: true
            };
            persistFileNamePreferences(reset);
        });
        const syncFamilyButtons = () => {
            const selectedFamily = getFormatFamily(selectedFormat);
            Array.from(familyTabs.querySelectorAll('.download-format-family')).forEach(button => {
                const family = button.dataset.family;
                const selected = family === selectedFamily;
                const expanded = qualityMenuOpen && family === activeFormatFamily;
                button.classList.toggle('current', selected);
                button.classList.toggle('menu-open', expanded);
                button.setAttribute('aria-pressed', String(selected));
                button.setAttribute('aria-expanded', String(expanded));
                const detail = button.querySelector('.download-format-family-copy small');
                const familyMeta = formatFamilies.find(item => item.id === family);
                const familySelection = getFamilySelection(family);
                const selectionSize = getOptionSizeText(familySelection);
                if (detail) {
                    detail.textContent = familySelection
                        ? `${familySelection.detail}${selectionSize ? ` · ${selectionSize}` : ''} ${selected ? '선택됨' : '기억됨'}`
                        : familyMeta?.detail || '';
                }
            });
        };
        const cancelQualityMenuPosition = () => {
            if (qualityMenuPositionFrame) {
                try { global.cancelAnimationFrame?.(qualityMenuPositionFrame); } catch (error) {}
            }
            qualityMenuPositionFrame = 0;
        };
        const positionQualityMenu = () => {
            qualityMenuPositionFrame = 0;
            if (!qualityMenuOpen || qualityMenu.hidden || !qualityMenuAnchor?.isConnected) return;
            const anchorRect = qualityMenuAnchor.getBoundingClientRect();
            const visualViewport = global.visualViewport || null;
            const viewportLeft = Math.max(0, Number(visualViewport?.offsetLeft || 0));
            const viewportTop = Math.max(0, Number(visualViewport?.offsetTop || 0));
            const viewportWidth = Math.max(240, Number(visualViewport?.width || global.innerWidth || document.documentElement?.clientWidth || 720));
            const viewportHeight = Math.max(240, Number(visualViewport?.height || global.innerHeight || document.documentElement?.clientHeight || 720));
            const viewportRight = viewportLeft + viewportWidth;
            const viewportBottom = viewportTop + viewportHeight;
            const edgeMargin = 10;
            const anchorGap = 8;

            qualityMenu.style.removeProperty('max-height');
            qualityMenu.style.maxWidth = `${Math.max(180, Math.floor(viewportWidth - edgeMargin * 2))}px`;
            const naturalRect = qualityMenu.getBoundingClientRect();
            const menuWidth = Math.min(Math.max(180, Number(naturalRect.width || 268)), Math.max(180, viewportWidth - edgeMargin * 2));
            const naturalHeight = Math.max(1, Number(naturalRect.height || 1));
            const menuHeight = Math.min(naturalHeight, Math.max(96, viewportHeight - edgeMargin * 2));
            const availableBelow = Math.max(0, viewportBottom - edgeMargin - anchorRect.bottom - anchorGap);
            const availableAbove = Math.max(0, anchorRect.top - viewportTop - edgeMargin - anchorGap);
            const placeAbove = availableBelow < naturalHeight && (availableAbove >= naturalHeight || availableAbove > availableBelow);
            const preferredTop = placeAbove
                ? anchorRect.top - anchorGap - menuHeight
                : anchorRect.bottom + anchorGap;
            const minTop = viewportTop + edgeMargin;
            const maxTop = Math.max(minTop, viewportBottom - edgeMargin - menuHeight);
            const top = clamp(preferredTop, minTop, maxTop);
            const preferredLeft = activeFormatFamily === 'wav' ? anchorRect.right - menuWidth : anchorRect.left;
            const minLeft = viewportLeft + edgeMargin;
            const maxLeft = Math.max(minLeft, viewportRight - edgeMargin - menuWidth);
            const left = clamp(preferredLeft, minLeft, maxLeft);
            const arrowCenter = anchorRect.left + anchorRect.width / 2 - left;
            const verticallyClamped = Math.abs(top - preferredTop) > 1;

            qualityMenu.dataset.placement = placeAbove ? 'above' : 'below';
            qualityMenu.dataset.viewportClamped = verticallyClamped ? 'true' : 'false';
            qualityMenu.style.left = `${Math.round(left)}px`;
            qualityMenu.style.right = 'auto';
            qualityMenu.style.top = `${Math.round(top)}px`;
            qualityMenu.style.bottom = 'auto';
            qualityMenu.style.maxHeight = `${Math.floor(menuHeight)}px`;
            qualityMenu.style.setProperty('--quality-menu-arrow-x', `${Math.round(clamp(arrowCenter - 5, 14, Math.max(14, menuWidth - 24)))}px`);
            qualityMenu.style.visibility = 'visible';
        };
        const scheduleQualityMenuPosition = () => {
            cancelQualityMenuPosition();
            if (!qualityMenuOpen) return;
            const requestFrame = global.requestAnimationFrame || (callback => global.setTimeout(callback, 0));
            qualityMenuPositionFrame = requestFrame(positionQualityMenu);
        };
        const closeQualityMenu = ({ restoreFocus = false } = {}) => {
            if (!qualityMenuOpen) return;
            qualityMenuOpen = false;
            cancelQualityMenuPosition();
            qualityMenu.hidden = true;
            qualityMenu.style.visibility = 'hidden';
            qualityMenuAnchor = null;
            panel.classList.remove('quality-menu-open');
            syncFamilyButtons();
            if (restoreFocus && qualityMenuReturnFocus?.isConnected) qualityMenuReturnFocus.focus();
        };

        const setSelected = (format, behavior = {}) => {
            const next = options.find(option => option.format === format);
            if (!next || next.available === false) {
                warning.classList.add('show');
                warning.textContent = next?.unavailableReason || '이 포맷은 현재 완성 파일에서 만들 수 없습니다.';
                return false;
            }
            selectedFormat = format;
            activeFormatFamily = getFormatFamily(format);
            qualityPreferences = saveDownloadQualityPreferences({
                ...qualityPreferences,
                [activeFormatFamily]: format,
                lastFormat: format
            });
            panel.dataset.formatFamily = activeFormatFamily;
            Array.from(list.querySelectorAll('.download-format-option')).forEach(button => {
                const active = button.dataset.format === selectedFormat;
                button.classList.toggle('current', active);
                button.setAttribute('aria-checked', String(active));
            });
            if (quickQualitySelect.value !== selectedFormat) quickQualitySelect.value = selectedFormat;
            quickQualityHint.textContent = `${getPreparationHint(next)}${next.qualityWarning ? ` · ${next.qualityWarning}` : ''}`;
            updateSelectedSummary();
            syncFamilyButtons();
            const selected = options.find(option => option.format === selectedFormat);
            const sizeText = getOptionSizeText(selected);
            const preparation = getPreparationHint(selected);
            const warningText = selected?.qualityWarning || (selected
                ? `${selected.label} ${selected.detail} 선택${sizeText ? ` · ${sizeText}` : ''}${preparation ? ` · ${preparation}` : ''}`
                : '형식 선택');
            warning.classList.add('show');
            warning.textContent = warningText;
            if (behavior.receipt !== false) {
                renderReceipt(primaryAction, null, selected ? `${selected.label} ${selected.detail}${sizeText ? ` · ${sizeText}` : ''} 준비됨` : '형식 선택됨');
            }
            if (behavior.closeMenu !== false) closeQualityMenu({ restoreFocus: behavior.restoreFocus !== false });
            return true;
        };

        const getFamilyOptions = family => visibleOptions.filter(option => family === 'mp3'
            ? String(option.format || '').startsWith('mp3')
            : String(option.format || '').startsWith('wav'));

        const renderQuickQualitySelect = () => {
            const familyOptions = getFamilyOptions(activeFormatFamily);
            quickQualityLabel.textContent = activeFormatFamily === 'mp3' ? 'MP3 음질' : 'WAV 음질';
            quickQualitySelect.replaceChildren();
            familyOptions.forEach(option => {
                const item = document.createElement('option');
                item.value = option.format;
                item.disabled = option.available === false;
                const sizeText = getOptionSizeText(option);
                item.textContent = `${option.detail} · ${getQualityHint(option)}${sizeText ? ` · ${sizeText}` : ''}`;
                quickQualitySelect.appendChild(item);
            });
            const selectedInFamily = familyOptions.find(option => option.format === selectedFormat);
            const fallback = selectedInFamily || getFamilySelection(activeFormatFamily) || familyOptions.find(option => option.available !== false) || familyOptions[0];
            quickQualitySelect.disabled = !fallback;
            if (fallback) quickQualitySelect.value = fallback.format;
            quickQualityHint.textContent = fallback
                ? `${getPreparationHint(fallback)}${fallback.qualityWarning ? ` · ${fallback.qualityWarning}` : ''}`
                : '선택 가능한 음질이 없습니다.';
        };
        quickQualitySelect.addEventListener('change', () => setSelected(quickQualitySelect.value, { restoreFocus: false }));

        const renderFormatFamilies = () => {
            familyTabs.replaceChildren();
            formatFamilies.forEach(family => {
                const familyOptions = getFamilyOptions(family.id);
                if (!familyOptions.length) return;
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'download-format-family';
                button.dataset.family = family.id;
                button.setAttribute('aria-haspopup', 'menu');
                button.setAttribute('aria-expanded', 'false');
                button.setAttribute('aria-pressed', String(family.id === getFormatFamily(selectedFormat)));
                const icon = document.createElement('span');
                icon.className = 'download-format-family-icon';
                icon.setAttribute('aria-hidden', 'true');
                icon.textContent = family.icon;
                const copy = document.createElement('span');
                copy.className = 'download-format-family-copy';
                const label = document.createElement('strong');
                label.textContent = family.label;
                const detail = document.createElement('small');
                detail.textContent = family.detail;
                copy.append(label, detail);
                const chevron = document.createElement('span');
                chevron.className = 'download-format-family-chevron';
                chevron.setAttribute('aria-hidden', 'true');
                chevron.textContent = '›';
                button.append(icon, copy, chevron);
                button.addEventListener('click', () => {
                    if (qualityMenuOpen && activeFormatFamily === family.id) {
                        closeQualityMenu();
                        return;
                    }
                    activeFormatFamily = family.id;
                    const familyDefault = getFamilySelection(family.id) || familyOptions.find(option => option.available !== false) || familyOptions[0];
                    if (familyDefault && getFormatFamily(selectedFormat) !== family.id) {
                        setSelected(familyDefault.format, { closeMenu: false, restoreFocus: false });
                    }
                    panel.dataset.formatFamily = activeFormatFamily;
                    renderFormatOptions();
                    qualityMenuOpen = true;
                    qualityMenuReturnFocus = button;
                    qualityMenuAnchor = button;
                    qualityMenu.dataset.anchorFamily = family.id;
                    qualityMenu.dataset.placement = 'below';
                    qualityMenu.dataset.viewportClamped = 'false';
                    qualityMenu.style.visibility = 'hidden';
                    qualityMenu.hidden = false;
                    panel.classList.add('quality-menu-open');
                    syncFamilyButtons();
                    scheduleQualityMenuPosition();
                    requestAnimationFrame(() => {
                        const preferredFormat = qualityPreferences[family.id] || selectedFormat;
                        list.querySelector(`[data-format="${preferredFormat}"]`)?.scrollIntoView?.({ block: 'nearest' });
                    });
                    warning.classList.add('show');
                    warning.textContent = family.id === 'mp3'
                        ? 'MP3 비트레이트를 선택하세요.'
                        : 'WAV 비트 깊이를 선택하세요.';
                });
                button.addEventListener('keydown', event => {
                    if (event.key !== 'ArrowDown') return;
                    event.preventDefault();
                    if (!qualityMenuOpen || activeFormatFamily !== family.id) button.click();
                    requestAnimationFrame(() => {
                        const preferredFormat = qualityPreferences[family.id] || selectedFormat;
                        const preferred = list.querySelector(`[data-format="${preferredFormat}"]:not(:disabled)`);
                        (preferred || list.querySelector('.download-format-option:not(:disabled)'))?.focus();
                    });
                });
                familyTabs.appendChild(button);
            });
            syncFamilyButtons();
        };

        const renderFormatOptions = () => {
            list.replaceChildren();
            const family = formatFamilies.find(item => item.id === activeFormatFamily) || formatFamilies[0];
            // Legacy QA wording anchors: MP3 품질 선택 / WAV 품질 선택.
            qualityLabel.textContent = activeFormatFamily === 'mp3' ? 'MP3 음질' : 'WAV 음질';
            qualityMenu.setAttribute('aria-label', qualityLabel.textContent);
            getFamilyOptions(activeFormatFamily).forEach(option => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = `download-format-option ${option.format === selectedFormat ? 'current' : ''}`;
                button.dataset.format = option.format;
                button.setAttribute('role', 'menuitemradio');
                button.setAttribute('aria-checked', String(option.format === selectedFormat));
                if (option.available === false) {
                    button.disabled = true;
                    button.dataset.permanentDisabled = 'true';
                    button.classList.add('unavailable');
                    button.setAttribute('aria-disabled', 'true');
                    button.title = option.unavailableReason || '다른 포맷은 재마스터링이 필요합니다.';
                }
                const main = document.createElement('span');
                main.className = 'download-format-option-value';
                main.textContent = option.detail;
                const meta = document.createElement('span');
                meta.className = 'download-format-option-meta';
                const unit = document.createElement('b');
                unit.textContent = option.available === false
                    ? `${getQualityHint(option)} · 재마스터링 필요`
                    : `${getQualityHint(option)} · ${getPreparationHint(option)}`;
                const size = document.createElement('small');
                size.className = 'download-format-option-size';
                const estimate = getOptionSizeEstimate(option);
                size.textContent = estimate?.label ? `${estimate.exact ? '현재 ' : '약 '}${estimate.label}` : '용량 계산 불가';
                meta.append(unit, size);
                button.setAttribute('aria-label', `${option.label} ${option.detail}, ${unit.textContent}, ${size.textContent}`);
                button.append(main, meta);
                button.addEventListener('click', () => setSelected(option.format));
                list.appendChild(button);
            });
            if (!list.children.length) {
                const empty = document.createElement('p');
                empty.className = 'download-format-empty';
                empty.textContent = `${family.label} 형식을 사용할 수 없습니다.`;
                list.appendChild(empty);
            }
            renderQuickQualitySelect();
        };
        qualityMenu.addEventListener('keydown', event => {
            const buttons = Array.from(list.querySelectorAll('.download-format-option:not(:disabled)'));
            if (!buttons.length) return;
            const currentIndex = Math.max(0, buttons.indexOf(document.activeElement));
            let nextIndex = currentIndex;
            if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % buttons.length;
            else if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
            else if (event.key === 'Home') nextIndex = 0;
            else if (event.key === 'End') nextIndex = buttons.length - 1;
            else if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                closeQualityMenu({ restoreFocus: true });
                return;
            } else return;
            event.preventDefault();
            buttons[nextIndex]?.focus();
        });
        panel.dataset.formatFamily = activeFormatFamily;
        renderFormatFamilies();
        renderFormatOptions();
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
        let currentActionButton = null;
        const allButtons = () => [...panel.querySelectorAll('button'), ...qualityMenu.querySelectorAll('button')].filter(button => button !== cancelAction);
        const setBusy = (busy, options = {}) => {
            const active = Boolean(busy);
            const showProgress = active && options.showProgress !== false;
            allButtons().forEach(button => {
                button.disabled = active || button.dataset.permanentDisabled === 'true';
                if (active && button === currentActionButton) button.setAttribute('aria-busy', 'true');
                else button.removeAttribute('aria-busy');
            });
            panel.setAttribute('aria-busy', String(active));
            cancelAction.disabled = !showProgress;
            progressCard.hidden = !showProgress;
            panel.classList.toggle('working', showProgress);
            qualityMenu.classList.toggle('working', showProgress);
            if (showProgress) {
                global.requestAnimationFrame?.(() => {
                    if (!progressCard.isConnected || progressCard.hidden) return;
                    try { progressCard.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); } catch (error) {}
                });
            }
            fileNameOptionInputs.forEach(input => { input.disabled = active; });
            fileNameSettingsToggle.disabled = active;
            fileNameCopy.disabled = active;
            fileNameReset.disabled = active;
            if (!active) stopProgressClock();
        };

        const prepareSelected = async statusText => {
            setBusy(true, { showProgress: true });
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
                currentActionButton = button;
                currentActionController = typeof AbortController === 'function' ? new AbortController() : null;
                backdrop.__foxbearAbortController = currentActionController;
                setBusy(true, { showProgress: false });
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
                    currentActionButton = null;
                }
            });
        };

        const handleProgressRestore = () => {
            syncDownloadVisualViewport({ revealProgress: actionInFlight });
            if (!actionInFlight) return;
            progressLastAt = Date.now();
            updateProgressTiming();
        };
        const syncDownloadVisualViewport = ({ revealProgress = false } = {}) => {
            const visualViewport = global.visualViewport || null;
            const layoutHeight = Math.max(240, Number(global.innerHeight || document.documentElement?.clientHeight || 720));
            const visualHeight = Math.max(240, Number(visualViewport?.height || layoutHeight));
            const visualOffsetTop = Math.max(0, Number(visualViewport?.offsetTop || 0));
            const bottomInset = Math.max(0, layoutHeight - (visualOffsetTop + visualHeight));
            panel.style.setProperty('--foxbear-download-visual-height', `${Math.round(visualHeight)}px`);
            backdrop.style.setProperty('--foxbear-download-visual-bottom-inset', `${Math.round(bottomInset)}px`);
            if (revealProgress && actionInFlight && !progressCard.hidden) {
                global.requestAnimationFrame?.(() => {
                    if (!progressCard.isConnected || progressCard.hidden) return;
                    try { progressCard.scrollIntoView({ block: 'center', inline: 'nearest' }); }
                    catch (error) { global.FoxBearRuntimeFaultCounters?.record?.('download-dialog', 'progress-reveal-failed'); }
                });
            }
            return { layoutHeight, visualHeight, visualOffsetTop, bottomInset };
        };
        const handleQualityMenuViewportChange = () => {
            syncDownloadVisualViewport({ revealProgress: true });
            if (qualityMenuOpen) scheduleQualityMenuPosition();
        };
        const handleQualityMenuOutsidePointer = event => {
            if (!qualityMenuOpen) return;
            if (qualityMenu.contains(event.target) || formatPicker.contains(event.target)) return;
            closeQualityMenu();
        };
        const handleDialogKeydown = event => {
            if (event.key !== 'Escape') return;
            if (qualityMenuOpen) {
                event.preventDefault();
                event.stopImmediatePropagation();
                closeQualityMenu({ restoreFocus: true });
                return;
            }
            if (event.key !== 'Escape' || actionInFlight) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            closeDownloadOptionsDialog(backdrop);
        };
        document.addEventListener('visibilitychange', handleProgressRestore, { passive: true });
        document.addEventListener('keydown', handleDialogKeydown, true);
        document.addEventListener('pointerdown', handleQualityMenuOutsidePointer, true);
        global.addEventListener('pageshow', handleProgressRestore, { passive: true });
        global.addEventListener('resize', handleQualityMenuViewportChange, { passive: true });
        global.addEventListener('orientationchange', handleQualityMenuViewportChange, { passive: true });
        global.visualViewport?.addEventListener?.('resize', handleQualityMenuViewportChange, { passive: true });
        global.visualViewport?.addEventListener?.('scroll', handleQualityMenuViewportChange, { passive: true });
        panel.addEventListener('scroll', handleQualityMenuViewportChange, { passive: true });
        backdrop.__foxbearCleanup = () => {
            stopProgressClock();
            cancelQualityMenuPosition();
            document.removeEventListener('visibilitychange', handleProgressRestore);
            document.removeEventListener('keydown', handleDialogKeydown, true);
            document.removeEventListener('pointerdown', handleQualityMenuOutsidePointer, true);
            global.removeEventListener('pageshow', handleProgressRestore);
            global.removeEventListener('resize', handleQualityMenuViewportChange);
            global.removeEventListener('orientationchange', handleQualityMenuViewportChange);
            global.visualViewport?.removeEventListener?.('resize', handleQualityMenuViewportChange);
            global.visualViewport?.removeEventListener?.('scroll', handleQualityMenuViewportChange);
            panel.removeEventListener('scroll', handleQualityMenuViewportChange);
            qualityMenu.remove();
        };

        bindActionButton(download, primaryAction, download.textContent);
        bindActionButton(share, secondaryAction, share.textContent);
        bindActionButton(help, tertiaryAction, help.textContent);

        close.addEventListener('click', () => {
            if (actionInFlight) return;
            closeDownloadOptionsDialog(backdrop);
        });
        panel.addEventListener('click', event => {
            if (qualityMenuOpen && !formatPicker.contains(event.target)) closeQualityMenu();
        });
        backdrop.addEventListener('click', event => { if (event.target === backdrop && !actionInFlight) closeDownloadOptionsDialog(backdrop); });
        panel.classList.add('download-options-panel-simple');
        // Compact-stack compatibility anchor: panel.append(close, title, name, warning, listLabel, list, selectedSummary, actions)
        // v1.6.109 compact hierarchy: only MP3/WAV stay visible; quality is portalled above the scrollable sheet.
        panel.append(close, title, name, warning, listLabel, formatPicker, selectedSummary, progressCard, fileNameCard, actions);
        backdrop.append(panel, qualityMenu);
        syncDownloadVisualViewport();
        document.body.appendChild(backdrop);
        document.body.classList.add('download-options-open');
        global.FoxBearModalStateMachine?.setExternalLayerOpen?.(backdrop, true, {
            mode: 'dialog',
            panel,
            opener: backdrop.__foxbearReturnFocus,
            lockScroll: true,
            onRequestClose: () => { if (!actionInFlight) closeDownloadOptionsDialog(backdrop); },
            onViewportChange: () => { syncDownloadVisualViewport({ revealProgress: true }); scheduleQualityMenuPosition(); }
        });
        requestAnimationFrame(() => panel.focus());
    }

    global.FoxBearDownloadDialogView = Object.freeze({ showDownloadOptionsDialog });
})(window);
