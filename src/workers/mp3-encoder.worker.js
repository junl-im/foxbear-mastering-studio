// FoxBear native MP3 encoder worker
// Uses WebCodecs when the browser exposes an MP3 AudioEncoder. Falls back in app to WAV when unavailable.
'use strict';

self.onmessage = async event => {
    try {
        const { sampleRate, channels, length, bitrate, channelBuffers } = event.data || {};
        if (!sampleRate || !channels || !length || !channelBuffers) throw new Error('잘못된 MP3 인코딩 요청입니다.');
        if (typeof AudioEncoder === 'undefined' || typeof AudioData === 'undefined') {
            throw new Error('이 브라우저는 WebCodecs MP3 인코더를 제공하지 않습니다.');
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
                encodedChunks.push(buf);
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
        const total = encodedChunks.reduce((sum, buf) => sum + buf.byteLength, 0);
        const result = new Uint8Array(total);
        let ptr = 0;
        encodedChunks.forEach(buf => {
            result.set(new Uint8Array(buf), ptr);
            ptr += buf.byteLength;
        });
        if (!result.byteLength) throw new Error('MP3 인코더가 빈 출력을 반환했습니다.');
        self.postMessage({ ok: true, arrayBuffer: result.buffer }, [result.buffer]);
    } catch (error) {
        self.postMessage({ ok: false, error: error.message || String(error) });
    }
};

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
