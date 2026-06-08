// FoxBear MP3 encoder worker
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
        const payload = event.data || {};
        const { sampleRate, channels, length, bitrate, channelBuffers } = payload;
        if (!sampleRate || !channels || !length || !channelBuffers) throw new Error('잘못된 MP3 인코딩 요청입니다.');

        try {
            const arrayBuffer = await encodeWithLameJs(payload);
            self.postMessage({ ok: true, arrayBuffer, encoder: 'lamejs' }, [arrayBuffer]);
            return;
        } catch (lameError) {
            console.warn('lamejs MP3 encoder fallback:', lameError);
        }

        const arrayBuffer = await encodeWithWebCodecs(payload);
        self.postMessage({ ok: true, arrayBuffer, encoder: 'webcodecs' }, [arrayBuffer]);
    } catch (error) {
        self.postMessage({ ok: false, error: error.message || String(error) });
    }
};

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

async function encodeWithLameJs(payload) {
    const lamejs = await ensureLameJs();
    const sampleRate = Number(payload.sampleRate);
    const channels = Math.min(2, Number(payload.channels || 1));
    const length = Number(payload.length);
    const kbps = Math.round(Number(payload.bitrate || 320000) / 1000);
    const data = payload.channelBuffers.map(buf => new Float32Array(buf));
    const encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
    const frameSize = 1152;
    const chunks = [];

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
    }

    const flushed = encoder.flush();
    if (flushed && flushed.length) chunks.push(flushed);
    return joinUint8Chunks(chunks, 'MP3 인코더가 빈 출력을 반환했습니다.');
}

async function encodeWithWebCodecs(payload) {
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
    const data = channelBuffers.map(buf => new Float32Array(buf));
    const frameSize = 1152 * 8;
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
    }
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

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
