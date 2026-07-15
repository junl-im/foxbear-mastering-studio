// FoxBear audio decode service - v1.5.11
(function attachFoxBearAudioDecodeService(global) {
    'use strict';

    const SERVICE_VERSION = '1.5.11-audio-context-ci-stability';
    const DEFAULT_METADATA_TIMEOUT_MS = 4500;
    const MAX_DECODE_EVENTS = 24;

    const state = {
        activeDecodes: 0,
        completedCount: 0,
        failedCount: 0,
        lastStartedAt: 0,
        lastCompletedAt: 0,
        lastError: '',
        lastFileName: '',
        lastFileSize: 0,
        lastDurationSec: 0,
        lastDecodedPcmMB: 0,
        totalDecodedPcmMB: 0,
        events: []
    };

    function nowMs() {
        return global.performance && typeof global.performance.now === 'function' ? global.performance.now() : Date.now();
    }

    function round(value, digits = 2) {
        const number = Number(value || 0);
        if (!Number.isFinite(number)) return 0;
        const factor = Math.pow(10, digits);
        return Math.round(number * factor) / factor;
    }

    function pushEvent(type, detail = {}) {
        const entry = Object.freeze({
            type,
            at: Date.now(),
            activeDecodes: state.activeDecodes,
            ...detail
        });
        state.events.push(entry);
        while (state.events.length > MAX_DECODE_EVENTS) state.events.shift();
        return entry;
    }

    function getFileExtension(fileOrName = '') {
        const name = typeof fileOrName === 'string' ? fileOrName : (fileOrName && fileOrName.name) || '';
        const match = String(name || '').toLowerCase().match(/\.[a-z0-9]+$/);
        return match ? match[0] : '';
    }

    function getAudioImportDecodeHint(fileOrName = '') {
        const ext = getFileExtension(fileOrName);
        if (['.mp4', '.m4v', '.mov', '.3gp', '.3gpp', '.3g2'].includes(ext)) return ' 영상 컨테이너는 AAC/ALAC 등 브라우저가 디코딩 가능한 오디오 트랙이 있을 때만 분석됩니다.';
        if (['.amr', '.wma'].includes(ext)) return ' 이 형식은 모바일/브라우저에 따라 디코딩이 제한될 수 있어 WAV/MP3/M4A 변환을 권장합니다.';
        if (['.aif', '.aiff', '.aifc', '.caf'].includes(ext)) return ' AIFF/CAF는 Safari 계열에서 더 잘 열릴 수 있으며, 브라우저별 지원 차이가 있습니다.';
        if (['.opus', '.oga', '.ogg'].includes(ext)) return ' OGG/Opus는 일부 Safari 환경에서 제한될 수 있습니다.';
        return '';
    }

    function getAudioCodecFailureHint(fileOrName = '') {
        const ext = getFileExtension(fileOrName);
        const base = getAudioImportDecodeHint(fileOrName);
        const common = ' 가능하면 WAV, MP3, M4A(AAC)로 변환하거나 다른 브라우저에서 다시 시도해주세요.';
        if (['.mp4', '.m4v', '.mov', '.3gp', '.3gpp', '.3g2'].includes(ext)) return `${base} 영상 파일이면 오디오 트랙이 없거나 브라우저가 해당 오디오 코덱을 열지 못할 수 있습니다.${common}`;
        if (['.flac'].includes(ext)) return `${base} 일부 모바일/인앱 브라우저는 FLAC 디코딩을 제한합니다.${common}`;
        if (['.aif', '.aiff', '.aifc', '.caf', '.amr', '.wma', '.opus', '.oga', '.ogg'].includes(ext)) return `${base}${common}`;
        return `${base}${common}`;
    }

    async function ensureAudioContextRunning(audioContext) {
        const manager = global.FoxBearAudioContextManager;
        if (manager && typeof manager.resume === 'function') return manager.resume(audioContext, 'audio-decode');
        if (!audioContext || audioContext.state !== 'suspended' || typeof audioContext.resume !== 'function') return;
        try { await audioContext.resume(); } catch (error) {}
    }


    function createManagedDecodeContext(latencyHint) {
        const manager = global.FoxBearAudioContextManager;
        if (manager && typeof manager.create === 'function') {
            return manager.create({
                purpose: 'audio-decode',
                ownerId: `audio-decode:${Date.now()}:${state.activeDecodes}`,
                latencyHint: latencyHint || 'playback',
                transient: true
            });
        }
        const AudioContextClass = global.AudioContext || global.webkitAudioContext;
        if (!AudioContextClass) throw new Error('이 브라우저는 Web Audio API를 지원하지 않습니다.');
        return Reflect.construct(AudioContextClass, [{ latencyHint: latencyHint || 'playback' }]);
    }

    function closeManagedDecodeContext(context) {
        const manager = global.FoxBearAudioContextManager;
        if (manager && typeof manager.close === 'function') return manager.close(context, 'audio-decode-complete');
        if (!context || context.state === 'closed' || typeof context.close !== 'function') return Promise.resolve(true);
        return context.close().then(() => true).catch(() => false);
    }

    function decodeAudioDataCompat(audioContext, arrayBuffer) {
        const primaryBuffer = arrayBuffer.slice ? arrayBuffer.slice(0) : arrayBuffer;
        try {
            const result = audioContext.decodeAudioData(primaryBuffer);
            if (result && typeof result.then === 'function') return result;
        } catch (error) {}
        return new Promise((resolve, reject) => {
            const fallbackBuffer = arrayBuffer.slice ? arrayBuffer.slice(0) : arrayBuffer;
            try { audioContext.decodeAudioData(fallbackBuffer, resolve, reject); }
            catch (error) { reject(error); }
        });
    }

    async function verifyMediaElementCanLoad(file, timeoutMs = DEFAULT_METADATA_TIMEOUT_MS) {
        if (!file || typeof global.document === 'undefined') return { ok: false, reason: '미디어 엘리먼트 확인 불가' };
        const url = global.URL.createObjectURL(file);
        const audio = global.document.createElement('audio');
        audio.preload = 'metadata';
        audio.muted = true;
        return await new Promise(resolve => {
            let settled = false;
            const done = result => {
                if (settled) return;
                settled = true;
                try { global.clearTimeout(timer); } catch (error) {}
                try { audio.removeAttribute('src'); audio.load(); } catch (error) {}
                try { global.URL.revokeObjectURL(url); } catch (error) {}
                resolve(result);
            };
            const timer = global.setTimeout(() => done({ ok: false, reason: 'metadata timeout' }), Math.max(500, Number(timeoutMs || DEFAULT_METADATA_TIMEOUT_MS)));
            audio.addEventListener('loadedmetadata', () => done({ ok: true, duration: Number(audio.duration || 0) }), { once: true });
            audio.addEventListener('error', () => done({ ok: false, reason: audio.error?.message || `media error ${audio.error?.code || ''}`.trim() }), { once: true });
            audio.src = url;
            audio.load();
        });
    }

    function estimateDecodedPcmBytes(audioBuffer) {
        if (!audioBuffer) return 0;
        const channels = Math.max(1, Number(audioBuffer.numberOfChannels || 1));
        const length = Math.max(0, Number(audioBuffer.length || 0));
        return channels * length * 4;
    }

    function getDecodedBufferSummary(audioBuffer) {
        if (!audioBuffer) return null;
        const pcmBytes = estimateDecodedPcmBytes(audioBuffer);
        return Object.freeze({
            durationSec: round(audioBuffer.duration || 0, 3),
            sampleRate: Number(audioBuffer.sampleRate || 0),
            channels: Number(audioBuffer.numberOfChannels || 0),
            frames: Number(audioBuffer.length || 0),
            decodedPcmMB: round(pcmBytes / 1048576, 2)
        });
    }

    function getDiagnostics() {
        return Object.freeze({
            version: SERVICE_VERSION,
            activeDecodes: state.activeDecodes,
            completedCount: state.completedCount,
            failedCount: state.failedCount,
            lastStartedAt: state.lastStartedAt,
            lastCompletedAt: state.lastCompletedAt,
            lastError: state.lastError,
            lastFileName: state.lastFileName,
            lastFileSize: state.lastFileSize,
            lastDurationSec: state.lastDurationSec,
            lastDecodedPcmMB: state.lastDecodedPcmMB,
            totalDecodedPcmMB: round(state.totalDecodedPcmMB, 2),
            events: state.events.slice()
        });
    }

    function createDecodeError(file, error, mediaCheck) {
        const mediaText = mediaCheck?.ok
            ? ' 브라우저 미디어 플레이어는 열 수 있지만 Web Audio 분석 디코더가 거부했습니다.'
            : ' 브라우저 미디어 플레이어에서도 바로 열리지 않았습니다.';
        const message = '오디오 디코딩에 실패했습니다.' + mediaText + getAudioCodecFailureHint(file);
        const next = new Error(message);
        next.cause = error;
        return next;
    }

    async function decodeAudioFile(file, options = {}) {
        if (!global.AudioContext && !global.webkitAudioContext) throw new Error('이 브라우저는 Web Audio API를 지원하지 않습니다. Chrome, Edge, Safari 최신 버전에서 다시 시도해주세요.');
        const startedMs = nowMs();
        state.activeDecodes += 1;
        state.lastStartedAt = Date.now();
        state.lastFileName = file?.name || '';
        state.lastFileSize = Number(file?.size || 0);
        state.lastError = '';
        pushEvent('decode-start', { fileName: state.lastFileName, sizeBytes: state.lastFileSize });

        let arrayBuffer = null;
        let audioContext = null;
        try {
            try { arrayBuffer = await file.arrayBuffer(); }
            catch (error) { throw new Error('선택한 파일을 읽지 못했습니다. 파일 권한 또는 클라우드 다운로드 상태를 확인해주세요.'); }
            if (!arrayBuffer || !arrayBuffer.byteLength) throw new Error('선택한 파일이 비어 있거나 읽을 수 없습니다.');

            audioContext = createManagedDecodeContext(options.latencyHint || 'playback');
            await ensureAudioContextRunning(audioContext);
            const decoded = await decodeAudioDataCompat(audioContext, arrayBuffer);
            const summary = getDecodedBufferSummary(decoded) || {};
            state.completedCount += 1;
            state.lastCompletedAt = Date.now();
            state.lastDurationSec = Number(summary.durationSec || 0);
            state.lastDecodedPcmMB = Number(summary.decodedPcmMB || 0);
            state.totalDecodedPcmMB += state.lastDecodedPcmMB;
            pushEvent('decode-complete', {
                fileName: state.lastFileName,
                durationSec: state.lastDurationSec,
                decodedPcmMB: state.lastDecodedPcmMB,
                elapsedMs: round(nowMs() - startedMs, 1)
            });
            return decoded;
        } catch (error) {
            let finalError = error;
            if (!String(error?.message || '').includes('선택한 파일을 읽지 못했습니다') && !String(error?.message || '').includes('비어 있거나')) {
                const mediaCheck = await verifyMediaElementCanLoad(file, options.metadataTimeoutMs).catch(() => null);
                finalError = createDecodeError(file, error, mediaCheck);
                pushEvent('decode-media-check', { fileName: state.lastFileName, mediaOk: Boolean(mediaCheck?.ok), reason: mediaCheck?.reason || '' });
            }
            state.failedCount += 1;
            state.lastCompletedAt = Date.now();
            state.lastError = finalError?.message || String(finalError || 'decode failed');
            pushEvent('decode-failed', { fileName: state.lastFileName, message: state.lastError, elapsedMs: round(nowMs() - startedMs, 1) });
            throw finalError;
        } finally {
            arrayBuffer = null;
            if (audioContext) await closeManagedDecodeContext(audioContext);
            state.activeDecodes = Math.max(0, state.activeDecodes - 1);
        }
    }

    global.FoxBearAudioDecodeService = Object.freeze({
        version: SERVICE_VERSION,
        decodeAudioFile,
        decodeAudioDataCompat,
        verifyMediaElementCanLoad,
        getAudioCodecFailureHint,
        getAudioImportDecodeHint,
        estimateDecodedPcmBytes,
        getDecodedBufferSummary,
        getDiagnostics
    });
})(window);
