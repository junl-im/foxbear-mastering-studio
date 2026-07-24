// FoxBear AI Mastering Studio Pro v1.6.0 - highlight compare inspector
// Stage19: keeps original/master-preview highlight windows aligned and provides light diagnostics.
'use strict';

(function attachFoxBearHighlightCompareInspector(global) {
    const DEFAULT_DURATION_SEC = 15;

    function finiteNumber(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function round(value, digits = 2) {
        const factor = Math.pow(10, digits);
        return Math.round(finiteNumber(value, 0) * factor) / factor;
    }

    function getOriginalDuration(track) {
        return finiteNumber(track?.analysis?.duration ?? track?.durationSec ?? track?.originalDurationSec, 0);
    }

    function getPreviewStart(track, fallbackStartSec = 0) {
        const candidates = [
            track?.masterPreviewInfo?.startSec,
            track?.masterPreviewInfo?.highlightStartSec,
            track?.abHighlightStartSec,
            track?.analysis?.abHighlightStartSec,
            fallbackStartSec
        ];
        for (const candidate of candidates) {
            const n = Number(candidate);
            if (Number.isFinite(n) && n >= 0) return n;
        }
        return 0;
    }

    function getPreviewDuration(track, fallbackDurationSec = DEFAULT_DURATION_SEC) {
        const candidates = [
            track?.masterPreviewInfo?.durationSec,
            track?.masterPreviewDurationSec,
            fallbackDurationSec,
            DEFAULT_DURATION_SEC
        ];
        for (const candidate of candidates) {
            const n = Number(candidate);
            if (Number.isFinite(n) && n > 0) return n;
        }
        return DEFAULT_DURATION_SEC;
    }

    function resolveCompareWindow(track, options = {}) {
        const originalDurationSec = getOriginalDuration(track);
        const fallbackStartSec = finiteNumber(options.fallbackStartSec, 0);
        const fallbackDurationSec = finiteNumber(options.fallbackDurationSec, DEFAULT_DURATION_SEC);
        const rawStart = getPreviewStart(track, fallbackStartSec);
        const rawDuration = getPreviewDuration(track, fallbackDurationSec);
        const hasOriginalDuration = Number.isFinite(originalDurationSec) && originalDurationSec > 0;
        const maxStart = hasOriginalDuration ? Math.max(0, originalDurationSec - 0.001) : Math.max(0, rawStart);
        const startSec = clamp(rawStart, 0, maxStart);
        const maxDuration = hasOriginalDuration ? Math.max(0.001, originalDurationSec - startSec) : rawDuration;
        const durationSec = clamp(rawDuration, 0.001, Math.max(0.001, maxDuration));
        const endSec = startSec + durationSec;
        return Object.freeze({
            startSec: round(startSec, 3),
            durationSec: round(durationSec, 3),
            endSec: round(endSec, 3),
            originalLocalStartSec: round(startSec, 3),
            masterPreviewLocalStartSec: 0,
            originalDurationSec: round(originalDurationSec, 3),
            aligned: true,
            clamped: Math.abs(rawStart - startSec) > 0.001 || Math.abs(rawDuration - durationSec) > 0.001
        });
    }

    function windowToDataset(windowInfo = {}) {
        return {
            waveformScope: 'preview',
            waveformStartSec: String(round(windowInfo.startSec, 2)),
            waveformDurationSec: String(round(windowInfo.durationSec, 2)),
            waveformAbsoluteStartSec: String(round(windowInfo.startSec, 2)),
            waveformMasterPreviewStartSec: '0',
            waveformAligned: 'true'
        };
    }

    function energyStats(values = []) {
        const list = Array.isArray(values) ? values.map(Number).filter(Number.isFinite) : [];
        if (!list.length) return { peak: 0, rms: 0, hotRatio: 0, bins: 0 };
        let sumSquares = 0;
        let peak = 0;
        let hot = 0;
        list.forEach(value => {
            const v = clamp(Math.abs(value), 0, 1);
            peak = Math.max(peak, v);
            sumSquares += v * v;
            if (v >= 0.92) hot += 1;
        });
        return Object.freeze({
            peak: round(peak, 3),
            rms: round(Math.sqrt(sumSquares / list.length), 3),
            hotRatio: round(hot / list.length, 3),
            bins: list.length
        });
    }

    function compareWaveformEnergy(originalValues = [], previewValues = []) {
        const original = energyStats(originalValues);
        const preview = energyStats(previewValues);
        const rmsDelta = round(preview.rms - original.rms, 3);
        const peakDelta = round(preview.peak - original.peak, 3);
        const status = Math.abs(rmsDelta) <= 0.18 && Math.abs(peakDelta) <= 0.28 ? 'ok' : 'check';
        return Object.freeze({ original, preview, rmsDelta, peakDelta, status });
    }

    function formatWindowLabel(windowInfo = {}) {
        const start = round(windowInfo.startSec, 1);
        const duration = round(windowInfo.durationSec, 1);
        const end = round(windowInfo.endSec ?? (windowInfo.startSec + windowInfo.durationSec), 1);
        return `${start}s–${end}s · ${duration}s`;
    }

    function buildDiagnostic(track, options = {}) {
        const windowInfo = resolveCompareWindow(track, options);
        const energy = compareWaveformEnergy(options.originalValues || [], options.previewValues || []);
        return Object.freeze({
            window: windowInfo,
            energy,
            label: formatWindowLabel(windowInfo),
            status: windowInfo.clamped ? 'clamped' : energy.status,
            message: windowInfo.clamped
                ? '원곡 길이에 맞춰 하이라이트 구간을 보정했습니다.'
                : (energy.status === 'ok' ? '원음/하이라이트 구간이 같은 기준으로 정렬됐습니다.' : '파형 에너지 차이가 큽니다. 구간은 맞지만 마스터링 변화가 크게 들릴 수 있습니다.')
        });
    }

    global.FoxBearHighlightCompareInspector = Object.freeze({
        DEFAULT_DURATION_SEC,
        resolveCompareWindow,
        windowToDataset,
        energyStats,
        compareWaveformEnergy,
        formatWindowLabel,
        buildDiagnostic
    });
})(window);
