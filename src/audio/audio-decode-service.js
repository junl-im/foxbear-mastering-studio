// FoxBear audio decode service - v1.5.47
(function attachFoxBearAudioDecodeService(global) {
    'use strict';

    const SERVICE_VERSION = '1.5.47-engine-edgecase-quality-gate';
    const DEFAULT_METADATA_TIMEOUT_MS = 4500;
    const MIN_DECODE_TIMEOUT_MS = 20000;
    const MAX_DECODE_TIMEOUT_MS = 120000;
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

    function makeAbortError(signal, fallback = 'audio-decode-cancelled') {
        const reason = signal?.reason;
        if (reason instanceof Error) return reason;
        const error = new Error(String(reason || fallback));
        error.name = 'AbortError';
        error.code = 'FOXBEAR_ANALYSIS_CANCELLED';
        return error;
    }

    function throwIfAborted(signal) {
        if (signal?.aborted) throw makeAbortError(signal);
    }

    function awaitWithAbort(promise, signal, onAbort) {
        if (!signal) return Promise.resolve(promise);
        throwIfAborted(signal);
        return new Promise((resolve, reject) => {
            let settled = false;
            const finish = (callback, value) => {
                if (settled) return;
                settled = true;
                try { signal.removeEventListener?.('abort', abort); } catch (error) {}
                callback(value);
            };
            const abort = () => {
                try { onAbort?.(); } catch (error) {}
                finish(reject, makeAbortError(signal));
            };
            signal.addEventListener?.('abort', abort, { once: true });
            if (signal.aborted) {
                abort();
                return;
            }
            Promise.resolve(promise).then(value => finish(resolve, value), error => finish(reject, error));
        });
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

    function readAscii(view, offset, length) {
        let text = '';
        for (let index = 0; index < length; index += 1) text += String.fromCharCode(view.getUint8(offset + index));
        return text;
    }

    function detectAudioContainer(arrayBuffer, fileOrName = '') {
        const ext = getFileExtension(fileOrName);
        if (!arrayBuffer || arrayBuffer.byteLength < 12) return { id: ext ? ext.slice(1) : 'unknown', extension: ext, signature: '' };
        const view = new DataView(arrayBuffer, 0, Math.min(arrayBuffer.byteLength, 64));
        const first4 = readAscii(view, 0, 4);
        const at8 = readAscii(view, 8, 4);
        if (first4 === 'RIFF' && at8 === 'WAVE') return { id: 'wav', extension: ext, signature: 'RIFF/WAVE' };
        if (first4 === 'FORM' && (at8 === 'AIFF' || at8 === 'AIFC')) return { id: 'aiff', extension: ext, signature: `FORM/${at8}` };
        if (first4 === 'fLaC') return { id: 'flac', extension: ext, signature: 'fLaC' };
        if (first4 === 'OggS') return { id: 'ogg', extension: ext, signature: 'OggS' };
        if (view.getUint32(0, false) === 0x1A45DFA3) return { id: 'webm', extension: ext, signature: 'EBML' };
        if (first4 === 'ID3' || (view.getUint8(0) === 0xff && (view.getUint8(1) & 0xe0) === 0xe0)) return { id: 'mp3', extension: ext, signature: 'MPEG audio' };
        if (view.getUint8(0) === 0xff && (view.getUint8(1) & 0xf6) === 0xf0) return { id: 'aac', extension: ext, signature: 'AAC ADTS' };
        if (readAscii(view, 4, 4) === 'ftyp') return { id: 'mp4', extension: ext, signature: 'ISO BMFF' };
        return { id: ext ? ext.slice(1) : 'unknown', extension: ext, signature: '' };
    }

    function parseWavHeaderMetadata(arrayBuffer, fileSize = 0) {
        if (!arrayBuffer || arrayBuffer.byteLength < 44) return null;
        const view = new DataView(arrayBuffer);
        if (readAscii(view, 0, 4) !== 'RIFF' || readAscii(view, 8, 4) !== 'WAVE') return null;
        let cursor = 12;
        let channels = 0;
        let sampleRate = 0;
        let byteRate = 0;
        let dataBytes = 0;
        while (cursor + 8 <= view.byteLength) {
            const id = readAscii(view, cursor, 4);
            const size = view.getUint32(cursor + 4, true);
            const payload = cursor + 8;
            if (id === 'fmt ' && size >= 16 && payload + 16 <= view.byteLength) {
                channels = view.getUint16(payload + 2, true);
                sampleRate = view.getUint32(payload + 4, true);
                byteRate = view.getUint32(payload + 8, true);
            } else if (id === 'data') {
                dataBytes = size;
                break;
            }
            const next = payload + size + (size % 2);
            if (next <= cursor || next > view.byteLength) break;
            cursor = next;
        }
        if (!Number.isFinite(channels) || channels < 1 || channels > 32) return null;
        if (!Number.isFinite(sampleRate) || sampleRate < 3000 || sampleRate > 384000) return null;
        const safeByteRate = Number.isFinite(byteRate) && byteRate > 0 ? byteRate : 0;
        const inferredDataBytes = dataBytes || Math.max(0, Number(fileSize || 0) - 44);
        const durationSec = safeByteRate > 0 ? inferredDataBytes / safeByteRate : 0;
        return { durationSec, sampleRate, channels, source: 'wav-header' };
    }

    function parseAiffHeaderMetadata(arrayBuffer) {
        if (!arrayBuffer || arrayBuffer.byteLength < 30) return null;
        const view = new DataView(arrayBuffer);
        if (readAscii(view, 0, 4) !== 'FORM') return null;
        const formType = readAscii(view, 8, 4);
        if (formType !== 'AIFF' && formType !== 'AIFC') return null;
        let cursor = 12;
        while (cursor + 8 <= view.byteLength) {
            const id = readAscii(view, cursor, 4);
            const size = view.getUint32(cursor + 4, false);
            const payload = cursor + 8;
            if (id === 'COMM' && size >= 18 && payload + 18 <= view.byteLength) {
                const channels = view.getUint16(payload, false);
                const frames = view.getUint32(payload + 2, false);
                const sampleRate = readExtended80(view, payload + 8);
                if (channels >= 1 && channels <= 32 && Number.isFinite(sampleRate) && sampleRate >= 3000 && sampleRate <= 384000) {
                    return { durationSec: frames / sampleRate, sampleRate, channels, source: 'aiff-header' };
                }
                return null;
            }
            const next = payload + size + (size % 2);
            if (next <= cursor || next > view.byteLength) break;
            cursor = next;
        }
        return null;
    }

    async function readAudioHeader(file, maxBytes = 1024 * 1024, signal = null) {
        throwIfAborted(signal);
        if (!file || typeof file.slice !== 'function') return null;
        const size = Math.max(0, Number(file.size || 0));
        const length = Math.max(64, Math.min(size || maxBytes, Math.max(64, Number(maxBytes || 0))));
        const blob = file.slice(0, length);
        return await awaitWithAbort(blob.arrayBuffer(), signal);
    }

    function estimatePcmMemory(durationSec, sampleRate, channels, fileBytes, options = {}) {
        const duration = Math.max(0, Number(durationSec || 0));
        const rate = Math.max(3000, Math.min(384000, Number(sampleRate || 48000)));
        const channelCount = Math.max(1, Math.min(32, Number(channels || 2)));
        if (!Number.isFinite(duration) || duration <= 0) return { known: false, decodedPcmBytes: 0, estimatedPeakBytes: Math.max(0, Number(fileBytes || 0)) };
        const decodedPcmBytes = Math.ceil(duration * rate * channelCount * 4);
        const multiplier = Math.max(1.5, Math.min(4, Number(options.peakMultiplier || 2.6)));
        const estimatedPeakBytes = Math.ceil(Math.max(0, Number(fileBytes || 0)) + decodedPcmBytes * multiplier);
        return { known: true, decodedPcmBytes, estimatedPeakBytes };
    }

    async function probeAudioFileMemory(file, options = {}) {
        const signal = options.signal || null;
        throwIfAborted(signal);
        const fileBytes = Math.max(0, Number(file?.size || 0));
        let header = null;
        let container = { id: getFileExtension(file).slice(1) || 'unknown', extension: getFileExtension(file), signature: '' };
        let metadata = null;
        try {
            header = await readAudioHeader(file, options.headerBytes || 1024 * 1024, signal);
            if (header) {
                container = detectAudioContainer(header, file);
                if (container.id === 'wav') metadata = parseWavHeaderMetadata(header, fileBytes);
                else if (container.id === 'aiff') metadata = parseAiffHeaderMetadata(header);
            }
        } catch (error) {
            if (signal?.aborted) throw makeAbortError(signal);
        }
        if (!metadata || !Number.isFinite(Number(metadata.durationSec)) || Number(metadata.durationSec) <= 0) {
            const media = await verifyMediaElementCanLoad(file, options.metadataTimeoutMs || 1800, signal).catch(error => {
                if (signal?.aborted) throw makeAbortError(signal);
                return null;
            });
            if (media?.ok && Number.isFinite(Number(media.duration)) && Number(media.duration) > 0) {
                metadata = {
                    durationSec: Number(media.duration),
                    sampleRate: Number(options.defaultSampleRate || 48000),
                    channels: Number(options.defaultChannels || 2),
                    source: 'media-metadata-estimate'
                };
            }
        }
        const durationSec = Math.max(0, Number(metadata?.durationSec || 0));
        const sampleRate = Math.max(3000, Math.min(384000, Number(metadata?.sampleRate || options.defaultSampleRate || 48000)));
        const channels = Math.max(1, Math.min(32, Number(metadata?.channels || options.defaultChannels || 2)));
        const memory = estimatePcmMemory(durationSec, sampleRate, channels, fileBytes, {
            peakMultiplier: options.peakMultiplier || (container.id === 'wav' || container.id === 'aiff' ? 2.2 : 2.6)
        });
        return Object.freeze({
            version: SERVICE_VERSION,
            fileName: file?.name || '',
            fileBytes,
            container: container.id,
            signature: container.signature || '',
            metadataSource: metadata?.source || 'unknown',
            known: memory.known,
            durationSec: round(durationSec, 3),
            sampleRate,
            channels,
            decodedPcmBytes: memory.decodedPcmBytes,
            decodedPcmMB: round(memory.decodedPcmBytes / 1048576, 2),
            estimatedPeakBytes: memory.estimatedPeakBytes,
            estimatedPeakMB: round(memory.estimatedPeakBytes / 1048576, 2)
        });
    }

    function readExtended80(view, offset) {
        const sign = (view.getUint16(offset, false) & 0x8000) ? -1 : 1;
        const exponent = view.getUint16(offset, false) & 0x7fff;
        const hi = view.getUint32(offset + 2, false);
        const lo = view.getUint32(offset + 6, false);
        if (exponent === 0 && hi === 0 && lo === 0) return 0;
        if (exponent === 0x7fff) return Number.NaN;
        const mantissa = hi * Math.pow(2, -31) + lo * Math.pow(2, -63);
        return sign * mantissa * Math.pow(2, exponent - 16383);
    }

    function decodeAiffPcm(audioContext, arrayBuffer) {
        if (!arrayBuffer || arrayBuffer.byteLength < 24) throw new Error('AIFF 파일이 너무 짧습니다.');
        const view = new DataView(arrayBuffer);
        if (readAscii(view, 0, 4) !== 'FORM') throw new Error('AIFF FORM 헤더가 없습니다.');
        const formType = readAscii(view, 8, 4);
        if (formType !== 'AIFF' && formType !== 'AIFC') throw new Error('AIFF/AIFC 파일이 아닙니다.');
        let comm = null;
        let sound = null;
        let cursor = 12;
        while (cursor + 8 <= view.byteLength) {
            const id = readAscii(view, cursor, 4);
            const size = view.getUint32(cursor + 4, false);
            const payload = cursor + 8;
            if (payload + size > view.byteLength) break;
            if (id === 'COMM' && size >= 18) {
                comm = {
                    channels: view.getUint16(payload, false),
                    frames: view.getUint32(payload + 2, false),
                    bits: view.getUint16(payload + 6, false),
                    sampleRate: readExtended80(view, payload + 8),
                    compression: formType === 'AIFC' && size >= 22 ? readAscii(view, payload + 18, 4) : 'NONE'
                };
            } else if (id === 'SSND' && size >= 8) {
                const offset = view.getUint32(payload, false);
                sound = { start: payload + 8 + offset, bytes: Math.max(0, size - 8 - offset) };
            }
            cursor = payload + size + (size % 2);
        }
        if (!comm || !sound) throw new Error('AIFF COMM 또는 SSND 청크가 없습니다.');
        if (!Number.isFinite(comm.sampleRate) || comm.sampleRate < 8000 || comm.sampleRate > 384000) throw new Error('AIFF 샘플레이트를 읽지 못했습니다.');
        if (comm.channels < 1 || comm.channels > 32) throw new Error('지원하지 않는 AIFF 채널 수입니다.');
        if (![8, 16, 24, 32].includes(comm.bits)) throw new Error(`지원하지 않는 AIFF 비트 깊이입니다: ${comm.bits}-bit`);
        const compression = comm.compression || 'NONE';
        const littleEndian = compression === 'sowt';
        const float32 = compression === 'fl32' || compression === 'FL32';
        if (!['NONE', 'twos', 'sowt', 'fl32', 'FL32'].includes(compression)) throw new Error(`지원하지 않는 AIFC 압축 방식입니다: ${compression}`);
        if (float32 && comm.bits !== 32) throw new Error('AIFC float 형식의 비트 깊이가 올바르지 않습니다.');
        const bytesPerSample = comm.bits / 8;
        const availableFrames = Math.floor(sound.bytes / Math.max(1, comm.channels * bytesPerSample));
        const frameCount = Math.min(comm.frames || availableFrames, availableFrames);
        if (!frameCount) throw new Error('AIFF PCM 데이터가 비어 있습니다.');
        const output = audioContext.createBuffer(comm.channels, frameCount, Math.round(comm.sampleRate));
        let position = sound.start;
        const scale = Math.pow(2, comm.bits - 1);
        for (let frame = 0; frame < frameCount; frame += 1) {
            for (let channel = 0; channel < comm.channels; channel += 1) {
                let sample = 0;
                if (float32) sample = view.getFloat32(position, littleEndian);
                else if (comm.bits === 8) sample = view.getInt8(position) / 128;
                else if (comm.bits === 16) sample = view.getInt16(position, littleEndian) / scale;
                else if (comm.bits === 24) {
                    const b0 = view.getUint8(position + (littleEndian ? 2 : 0));
                    const b1 = view.getUint8(position + 1);
                    const b2 = view.getUint8(position + (littleEndian ? 0 : 2));
                    let value = (b0 << 16) | (b1 << 8) | b2;
                    if (value & 0x800000) value |= 0xff000000;
                    sample = value / scale;
                } else sample = view.getInt32(position, littleEndian) / scale;
                output.getChannelData(channel)[frame] = Math.max(-1, Math.min(1, Number.isFinite(sample) ? sample : 0));
                position += bytesPerSample;
            }
        }
        return output;
    }

    function getDecodeTimeoutMs(file, options = {}) {
        const requested = Number(options.decodeTimeoutMs || 0);
        if (requested > 0) return Math.max(MIN_DECODE_TIMEOUT_MS, Math.min(MAX_DECODE_TIMEOUT_MS, requested));
        const sizeMb = Number(file?.size || 0) / 1048576;
        return Math.max(MIN_DECODE_TIMEOUT_MS, Math.min(MAX_DECODE_TIMEOUT_MS, 20000 + sizeMb * 650));
    }

    function withTimeout(promise, timeoutMs, onTimeout) {
        let timer = 0;
        return new Promise((resolve, reject) => {
            timer = global.setTimeout(() => {
                try { onTimeout?.(); } catch (error) {}
                const timeoutError = new Error(`오디오 디코딩 시간이 ${Math.round(timeoutMs / 1000)}초를 초과했습니다.`);
                timeoutError.code = 'AUDIO_DECODE_TIMEOUT';
                reject(timeoutError);
            }, timeoutMs);
            Promise.resolve(promise).then(
                value => { global.clearTimeout(timer); resolve(value); },
                error => { global.clearTimeout(timer); reject(error); }
            );
        });
    }

    function getAudioImportDecodeHint(fileOrName = '') {
        const ext = getFileExtension(fileOrName);
        if (['.mp4', '.m4v', '.mov'].includes(ext)) return ' MP4/MOV는 브라우저가 파일 내부 오디오 코덱을 지원할 때만 분석됩니다.';
        if (['.aif', '.aiff', '.aifc'].includes(ext)) return ' PCM AIFF/AIFC는 브라우저 디코더 실패 시 앱 내부 파서로 다시 시도합니다.';
        if (['.opus', '.oga', '.ogg', '.webm', '.weba', '.flac', '.m4a', '.aac'].includes(ext)) return ' 이 형식은 현재 브라우저 코덱 지원 여부에 따라 달라집니다.';
        return '';
    }

    function getAudioCodecFailureHint(fileOrName = '') {
        const ext = getFileExtension(fileOrName);
        const base = getAudioImportDecodeHint(fileOrName);
        const common = ' 가능하면 WAV, MP3, M4A(AAC)로 변환하거나 다른 브라우저에서 다시 시도해주세요.';
        if (['.mp4', '.m4v', '.mov'].includes(ext)) return `${base} 오디오 트랙이 없거나 내부 AAC/ALAC 코덱을 브라우저가 열지 못할 수 있습니다.${common}`;
        if (['.aif', '.aiff', '.aifc'].includes(ext)) return `${base} 압축 AIFC는 지원하지 않으며 PCM(NONE/twos/sowt) 또는 32-bit float만 지원합니다.${common}`;
        if (['.flac', '.opus', '.oga', '.ogg', '.webm', '.weba', '.m4a', '.aac'].includes(ext)) return `${base}${common}`;
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

    async function verifyMediaElementCanLoad(file, timeoutMs = DEFAULT_METADATA_TIMEOUT_MS, signal = null) {
        if (!file || typeof global.document === 'undefined') return { ok: false, reason: '미디어 엘리먼트 확인 불가' };
        throwIfAborted(signal);
        const url = global.URL.createObjectURL(file);
        const audio = global.document.createElement('audio');
        audio.preload = 'metadata';
        audio.muted = true;
        return await new Promise(resolve => {
            let settled = false;
            let timer = 0;
            const done = result => {
                if (settled) return;
                settled = true;
                try { signal?.removeEventListener?.('abort', abort); } catch (error) {}
                try { global.clearTimeout(timer); } catch (error) {}
                try { audio.removeAttribute('src'); audio.load(); } catch (error) {}
                try { global.URL.revokeObjectURL(url); } catch (error) {}
                resolve(result);
            };
            const abort = () => done({ ok: false, aborted: true, reason: 'aborted' });
            signal?.addEventListener?.('abort', abort, { once: true });
            if (settled || signal?.aborted) {
                abort();
                return;
            }
            timer = global.setTimeout(() => done({ ok: false, reason: 'metadata timeout' }), Math.max(500, Number(timeoutMs || DEFAULT_METADATA_TIMEOUT_MS)));
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

    function createDecodeError(file, error, mediaCheck, detectedContainer = null) {
        const mediaText = mediaCheck?.ok
            ? ' 브라우저 미디어 플레이어는 열 수 있지만 Web Audio 분석 디코더가 거부했습니다.'
            : ' 브라우저 미디어 플레이어에서도 바로 열리지 않았습니다.';
        const detectedText = detectedContainer?.signature ? ` 파일 헤더는 ${detectedContainer.signature} 형식으로 감지되었습니다.` : '';
        const message = '오디오 디코딩에 실패했습니다.' + mediaText + detectedText + getAudioCodecFailureHint(file);
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

        const signal = options.signal || null;
        let arrayBuffer = null;
        let audioContext = null;
        let detectedContainer = null;
        try {
            throwIfAborted(signal);
            try { arrayBuffer = await awaitWithAbort(file.arrayBuffer(), signal); }
            catch (error) { throw new Error('선택한 파일을 읽지 못했습니다. 파일 권한 또는 클라우드 다운로드 상태를 확인해주세요.'); }
            if (!arrayBuffer || !arrayBuffer.byteLength) throw new Error('선택한 파일이 비어 있거나 읽을 수 없습니다.');

            throwIfAborted(signal);
            audioContext = createManagedDecodeContext(options.latencyHint || 'playback');
            const container = detectAudioContainer(arrayBuffer, file);
            detectedContainer = container;
            const timeoutMs = getDecodeTimeoutMs(file, options);
            let decoded = null;
            try {
                // v1.5.29 compatibility anchor: decodeAudioDataCompat(audioContext, arrayBuffer), signal
                decoded = await awaitWithAbort(withTimeout(
                    decodeAudioDataCompat(audioContext, arrayBuffer),
                    timeoutMs,
                    () => closeManagedDecodeContext(audioContext)
                ), signal, () => closeManagedDecodeContext(audioContext));
            } catch (nativeError) {
                if (container.id !== 'aiff') throw nativeError;
                pushEvent('decode-aiff-fallback', { fileName: state.lastFileName, signature: container.signature });
                decoded = decodeAiffPcm(audioContext, arrayBuffer);
            }
            throwIfAborted(signal);
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
                elapsedMs: round(nowMs() - startedMs, 1),
                container: detectAudioContainer(arrayBuffer, file).id
            });
            return decoded;
        } catch (error) {
            if (error?.name === 'AbortError' || error?.code === 'FOXBEAR_ANALYSIS_CANCELLED' || signal?.aborted) {
                pushEvent('decode-cancelled', { fileName: state.lastFileName, elapsedMs: round(nowMs() - startedMs, 1) });
                throw makeAbortError(signal);
            }
            let finalError = error;
            if (!String(error?.message || '').includes('선택한 파일을 읽지 못했습니다') && !String(error?.message || '').includes('비어 있거나')) {
                const mediaCheck = await verifyMediaElementCanLoad(file, options.metadataTimeoutMs, signal).catch(() => null);
                if (signal?.aborted || mediaCheck?.aborted) {
                    pushEvent('decode-cancelled', { fileName: state.lastFileName, elapsedMs: round(nowMs() - startedMs, 1) });
                    throw makeAbortError(signal);
                }
                finalError = createDecodeError(file, error, mediaCheck, detectedContainer);
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
        probeAudioFileMemory,
        estimatePcmMemory,
        parseWavHeaderMetadata,
        parseAiffHeaderMetadata,
        decodeAudioDataCompat,
        decodeAiffPcm,
        detectAudioContainer,
        verifyMediaElementCanLoad,
        getAudioCodecFailureHint,
        getAudioImportDecodeHint,
        estimateDecodedPcmBytes,
        getDecodedBufferSummary,
        getDiagnostics
    });
})(window);
