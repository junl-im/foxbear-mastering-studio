// FoxBear import preflight service v1.6.56 - decoded PCM and peak-memory admission control
'use strict';

(function attachFoxBearImportPreflightService(global) {
    const VERSION = '1.6.56-playback-blob-source-resilience';

    function formatBytes(bytes) {
        const value = Math.max(0, Number(bytes || 0));
        if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(2)}GB`;
        if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)}MB`;
        if (value >= 1024) return `${Math.round(value / 1024)}KB`;
        return `${Math.round(value)}B`;
    }

    async function mapWithConcurrency(entries, concurrency, mapper) {
        const list = Array.isArray(entries) ? entries : [];
        const output = new Array(list.length);
        let cursor = 0;
        const count = Math.max(1, Math.min(list.length || 1, Number(concurrency || 1)));
        await Promise.all(Array.from({ length: count }, async () => {
            while (cursor < list.length) {
                const index = cursor++;
                output[index] = await mapper(list[index], index);
            }
        }));
        return output;
    }

    async function run(plan, options = {}) {
        const accepted = Array.isArray(plan?.accepted) ? plan.accepted : [];
        const decodeService = options.decodeService || global.FoxBearAudioDecodeService;
        if (!accepted.length || !decodeService || typeof decodeService.probeAudioFileMemory !== 'function') {
            return Object.freeze({ ...plan, decodedMemoryRejected: [], skippedByDecodedMemory: 0 });
        }
        const policy = plan.policy || {};
        const lowMemory = Boolean(policy.lowMemory);
        const maxDecodedPcmBytes = Number(lowMemory ? options.lowMemoryMaxDecodedPcmBytes : options.standardMaxDecodedPcmBytes) || Number.MAX_SAFE_INTEGER;
        const maxDecodePeakBytes = Number(lowMemory ? options.lowMemoryMaxDecodePeakBytes : options.standardMaxDecodePeakBytes) || Number.MAX_SAFE_INTEGER;
        options.onStatus?.(`${accepted.length}개 파일의 재생 길이와 예상 메모리를 확인 중`, 'active');
        const inspected = await mapWithConcurrency(accepted, options.concurrency || 3, async entry => {
            try {
                const memoryProbe = await decodeService.probeAudioFileMemory(entry.file, {
                    metadataTimeoutMs: options.metadataTimeoutMs || 1800,
                    defaultSampleRate: options.defaultSampleRate || 48000,
                    defaultChannels: options.defaultChannels || 2
                });
                return { ...entry, memoryProbe };
            } catch (error) {
                options.onProbeError?.(error, entry.file);
                return { ...entry, memoryProbe: null };
            }
        });
        const safe = [];
        const decodedMemoryRejected = [];
        inspected.forEach(entry => {
            const probe = entry.memoryProbe;
            if (probe?.known && (Number(probe.decodedPcmBytes || 0) > maxDecodedPcmBytes || Number(probe.estimatedPeakBytes || 0) > maxDecodePeakBytes)) {
                decodedMemoryRejected.push({
                    file: entry.file,
                    probe,
                    reason: `디코딩 시 PCM ${formatBytes(probe.decodedPcmBytes)} · 예상 피크 ${formatBytes(probe.estimatedPeakBytes)}로 현재 기기 한도를 넘습니다.`
                });
            } else safe.push(entry);
        });
        return Object.freeze({
            ...plan,
            accepted: safe,
            decodedMemoryRejected,
            skippedByDecodedMemory: decodedMemoryRejected.length,
            largeBatch: Boolean(plan.largeBatch || lowMemory || safe.length >= Number(options.largeBatchThreshold || 12))
        });
    }

    global.FoxBearImportPreflightService = Object.freeze({ version: VERSION, run, mapWithConcurrency });
})(window);
