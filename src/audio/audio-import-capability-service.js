// FoxBear audio import capability service - v1.6.92
(function attachFoxBearAudioImportCapabilityService(global) {
    'use strict';

    const SERVICE_VERSION = '1.6.92-spectrum-panel-mount-lifecycle-recovery';
    const FORMAT_DEFINITIONS = Object.freeze([
        Object.freeze({ id: 'wav', label: 'WAV', extensions: ['.wav', '.wave'], mimes: ['audio/wav', 'audio/x-wav'], tier: 'core' }),
        Object.freeze({ id: 'mp3', label: 'MP3', extensions: ['.mp3', '.mpeg', '.mpga'], mimes: ['audio/mpeg'], tier: 'core' }),
        Object.freeze({ id: 'aiff', label: 'AIFF PCM', extensions: ['.aif', '.aiff', '.aifc'], mimes: ['audio/aiff', 'audio/x-aiff'], tier: 'app-fallback' }),
        Object.freeze({ id: 'aac', label: 'M4A/AAC', extensions: ['.m4a', '.aac'], mimes: ['audio/mp4; codecs="mp4a.40.2"', 'audio/mp4', 'audio/aac'], tier: 'conditional' }),
        Object.freeze({ id: 'flac', label: 'FLAC', extensions: ['.flac'], mimes: ['audio/flac', 'audio/x-flac'], tier: 'conditional' }),
        Object.freeze({ id: 'ogg', label: 'OGG/Vorbis', extensions: ['.ogg', '.oga'], mimes: ['audio/ogg; codecs="vorbis"', 'audio/ogg'], tier: 'conditional' }),
        Object.freeze({ id: 'opus', label: 'Opus', extensions: ['.opus'], mimes: ['audio/ogg; codecs="opus"', 'audio/webm; codecs="opus"'], tier: 'conditional' }),
        Object.freeze({ id: 'webm', label: 'WebM Audio', extensions: ['.webm', '.weba'], mimes: ['audio/webm; codecs="opus"', 'audio/webm'], tier: 'conditional' }),
        Object.freeze({ id: 'mp4', label: 'MP4/MOV 오디오 트랙', extensions: ['.mp4', '.m4v', '.mov'], mimes: ['audio/mp4; codecs="mp4a.40.2"', 'video/mp4', 'video/quicktime'], tier: 'container' })
    ]);
    const EXPLICITLY_UNSUPPORTED = Object.freeze({
        '.caf': 'CAF 전용 디코더가 포함되어 있지 않습니다.',
        '.3gp': '3GP 컨테이너는 브라우저별 코덱 차이가 커서 입력 목록에서 제외했습니다.',
        '.3gpp': '3GP 컨테이너는 브라우저별 코덱 차이가 커서 입력 목록에서 제외했습니다.',
        '.3g2': '3G2 컨테이너는 브라우저별 코덱 차이가 커서 입력 목록에서 제외했습니다.',
        '.amr': 'AMR 전용 디코더가 포함되어 있지 않습니다.',
        '.wma': 'WMA 전용 디코더가 포함되어 있지 않습니다.'
    });

    let cachedProfile = null;

    function getExtension(fileOrName = '') {
        const name = typeof fileOrName === 'string' ? fileOrName : (fileOrName?.name || '');
        return String(name).toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || '';
    }

    function getAudioProbe() {
        if (!global.document) return null;
        return global.document.createElement('audio');
    }

    function getMimeConfidence(probe, mimes = []) {
        if (!probe || typeof probe.canPlayType !== 'function') return '';
        let best = '';
        for (const mime of mimes) {
            let result = '';
            try { result = probe.canPlayType(mime) || ''; } catch (error) { result = ''; }
            if (result === 'probably') return 'probably';
            if (result === 'maybe') best = 'maybe';
        }
        return best;
    }

    function buildProfile() {
        const probe = getAudioProbe();
        const formats = FORMAT_DEFINITIONS.map(definition => {
            const confidence = definition.tier === 'core' || definition.tier === 'app-fallback'
                ? 'probably'
                : getMimeConfidence(probe, definition.mimes);
            const available = definition.tier === 'core' || definition.tier === 'app-fallback' || Boolean(confidence);
            return Object.freeze({ ...definition, confidence, available });
        });
        const accepted = formats.filter(item => item.available);
        const extensions = [...new Set(accepted.flatMap(item => item.extensions))];
        const mimes = [...new Set(accepted.flatMap(item => item.mimes.map(mime => mime.split(';')[0].trim()).filter(Boolean)))];
        const coreLabels = formats.filter(item => item.tier === 'core' || item.tier === 'app-fallback').map(item => item.label);
        const conditionalLabels = formats.filter(item => item.available && item.tier !== 'core' && item.tier !== 'app-fallback').map(item => item.label);
        return Object.freeze({
            version: SERVICE_VERSION,
            formats: Object.freeze(formats),
            acceptedExtensions: Object.freeze(extensions),
            acceptedMimes: Object.freeze(mimes),
            accept: Object.freeze([...extensions, ...mimes].join(',')),
            coreLabels: Object.freeze(coreLabels),
            conditionalLabels: Object.freeze(conditionalLabels)
        });
    }

    function getProfile(options = {}) {
        if (!cachedProfile || options.refresh === true) cachedProfile = buildProfile();
        return cachedProfile;
    }

    function getFormatByExtension(extension = '') {
        const ext = String(extension || '').toLowerCase();
        return getProfile().formats.find(item => item.extensions.includes(ext)) || null;
    }

    function getFileCapability(fileOrName = '') {
        const extension = getExtension(fileOrName);
        if (EXPLICITLY_UNSUPPORTED[extension]) {
            return Object.freeze({ ok: false, extension, label: '지원하지 않음', tier: 'unsupported', reason: EXPLICITLY_UNSUPPORTED[extension] });
        }
        const format = getFormatByExtension(extension);
        if (!extension) return Object.freeze({ ok: true, extension: '', label: '확장자 미확인', tier: 'unknown', reason: '실제 디코더로 확인합니다.' });
        if (!format) return Object.freeze({ ok: false, extension, label: '지원하지 않음', tier: 'unsupported', reason: '지원 목록에 없는 확장자입니다.' });
        if (!format.available) {
            return Object.freeze({ ok: false, extension, label: `${format.label} 미지원`, tier: format.tier, reason: `현재 브라우저가 ${format.label} 재생 가능성을 보고하지 않았습니다.` });
        }
        const conditional = format.tier === 'conditional' || format.tier === 'container';
        return Object.freeze({
            ok: true,
            extension,
            formatId: format.id,
            label: conditional ? `${format.label} · 브라우저 조건부` : `${format.label} · 지원`,
            tier: format.tier,
            confidence: format.confidence,
            reason: conditional ? '파일 내부 코덱은 실제 디코딩 단계에서 최종 확인합니다.' : ''
        });
    }

    function getPickerTypes() {
        const profile = getProfile();
        const stable = profile.formats.filter(item => item.available && (item.tier === 'core' || item.tier === 'app-fallback'));
        const conditional = profile.formats.filter(item => item.available && item.tier !== 'core' && item.tier !== 'app-fallback');
        const toAccept = formats => {
            const result = {};
            formats.forEach(format => {
                const mime = format.mimes.map(value => value.split(';')[0].trim()).find(Boolean) || 'application/octet-stream';
                result[mime] = [...new Set([...(result[mime] || []), ...format.extensions])];
            });
            return result;
        };
        const types = [{ description: 'FoxBear 안정 입력 (WAV, MP3, AIFF PCM)', accept: toAccept(stable) }];
        if (conditional.length) types.push({ description: '현재 브라우저 조건부 입력', accept: toAccept(conditional) });
        return types;
    }

    function getStatusText() {
        return '마스터링할 오디오 파일을 불러오세요. 여러 곡도 한 번에 선택할 수 있습니다.';
    }

    function applyToInputs(options = {}) {
        const profile = getProfile({ refresh: true });
        [options.fileInput, options.folderInput, options.referenceInput].filter(Boolean).forEach(input => {
            input.setAttribute('accept', profile.accept);
            input.dataset.codecProfileVersion = SERVICE_VERSION;
        });
        if (options.statusElement) options.statusElement.textContent = getStatusText();
        return profile;
    }

    global.FoxBearAudioImportCapabilityService = Object.freeze({
        version: SERVICE_VERSION,
        getProfile,
        getPickerTypes,
        getFileCapability,
        getStatusText,
        applyToInputs,
        getExtension,
        explicitlyUnsupported: EXPLICITLY_UNSUPPORTED
    });
})(window);
