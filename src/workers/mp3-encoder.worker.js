// FoxBear MP3 encoder worker v1.6.85 with progress reporting
// Primary path: bundled lamejs encoder for broad browser support.
// Fallback path: WebCodecs MP3 AudioEncoder when available.
'use strict';

const LAMEJS_VENDOR_URL = '../../vendor/lamejs/lame.min.js';
const TRUSTED_IMPORT_URLS = new Set([new URL(LAMEJS_VENDOR_URL, self.location.href).href]);
const FOXBEAR_WORKER_TRUSTED_TYPES_POLICY = createWorkerTrustedTypesPolicy();
let lameLoadPromise = null;

function createWorkerTrustedTypesPolicy() {
    if (!self.trustedTypes || typeof self.trustedTypes.createPolicy !== 'function') return null;
    try {
        return self.trustedTypes.createPolicy('foxbear', {
            createScriptURL(value) {
                const url = new URL(String(value), self.location.href);
                if (url.origin !== self.location.origin || !TRUSTED_IMPORT_URLS.has(url.href)) {
                    throw new TypeError('허용되지 않은 MP3 인코더 스크립트 URL입니다.');
                }
                return url.href;
            }
        });
    } catch (error) {
        console.warn('Worker Trusted Types policy unavailable:', error);
        return null;
    }
}

function resolveWorkerImportUrl(path) {
    const url = new URL(String(path || ''), self.location.href);
    if (url.origin !== self.location.origin || !TRUSTED_IMPORT_URLS.has(url.href)) {
        throw new TypeError('허용되지 않은 MP3 인코더 경로입니다.');
    }
    return FOXBEAR_WORKER_TRUSTED_TYPES_POLICY ? FOXBEAR_WORKER_TRUSTED_TYPES_POLICY.createScriptURL(url.href) : url.href;
}

self.onmessage = async event => {
    try {
        const rawPayload = event.data || {};
        const jobId = String(rawPayload.__foxbearJobId || '');
        const payload = normalizeEncodePayload(rawPayload);
        postProgress(jobId, 2, 'MP3 준비', '인코더와 채널 데이터를 준비합니다.');

        try {
            const arrayBuffer = await encodeWithLameJs(payload, jobId);
            self.postMessage({ ok: true, arrayBuffer, encoder: 'lamejs', __foxbearJobId: jobId }, [arrayBuffer]);
            return;
        } catch (lameError) {
            console.warn('lamejs MP3 encoder fallback:', lameError);
        }

        const arrayBuffer = await encodeWithWebCodecs(payload, jobId);
        self.postMessage({ ok: true, arrayBuffer, encoder: 'webcodecs', __foxbearJobId: jobId }, [arrayBuffer]);
    } catch (error) {
        self.postMessage({ ok: false, error: error.message || String(error), __foxbearJobId: String(event.data?.__foxbearJobId || '') });
    }
};

function normalizeEncodePayload(payload) {
    const sampleRate = normalizeInteger(payload.sampleRate, 8000, 384000, '샘플레이트');
    const channels = normalizeInteger(payload.channels, 1, 2, '채널 수');
    const requestedLength = normalizeInteger(payload.length, 1, 0x7fffffff, '샘플 길이');
    const bitrate = normalizeInteger(payload.bitrate || 320000, 32000, 512000, '비트레이트');
    const buffers = Array.isArray(payload.channelBuffers) ? payload.channelBuffers.slice(0, channels) : [];
    if (buffers.length < channels) throw new Error('MP3 인코딩 채널 입력이 부족합니다.');
    const views = buffers.map((buffer, index) => {
        if (!buffer || typeof buffer.byteLength !== 'number' || buffer.byteLength < 4) throw new Error(`MP3 ${index + 1}번 채널 데이터가 잘못되었습니다.`);
        return new Float32Array(buffer);
    });
    const length = Math.min(requestedLength, ...views.map(view => view.length));
    if (!Number.isFinite(length) || length < 1) throw new Error('MP3 인코딩할 샘플이 없습니다.');
    return { sampleRate, channels, length, bitrate, channelBuffers: buffers };
}

function normalizeInteger(value, min, max, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${label} 값이 유효하지 않습니다.`);
    const integer = Math.trunc(number);
    if (integer < min || integer > max) throw new Error(`${label} 값이 허용 범위를 벗어났습니다.`);
    return integer;
}

async function ensureLameJs() {
    if (self.lamejs && self.lamejs.Mp3Encoder) return self.lamejs;
    if (!lameLoadPromise) {
        lameLoadPromise = new Promise((resolve, reject) => {
            try {
                importScripts(resolveWorkerImportUrl(LAMEJS_VENDOR_URL));
                if (self.lamejs && self.lamejs.Mp3Encoder) resolve(self.lamejs);
                else reject(new Error('lamejs 로드 후 MP3 인코더를 찾을 수 없습니다.'));
            } catch (error) {
                reject(error);
            }
        });
    }
    return lameLoadPromise;
}

async function encodeWithLameJs(payload, jobId) {
    const lamejs = await ensureLameJs();
    const sampleRate = Number(payload.sampleRate);
    const channels = Math.min(2, Number(payload.channels || 1));
    const length = Number(payload.length);
    const kbps = Math.round(Number(payload.bitrate || 320000) / 1000);
    const data = payload.channelBuffers.map(buf => new Float32Array(buf));
    postProgress(jobId, 6, 'MP3 인코더 로드', 'LAME 인코더를 초기화했습니다.');
    const encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
    const frameSize = 1152;
    const chunks = [];

    let lastPercent = 6;
    for (let offset = 0; offset < length; offset += frameSize) {
        const frameCount = Math.min(frameSize, length - offset);
        const left = floatFrameToInt16(data[0], offset, frameCount);
        let encoded;
        if (channels > 1) {
            const right = floatFrameToInt16(data[1] || data[0], offset, frameCount);
            encoded = encoder.encodeBuffer(left, right);
        } else {
            encoded = encoder.encodeBuffer(left);
        }
        if (encoded && encoded.length) chunks.push(encoded);
        const percent = 8 + Math.floor(((offset + frameCount) / Math.max(1, length)) * 86);
        if (percent >= lastPercent + 2 || offset + frameCount >= length) {
            lastPercent = percent;
            postProgress(jobId, percent, 'MP3 인코딩', `${Math.min(length, offset + frameCount).toLocaleString()} / ${length.toLocaleString()} samples`);
        }
    }

    postProgress(jobId, 96, 'MP3 마무리', '인코더 버퍼를 비우고 파일을 결합합니다.');
    const flushed = encoder.flush();
    if (flushed && flushed.length) chunks.push(flushed);
    return joinUint8Chunks(chunks, 'MP3 인코더가 빈 출력을 반환했습니다.');
}

async function encodeWithWebCodecs(payload, jobId) {
    const { sampleRate, channels, length, bitrate, channelBuffers } = payload;
    if (typeof AudioEncoder === 'undefined' || typeof AudioData === 'undefined') {
        throw new Error('이 브라우저는 MP3 인코더를 제공하지 않습니다.');
    }
    const config = { codec: 'mp3', sampleRate, numberOfChannels: channels, bitrate: bitrate || 320000 };
    if (AudioEncoder.isConfigSupported) {
        const support = await AudioEncoder.isConfigSupported(config);
        if (!support.supported) throw new Error('이 브라우저는 MP3 인코딩 설정을 지원하지 않습니다.');
    }
    const encodedChunks = [];
    let encoderError = null;
    const encoder = new AudioEncoder({
        output: chunk => {
            const buf = new ArrayBuffer(chunk.byteLength);
            chunk.copyTo(buf);
            encodedChunks.push(new Uint8Array(buf));
        },
        error: err => { encoderError = err; }
    });
    encoder.configure(config);
    postProgress(jobId, 8, 'MP3 WebCodecs', '브라우저 오디오 인코더를 시작했습니다.');
    const data = channelBuffers.map(buf => new Float32Array(buf));
    const frameSize = 1152 * 8;
    let lastPercent = 8;
    for (let offset = 0; offset < length; offset += frameSize) {
        const frameCount = Math.min(frameSize, length - offset);
        const planar = new Float32Array(frameCount * channels);
        for (let ch = 0; ch < channels; ch += 1) {
            const dstOffset = ch * frameCount;
            const src = data[ch];
            for (let i = 0; i < frameCount; i += 1) planar[dstOffset + i] = clamp(src[offset + i] || 0, -1, 1);
        }
        const audioData = new AudioData({
            format: 'f32-planar',
            sampleRate,
            numberOfFrames: frameCount,
            numberOfChannels: channels,
            timestamp: Math.round(offset / sampleRate * 1000000),
            data: planar
        });
        encoder.encode(audioData);
        audioData.close();
        const percent = 10 + Math.floor(((offset + frameCount) / Math.max(1, length)) * 84);
        if (percent >= lastPercent + 2 || offset + frameCount >= length) {
            lastPercent = percent;
            postProgress(jobId, percent, 'MP3 WebCodecs', `${Math.min(length, offset + frameCount).toLocaleString()} / ${length.toLocaleString()} samples`);
        }
    }
    postProgress(jobId, 96, 'MP3 마무리', '인코더 출력을 결합합니다.');
    await encoder.flush();
    encoder.close();
    if (encoderError) throw encoderError;
    return joinUint8Chunks(encodedChunks, 'WebCodecs MP3 인코더가 빈 출력을 반환했습니다.');
}

function floatFrameToInt16(source, offset, frameCount) {
    const out = new Int16Array(frameCount);
    for (let i = 0; i < frameCount; i += 1) {
        const value = clamp(source[offset + i] || 0, -1, 1);
        out[i] = value < 0 ? Math.round(value * 32768) : Math.round(value * 32767);
    }
    return out;
}

function joinUint8Chunks(chunks, emptyMessage) {
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    if (!total) throw new Error(emptyMessage);
    const result = new Uint8Array(total);
    let ptr = 0;
    chunks.forEach(chunk => {
        result.set(chunk, ptr);
        ptr += chunk.length;
    });
    return result.buffer;
}


function postProgress(jobId, percent, stage, detail = '') {
    try {
        self.postMessage({
            type: 'progress',
            __foxbearProgress: true,
            __foxbearJobId: String(jobId || ''),
            percent: Math.max(0, Math.min(100, Number(percent) || 0)),
            stage: String(stage || 'MP3 인코딩'),
            detail: String(detail || '')
        });
    } catch (error) {}
}

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
