// FoxBear common waveform control service - Stage27
(function attachFoxBearWaveformControlService(global) {
    'use strict';

    const SERVICE_VERSION = '1.6.50-kakao-centered-entry-notice';
    const DEFAULT_BINS = 96;
    const SAFE_END_MARGIN_SEC = 0.08;
    const barElementsCache = typeof WeakMap === 'function' ? new WeakMap() : null;

    function getCore() {
        return global.FoxBearCoreUtils || {};
    }

    function clamp(value, min, max) {
        const coreClamp = getCore().clamp;
        if (typeof coreClamp === 'function') return coreClamp(value, min, max);
        const number = Number(value);
        if (!Number.isFinite(number)) return min;
        return Math.min(max, Math.max(min, number));
    }

    function normalizeValues(values = [], targetBins = DEFAULT_BINS) {
        const coreNormalize = getCore().normalizeWaveformValues;
        if (typeof coreNormalize === 'function') return coreNormalize(values, targetBins);
        if (!Array.isArray(values) || !values.length) return [];
        const bins = Math.max(8, Math.round(Number(targetBins) || DEFAULT_BINS));
        const out = [];
        for (let i = 0; i < bins; i += 1) {
            const index = Math.min(values.length - 1, Math.floor((i / bins) * values.length));
            out.push(clamp(Number(values[index]) || 0, 0, 1));
        }
        const max = Math.max(...out, 0.001);
        return out.map(value => clamp(value / max, 0, 1));
    }

    function sampleMarkers(values = []) {
        const coreSample = getCore().sampleMarkersFromValues;
        if (typeof coreSample === 'function') return coreSample(values);
        if (!Array.isArray(values) || !values.length) return [];
        return values.map(value => {
            const normalized = clamp(Number(value) || 0, 0, 1);
            if (normalized >= 0.985) return 'clip';
            if (normalized >= 0.92) return 'hot';
            return 'ok';
        });
    }

    function getMarker(markers = [], index = 0, total = 1, value = 0) {
        const coreMarker = getCore().getWaveformMarkerForIndex;
        if (typeof coreMarker === 'function') return coreMarker(markers, index, total, value);
        const list = Array.isArray(markers) ? markers : [];
        let marker = '';
        if (list.length) {
            const mappedIndex = list.length === total
                ? index
                : Math.round(index / Math.max(1, total - 1) * Math.max(0, list.length - 1));
            marker = String(list[mappedIndex] || '').toLowerCase();
        }
        if (marker === 'clip' || marker === 'hot' || marker === 'ok') return marker;
        const normalized = clamp(Number(value) || 0, 0, 1);
        if (normalized >= 0.985) return 'clip';
        if (normalized >= 0.92) return 'hot';
        return 'ok';
    }

    function getBarElements(element) {
        if (!element || typeof element.querySelectorAll !== 'function') return [];
        const cached = barElementsCache?.get(element);
        if (cached) return cached;
        const bars = Array.from(element.querySelectorAll('i'));
        try { barElementsCache?.set(element, bars); } catch (error) {}
        return bars;
    }

    function getTimelineModel(element) {
        const bars = getBarElements(element);
        const rootRect = element?.getBoundingClientRect?.();
        if (!rootRect || !rootRect.width) return null;
        if (!bars.length) return { rootRect, bars, plotLeft: rootRect.left, plotRight: rootRect.right, plotWidth: rootRect.width };
        const firstRect = bars[0]?.getBoundingClientRect?.();
        const lastRect = bars[bars.length - 1]?.getBoundingClientRect?.();
        const left = Number.isFinite(firstRect?.left) ? firstRect.left : rootRect.left;
        const right = Number.isFinite(lastRect?.right) ? lastRect.right : rootRect.right;
        const safeLeft = Math.max(rootRect.left, Math.min(left, right));
        const safeRight = Math.min(rootRect.right, Math.max(left, right));
        const width = Math.max(1, safeRight - safeLeft);
        return { rootRect, bars, plotLeft: safeLeft, plotRight: safeRight, plotWidth: width };
    }

    function pointerToPercent(event, element) {
        const target = element || event?.currentTarget || event?.target;
        if (!target || typeof target.getBoundingClientRect !== 'function') return NaN;
        const x = Number(event?.clientX ?? event?.touches?.[0]?.clientX ?? event?.changedTouches?.[0]?.clientX);
        if (!Number.isFinite(x)) return NaN;
        const model = getTimelineModel(target);
        if (!model) return NaN;
        return clamp((x - model.plotLeft) / Math.max(1, model.plotWidth) * 100, 0, 100);
    }

    function audioPercentToVisualPercent(element, percent) {
        const pct = clamp(Number(percent), 0, 100);
        const model = getTimelineModel(element);
        if (!model) return pct;
        const x = model.plotLeft + model.plotWidth * (pct / 100);
        return clamp((x - model.rootRect.left) / Math.max(1, model.rootRect.width) * 100, 0, 100);
    }

    function clearLegacyBarProgress(element) {
        if (!element || element.dataset.waveformCssProgressReady === 'true') return;
        element.dataset.waveformCssProgressReady = 'true';
        getBarElements(element).forEach(bar => bar.classList.remove('is-played', 'is-current'));
    }

    function updateBarProgress(element, percent) {
        if (!element || !Number.isFinite(Number(percent))) return;
        const pct = clamp(Number(percent), 0, 100);
        clearLegacyBarProgress(element);
        // A single CSS custom property replaces per-frame class mutations on
        // every waveform bar. The existing gradient/playhead CSS consumes it.
        element.style.setProperty('--waveform-progress-pct', `${audioPercentToVisualPercent(element, pct)}%`);
    }

    function setPlayhead(element, percent, playing = false) {
        if (!element) return;
        if (!Number.isFinite(Number(percent))) {
            element.classList.remove('has-live-playhead', 'is-playing');
            element.style.removeProperty('--waveform-playhead-pct');
            element.style.removeProperty('--waveform-progress-pct');
            element.removeAttribute('aria-valuenow');
            delete element.dataset.waveformPlaybackPercent;
            clearLegacyBarProgress(element);
            return;
        }
        const pct = clamp(Number(percent), 0, 100);
        const visualPct = audioPercentToVisualPercent(element, pct);
        const displayPct = Math.round(pct * 10) / 10;
        element.dataset.waveformPlaybackPercent = String(displayPct);
        element.style.setProperty('--waveform-playhead-pct', `${visualPct}%`);
        element.style.setProperty('--waveform-progress-pct', `${visualPct}%`);
        element.setAttribute('aria-valuenow', String(Math.round(displayPct)));
        element.classList.add('has-live-playhead');
        element.classList.toggle('is-playing', Boolean(playing));
        updateBarProgress(element, pct);
    }

    function seekAudioToPercent(audio, percent, durationOverride = 0, options = {}) {
        if (!audio) return NaN;
        const duration = Number(durationOverride || audio.duration || 0);
        if (!Number.isFinite(duration) || duration <= 0) return NaN;
        const pct = clamp(Number(percent || 0), 0, 100) / 100;
        const safeEnd = Math.max(0, duration - Number(options.endMarginSec ?? SAFE_END_MARGIN_SEC));
        const nextTime = clamp(duration * pct, 0, safeEnd);
        audio.currentTime = nextTime;
        return nextTime;
    }

    function findStrongestPeakPercent(values = []) {
        if (!Array.isArray(values) || !values.length) return NaN;
        let maxIndex = 0;
        let maxValue = -Infinity;
        values.forEach((value, index) => {
            const n = Number(value);
            if (Number.isFinite(n) && n > maxValue) {
                maxValue = n;
                maxIndex = index;
            }
        });
        return values.length > 1 ? maxIndex / (values.length - 1) * 100 : 0;
    }

    function renderBars(values = [], markers = [], options = {}) {
        const owner = options.document || global.document;
        const bars = owner.createElement(options.tagName || 'span');
        bars.className = options.className || 'dock-integrated-waveform-bars';
        const normalized = normalizeValues(values, options.bins || DEFAULT_BINS);
        const renderValues = normalized.length ? normalized : Array.from({ length: Math.max(8, Number(options.bins || DEFAULT_BINS)) }, (_, index) => clamp(0.18 + Math.sin(index * 0.43) * 0.08, 0.08, 0.34));
        const markerList = Array.isArray(markers) && markers.length ? markers : sampleMarkers(renderValues);
        renderValues.forEach((value, index) => {
            const bar = owner.createElement('i');
            const percent = renderValues.length > 1 ? Math.round(index / (renderValues.length - 1) * 1000) / 10 : 0;
            bar.dataset.waveformIndex = String(index);
            bar.dataset.waveformPercent = String(percent);
            bar.className = `${options.barClassPrefix || 'dock-integrated-waveform'}-bar ${options.barClassPrefix || 'dock-integrated-waveform'}-${getMarker(markerList, index, renderValues.length, value)}`;
            bar.style.height = `${Math.max(10, Math.round(clamp(Number(value) || 0, 0, 1) * 100))}%`;
            bars.appendChild(bar);
        });
        bars.dataset.waveformService = SERVICE_VERSION;
        return bars;
    }

    function stampManagedElement(element, role = 'waveform') {
        if (!element) return element;
        element.dataset.waveformService = SERVICE_VERSION;
        element.dataset.waveformControlRole = role;
        try { barElementsCache?.delete(element); } catch (error) {}
        clearLegacyBarProgress(element);
        return element;
    }

    const api = Object.freeze({
        version: SERVICE_VERSION,
        normalizeValues,
        sampleMarkers,
        getMarker,
        getBarElements,
        getTimelineModel,
        pointerToPercent,
        audioPercentToVisualPercent,
        updateBarProgress,
        setPlayhead,
        seekAudioToPercent,
        findStrongestPeakPercent,
        renderBars,
        stampManagedElement
    });

    global.FoxBearWaveformControlService = api;
})(window);
