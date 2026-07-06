// FoxBear waveform compare popup view helpers.
// Stage6: extracted from src/app.js so compare UI can evolve without growing the main app file.
(function attachFoxBearWaveformCompareView(global) {
  'use strict';

  function pick(deps, name, fallback) {
    return deps && Object.prototype.hasOwnProperty.call(deps, name) ? deps[name] : fallback;
  }

  function createRenderer(deps = {}) {
    const state = pick(deps, 'state', {});
    const MASTER_PREVIEW_DURATION_SEC = pick(deps, 'MASTER_PREVIEW_DURATION_SEC', 15);
    const clamp = pick(deps, 'clamp', (value, min, max) => Math.min(max, Math.max(min, value)));
    const documentRef = pick(deps, 'document', global.document);
    const raf = pick(deps, 'requestAnimationFrame', global.requestAnimationFrame ? global.requestAnimationFrame.bind(global) : fn => global.setTimeout ? global.setTimeout(fn, 0) : 0);
    const setTimeoutRef = pick(deps, 'setTimeout', global.setTimeout ? global.setTimeout.bind(global) : (() => 0));
    const setIntervalRef = pick(deps, 'setInterval', global.setInterval ? global.setInterval.bind(global) : (() => 0));
    const clearIntervalRef = pick(deps, 'clearInterval', global.clearInterval ? global.clearInterval.bind(global) : (() => undefined));

    const getAdaptiveDockWaveformBinCount = pick(deps, 'getAdaptiveDockWaveformBinCount', () => 128);
    const getTrackOriginalWaveformValues = pick(deps, 'getTrackOriginalWaveformValues', () => []);
    const getTrackMasterWaveformValues = pick(deps, 'getTrackMasterWaveformValues', () => []);
    const getTrackMasterWaveformMarkers = pick(deps, 'getTrackMasterWaveformMarkers', () => []);
    const normalizeWaveformValues = pick(deps, 'normalizeWaveformValues', values => Array.isArray(values) ? values : []);
    const sampleMarkersFromValues = pick(deps, 'sampleMarkersFromValues', () => []);
    const getMasterPreviewStartSec = pick(deps, 'getMasterPreviewStartSec', () => 0);
    const attachWaveformSeekHandlers = pick(deps, 'attachWaveformSeekHandlers', () => undefined);
    const addWaveformPeakJumpChips = pick(deps, 'addWaveformPeakJumpChips', () => undefined);
    const getBottomPreviewAudio = pick(deps, 'getBottomPreviewAudio', () => null);
    const getDockModeLabel = pick(deps, 'getDockModeLabel', mode => mode || '재생');
    const formatPlayerTime = pick(deps, 'formatPlayerTime', () => '00:00');
    const toggleBottomPreviewExternalPlayback = pick(deps, 'toggleBottomPreviewExternalPlayback', () => undefined);
    const activateMainTrackFromDock = pick(deps, 'activateMainTrackFromDock', track => track);
    const resolveMainActiveTrackForDock = pick(deps, 'resolveMainActiveTrackForDock', () => null);
    const showToast = pick(deps, 'showToast', () => undefined);
    const runDockRemoteMasterPreview = pick(deps, 'runDockRemoteMasterPreview', () => undefined);
    const captureBottomPreviewTransport = pick(deps, 'captureBottomPreviewTransport', () => undefined);
    const renderBottomPreviewDock = pick(deps, 'renderBottomPreviewDock', () => undefined);
    const playBottomPreviewAudio = pick(deps, 'playBottomPreviewAudio', () => undefined);
    const foxBearHaptic = pick(deps, 'foxBearHaptic', () => undefined);

    function renderWaveformCompareDialog(track, target) {
        const wrap = documentRef.createElement('section');
        wrap.className = 'waveform-compare-card';
        const head = documentRef.createElement('div');
        head.className = 'waveform-compare-head';
        const name = documentRef.createElement('strong');
        name.textContent = track.name || '선택 트랙';
        const meta = documentRef.createElement('span');
        meta.textContent = getWaveformCompareSummaryText(track);
        head.append(name, meta);
        wrap.appendChild(head);
        wrap.appendChild(createWaveformCompareTransportControls(track));
        addWaveformPeakJumpChips(track, wrap);

        const rows = createAlignedWaveformCompareRows(track);
        rows.forEach(rowInfo => wrap.appendChild(makeWaveformCompareRow(rowInfo.label, rowInfo.values, rowInfo.markers, rowInfo.tone, rowInfo.mode, rowInfo)));
        if (!rows.some(row => row.mode !== 'original')) {
            const empty = documentRef.createElement('div');
            empty.className = 'waveform-compare-empty';
            empty.textContent = '마스터링 실행 또는 하이라이트 듣기 생성 후 비교 파형이 표시됩니다.';
            wrap.appendChild(empty);
        }
        const hint = documentRef.createElement('p');
        hint.className = 'waveform-compare-hint';
        hint.textContent = rows.some(row => row.scope === 'preview')
            ? '원곡도 하이라이트 시작점과 길이에 맞춰 잘라 표시합니다. 파형을 누르면 두 소스가 같은 구간으로 이동합니다.'
            : '파형을 누르면 같은 비율 위치로 이동합니다. 위 재생 버튼으로 팝업 안에서 바로 재생/정지할 수 있습니다.';
        wrap.appendChild(hint);
        target.appendChild(wrap);
    }

    function getWaveformCompareSummaryText(track) {
        if (track?.masteredUrl) {
            const originalDuration = Number(track?.analysis?.duration || 0);
            const masteredDuration = Number(track?.masteredDurationSec || 0);
            const hasMismatch = Number.isFinite(originalDuration) && Number.isFinite(masteredDuration) && originalDuration > 0 && masteredDuration > 0 && Math.abs(originalDuration - masteredDuration) > 0.25;
            return hasMismatch ? '원곡 / 마스터링 길이 보정 비교' : '원곡 / 마스터링 큰 비교';
        }
        if (track?.masterPreviewUrl) return '원곡 / 15초 하이라이트 길이 맞춤 비교';
        return '원곡 파형 피크';
    }

    function sliceWaveformValuesByTime(values = [], sourceDurationSec = 0, startSec = 0, durationSec = 0, targetBins = 128) {
        const list = Array.isArray(values) ? values : [];
        const sourceDuration = Number(sourceDurationSec || 0);
        const targetDuration = Number(durationSec || 0);
        if (!list.length) return [];
        if (!Number.isFinite(sourceDuration) || sourceDuration <= 0 || !Number.isFinite(targetDuration) || targetDuration <= 0) {
            return normalizeWaveformValues(list, targetBins);
        }
        const safeStart = clamp(Number(startSec || 0), 0, Math.max(0, sourceDuration - 0.001));
        const safeEnd = clamp(safeStart + targetDuration, safeStart + 0.001, sourceDuration);
        const startIndex = clamp(Math.floor(safeStart / sourceDuration * list.length), 0, Math.max(0, list.length - 1));
        const endIndex = clamp(Math.ceil(safeEnd / sourceDuration * list.length), startIndex + 1, list.length);
        return normalizeWaveformValues(list.slice(startIndex, endIndex), targetBins);
    }

    function createAlignedWaveformCompareRows(track) {
        const popupBins = getAdaptiveDockWaveformBinCount('popup');
        const original = getTrackOriginalWaveformValues(track);
        const mastered = getTrackMasterWaveformValues(track);
        const originalDuration = Number(track?.analysis?.duration || 0);
        const previewStart = getMasterPreviewStartSec(track);
        const previewDuration = Number(track?.masterPreviewInfo?.durationSec || MASTER_PREVIEW_DURATION_SEC || 0);

        if (track?.masteredUrl && mastered.length) {
            return [
                { label: '원곡', values: normalizeWaveformValues(original, popupBins), markers: sampleMarkersFromValues(original), tone: 'original', mode: 'original', scope: 'full', aligned: true },
                { label: '마스터링', values: normalizeWaveformValues(mastered, popupBins), markers: getTrackMasterWaveformMarkers(track, mastered), tone: 'mastered', mode: 'mastered', scope: 'full', aligned: true }
            ];
        }

        if (track?.masterPreviewUrl && mastered.length) {
            const alignedOriginal = sliceWaveformValuesByTime(original, originalDuration, previewStart, previewDuration, popupBins);
            return [
                { label: '원곡 하이라이트', values: alignedOriginal, markers: sampleMarkersFromValues(alignedOriginal), tone: 'original', mode: 'original', scope: 'preview', aligned: true, startSec: previewStart, durationSec: previewDuration },
                { label: '하이라이트 듣기', values: normalizeWaveformValues(mastered, popupBins), markers: getTrackMasterWaveformMarkers(track, mastered), tone: 'mastered', mode: 'masterPreview', scope: 'preview', aligned: true, startSec: previewStart, durationSec: previewDuration }
            ];
        }

        return [{ label: '원곡', values: normalizeWaveformValues(original, popupBins), markers: sampleMarkersFromValues(original), tone: 'original', mode: 'original', scope: 'full', aligned: false }];
    }

    function createWaveformCompareTransportControls(track) {
        const controls = documentRef.createElement('div');
        controls.className = 'waveform-compare-transport';

        const toggle = documentRef.createElement('button');
        toggle.type = 'button';
        toggle.className = 'waveform-compare-transport-toggle';
        toggle.setAttribute('aria-label', '비교 팝업 재생 또는 정지');

        const mode = documentRef.createElement('span');
        mode.className = 'waveform-compare-transport-mode';

        const time = documentRef.createElement('span');
        time.className = 'waveform-compare-transport-time';

        const sync = () => {
            const audio = getBottomPreviewAudio();
            const playing = Boolean(audio && !audio.paused && !audio.ended);
            toggle.textContent = playing ? '정지' : '재생';
            toggle.classList.toggle('playing', playing);
            mode.textContent = getDockModeLabel(state.bottomPreviewMode);
            const duration = Number(audio?.duration || (state.bottomPreviewMode === 'masterPreview' ? track?.masterPreviewInfo?.durationSec : track?.analysis?.duration) || 0);
            time.textContent = audio ? formatPlayerTime(audio.currentTime || 0, duration) : '00:00';
        };

        toggle.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            toggleBottomPreviewExternalPlayback(event);
            raf(sync);
            setTimeoutRef(sync, 90);
        });

        const timer = setIntervalRef(() => {
            if (!documentRef.body.contains(controls)) {
                clearIntervalRef(timer);
                return;
            }
            sync();
        }, 240);
        sync();

        controls.append(toggle, mode, time);
        return controls;
    }

    function getWaveformMarkerForIndex(markers = [], index = 0, total = 1, value = 0) {
        const list = Array.isArray(markers) ? markers : [];
        let marker = '';
        if (list.length) {
            const mappedIndex = list.length === total ? index : Math.round(index / Math.max(1, total - 1) * Math.max(0, list.length - 1));
            marker = String(list[mappedIndex] || '').toLowerCase();
        }
        if (marker === 'clip' || marker === 'hot' || marker === 'ok') return marker;
        const v = Number(value || 0);
        if (v >= 0.985) return 'clip';
        if (v >= 0.92) return 'hot';
        return 'ok';
    }

    function makeWaveformCompareRow(labelText, values = [], markers = [], tone = '', sourceMode = '', options = {}) {
        const row = documentRef.createElement('div');
        row.className = `waveform-compare-row ${tone ? 'waveform-compare-' + tone : ''}`;
        row.classList.toggle('is-aligned', Boolean(options.aligned));
        const label = documentRef.createElement('span');
        label.textContent = labelText;
        const bars = documentRef.createElement('div');
        bars.className = 'waveform-compare-bars';
        attachWaveformSeekHandlers(bars, sourceMode || tone || state.bottomPreviewMode, 'popup');
        if (options.scope === 'preview') bars.dataset.waveformScope = 'preview';
        if (Number.isFinite(Number(options.startSec))) bars.dataset.waveformStartSec = String(Math.round(Number(options.startSec) * 100) / 100);
        if (Number.isFinite(Number(options.durationSec))) bars.dataset.waveformDurationSec = String(Math.round(Number(options.durationSec) * 100) / 100);
        bars.dataset.waveformAligned = options.aligned ? 'true' : 'false';
        const popupBins = getAdaptiveDockWaveformBinCount('popup');
        bars.dataset.waveformBinCount = String((values && values.length) || popupBins);
        const normalized = normalizeWaveformValues(values, popupBins);
        if (!normalized.length) {
            bars.classList.add('empty');
            for (let i = 0; i < popupBins; i += 1) {
                const bar = documentRef.createElement('i');
                bar.dataset.waveformIndex = String(i);
                bar.dataset.waveformPercent = String(Math.round(i / Math.max(1, popupBins - 1) * 1000) / 10);
                bar.style.height = '8%';
                bars.appendChild(bar);
            }
        } else {
            normalized.forEach((value, index) => {
                const bar = documentRef.createElement('i');
                bar.dataset.waveformIndex = String(index);
                bar.dataset.waveformPercent = String(normalized.length > 1 ? Math.round(index / (normalized.length - 1) * 1000) / 10 : 0);
                const marker = getWaveformMarkerForIndex(markers, index, normalized.length, value);
                bar.className = `waveform-bar waveform-${marker}`;
                bar.title = marker === 'clip' ? '클립/초과 피크 구간' : (marker === 'hot' ? '주의 피크 구간' : '일반 피크 구간');
                bar.style.height = `${Math.max(5, Math.round(clamp(value, 0, 1) * 100))}%`;
                bars.appendChild(bar);
            });
        }
        const listen = documentRef.createElement('button');
        listen.type = 'button';
        listen.className = 'waveform-compare-listen';
        const mode = sourceMode === 'mastered' ? 'mastered' : (sourceMode === 'masterPreview' ? 'masterPreview' : 'original');
        listen.textContent = mode === 'mastered' ? '마스터링 듣기' : (mode === 'masterPreview' ? '하이라이트 듣기' : '원곡 듣기');
        listen.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            const track = activateMainTrackFromDock(resolveMainActiveTrackForDock());
            if (!track) {
                showToast('비교할 음원을 먼저 불러와주세요.');
                return;
            }
            if (mode === 'mastered' && !track.masteredUrl) {
                showToast('마스터링 완료 후 마스터링 듣기가 가능합니다.');
                return;
            }
            if (mode === 'masterPreview' && !track.masterPreviewUrl) {
                runDockRemoteMasterPreview(event);
                return;
            }
            captureBottomPreviewTransport(track, state.bottomPreviewMode);
            const alignedStartSec = Number(options.startSec);
            const alignedDurationSec = Number(options.durationSec);
            if (options.scope === 'preview' && Number.isFinite(alignedStartSec) && alignedStartSec >= 0) {
                const localSec = mode === 'masterPreview' ? 0 : alignedStartSec;
                state.bottomPreviewTransport = {
                    trackId: track.id,
                    mode,
                    localSec,
                    absoluteSec: alignedStartSec,
                    durationSec: Number.isFinite(alignedDurationSec) && alignedDurationSec > 0 ? alignedDurationSec : undefined,
                    scope: 'preview',
                    playing: true,
                    translationMode: state.previewTranslationMode || 'studio',
                    capturedAt: Date.now(),
                    source: 'waveform-compare-listen'
                };
            }
            state.bottomPreviewMode = mode;
            state.bottomPreviewTrackId = track.id;
            state.bottomPreviewAutoplayTrackId = track.id;
            renderBottomPreviewDock({ autoPlay: true, keepPlaying: true });
            raf(() => {
                const audio = getBottomPreviewAudio();
                if (audio && options.scope === 'preview' && Number.isFinite(alignedStartSec) && alignedStartSec >= 0) {
                    const targetLocalSec = mode === 'masterPreview' ? 0 : alignedStartSec;
                    try {
                        if (audio.readyState >= 1) audio.currentTime = Math.max(0, targetLocalSec);
                        else audio.addEventListener('loadedmetadata', () => {
                            try { audio.currentTime = Math.max(0, targetLocalSec); } catch (error) {}
                        }, { once: true });
                    } catch (error) {}
                }
                playBottomPreviewAudio();
            });
            foxBearHaptic('switch');
            const rangeText = options.scope === 'preview' && Number.isFinite(alignedStartSec)
                ? ` · ${Math.round(alignedStartSec * 10) / 10}초 구간`
                : '';
            showToast(`${listen.textContent}로 전환했습니다${rangeText}.`);
        });
        row.append(label, bars, listen);
        return row;
    }

    return {
      renderWaveformCompareDialog,
      getWaveformCompareSummaryText,
      sliceWaveformValuesByTime,
      createAlignedWaveformCompareRows,
      createWaveformCompareTransportControls,
      makeWaveformCompareRow
    };
  }

  function renderWaveformCompareDialog(track, target, deps = {}) {
    return createRenderer(deps).renderWaveformCompareDialog(track, target);
  }

  global.FoxBearWaveformCompareView = Object.freeze({
    createRenderer,
    renderWaveformCompareDialog
  });
})(window);
