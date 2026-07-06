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

    const supportsWebShareFiles = (blob, fileName) => {
        if (!navigator.share || typeof File === 'undefined') return false;
        try {
            const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
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
            ? 'Blob 다운로드가 저장함에 바로 보이지 않을 수 있어 공유/저장 또는 외부 브라우저 경로를 같이 제공합니다.'
            : shareFiles
                ? '다운로드와 파일 공유가 모두 가능한 환경으로 보입니다.'
                : '다운로드는 가능하지만 파일 공유는 제한될 수 있습니다.';
        return { ua, restricted, ios, android, kakao, naver, instagram, line, label, detail, shareApi, shareFiles, anchorDownload, filePicker };
    };

    const shareDownloadFile = async (blob, fileName, deps = {}) => {
        if (!navigator.share || typeof File === 'undefined') throw new Error('파일 공유를 지원하지 않는 브라우저입니다.');
        const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
        const payload = { files: [file], title: fileName, text: 'FoxBear Music 마스터링 파일' };
        if (navigator.canShare && !navigator.canShare({ files: payload.files })) throw new Error('이 파일 형식은 현재 브라우저 공유창에서 보낼 수 없습니다.');
        await navigator.share(payload);
        getToast(deps)('공유/저장 요청을 보냈습니다.');
    };

    const saveBlobWithPicker = async (blob, fileName, deps = {}) => {
        if (!supportsFileSystemSave()) throw new Error('File System Access API unsupported');
        const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
        const picker = await global.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
                description: 'FoxBear mastered file',
                accept: { [blob.type || 'application/octet-stream']: ext ? [`.${ext}`] : ['.wav'] }
            }]
        });
        const writable = await picker.createWritable();
        await writable.write(blob);
        await writable.close();
        getToast(deps)(`${fileName} 직접 저장을 완료했습니다.`);
    };

    const copyCurrentPageUrl = (deps = {}) => {
        const text = location.href.split('#')[0];
        const showToast = getToast(deps);
        if (navigator.clipboard && global.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => showToast('페이지 주소를 복사했습니다. 카카오톡 메뉴에서 외부 브라우저로 열어주세요.'))
                .catch(() => showToast(text));
            return;
        }
        showToast(text);
    };

    const openCurrentPageInExternalBrowser = (deps = {}) => {
        const pageUrl = location.href.split('#')[0];
        const ua = navigator.userAgent || '';
        const showToast = getToast(deps);
        if (/Android/i.test(ua)) {
            try {
                const parsed = new URL(pageUrl);
                const scheme = parsed.protocol.replace(':', '') || 'https';
                const path = `${parsed.host}${parsed.pathname}${parsed.search}`;
                global.location.href = `intent://${path}#Intent;scheme=${scheme};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`;
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

    const showDownloadAssist = (url, fileName, mimeType, blob = null, deps = {}) => {
        if (url) addActiveUrl(url, deps);
        let panel = document.getElementById('downloadAssist');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'downloadAssist';
            panel.className = 'download-assist';
            document.body.appendChild(panel);
        }
        panel.textContent = '';

        const title = document.createElement('strong');
        title.textContent = '다운로드가 안 보이나요?';

        const message = document.createElement('p');
        const inApp = isRestrictedDownloadBrowser();
        message.textContent = inApp
            ? '카카오톡 인앱 브라우저는 Blob 파일을 내려받는 척하다가 저장하지 않는 경우가 있습니다. 공유/저장을 먼저 누르고, 계속 실패하면 외부 브라우저에서 페이지를 다시 연 뒤 마스터링/다운로드를 진행해주세요.'
            : '자동 저장이 시작되지 않으면 아래 버튼으로 파일을 직접 열어 저장해주세요.';

        const file = document.createElement('span');
        file.className = 'download-assist-file';
        file.textContent = `${fileName} · ${mimeType || 'audio'}`;

        const actions = document.createElement('div');
        actions.className = 'download-assist-actions';

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

        const open = document.createElement('a');
        open.className = 'btn-secondary';
        open.href = url;
        open.download = fileName;
        open.target = '_blank';
        open.rel = 'noopener noreferrer';
        open.textContent = '파일 열기';

        const copy = document.createElement('button');
        copy.type = 'button';
        copy.className = 'btn-secondary';
        copy.textContent = '페이지 주소 복사';
        copy.addEventListener('click', () => copyCurrentPageUrl(deps));

        let external = null;
        if (inApp) {
            external = document.createElement('button');
            external.type = 'button';
            external.className = 'btn-primary';
            external.textContent = '외부 브라우저 열기';
            external.addEventListener('click', () => openCurrentPageInExternalBrowser(deps));
        }

        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'btn-secondary';
        close.textContent = '닫기';
        close.addEventListener('click', () => {
            panel.classList.remove('show');
            panel.remove();
            revokeDownloadUrl(url, deps);
        });

        if (external) actions.appendChild(external);
        actions.append(open, copy, close);
        panel.append(title, message, file, actions);
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
            getToast(deps)('카카오/인앱 브라우저는 자동 저장이 막힐 수 있습니다. 도움창의 공유/저장 또는 외부 브라우저 열기를 사용해주세요.');
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

    global.FoxBearDownloadService = Object.freeze({
        getDownloadFormatOptions,
        prepareTrackDownloadBlob,
        downloadBlob,
        getDownloadEnvironmentInfo,
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
        normalizeDownloadFileNameForBlob,
        sanitizeDownloadFileName,
        revokeDownloadUrl,
        showDownloadAssist
    });
})(window);
