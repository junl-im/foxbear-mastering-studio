// FoxBear WAV encoder worker - 24-bit PCM and 32-bit float WAV
'use strict';

self.onmessage = event => {
    try {
        const { sampleRate, channels, length, channelBuffers, format } = event.data || {};
        if (!sampleRate || !channels || !length || !channelBuffers) throw new Error('잘못된 WAV 인코딩 요청입니다.');
        const arrayBuffer = encodeWav({ sampleRate, channels, length, channelBuffers, format: format || 'wav24' });
        self.postMessage({ ok: true, arrayBuffer }, [arrayBuffer]);
    } catch (error) {
        self.postMessage({ ok: false, error: error.message || String(error) });
    }
};

function encodeWav({ sampleRate, channels, length, channelBuffers, format }) {
    const float32 = format === 'wav32float';
    const bytesPerSample = float32 ? 4 : 3;
    const bitDepth = float32 ? 32 : 24;
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
    for (let i = 0; i < length; i += 1) {
        for (let ch = 0; ch < channels; ch += 1) {
            if (float32) {
                view.setFloat32(offset, clamp(channelData[ch][i] || 0, -1, 1), true);
                offset += 4;
            } else {
                const dither = (Math.random() - Math.random()) / 8388608;
                const sample = clamp((channelData[ch][i] || 0) + dither, -1, 1);
                writeInt24(view, offset, sample);
                offset += 3;
            }
        }
    }
    return arrayBuffer;
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
