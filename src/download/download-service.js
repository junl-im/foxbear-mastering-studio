(function initFoxBearDownloadService(global) {
    'use strict';

    const DEFAULT_FORMAT_OPTIONS = Object.freeze([
        { format: 'mp3_128', label: 'MP3', detail: '128 kbps' },
        { format: 'mp3_192', label: 'MP3', detail: '192 kbps' },
        { format: 'mp3_320', label: 'MP3', detail: '320 kbps' },
        { format: 'wav16', label: 'WAV', detail: '16-bit PCM' },
        { format: 'wav24', label: 'WAV', detail: '24-bit PCM' },
        { format: 'wav32float', label: 'WAV', detail: '32-bit Float' }
    ]);

    const noop = () => {};
    const MAX_DOWNLOAD_DIAGNOSTIC_EVENTS = 16;
    const downloadDiagnosticEvents = [];

    const clonePlain = value => {
        try { return JSON.parse(JSON.stringify(value)); }
        catch (error) { return value; }
    };

    const recordDownloadEvent = (type, detail = {}) => {
        const event = {
            at: new Date().toISOString(),
            type: String(type || 'event'),
            detail: clonePlain(detail || {})
        };
        downloadDiagnosticEvents.push(event);
        while (downloadDiagnosticEvents.length > MAX_DOWNLOAD_DIAGNOSTIC_EVENTS) downloadDiagnosticEvents.shift();
        return event;
    };

    const getDownloadDiagnosticEvents = () => downloadDiagnosticEvents.map(event => ({ ...event, detail: clonePlain(event.detail) }));

    const getToast = deps => (typeof deps?.showToast === 'function' ? deps.showToast : noop);
    const getTimestamp = deps => (typeof deps?.timestampForFile === 'function' ? deps.timestampForFile() : new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14));
    const addActiveUrl = (url, deps) => {
        const urls = deps?.state?.activeDownloadUrls;
        if (url && urls && typeof urls.add === 'function') urls.add(url);
    };
    const hasActiveUrl = (url, deps) => {
        const urls = deps?.state?.activeDownloadUrls;
        return Boolean(urls && typeof urls.has === 'function' && urls.has(url));
    };
    const deleteActiveUrl = (url, deps) => {
        const urls = deps?.state?.activeDownloadUrls;
        if (urls && typeof urls.delete === 'function') urls.delete(url);
    };

    const getDownloadFormatOptions = () => DEFAULT_FORMAT_OPTIONS.map(option => ({ ...option }));

    const getFallbackMasteredFileName = (track, deps, options = {}) => {
        if (typeof deps?.buildMasteredFileName === 'function') return deps.buildMasteredFileName(track, options);
        const base = String(track?.name || 'track').replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9가-힣._ -]+/g, '_').trim() || 'track';
        const extension = options.extension || (/mp3/.test(options.format || '') ? 'mp3' : 'wav');
        return `${base}_mastered.${extension}`;
    };

    const prepareTrackDownloadBlob = async (track, format, deps = {}) => {
        if (!track || !track.outBlob) throw new Error('완성된 마스터링 파일이 없습니다.');
        if (format === track.outFormat || !track.masteredBuffer) {
            const outputFormat = track.outFormat || 'wav24';
            const fileName = track.outName || getFallbackMasteredFileName(track, deps, {
                format: outputFormat,
                extension: /mp3/.test(outputFormat) ? 'mp3' : 'wav'
            });
            return { blob: track.outBlob, fileName };
        }
        if (typeof deps.encodeMasterOutputAsync !== 'function') throw new Error('선택한 포맷을 인코딩할 수 없습니다.');
        const encoded = await deps.encodeMasterOutputAsync(track.masteredBuffer, format);
        if (!encoded.blob || encoded.blob.size <= 44) throw new Error('선택한 포맷 파일을 만들지 못했습니다.');
        const fileName = getFallbackMasteredFileName(track, deps, encoded);
        return { blob: encoded.blob, fileName };
    };

    const canShareTinyAudioProbe = () => {
        if (!navigator.share || typeof File === 'undefined') return false;
        if (!navigator.canShare) return true;
        try {
            const file = new File([new Uint8Array([0])], 'foxbear-preview.wav', { type: 'audio/wav' });
            return navigator.canShare({ files: [file] });
        } catch (error) {
            return false;
        }
    };

    const supportsWebShareDownloadFiles = () => Boolean(navigator.share && typeof File !== 'undefined' && (!navigator.canShare || canShareTinyAudioProbe()));

    const makeShareFile = (blob, fileName) => new File([blob], fileName, { type: blob?.type || 'application/octet-stream' });

    const supportsWebShareFiles = (blob, fileName) => {
        if (!navigator.share || typeof File === 'undefined' || !blob) return false;
        try {
            const file = makeShareFile(blob, fileName || 'foxbear-mastered.wav');
            return !navigator.canShare || navigator.canShare({ files: [file] });
        } catch (error) {
            return false;
        }
    };

    const supportsFileSystemSave = () => typeof global.showSaveFilePicker === 'function';

    const supportsAnchorDownload = () => {
        const a = document.createElement('a');
        return 'download' in a;
    };

    const isRestrictedDownloadBrowser = () => {
        const ua = navigator.userAgent || '';
        return /KAKAOTALK|KakaoTalk|NAVER\(inapp|FBAN|FBAV|Instagram|Line\//i.test(ua);
    };

    const isKakaoInAppBrowser = () => /KAKAOTALK|KakaoTalk/i.test(navigator.userAgent || '');

    const getDownloadEnvironmentInfo = () => {
        const ua = navigator.userAgent || '';
        const restricted = isRestrictedDownloadBrowser();
        const ios = /iPhone|iPad|iPod/i.test(ua);
        const android = /Android/i.test(ua);
        const kakao = /KAKAOTALK|KakaoTalk/i.test(ua);
        const naver = /NAVER\(inapp/i.test(ua);
        const instagram = /Instagram/i.test(ua);
        const line = /Line\//i.test(ua);
        const standalone = Boolean(global.matchMedia?.('(display-mode: standalone)')?.matches || global.navigator?.standalone);
        const secureContext = Boolean(global.isSecureContext);
        const shareApi = Boolean(navigator.share && typeof File !== 'undefined');
        const shareFiles = shareApi && (!navigator.canShare || canShareTinyAudioProbe());
        const anchorDownload = supportsAnchorDownload();
        const filePicker = supportsFileSystemSave();
        let label = '일반 브라우저';
        if (kakao) label = '카카오톡 인앱 브라우저';
        else if (naver) label = '네이버 인앱 브라우저';
        else if (instagram) label = '인스타그램 인앱 브라우저';
        else if (line) label = 'LINE 인앱 브라우저';
        else if (ios) label = 'iOS 브라우저';
        else if (android) label = 'Android 브라우저';
        const detail = restricted
            ? '인앱 브라우저는 Blob 자동 다운로드가 막히거나 저장 위치가 보이지 않을 수 있어 공유/저장, 파일 열기, 외부 브라우저 안내를 함께 제공합니다.'
            : shareFiles
                ? '다운로드와 파일 공유가 모두 가능한 환경으로 보입니다.'
                : '다운로드는 가능하지만 파일 공유는 제한될 수 있습니다.';
        const recommendedAction = restricted
            ? (shareFiles ? '공유/저장 먼저' : '저장 도움 먼저')
            : '다운로드';
        return { ua, restricted, ios, android, kakao, naver, instagram, line, standalone, secureContext, label, detail, shareApi, shareFiles, anchorDownload, filePicker, recommendedAction };
    };

    const getFileSizeLabel = blob => {
        const size = Number(blob?.size || 0);
        if (!size) return '크기 확인 전';
        if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
        if (size >= 1024) return `${Math.round(size / 1024)} KB`;
        return `${size} B`;
    };

    const getDownloadTroubleshootingText = (fileName = 'FoxBear mastered file') => {
        const env = getDownloadEnvironmentInfo();
        const lines = [
            `FoxBear 다운로드/공유 안내`,
            `파일: ${fileName}`,
            `브라우저: ${env.label}`,
            '',
            env.restricted
                ? '카카오톡/인앱 브라우저에서는 Blob 자동 다운로드가 저장되지 않거나 다운로드 목록에 보이지 않을 수 있습니다.'
                : '일반 브라우저에서는 다운로드 버튼이 가장 안정적입니다.',
            '',
            '권장 순서:',
            '1. 공유/저장 버튼으로 기기 기본 공유창을 엽니다.',
            '2. 공유창에서 파일 저장, 카카오톡, 문자, 메일, 드라이브 중 가능한 대상을 선택합니다.',
            '3. 공유창이 뜨지 않으면 저장 도움창의 파일 열기를 눌러 새 화면에서 저장을 시도합니다.',
            '4. 카카오톡 안에서 계속 실패하면 주소 복사 후 Chrome/Safari에서 다시 열어 마스터링/다운로드를 진행합니다.'
        ];
        return lines.join('\n');
    };


    const getRecommendedDownloadFlow = (blob = null, fileName = '') => {
        const env = getDownloadEnvironmentInfo();
        const safeName = fileName ? sanitizeDownloadFileName(normalizeDownloadFileNameForBlob(fileName, blob)) : '';
        const shareReady = blob ? supportsWebShareFiles(blob, safeName || fileName || 'foxbear-mastered.wav') : env.shareFiles;
        const directSaveReady = supportsFileSystemSave();
        const defaultSteps = [
            { key: 'download', label: '다운로드', detail: '브라우저 기본 저장을 시도합니다.' },
            { key: 'share', label: '파일 공유', detail: '지원 기기에서는 공유창으로 보냅니다.' },
            { key: 'assist', label: '저장 도움', detail: '저장이 안 보이면 대체 방법을 보여줍니다.' }
        ];
        if (env.restricted) {
            return {
                version: '1.4.23',
                restricted: true,
                primaryAction: shareReady ? 'share' : 'assist',
                primaryLabel: shareReady ? '공유/저장' : '저장 도움',
                secondaryLabel: shareReady ? '저장 도움' : '파일 열기',
                headline: shareReady ? '카카오에서는 공유/저장이 가장 안정적입니다.' : '이 인앱 브라우저는 파일 공유가 제한될 수 있습니다.',
                detail: '자동 다운로드에만 기대지 않고 공유/저장, 파일 열기, 외부 브라우저 순서로 안내합니다.',
                steps: [
                    { key: 'share', label: '1. 공유/저장', detail: shareReady ? '기기 공유창에서 파일 앱, 카카오톡, 드라이브를 선택합니다.' : '지원되지 않으면 바로 저장 도움으로 넘어갑니다.' },
                    { key: 'assist', label: '2. 저장 도움', detail: '파일 열기와 안내 복사, 진단 복사를 제공합니다.' },
                    { key: 'external', label: '3. 외부 브라우저', detail: '계속 실패하면 Chrome/Safari에서 다시 진행합니다.' }
                ],
                badges: [
                    shareReady ? '파일 공유 가능' : '파일 공유 제한',
                    env.kakao ? '카카오 인앱' : '인앱 브라우저',
                    directSaveReady ? '직접 저장 가능' : '직접 저장 제한'
                ]
            };
        }
        return {
            version: '1.4.23',
            restricted: false,
            primaryAction: 'download',
            primaryLabel: '다운로드',
            secondaryLabel: shareReady ? '파일 공유' : '저장 도움',
            headline: '일반 브라우저에서는 다운로드가 우선입니다.',
            detail: shareReady ? '공유가 필요하면 파일 공유를 함께 사용할 수 있습니다.' : '공유가 제한되면 저장 도움을 사용하세요.',
            steps: defaultSteps,
            badges: [
                env.anchorDownload ? '다운로드 가능' : '다운로드 제한 가능',
                shareReady ? '파일 공유 가능' : '파일 공유 제한',
                env.standalone ? 'PWA 모드' : env.label
            ]
        };
    };


    const getDownloadActionReceipt = (action = 'download', blob = null, fileName = '') => {
        const env = getDownloadEnvironmentInfo();
        const normalizedAction = ['download', 'share', 'assist', 'diagnostics', 'copy', 'external'].includes(action) ? action : 'download';
        const safeName = fileName ? sanitizeDownloadFileName(normalizeDownloadFileNameForBlob(fileName, blob)) : 'FoxBear mastered file';
        const fileSize = getFileSizeLabel(blob);
        const commonFile = `${safeName} · ${fileSize}`;
        const restricted = env.restricted;
        const receiptMap = {
            download: restricted
                ? {
                    title: '인앱 브라우저라 저장 도움으로 전환될 수 있습니다.',
                    detail: `${commonFile} 준비 후 공유/저장 또는 파일 열기 순서로 안내합니다.`,
                    nextSteps: ['공유창이 뜨면 파일 저장/드라이브/메신저를 선택하세요.', '공유창이 안 뜨면 저장 도움의 파일 열기를 누르세요.', '계속 실패하면 주소 복사 후 Chrome/Safari에서 다시 여세요.']
                }
                : {
                    title: '다운로드를 시작합니다.',
                    detail: `${commonFile} 파일을 브라우저 기본 저장 방식으로 내려받습니다.`,
                    nextSteps: ['다운로드 표시줄 또는 다운로드 폴더를 확인하세요.', '저장이 안 보이면 저장 도움을 사용하세요.']
                },
            share: {
                title: restricted ? '공유/저장창을 먼저 여는 흐름입니다.' : '기기 공유창으로 파일을 보냅니다.',
                detail: `${commonFile} 파일을 공유 가능한 오디오 파일로 준비합니다.`,
                nextSteps: ['공유창에서 파일 앱, 드라이브, 메신저, 메일 중 가능한 대상을 고르세요.', '공유가 취소되거나 막히면 저장 도움으로 이어집니다.']
            },
            assist: {
                title: '저장 도움창을 엽니다.',
                detail: `${commonFile} 파일을 열기/공유/복사 안내와 함께 보여줍니다.`,
                nextSteps: ['파일 열기를 눌러 새 화면에서 저장을 시도하세요.', '인앱 브라우저에서는 외부 브라우저 안내를 참고하세요.', '문제가 계속되면 진단 복사를 눌러 상태를 확인하세요.']
            },
            diagnostics: {
                title: '진단 정보를 복사합니다.',
                detail: '파일 저장 실패 원인을 확인할 수 있도록 브라우저/공유/다운로드 상태를 복사합니다.',
                nextSteps: ['복사된 JSON을 메모장이나 대화창에 붙여 확인하세요.', '파일 자체는 공유되지 않고 상태 정보만 복사됩니다.']
            },
            copy: {
                title: '현재 페이지 주소를 복사합니다.',
                detail: '외부 브라우저에서 다시 열 수 있도록 현재 앱 주소를 복사합니다.',
                nextSteps: ['Chrome/Safari 주소창에 붙여넣어 여세요.', '메모리의 완성 파일은 넘어가지 않을 수 있어 다시 마스터링이 필요할 수 있습니다.']
            },
            external: {
                title: '외부 브라우저로 열기를 시도합니다.',
                detail: '인앱 브라우저 제한을 피하기 위해 Chrome/Safari 이동을 안내합니다.',
                nextSteps: ['새 브라우저에서 앱이 열리면 파일을 다시 불러와 마스터링하세요.', '현재 Blob 파일은 브라우저 간 직접 전달되지 않을 수 있습니다.']
            }
        };
        const receipt = receiptMap[normalizedAction] || receiptMap.download;
        return {
            version: '1.4.23',
            action: normalizedAction,
            title: receipt.title,
            detail: receipt.detail,
            nextSteps: receipt.nextSteps.slice(),
            badges: [env.label, restricted ? '인앱 fallback' : '일반 저장', env.shareFiles ? '공유 가능' : '공유 제한'],
            file: { name: safeName, sizeLabel: fileSize, sizeBytes: Number(blob?.size || 0), type: blob?.type || '' },
            environment: { label: env.label, restricted, kakao: env.kakao, ios: env.ios, android: env.android, standalone: env.standalone }
        };
    };


    const getDownloadRecoveryChecklist = (blob = null, fileName = '', lastAction = '') => {
        const env = getDownloadEnvironmentInfo();
        const safeName = fileName ? sanitizeDownloadFileName(normalizeDownloadFileNameForBlob(fileName, blob)) : 'FoxBear mastered file';
        const fileSize = getFileSizeLabel(blob);
        const shareReady = blob ? supportsWebShareFiles(blob, safeName) : env.shareFiles;
        const restricted = env.restricted;
        const normalizedLastAction = String(lastAction || '').replace(/[^a-z-]+/gi, '') || 'ready';
        const headline = restricted
            ? '카카오/인앱 저장 체크리스트'
            : '다운로드 확인 체크리스트';
        const summary = restricted
            ? '자동 다운로드가 안 보이면 고장이라기보다 브라우저 제한일 가능성이 큽니다. 아래 순서대로만 확인하세요.'
            : '다운로드가 바로 보이지 않으면 브라우저 저장 위치와 도움창을 차례로 확인하세요.';
        const steps = restricted
            ? [
                { key: 'share', label: '1. 공유/저장', detail: shareReady ? '공유창에서 파일 앱, 드라이브, 카카오톡, 메일 중 가능한 곳을 선택합니다.' : '공유창이 제한되면 바로 저장 도움으로 넘어갑니다.' },
                { key: 'open', label: '2. 파일 열기', detail: '저장 도움창에서 파일 열기를 누른 뒤 브라우저 메뉴의 저장/공유를 확인합니다.' },
                { key: 'diagnostics', label: '3. 진단 복사', detail: '계속 실패하면 진단 복사를 눌러 브라우저/파일 상태를 확인합니다.' },
                { key: 'external', label: '4. 외부 브라우저', detail: '마지막으로 주소 복사 후 Chrome/Safari에서 다시 마스터링하고 저장합니다.' }
            ]
            : [
                { key: 'download', label: '1. 다운로드 폴더 확인', detail: '브라우저 다운로드 표시줄 또는 다운로드 폴더를 먼저 확인합니다.' },
                { key: 'share', label: '2. 파일 공유', detail: shareReady ? '필요하면 기기 공유창으로 파일을 보냅니다.' : '공유가 제한되면 저장 도움을 사용합니다.' },
                { key: 'assist', label: '3. 저장 도움', detail: '자동 저장이 안 보이면 파일 열기 또는 직접 저장을 사용합니다.' }
            ];
        return {
            version: '1.4.23',
            lastAction: normalizedLastAction,
            headline,
            summary,
            primaryAction: restricted ? (shareReady ? 'share' : 'assist') : 'download',
            fallbackAction: restricted ? 'diagnostics' : 'assist',
            file: { name: safeName, sizeLabel: fileSize, sizeBytes: Number(blob?.size || 0), type: blob?.type || '' },
            environment: { label: env.label, restricted, kakao: env.kakao, ios: env.ios, android: env.android, standalone: env.standalone, shareFiles: env.shareFiles, anchorDownload: env.anchorDownload, filePicker: env.filePicker },
            steps
        };
    };



    const getDownloadCompactRecoveryPlan = (blob = null, fileName = '', lastAction = '') => {
        const checklist = getDownloadRecoveryChecklist(blob, fileName, lastAction);
        const env = checklist.environment || getDownloadEnvironmentInfo();
        const restricted = Boolean(env.restricted);
        const maxVisibleSteps = restricted ? 3 : 2;
        const compactSteps = (checklist.steps || []).slice(0, maxVisibleSteps).map((step, index) => ({
            key: step.key || `step-${index + 1}`,
            label: String(step.label || `단계 ${index + 1}`).replace(/^\d+\.\s*/, ''),
            detail: step.detail || ''
        }));
        const optionalStep = restricted
            ? (checklist.steps || []).find(step => step.key === 'diagnostics') || null
            : (checklist.steps || []).find(step => step.key === 'assist') || null;
        return {
            version: '1.4.23',
            mode: restricted ? 'restricted-compact' : 'standard-compact',
            lastAction: checklist.lastAction,
            headline: restricted ? '저장은 이 순서로만 해보세요' : '저장이 안 보이면 이것만 확인하세요',
            summary: restricted
                ? '카카오 안에서는 자동 다운로드보다 공유/파일 열기가 더 안정적입니다.'
                : '대부분은 다운로드 폴더 확인 또는 저장 도움으로 해결됩니다.',
            primaryAction: checklist.primaryAction,
            fallbackAction: checklist.fallbackAction,
            firstActionLabel: restricted ? '공유/저장' : '다운로드',
            fallbackLabel: restricted ? '파일 열기' : '저장 도움',
            copyLabel: '체크리스트 복사',
            optionalAction: optionalStep ? {
                key: optionalStep.key,
                label: String(optionalStep.label || '').replace(/^\d+\.\s*/, '') || '추가 확인',
                detail: optionalStep.detail || ''
            } : null,
            file: checklist.file,
            environment: checklist.environment,
            steps: compactSteps
        };
    };


    const getDownloadDialogCompactHint = (blob = null, fileName = '', lastAction = '') => {
        const plan = getDownloadCompactRecoveryPlan(blob, fileName, lastAction);
        const env = plan.environment || getDownloadEnvironmentInfo();
        const restricted = Boolean(env.restricted);
        const primaryLabel = restricted ? (plan.primaryAction === 'assist' ? '저장 도움' : '공유/저장') : '다운로드';
        const fallbackLabel = restricted ? '파일 열기' : '저장 도움';
        return {
            version: '1.4.23',
            mode: restricted ? 'restricted-micro' : 'standard-micro',
            lastAction: plan.lastAction,
            headline: restricted ? '카카오에서는 이 두 가지만 먼저' : '먼저 다운로드만 확인',
            detail: restricted
                ? `${primaryLabel}을 먼저 누르고, 안 보이면 저장 도움의 ${fallbackLabel}를 누르세요.`
                : '저장이 안 보이면 다운로드 폴더를 확인하고, 필요할 때만 저장 도움을 여세요.',
            primaryAction: plan.primaryAction,
            fallbackAction: plan.fallbackAction,
            primaryLabel,
            fallbackLabel,
            advancedLabel: restricted ? '진단/주소 복사는 추가 옵션에 있습니다.' : '공유/진단은 추가 옵션에 있습니다.',
            visibleStepLimit: restricted ? 2 : 1,
            steps: (plan.steps || []).slice(0, restricted ? 2 : 1),
            file: plan.file,
            environment: plan.environment
        };
    };


    const getDownloadDialogDisplayProfile = (blob = null, fileName = '', lastAction = 'dialog-open') => {
        const hint = getDownloadDialogCompactHint(blob, fileName, lastAction);
        const env = hint.environment || getDownloadEnvironmentInfo();
        const restricted = Boolean(env.restricted);
        return {
            version: '1.4.23',
            mode: restricted ? 'restricted-declutter' : 'standard-declutter',
            headline: restricted ? '첫 화면은 공유/저장만 먼저' : '첫 화면은 다운로드만 먼저',
            detail: restricted
                ? '카카오에서 안 보이면 저장 도움의 파일 열기만 확인하고, 진단/주소 복사는 추가 옵션에서 사용하세요.'
                : '저장 위치가 안 보일 때만 저장 도움을 열고, 공유/진단은 추가 옵션에 둡니다.',
            initialWarning: restricted ? '공유/저장을 먼저 누르세요. 안 되면 저장 도움의 파일 열기만 확인하세요.' : '다운로드를 먼저 누르세요. 안 보이면 다운로드 폴더를 확인하세요.',
            receiptIdle: true,
            maxInitialReceiptSteps: restricted ? 1 : 0,
            maxActionReceiptSteps: restricted ? 2 : 2,
            showChecklistOnOpen: false,
            showChecklistAfterAction: true,
            advancedCollapsed: true,
            hint
        };
    };

    const serializeDownloadRecoveryChecklist = (blob = null, fileName = '', lastAction = '') => {
        const checklist = getDownloadRecoveryChecklist(blob, fileName, lastAction);
        const lines = [
            'FoxBear 저장 체크리스트',
            `파일: ${checklist.file.name} (${checklist.file.sizeLabel})`,
            `브라우저: ${checklist.environment.label}`,
            `최근 동작: ${checklist.lastAction}`,
            '',
            checklist.summary,
            '',
            ...checklist.steps.map(step => `${step.label}: ${step.detail}`)
        ];
        return lines.join('\n');
    };

    const copyDownloadRecoveryChecklist = (blob = null, fileName = '', lastAction = '', deps = {}) => {
        const text = serializeDownloadRecoveryChecklist(blob, fileName, lastAction);
        recordDownloadEvent('recovery-checklist-copy', { fileName, lastAction });
        return copyTextToClipboard(text, deps, '저장 체크리스트를 복사했습니다.');
    };

    const copyTextToClipboard = async (text, deps = {}, successMessage = '복사했습니다.') => {
        const showToast = getToast(deps);
        if (navigator.clipboard && global.isSecureContext) {
            await navigator.clipboard.writeText(text);
            showToast(successMessage);
            return true;
        }
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        document.body.appendChild(area);
        area.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (error) { ok = false; }
        area.remove();
        showToast(ok ? successMessage : text);
        return ok;
    };

    const copyDownloadTroubleshootingGuide = (fileName, deps = {}) => {
        const text = getDownloadTroubleshootingText(fileName);
        recordDownloadEvent('troubleshooting-copy', { fileName });
        return copyTextToClipboard(text, deps, '다운로드 문제 해결 안내를 복사했습니다.');
    };

    const getDownloadDiagnostics = (blob = null, fileName = '') => {
        const env = getDownloadEnvironmentInfo();
        const safeName = fileName ? sanitizeDownloadFileName(normalizeDownloadFileNameForBlob(fileName, blob)) : '';
        return {
            version: '1.4.23',
            generatedAt: new Date().toISOString(),
            file: {
                name: safeName || fileName || '',
                sizeBytes: Number(blob?.size || 0),
                sizeLabel: getFileSizeLabel(blob),
                type: String(blob?.type || '')
            },
            capability: getDownloadCapabilitySummary(blob, safeName || fileName),
            environment: {
                label: env.label,
                restricted: env.restricted,
                kakao: env.kakao,
                ios: env.ios,
                android: env.android,
                standalone: env.standalone,
                secureContext: env.secureContext,
                shareApi: env.shareApi,
                shareFiles: env.shareFiles,
                anchorDownload: env.anchorDownload,
                filePicker: env.filePicker,
                recommendedAction: env.recommendedAction,
                userAgent: env.ua
            },
            recentEvents: getDownloadDiagnosticEvents()
        };
    };

    const serializeDownloadDiagnostics = (blob = null, fileName = '') => JSON.stringify(getDownloadDiagnostics(blob, fileName), null, 2);

    const copyDownloadDiagnostics = (blob = null, fileName = '', deps = {}) => {
        recordDownloadEvent('diagnostics-copy', { fileName, sizeBytes: Number(blob?.size || 0), type: blob?.type || '' });
        return copyTextToClipboard(serializeDownloadDiagnostics(blob, fileName), deps, '다운로드 진단 정보를 복사했습니다.');
    };

    const shareDownloadFile = async (blob, fileName, deps = {}) => {
        if (!navigator.share || typeof File === 'undefined') {
            recordDownloadEvent('share-unsupported', { fileName, hasNavigatorShare: Boolean(navigator.share), hasFile: typeof File !== 'undefined' });
            throw new Error('파일 공유를 지원하지 않는 브라우저입니다.');
        }
        if (!blob) throw new Error('공유할 파일이 없습니다.');
        const safeName = sanitizeDownloadFileName(normalizeDownloadFileNameForBlob(fileName, blob));
        const file = makeShareFile(blob, safeName);
        const payload = { files: [file], title: safeName, text: 'FoxBear Music 마스터링 파일' };
        if (navigator.canShare && !navigator.canShare({ files: payload.files })) {
            recordDownloadEvent('share-cannot-share-file', { fileName: safeName, sizeBytes: blob.size, type: blob.type || '' });
            throw new Error('이 파일 형식은 현재 브라우저 공유창에서 보낼 수 없습니다.');
        }
        recordDownloadEvent('share-start', { fileName: safeName, sizeBytes: blob.size, type: blob.type || '' });
        try {
            await navigator.share(payload);
            recordDownloadEvent('share-success', { fileName: safeName, sizeBytes: blob.size, type: blob.type || '' });
            getToast(deps)('공유/저장 요청을 보냈습니다.');
        } catch (error) {
            recordDownloadEvent('share-failed', { fileName: safeName, message: error?.message || String(error), name: error?.name || '' });
            throw error;
        }
    };

    const saveBlobWithPicker = async (blob, fileName, deps = {}) => {
        if (!supportsFileSystemSave()) throw new Error('File System Access API unsupported');
        const safeName = sanitizeDownloadFileName(normalizeDownloadFileNameForBlob(fileName, blob));
        recordDownloadEvent('file-picker-start', { fileName: safeName, sizeBytes: Number(blob?.size || 0), type: blob?.type || '' });
        const ext = safeName.includes('.') ? safeName.split('.').pop().toLowerCase() : '';
        const picker = await global.showSaveFilePicker({
            suggestedName: safeName,
            types: [{
                description: 'FoxBear mastered file',
                accept: { [blob.type || 'application/octet-stream']: ext ? [`.${ext}`] : ['.wav'] }
            }]
        });
        const writable = await picker.createWritable();
        await writable.write(blob);
        await writable.close();
        recordDownloadEvent('file-picker-success', { fileName: safeName, sizeBytes: Number(blob?.size || 0), type: blob?.type || '' });
        getToast(deps)(`${safeName} 직접 저장을 완료했습니다.`);
    };

    const copyCurrentPageUrl = (deps = {}) => {
        const text = location.href.split('#')[0];
        recordDownloadEvent('page-url-copy', { url: text });
        copyTextToClipboard(text, deps, '페이지 주소를 복사했습니다. 카카오톡 메뉴에서 외부 브라우저로 열어주세요.')
            .catch(() => getToast(deps)(text));
    };

    const buildExternalBrowserIntentUrl = pageUrl => {
        const parsed = new URL(pageUrl);
        const scheme = parsed.protocol.replace(':', '') || 'https';
        const path = `${parsed.host}${parsed.pathname}${parsed.search}`;
        return `intent://${path}#Intent;scheme=${scheme};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`;
    };

    const openCurrentPageInExternalBrowser = (deps = {}) => {
        const pageUrl = location.href.split('#')[0];
        recordDownloadEvent('external-browser-open', { pageUrl });
        const ua = navigator.userAgent || '';
        const showToast = getToast(deps);
        if (/Android/i.test(ua)) {
            try {
                global.location.href = buildExternalBrowserIntentUrl(pageUrl);
                setTimeout(() => copyCurrentPageUrl(deps), 900);
                return;
            } catch (error) {
                console.warn('external browser intent failed:', error);
            }
        }
        copyCurrentPageUrl(deps);
        showToast('iPhone 카카오톡은 오른쪽 위 메뉴에서 Safari/브라우저로 열기를 눌러주세요.');
    };

    const normalizeDownloadFileNameForBlob = (fileName, blob) => {
        const rawName = String(fileName || 'download').trim() || 'download';
        const mime = String(blob?.type || '').toLowerCase();
        let expectedExt = '';
        if (mime.includes('mpeg') || mime.includes('mp3')) expectedExt = 'mp3';
        else if (mime.includes('wav') || mime.includes('wave')) expectedExt = 'wav';
        else if (mime.includes('zip')) expectedExt = 'zip';
        else if (mime.includes('json')) expectedExt = 'json';
        if (!expectedExt) return rawName;

        const lower = rawName.toLowerCase();
        if (lower.endsWith(`.${expectedExt}`)) return rawName;

        const dot = rawName.lastIndexOf('.');
        if (dot > 0 && rawName.length - dot <= 7) {
            return `${rawName.slice(0, dot)}.${expectedExt}`;
        }
        return `${rawName}.${expectedExt}`;
    };

    const sanitizeDownloadFileName = fileName => {
        const cleaned = String(fileName || 'download').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim();
        return cleaned || 'download';
    };

    const revokeDownloadUrl = (url, deps = {}) => {
        if (!url) return;
        if (hasActiveUrl(url, deps)) {
            URL.revokeObjectURL(url);
            deleteActiveUrl(url, deps);
            return;
        }
        try { URL.revokeObjectURL(url); } catch (error) {}
    };

    const appendGuideSteps = (container, env) => {
        const list = document.createElement('ol');
        list.className = 'download-assist-steps';
        const steps = env.restricted
            ? [
                '공유/저장을 눌러 기기 기본 공유창을 먼저 엽니다.',
                '공유창에서 파일 저장, 카카오톡, 문자, 메일, 드라이브 중 가능한 곳을 선택합니다.',
                '공유창이 안 뜨면 파일 열기를 누른 뒤 브라우저 메뉴의 저장/공유를 사용합니다.',
                '계속 실패하면 주소 복사 후 Chrome/Safari에서 다시 열어 다운로드합니다.'
            ]
            : [
                '다운로드가 자동 시작되지 않으면 파일 열기를 눌러 저장합니다.',
                '지원 브라우저라면 공유/저장으로 기기 공유창을 사용할 수 있습니다.'
            ];
        steps.forEach(step => {
            const item = document.createElement('li');
            item.textContent = step;
            list.appendChild(item);
        });
        container.appendChild(list);
    };

    const showDownloadAssist = (url, fileName, mimeType, blob = null, deps = {}) => {
        if (url) addActiveUrl(url, deps);
        recordDownloadEvent('assist-open', { fileName, mimeType, sizeBytes: Number(blob?.size || 0), hasUrl: Boolean(url) });
        const previous = document.getElementById('downloadAssist');
        if (previous) previous.remove();

        const env = getDownloadEnvironmentInfo();
        const panel = document.createElement('div');
        panel.id = 'downloadAssist';
        panel.className = `download-assist download-assist-v2 ${env.restricted ? 'restricted' : 'normal'}`;
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'false');
        panel.setAttribute('aria-label', '다운로드 저장 도움');

        const closeTop = document.createElement('button');
        closeTop.type = 'button';
        closeTop.className = 'download-assist-close';
        closeTop.setAttribute('aria-label', '저장 도움 닫기');
        closeTop.textContent = '×';

        const title = document.createElement('strong');
        title.textContent = env.restricted ? '카카오 저장 도움' : '다운로드가 안 보이나요?';

        const message = document.createElement('p');
        message.textContent = env.restricted
            ? '카카오톡 안에서는 자동 다운로드가 조용히 실패할 수 있습니다. 아래 순서대로 저장 방법을 바꿔보세요.'
            : '자동 저장이 시작되지 않으면 아래 버튼으로 파일을 직접 열거나 공유해주세요.';

        const file = document.createElement('span');
        file.className = 'download-assist-file';
        file.textContent = `${fileName} · ${mimeType || 'audio'} · ${getFileSizeLabel(blob)}`;

        const support = document.createElement('div');
        support.className = 'download-assist-support';
        const supportItems = [
            env.shareFiles ? '공유 가능' : '공유 제한',
            env.anchorDownload ? '기본 다운로드 가능' : '기본 다운로드 제한',
            env.filePicker ? '직접 저장 가능' : '직접 저장 제한',
            env.standalone ? 'PWA 모드' : env.label
        ];
        supportItems.forEach(text => {
            const badge = document.createElement('b');
            badge.textContent = text;
            support.appendChild(badge);
        });

        const recoveryChecklist = getDownloadRecoveryChecklist(blob, fileName, 'assist');
        const checklist = document.createElement('div');
        checklist.className = 'download-assist-checklist';
        const checklistTitle = document.createElement('strong');
        checklistTitle.textContent = recoveryChecklist.headline;
        const checklistSummary = document.createElement('span');
        checklistSummary.textContent = recoveryChecklist.summary;
        const checklistSteps = document.createElement('ol');
        recoveryChecklist.steps.slice(0, env.restricted ? 4 : 3).forEach(step => {
            const item = document.createElement('li');
            const label = document.createElement('b');
            label.textContent = step.label;
            const detail = document.createElement('span');
            detail.textContent = step.detail;
            item.append(label, detail);
            checklistSteps.appendChild(item);
        });
        checklist.append(checklistTitle, checklistSummary, checklistSteps);

        const actions = document.createElement('div');
        actions.className = 'download-assist-actions';

        const closePanel = () => {
            panel.classList.remove('show');
            setTimeout(() => panel.remove(), 140);
            if (url) setTimeout(() => revokeDownloadUrl(url, deps), 250);
        };
        closeTop.addEventListener('click', closePanel);

        if (blob && supportsWebShareFiles(blob, fileName)) {
            const share = document.createElement('button');
            share.type = 'button';
            share.className = 'btn-primary';
            share.textContent = '공유/저장';
            share.addEventListener('click', () => shareDownloadFile(blob, fileName, deps).catch(error => {
                console.warn('share download failed:', error);
                getToast(deps)('공유/저장이 취소되었거나 이 브라우저에서 막혔습니다.');
            }));
            actions.appendChild(share);
        }

        if (blob && supportsFileSystemSave()) {
            const save = document.createElement('button');
            save.type = 'button';
            save.className = 'btn-primary';
            save.textContent = '직접 저장';
            save.addEventListener('click', () => saveBlobWithPicker(blob, fileName, deps).catch(error => {
                console.warn('file picker save failed:', error);
                getToast(deps)('직접 저장이 취소되었거나 이 브라우저에서 막혔습니다.');
            }));
            actions.appendChild(save);
        }

        const open = document.createElement('a');
        open.className = 'btn-secondary';
        open.href = url;
        open.download = fileName;
        open.target = '_blank';
        open.rel = 'noopener noreferrer';
        open.textContent = '파일 열기';
        actions.appendChild(open);

        if (env.restricted) {
            const external = document.createElement('button');
            external.type = 'button';
            external.className = 'btn-secondary';
            external.textContent = '외부 브라우저';
            external.addEventListener('click', () => openCurrentPageInExternalBrowser(deps));
            actions.appendChild(external);
        }

        const copy = document.createElement('button');
        copy.type = 'button';
        copy.className = 'btn-secondary';
        copy.textContent = '주소 복사';
        copy.addEventListener('click', () => copyCurrentPageUrl(deps));
        actions.appendChild(copy);

        const guideCopy = document.createElement('button');
        guideCopy.type = 'button';
        guideCopy.className = 'btn-secondary';
        guideCopy.textContent = '안내 복사';
        guideCopy.addEventListener('click', () => copyDownloadTroubleshootingGuide(fileName, deps));
        actions.appendChild(guideCopy);

        const diagnostics = document.createElement('button');
        diagnostics.type = 'button';
        diagnostics.className = 'btn-secondary';
        diagnostics.textContent = '진단 복사';
        diagnostics.addEventListener('click', () => copyDownloadDiagnostics(blob, fileName, deps));
        actions.appendChild(diagnostics);

        const checklistCopy = document.createElement('button');
        checklistCopy.type = 'button';
        checklistCopy.className = 'btn-secondary';
        checklistCopy.textContent = '체크리스트 복사';
        checklistCopy.addEventListener('click', () => copyDownloadRecoveryChecklist(blob, fileName, 'assist', deps));
        actions.appendChild(checklistCopy);

        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'btn-secondary';
        close.textContent = '닫기';
        close.addEventListener('click', closePanel);
        actions.appendChild(close);

        panel.append(closeTop, title, message, file, support, checklist);
        appendGuideSteps(panel, env);
        panel.appendChild(actions);
        document.body.appendChild(panel);
        requestAnimationFrame(() => panel.classList.add('show'));
    };

    const downloadBlob = (blob, fileName, deps = {}) => {
        if (!blob) return;
        const normalizedName = normalizeDownloadFileNameForBlob(fileName || `foxbear_mastered_${getTimestamp(deps)}.wav`, blob);
        const safeName = sanitizeDownloadFileName(normalizedName);
        const url = URL.createObjectURL(blob);
        addActiveUrl(url, deps);
        recordDownloadEvent('object-url-created', { fileName: safeName, sizeBytes: blob.size, type: blob.type || '', restricted: isRestrictedDownloadBrowser() });

        const restricted = isRestrictedDownloadBrowser();
        const shouldOpenAssist = restricted || !supportsAnchorDownload();

        const a = document.createElement('a');
        a.href = url;
        a.download = safeName;
        a.rel = 'noopener noreferrer';
        a.target = '_blank';
        a.className = 'hidden-download-link';
        document.body.appendChild(a);

        if (restricted) {
            recordDownloadEvent('anchor-download-skipped-restricted', { fileName: safeName });
            showDownloadAssist(url, safeName, blob.type || 'audio/*', blob, deps);
            getToast(deps)('카카오/인앱 브라우저는 자동 저장이 막힐 수 있습니다. 공유/저장 또는 파일 열기를 사용해주세요.');
            a.remove();
            setTimeout(() => revokeDownloadUrl(url, deps), 10 * 60 * 1000);
            return;
        }

        try {
            recordDownloadEvent('anchor-download-click', { fileName: safeName });
            a.click();
        } catch (error) {
            recordDownloadEvent('anchor-download-click-failed', { fileName: safeName, message: error?.message || String(error) });
            console.warn('download click fallback:', error);
        }

        if (shouldOpenAssist) {
            showDownloadAssist(url, safeName, blob.type || 'audio/*', blob, deps);
            getToast(deps)('자동 저장이 시작되지 않으면 도움창의 직접 저장/파일 열기를 사용해보세요.');
        } else {
            getToast(deps)(`${safeName} 다운로드를 시작했습니다.`);
        }

        setTimeout(() => {
            a.remove();
            revokeDownloadUrl(url, deps);
        }, 90 * 1000);
    };

    const getDownloadCapabilitySummary = (blob = null, fileName = '') => {
        const env = getDownloadEnvironmentInfo();
        return {
            ...env,
            actualFileShare: blob ? supportsWebShareFiles(blob, fileName || 'foxbear-mastered.wav') : env.shareFiles,
            fileSize: getFileSizeLabel(blob),
            diagnosticEventCount: downloadDiagnosticEvents.length
        };
    };

    global.FoxBearDownloadService = Object.freeze({
        getDownloadFormatOptions,
        prepareTrackDownloadBlob,
        downloadBlob,
        getDownloadEnvironmentInfo,
        getDownloadCapabilitySummary,
        getRecommendedDownloadFlow,
        getDownloadActionReceipt,
        getDownloadRecoveryChecklist,
        getDownloadCompactRecoveryPlan,
        getDownloadDialogCompactHint,
        getDownloadDialogDisplayProfile,
        serializeDownloadRecoveryChecklist,
        copyDownloadRecoveryChecklist,
        getDownloadDiagnostics,
        serializeDownloadDiagnostics,
        copyDownloadDiagnostics,
        getDownloadDiagnosticEvents,
        canShareTinyAudioProbe,
        supportsWebShareDownloadFiles,
        supportsWebShareFiles,
        shareDownloadFile,
        supportsFileSystemSave,
        saveBlobWithPicker,
        copyCurrentPageUrl,
        openCurrentPageInExternalBrowser,
        supportsAnchorDownload,
        isRestrictedDownloadBrowser,
        isKakaoInAppBrowser,
        buildExternalBrowserIntentUrl,
        getDownloadTroubleshootingText,
        copyDownloadTroubleshootingGuide,
        normalizeDownloadFileNameForBlob,
        sanitizeDownloadFileName,
        revokeDownloadUrl,
        showDownloadAssist
    });
})(window);
