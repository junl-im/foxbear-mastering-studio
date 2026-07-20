'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/audio/audio-decode-service.js'), 'utf8');
const must = (condition, message) => { if (!condition) throw new Error(message); };

function writeAscii(view, offset, text) {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
}

function writeExtended80(view, offset, sampleRate) {
    // 44100 = 0x400e ac44000000000000 in 80-bit extended precision.
    if (sampleRate !== 44100) throw new Error('test helper currently supports 44100 Hz only');
    const bytes = [0x40, 0x0e, 0xac, 0x44, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    bytes.forEach((value, index) => view.setUint8(offset + index, value));
}

function makeAiff16Mono(samples) {
    const commSize = 18;
    const soundBytes = samples.length * 2;
    const ssndSize = 8 + soundBytes;
    const total = 12 + 8 + commSize + 8 + ssndSize;
    const buffer = new ArrayBuffer(total);
    const view = new DataView(buffer);
    writeAscii(view, 0, 'FORM');
    view.setUint32(4, total - 8, false);
    writeAscii(view, 8, 'AIFF');
    writeAscii(view, 12, 'COMM');
    view.setUint32(16, commSize, false);
    view.setUint16(20, 1, false);
    view.setUint32(22, samples.length, false);
    view.setUint16(26, 16, false);
    writeExtended80(view, 28, 44100);
    writeAscii(view, 38, 'SSND');
    view.setUint32(42, ssndSize, false);
    view.setUint32(46, 0, false);
    view.setUint32(50, 0, false);
    samples.forEach((sample, index) => view.setInt16(54 + index * 2, sample, false));
    return buffer;
}

const sandbox = {
    window: {
        performance: { now: () => 0 },
        setTimeout,
        clearTimeout
    },
    console,
    DataView,
    ArrayBuffer,
    Uint8Array,
    Float32Array,
    Math,
    Number,
    Date,
    Error,
    Promise
};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'audio-decode-service.js' });

const service = sandbox.window.FoxBearAudioDecodeService;
must(service && typeof service.decodeAiffPcm === 'function', 'AIFF decoder API missing');
const input = makeAiff16Mono([0, 32767, -32768, 16384]);
const fakeContext = {
    createBuffer(channels, frames, sampleRate) {
        const channelData = Array.from({ length: channels }, () => new Float32Array(frames));
        return {
            numberOfChannels: channels,
            length: frames,
            sampleRate,
            duration: frames / sampleRate,
            getChannelData(index) { return channelData[index]; }
        };
    }
};
const decoded = service.decodeAiffPcm(fakeContext, input);
const data = decoded.getChannelData(0);
must(decoded.numberOfChannels === 1, 'AIFF channel count mismatch');
must(decoded.sampleRate === 44100, 'AIFF sample rate mismatch');
must(decoded.length === 4, 'AIFF frame count mismatch');
must(Math.abs(data[0]) < 1e-8, 'AIFF zero sample mismatch');
must(data[1] > 0.999 && data[1] <= 1, 'AIFF positive peak mismatch');
must(data[2] === -1, 'AIFF negative peak mismatch');
must(Math.abs(data[3] - 0.5) < 0.0001, 'AIFF half-scale sample mismatch');
console.log('PASS v1.5.33 AIFF PCM runtime decode smoke');
