// FoxBear WAV encoder worker v1.5.47 - progress-aware 16/24-bit PCM and 32-bit float WAV
'use strict';

self.onmessage = event => {
    try {
        const rawPayload = event.data || {};
        const jobId = String(rawPayload.__foxbearJobId || '');
        const payload = normalizeEncodePayload(rawPayload);
        postProgress(jobId, 2, 'WAV 준비', '헤더와 출력 버퍼를 준비합니다.');
        const arrayBuffer = encodeWav(payload, jobId);
        self.postMessage({ ok: true, arrayBuffer, __foxbearJobId: jobId }, [arrayBuffer]);
    } catch (error) {
        self.postMessage({ ok: false, error: error.message || String(error), __foxbearJobId: String(event.data?.__foxbearJobId || '') });
    }
};

function normalizeEncodePayload(payload) {
    const sampleRate = normalizeInteger(payload.sampleRate, 8000, 384000, '샘플레이트');
    const channels = normalizeInteger(payload.channels, 1, 32, '채널 수');
    const requestedLength = normalizeInteger(payload.length, 1, 0x7fffffff, '샘플 길이');
    const format = ['wav16', 'wav24', 'wav32float'].includes(String(payload.format || '')) ? String(payload.format) : 'wav24';
    const buffers = Array.isArray(payload.channelBuffers) ? payload.channelBuffers.slice(0, channels) : [];
    if (buffers.length < channels) throw new Error('WAV 인코딩 채널 입력이 부족합니다.');
    const views = buffers.map((buffer, index) => {
        if (!buffer || typeof buffer.byteLength !== 'number' || buffer.byteLength < 4) throw new Error(`WAV ${index + 1}번 채널 데이터가 잘못되었습니다.`);
        return new Float32Array(buffer);
    });
    const length = Math.min(requestedLength, ...views.map(view => view.length));
    const bytesPerSample = format === 'wav32float' ? 4 : (format === 'wav16' ? 2 : 3);
    const dataSize = length * channels * bytesPerSample;
    if (!Number.isSafeInteger(dataSize) || dataSize < 1 || dataSize > 0xffffffff - 44) throw new Error('WAV 파일 크기가 RIFF 한도를 벗어났습니다.');
    return { sampleRate, channels, length, channelBuffers: buffers, format };
}

function normalizeInteger(value, min, max, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${label} 값이 유효하지 않습니다.`);
    const integer = Math.trunc(number);
    if (integer < min || integer > max) throw new Error(`${label} 값이 허용 범위를 벗어났습니다.`);
    return integer;
}

function encodeWav({ sampleRate, channels, length, channelBuffers, format }, jobId) {
    const float32 = format === 'wav32float';
    const pcm16 = format === 'wav16';
    const bytesPerSample = float32 ? 4 : (pcm16 ? 2 : 3);
    const bitDepth = float32 ? 32 : (pcm16 ? 16 : 24);
    const audioFormat = float32 ? 3 : 1;
    const blockAlign = channels * bytesPerSample;
    const dataSize = length * blockAlign;
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, audioFormat, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    const channelData = channelBuffers.map(buf => new Float32Array(buf));
    let offset = 44;
    let lastPercent = 2;
    const progressStride = Math.max(2048, Math.floor(length / 50));
    for (let i = 0; i < length; i += 1) {
        for (let ch = 0; ch < channels; ch += 1) {
            if (float32) {
                view.setFloat32(offset, clamp(channelData[ch][i] || 0, -1, 1), true);
                offset += 4;
            } else if (pcm16) {
                const dither = (Math.random() - Math.random()) / 32768;
                const sample = clamp((channelData[ch][i] || 0) + dither, -1, 1);
                view.setInt16(offset, sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff), true);
                offset += 2;
            } else {
                const dither = (Math.random() - Math.random()) / 8388608;
                const sample = clamp((channelData[ch][i] || 0) + dither, -1, 1);
                writeInt24(view, offset, sample);
                offset += 3;
            }
        }
        if (i === length - 1 || i % progressStride === 0) {
            const percent = 4 + Math.floor(((i + 1) / Math.max(1, length)) * 94);
            if (percent >= lastPercent + 2 || i === length - 1) {
                lastPercent = percent;
                postProgress(jobId, percent, 'WAV 인코딩', `${Math.min(length, i + 1).toLocaleString()} / ${length.toLocaleString()} samples`);
            }
        }
    }
    postProgress(jobId, 99, 'WAV 마무리', 'RIFF 파일 검증을 준비합니다.');
    return arrayBuffer;
}


function postProgress(jobId, percent, stage, detail = '') {
    try {
        self.postMessage({
            type: 'progress',
            __foxbearProgress: true,
            __foxbearJobId: String(jobId || ''),
            percent: Math.max(0, Math.min(100, Number(percent) || 0)),
            stage: String(stage || 'WAV 인코딩'),
            detail: String(detail || '')
        });
    } catch (error) {}
}

function writeInt24(view, offset, sample) {
    let value = sample < 0 ? Math.round(sample * 0x800000) : Math.round(sample * 0x7fffff);
    value = Math.max(-0x800000, Math.min(0x7fffff, value));
    if (value < 0) value += 0x1000000;
    view.setUint8(offset, value & 0xff);
    view.setUint8(offset + 1, (value >> 8) & 0xff);
    view.setUint8(offset + 2, (value >> 16) & 0xff);
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i += 1) view.setUint8(offset + i, string.charCodeAt(i));
}

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
