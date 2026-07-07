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
        return { ua, restricted, ios, android, kakao, naver, instagram, line, label, detail, shareApi, shareFiles, anchorDownload, filePicker, recommendedAction };
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
        return copyTextToClipboard(text, deps, '다운로드 문제 해결 안내를 복사했습니다.');
    };

    const shareDownloadFile = async (blob, fileName, deps = {}) => {
        if (!navigator.share || typeof File === 'undefined') throw new Error('파일 공유를 지원하지 않는 브라우저입니다.');
        if (!blob) throw new Error('공유할 파일이 없습니다.');
        const safeName = sanitizeDownloadFileName(normalizeDownloadFileNameForBlob(fileName, blob));
        const file = makeShareFile(blob, safeName);
        const payload = { files: [file], title: safeName, text: 'FoxBear Music 마스터링 파일' };
        if (navigator.canShare && !navigator.canShare({ files: payload.files })) throw new Error('이 파일 형식은 현재 브라우저 공유창에서 보낼 수 없습니다.');
        await navigator.share(payload);
        getToast(deps)('공유/저장 요청을 보냈습니다.');
    };

    const saveBlobWithPicker = async (blob, fileName, deps = {}) => {
        if (!supportsFileSystemSave()) throw new Error('File System Access API unsupported');
        const safeName = sanitizeDownloadFileName(normalizeDownloadFileNameForBlob(fileName, blob));
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
        getToast(deps)(`${safeName} 직접 저장을 완료했습니다.`);
    };

    const copyCurrentPageUrl = (deps = {}) => {
        const text = location.href.split('#')[0];
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

        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'btn-secondary';
        close.textContent = '닫기';
        close.addEventListener('click', closePanel);
        actions.appendChild(close);

        panel.append(closeTop, title, message, file);
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
            showDownloadAssist(url, safeName, blob.type || 'audio/*', blob, deps);
            getToast(deps)('카카오/인앱 브라우저는 자동 저장이 막힐 수 있습니다. 공유/저장 또는 파일 열기를 사용해주세요.');
            a.remove();
            setTimeout(() => revokeDownloadUrl(url, deps), 10 * 60 * 1000);
            return;
        }

        try {
            a.click();
        } catch (error) {
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
            fileSize: getFileSizeLabel(blob)
        };
    };

    global.FoxBearDownloadService = Object.freeze({
        getDownloadFormatOptions,
        prepareTrackDownloadBlob,
        downloadBlob,
        getDownloadEnvironmentInfo,
        getDownloadCapabilitySummary,
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
