// FoxBear managed waveform view helpers - Stage28
(function attachFoxBearWaveformControlView(global) {
  'use strict';

  const VIEW_VERSION = '1.6.80-ai-mastering-expert-workspace';
  const DEFAULT_BINS = 96;

  function getService() {
    return global.FoxBearWaveformControlService || {};
  }

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
    const serviceNormalize = getService().normalizeValues;
    if (typeof serviceNormalize === 'function') return serviceNormalize(values, targetBins);
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
    const serviceSample = getService().sampleMarkers;
    if (typeof serviceSample === 'function') return serviceSample(values);
    const coreSample = getCore().sampleMarkersFromValues;
    if (typeof coreSample === 'function') return coreSample(values);
    return (Array.isArray(values) ? values : []).map(value => {
      const normalized = clamp(Number(value) || 0, 0, 1);
      if (normalized >= 0.985) return 'clip';
      if (normalized >= 0.92) return 'hot';
      return 'ok';
    });
  }

  function getMarker(markers = [], index = 0, total = 1, value = 0) {
    const serviceMarker = getService().getMarker;
    if (typeof serviceMarker === 'function') return serviceMarker(markers, index, total, value);
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

  function makePlaceholderValues(count = DEFAULT_BINS, factory = null) {
    const bins = Math.max(8, Math.round(Number(count) || DEFAULT_BINS));
    const values = [];
    for (let index = 0; index < bins; index += 1) {
      const next = typeof factory === 'function'
        ? factory(index, bins)
        : 0.18 + Math.sin(index * 0.43) * 0.08;
      values.push(clamp(Number(next) || 0, 0.04, 0.42));
    }
    return values;
  }

  function setDataset(element, dataset = {}) {
    if (!element || !dataset || typeof dataset !== 'object') return;
    Object.entries(dataset).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      element.dataset[key] = String(value);
    });
  }

  function createBars(options = {}) {
    const owner = options.document || global.document;
    const bars = owner.createElement(options.tagName || 'div');
    const className = options.className || 'dock-integrated-waveform-bars';
    bars.className = className;

    const rawValues = Array.isArray(options.values) ? options.values : [];
    const bins = Math.max(8, Math.round(Number(options.bins || rawValues.length || DEFAULT_BINS)));
    const normalized = rawValues.length ? normalizeValues(rawValues, bins) : [];
    const hasRealValues = options.hasRealValues === undefined ? Boolean(normalized.length) : Boolean(options.hasRealValues);
    const renderValues = normalized.length ? normalized : makePlaceholderValues(bins, options.placeholderFactory);
    const markerList = Array.isArray(options.markers) && options.markers.length ? options.markers : sampleMarkers(renderValues);
    const prefix = options.barClassPrefix || 'dock-integrated-waveform';
    const realMinHeight = Number.isFinite(Number(options.realMinHeight)) ? Number(options.realMinHeight) : 5;
    const placeholderMinHeight = Number.isFinite(Number(options.placeholderMinHeight)) ? Number(options.placeholderMinHeight) : realMinHeight;
    const minHeight = normalized.length ? realMinHeight : placeholderMinHeight;

    if (options.emptyClass && !normalized.length) bars.classList.add(options.emptyClass);
    if (options.readyClass && hasRealValues) bars.classList.add(options.readyClass);
    if (options.placeholderClass && !hasRealValues) bars.classList.add(options.placeholderClass);

    bars.dataset.waveformView = VIEW_VERSION;
    bars.dataset.waveformBinCount = String(renderValues.length);
    if (options.includeReadyDataset !== false) bars.dataset.waveformReady = hasRealValues ? 'true' : 'false';
    setDataset(bars, options.dataset);
    const serviceStamp = getService().stampManagedElement;
    if (typeof serviceStamp === 'function') serviceStamp(bars, options.role || 'waveform');

    renderValues.forEach((value, index) => {
      const normalizedValue = clamp(Number(value) || 0, 0, 1);
      const marker = getMarker(markerList, index, renderValues.length, normalizedValue);
      const bar = owner.createElement('i');
      const percent = renderValues.length > 1 ? Math.round(index / (renderValues.length - 1) * 1000) / 10 : 0;
      bar.dataset.waveformIndex = String(index);
      bar.dataset.waveformPercent = String(percent);
      bar.className = `${prefix}-bar ${prefix}-${marker}`;
      if (options.titles !== false) {
        bar.title = marker === 'clip' ? '클립/초과 피크 구간' : (marker === 'hot' ? '주의 피크 구간' : '일반 피크 구간');
      }
      bar.style.height = `${Math.max(minHeight, Math.round(normalizedValue * 100))}%`;
      bars.appendChild(bar);
    });

    return bars;
  }

  function createRow(options = {}) {
    const owner = options.document || global.document;
    const row = owner.createElement(options.rowTagName || 'div');
    row.className = options.rowClassName || 'waveform-row';
    const label = owner.createElement(options.labelTagName || 'span');
    label.className = options.labelClassName || '';
    label.textContent = options.label || '';
    const bars = createBars({
      ...options,
      document: owner,
      className: options.barsClassName || options.className || 'waveform-bars',
      role: options.role || 'detail',
      barClassPrefix: options.barClassPrefix || 'waveform'
    });
    row.append(label, bars);
    return row;
  }

  global.FoxBearWaveformControlView = Object.freeze({
    version: VIEW_VERSION,
    createBars,
    createRow,
    makePlaceholderValues
  });
})(window);
