// FoxBear spectrum visualizer module - v1.4.21
// Detail-only FFT visualizer: Dock mini spectrum was removed to keep playback light.
(function initFoxBearSpectrumVisualizer(global) {
    'use strict';

    const VISUALIZER_VERSION = '1.6.70-share-retry-policy-drift-ci-efficiency';
    const PROFILE_RANGES = Object.freeze([
        [20, 32], [32, 45], [45, 63], [63, 90], [90, 125], [125, 180],
        [180, 250], [250, 355], [355, 500], [500, 710], [710, 1000], [1000, 1400],
        [1400, 2000], [2000, 2800], [2800, 4000], [4000, 5600], [5600, 7100], [7100, 9000],
        [9000, 11200], [11200, 14000], [14000, 16000], [16000, 18000], [18000, 20000], [20000, 22000]
    ]);
    const AXIS_LABELS = Object.freeze(['20Hz', '100', '1k', '10k', '22k']);
    const sourceNodes = new WeakMap();
    const externalAnalyserNodes = new WeakMap();
    const audioMetadata = new WeakMap();
    const registeredAudio = new Set();
    const audioBindings = new WeakMap();
    const state = {
        context: null,
        ownsContext: false,
        analyser: null,
        data: null,
        canvas: null,
        statusNode: null,
        metaNode: null,
        track: null,
        getActiveAudio: null,
        raf: 0,
        frameFallback: false,
        live: false,
        lastLiveValues: [],
        lastFrameAt: 0,
        lifecycleBound: false,
        lifecycleObserver: null,
        activateTimer: 0,
        prunedAudioCount: 0,
        disposedAudioCount: 0,
        disposing: false,
        lastError: ''
    };

    function now() {
        return global.performance && typeof global.performance.now === 'function'
            ? global.performance.now()
            : Date.now();
    }

    function clamp(value, min = 0, max = 1) {
        const number = Number(value);
        if (!Number.isFinite(number)) return min;
        return Math.min(max, Math.max(min, number));
    }

    function normalizeProfile(profile) {
        if (!Array.isArray(profile) || !profile.length) return [];
        const values = profile.map(value => Math.max(0, Number(value) || 0));
        const max = Math.max(...values, 1e-9);
        return values.map(value => clamp(value / max));
    }

    function resizeCanvas(canvas) {
        const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: 0, height: 0 };
        const width = Math.max(260, Math.round(rect.width || canvas.clientWidth || 560));
        const height = Math.max(120, Math.round(rect.height || canvas.clientHeight || 160));
        const ratio = Math.max(1, Math.min(2, global.devicePixelRatio || 1));
        const targetWidth = Math.round(width * ratio);
        const targetHeight = Math.round(height * ratio);
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }
        return { width: targetWidth, height: targetHeight, ratio };
    }

    function clearCanvas(ctx, width, height) {
        ctx.clearRect(0, 0, width, height);
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, 'rgba(13, 20, 36, 0.92)');
        bg.addColorStop(1, 'rgba(7, 10, 18, 0.96)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);
    }

    function drawGrid(ctx, width, height) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i += 1) {
            const y = Math.round(height * i / 4) + 0.5;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        for (let i = 1; i < 5; i += 1) {
            const x = Math.round(width * i / 5) + 0.5;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawBars(canvas, values, options = {}) {
        if (!canvas || typeof canvas.getContext !== 'function') return false;
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;
        const { width, height } = resizeCanvas(canvas);
        clearCanvas(ctx, width, height);
        drawGrid(ctx, width, height);
        const normalized = normalizeProfile(values);
        if (!normalized.length) {
            drawEmpty(ctx, width, height, options.emptyLabel || 'FFT 데이터 대기');
            return true;
        }
        const gap = Math.max(2, width * 0.004);
        const barWidth = Math.max(4, (width - gap * (normalized.length + 1)) / normalized.length);
        const baseY = height - Math.max(14, height * 0.10);
        const maxH = height * 0.76;
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, 'rgba(78, 211, 255, 0.62)');
        gradient.addColorStop(0.58, 'rgba(136, 119, 255, 0.76)');
        gradient.addColorStop(1, 'rgba(255, 191, 98, 0.94)');
        ctx.fillStyle = gradient;
        normalized.forEach((value, index) => {
            const x = gap + index * (barWidth + gap);
            const h = Math.max(3, value * maxH);
            const y = baseY - h;
            roundedRect(ctx, x, y, barWidth, h, Math.min(8, barWidth * 0.45));
            ctx.fill();
        });
        drawAiFocusLine(ctx, width, height, options.focusHz || 0);
        return true;
    }

    function drawEmpty(ctx, width, height, label) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.52)';
        ctx.font = `${Math.max(12, Math.round(height * 0.09))}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(label, width / 2, height / 2);
        ctx.restore();
    }

    function roundedRect(ctx, x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x, y + height);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function drawAiFocusLine(ctx, width, height, focusHz) {
        const hz = Number(focusHz || 0);
        if (!Number.isFinite(hz) || hz < 20) return;
        const x = frequencyToX(hz, width);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.58)';
        ctx.lineWidth = Math.max(1, width * 0.002);
        ctx.setLineDash([6, 7]);
        ctx.beginPath();
        ctx.moveTo(x, height * 0.10);
        ctx.lineTo(x, height * 0.88);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        ctx.font = `${Math.max(10, Math.round(height * 0.07))}px system-ui, sans-serif`;
        ctx.textAlign = x > width * 0.78 ? 'right' : 'left';
        ctx.fillText(`${Math.round(hz)}Hz`, x + (x > width * 0.78 ? -6 : 6), height * 0.14);
        ctx.restore();
    }

    function frequencyToX(freq, width) {
        const min = Math.log10(20);
        const max = Math.log10(22000);
        const now = Math.log10(clamp(freq, 20, 22000));
        return clamp((now - min) / Math.max(1e-9, max - min)) * width;
    }

    function profileFromAnalyser(analyser, data) {
        analyser.getByteFrequencyData(data);
        const sampleRate = state.context?.sampleRate || 44100;
        const binHz = sampleRate / (analyser.fftSize || 2048);
        return PROFILE_RANGES.map(([from, to]) => {
            const start = Math.max(1, Math.floor(from / binHz));
            const end = Math.min(data.length - 1, Math.ceil(to / binHz));
            let sum = 0;
            let count = 0;
            for (let index = start; index <= end; index += 1) {
                sum += data[index] || 0;
                count += 1;
            }
            return count ? sum / count / 255 : 0;
        });
    }

    function setStatus(message, mode = 'static') {
        if (state.statusNode) {
            state.statusNode.textContent = message;
            state.statusNode.dataset.spectrumStatus = mode;
        }
    }

    function setMeta(message) {
        if (state.metaNode) state.metaNode.textContent = message;
    }

    function pruneDisconnectedCanvases() {
        if (state.canvas && state.canvas.isConnected === false) state.canvas = null;
    }

    function hasRenderableCanvas() {
        pruneDisconnectedCanvases();
        return Boolean(state.canvas && state.canvas.isConnected !== false);
    }

    function drawEveryCanvas(values, options = {}) {
        pruneDisconnectedCanvases();
        if (!state.canvas || state.canvas.isConnected === false) return false;
        return drawBars(state.canvas, values, options);
    }

    function isDocumentHidden() {
        return Boolean(global.document && global.document.visibilityState === 'hidden');
    }

    function getFrameDelay() {
        return isDocumentHidden() ? 250 : 33;
    }

    function scheduleFrame(callback) {
        if (!isDocumentHidden() && typeof global.requestAnimationFrame === 'function') {
            state.frameFallback = false;
            return global.requestAnimationFrame(callback);
        }
        state.frameFallback = true;
        return global.setTimeout(() => callback(now()), getFrameDelay());
    }

    function cancelFrame(id) {
        if (!id) return;
        if (state.frameFallback || typeof global.cancelAnimationFrame !== 'function') global.clearTimeout(id);
        else global.cancelAnimationFrame(id);
    }

    function drawStatic(track = state.track) {
        const analysis = track?.analysis || {};
        const profile = Array.isArray(analysis.spectrumProfile) ? analysis.spectrumProfile : [];
        drawEveryCanvas(profile, {
            focusHz: analysis.targetDynamicFreq || analysis.harshPeakHz || 0,
            emptyLabel: track?.analysis ? '스펙트럼 값 없음' : '분석 후 표시'
        });
        if (track?.analysis) {
            const centroid = Number(analysis.spectralCentroidHz || 0);
            const bands = analysis.spectrumBands || {};
            setStatus('분석 FFT 프로필 표시 중 · 재생하면 실시간 스펙트럼으로 전환됩니다.', 'static');
            setMeta(`중심 ${centroid ? Math.round(centroid) + 'Hz' : '-'} · 저역 ${Math.round(Number(bands.bass || 0) * 100)}% · 존재감 ${Math.round(Number(bands.presence || 0) * 100)}% · Air ${Math.round(Number(bands.air || 0) * 100)}%`);
        } else {
            setStatus('트랙 분석이 끝나면 AI가 본 주파수 균형이 표시됩니다.', 'pending');
            setMeta('20Hz ~ 22kHz');
        }
    }

    function isRestrictedInAppBrowser() {
        const ua = String(global.navigator?.userAgent || '');
        return /KAKAOTALK|KakaoTalk|NAVER\(inapp|FBAN|FBAV|Instagram|Line\//i.test(ua);
    }

    function ensureContext() {
        if (!global.AudioContext && !global.webkitAudioContext) throw new Error('Web Audio API 미지원');
        if (!state.context || state.context.state === 'closed' || !state.ownsContext) {
            const manager = global.FoxBearAudioContextManager;
            state.context = manager && typeof manager.create === 'function'
                ? manager.create({ purpose: 'spectrum-visualizer', ownerId: 'spectrum-visualizer', replaceOwner: true, latencyHint: 'interactive' })
                : Reflect.construct(global.AudioContext || global.webkitAudioContext, [{ latencyHint: 'interactive' }]);
            state.ownsContext = true;
        }
        return state.context;
    }

    function resumeContext(context) {
        const manager = global.FoxBearAudioContextManager;
        if (manager && typeof manager.resume === 'function') return manager.resume(context, 'spectrum-live');
        if (!context || context.state !== 'suspended' || typeof context.resume !== 'function') return Promise.resolve(context);
        return context.resume().then(() => context).catch(() => context);
    }

    function releaseOwnedContext(reason = 'spectrum-release') {
        const context = state.context;
        const manager = global.FoxBearAudioContextManager;
        if (!context || !state.ownsContext) return;
        state.live = false;
        if (state.raf) {
            cancelFrame(state.raf);
            state.raf = 0;
        }
        state.analyser = null;
        state.data = null;
        state.lastFrameAt = 0;
        if (manager && typeof manager.close === 'function') manager.close(context, reason);
        else if (context.state !== 'closed' && typeof context.close === 'function') context.close().catch(() => {});
        state.context = null;
        state.ownsContext = false;
    }

    function clearActivationTimer() {
        if (!state.activateTimer) return;
        global.clearTimeout?.(state.activateTimer);
        state.activateTimer = 0;
    }

    function disposeSourceRecord(audio, record) {
        if (!record) return;
        if (state.analyser === record.analyser) {
            state.live = false;
            state.analyser = null;
            state.data = null;
        }
        try { record.source?.disconnect?.(); } catch (error) {}
        try { record.analyser?.disconnect?.(); } catch (error) {}
        try { record.silentSink?.disconnect?.(); } catch (error) {}
        try { record.stream?.getTracks?.().forEach(track => track.stop?.()); } catch (error) {}
        if (audio) sourceNodes.delete(audio);
    }

    function createAnalyser(context) {
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.82;
        return analyser;
    }

    function updateAudioMeta(audio, meta = {}) {
        if (!audio) return {};
        const prev = audioMetadata.get(audio) || {};
        const next = { ...prev, ...(meta || {}) };
        audioMetadata.set(audio, next);
        if (next.trackId) audio.dataset.spectrumTrackId = String(next.trackId);
        if (next.mode) audio.dataset.spectrumMode = String(next.mode);
        if (next.label) audio.dataset.spectrumLabel = String(next.label);
        return next;
    }

    function connectAudio(audio) {
        if (!audio) return null;
        const externalRecord = externalAnalyserNodes.get(audio);
        if (externalRecord?.analyser) {
            if (externalRecord.context && state.context && state.context !== externalRecord.context && state.ownsContext) releaseOwnedContext('spectrum-external-analyser');
            if (externalRecord.context) { state.context = externalRecord.context; state.ownsContext = false; }
            return externalRecord.analyser;
        }
        if (isRestrictedInAppBrowser()) {
            throw new Error('인앱 브라우저에서는 비침습 FFT를 사용하지 않습니다.');
        }
        const context = ensureContext();
        let record = sourceNodes.get(audio);
        if (record?.context?.state === 'closed') {
            disposeSourceRecord(audio, record);
            record = null;
        }
        if (!record) {
            // Never take ownership of the audible media element with
            // createMediaElementSource(). A suspended context would mute native
            // playback. Capture a duplicate stream for FFT and send only that
            // duplicate to a zero-gain sink.
            const capture = audio.captureStream || audio.mozCaptureStream;
            if (typeof capture !== 'function' || typeof context.createMediaStreamSource !== 'function') {
                throw new Error('비침습 실시간 FFT를 지원하지 않는 브라우저입니다.');
            }
            const stream = capture.call(audio);
            if (!stream || !stream.getAudioTracks?.().length) throw new Error('FFT용 오디오 스트림을 만들지 못했습니다.');
            const source = context.createMediaStreamSource(stream);
            const analyser = createAnalyser(context);
            const silentSink = context.createGain();
            silentSink.gain.value = 0;
            source.connect(analyser);
            analyser.connect(silentSink).connect(context.destination);
            record = { source, analyser, silentSink, stream, context };
            sourceNodes.set(audio, record);
        }
        return record.analyser;
    }

    function activateAudio(audio, meta = {}) {
        try {
            bindVisibilityLifecycle();
            if (!hasRenderableCanvas()) {
                state.live = false;
                state.lastError = '';
                return false;
            }
            const mergedMeta = { ...(audioMetadata.get(audio) || {}), ...(meta || {}) };
            const analyser = connectAudio(audio);
            if (!analyser) return false;
            state.analyser = analyser;
            state.data = new Uint8Array(analyser.frequencyBinCount);
            state.live = true;
            setStatus(`실시간 FFT 분석 중 · ${mergedMeta.label || audio.dataset.spectrumLabel || '재생 소스'}`, 'live');
            resumeContext(state.context).finally(() => startLoop());
            return true;
        } catch (error) {
            state.live = false;
            state.lastError = error?.message || String(error || 'spectrum error');
            setStatus('브라우저가 실시간 오디오 연결을 제한했습니다. 분석 FFT 프로필로 표시합니다.', 'fallback');
            drawStatic();
            return false;
        }
    }

    function stopLoopToStatic() {
        state.live = false;
        if (state.raf) {
            cancelFrame(state.raf);
            state.raf = 0;
        }
        drawStatic();
    }

    function startLoop() {
        if (state.raf) cancelFrame(state.raf);
        const tick = tickNow => {
            if (!state.live || !state.analyser || !state.data || !hasRenderableCanvas()) {
                state.raf = 0;
                return;
            }
            const elapsed = Number(tickNow || now()) - Number(state.lastFrameAt || 0);
            if (isDocumentHidden() && elapsed < 240) {
                state.raf = scheduleFrame(tick);
                return;
            }
            const values = profileFromAnalyser(state.analyser, state.data);
            state.lastLiveValues = values;
            state.lastFrameAt = Number(tickNow || now());
            drawEveryCanvas(values, { focusHz: state.track?.analysis?.targetDynamicFreq || state.track?.analysis?.harshPeakHz || 0 });
            state.raf = scheduleFrame(tick);
        };
        state.raf = scheduleFrame(tick);
    }

    function unregisterAudio(audio, reason = 'unregister') {
        if (!audio) return false;
        const handlers = audioBindings.get(audio);
        if (handlers) {
            Object.entries(handlers).forEach(([type, handler]) => {
                try { audio.removeEventListener?.(type, handler); } catch (error) {}
            });
        }
        audioBindings.delete(audio);

        const sourceRecord = sourceNodes.get(audio);
        const externalRecord = externalAnalyserNodes.get(audio);
        const activeAnalyser = state.analyser;
        const wasActive = Boolean(activeAnalyser && (activeAnalyser === sourceRecord?.analyser || activeAnalyser === externalRecord?.analyser));
        if (sourceRecord) disposeSourceRecord(audio, sourceRecord);
        externalAnalyserNodes.delete(audio);
        audioMetadata.delete(audio);
        const removed = registeredAudio.delete(audio);
        if (removed) state.disposedAudioCount += 1;

        if (audio.dataset) {
            delete audio.dataset.spectrumTrackId;
            delete audio.dataset.spectrumMode;
            delete audio.dataset.spectrumLabel;
            delete audio.dataset.spectrumBound;
        }

        if (wasActive && !state.disposing) {
            stopLoopToStatic();
            state.analyser = null;
            state.data = null;
            const next = getLikelyActiveAudio();
            if (next && next !== audio) activateAudio(next, { label: next.dataset?.spectrumLabel || '현재 재생' });
            else if (!registeredAudio.size) releaseOwnedContext(`spectrum-${reason}`);
        }
        return removed;
    }

    function pruneDisconnectedAudio() {
        const stale = Array.from(registeredAudio).filter(audio => !audio || audio.isConnected === false);
        stale.forEach(audio => unregisterAudio(audio, 'dom-detached'));
        state.prunedAudioCount += stale.length;
        return stale.length;
    }

    function handleVisibilityChange() {
        if (isDocumentHidden()) {
            if (state.raf) {
                cancelFrame(state.raf);
                state.raf = 0;
            }
            return;
        }
        pruneDisconnectedAudio();
        if (state.live && state.analyser && hasRenderableCanvas()) startLoop();
        else activateCurrentAudio();
    }

    function handlePageShow(event) {
        if (!event?.persisted) return;
        pruneDisconnectedAudio();
        activateCurrentAudio();
    }

    function handlePageHide(event) {
        if (event?.persisted) {
            if (state.raf) {
                cancelFrame(state.raf);
                state.raf = 0;
            }
            return;
        }
        dispose('pagehide');
    }

    function bindVisibilityLifecycle() {
        if (state.lifecycleBound || !global.document || typeof global.document.addEventListener !== 'function') return;
        state.lifecycleBound = true;
        global.document.addEventListener('visibilitychange', handleVisibilityChange);
        global.addEventListener?.('pageshow', handlePageShow);
        global.addEventListener?.('pagehide', handlePageHide);
        if (global.MutationObserver && global.document.documentElement) {
            state.lifecycleObserver = new global.MutationObserver(() => pruneDisconnectedAudio());
            state.lifecycleObserver.observe(global.document.documentElement, { childList: true, subtree: true });
        }
    }

    function registerAudio(audio, meta = {}) {
        if (!audio) return null;
        updateAudioMeta(audio, meta);
        if (registeredAudio.has(audio)) return audio;
        bindVisibilityLifecycle();
        const handlers = {
          play: () => activateAudio(audio),
          pause: () => {
            const active = getLikelyActiveAudio();
            if (state.live && (!active || active === audio)) stopLoopToStatic();
          },
          ended: stopLoopToStatic,
          emptied: () => unregisterAudio(audio, 'emptied'),
          error: () => {
            if (audio.isConnected === false) unregisterAudio(audio, 'error-detached');
          }
        };
        Object.entries(handlers).forEach(([type, handler]) => audio.addEventListener?.(type, handler));
        audioBindings.set(audio, handlers);
        registeredAudio.add(audio);
        if (audio.dataset) audio.dataset.spectrumBound = 'true';
        return audio;
    }

    function registerExternalAnalyser(audio, analyser, context, meta = {}) {
        if (!audio || !analyser) return null;
        updateAudioMeta(audio, meta);
        externalAnalyserNodes.set(audio, { analyser, context: context || null, meta: audioMetadata.get(audio) || {} });
        registerAudio(audio, meta);
        return analyser;
    }

    function getLikelyActiveAudio() {
        pruneDisconnectedAudio();
        if (typeof state.getActiveAudio === 'function') {
            const active = state.getActiveAudio();
            if (active) return active;
        }
        return Array.from(global.document?.querySelectorAll?.('audio') || []).find(audio => !audio.paused && !audio.ended) || null;
    }

    function activateCurrentAudio() {
        const active = getLikelyActiveAudio();
        if (!active) {
            drawStatic();
            return false;
        }
        return activateAudio(active, {
            label: active.dataset.spectrumLabel || active.getAttribute('aria-label') || '현재 재생'
        });
    }

    function renderPanel(options = {}) {
        const doc = options.document || global.document;
        const track = options.track || null;
        const panel = doc.createElement('section');
        panel.className = 'spectrum-visualizer-panel';
        panel.dataset.spectrumVisualizer = VISUALIZER_VERSION;

        const head = doc.createElement('div');
        head.className = 'spectrum-visualizer-head';
        const titleWrap = doc.createElement('div');
        const title = doc.createElement('strong');
        title.textContent = 'AI 스펙트럼 뷰';
        const subtitle = doc.createElement('small');
        subtitle.textContent = 'FFT 분석기가 보는 주파수 균형을 캔버스로 표시합니다.';
        titleWrap.append(title, subtitle);
        const badge = doc.createElement('span');
        badge.className = 'spectrum-visualizer-badge';
        badge.textContent = '20Hz-22kHz';
        head.append(titleWrap, badge);

        const canvas = doc.createElement('canvas');
        canvas.className = 'spectrum-visualizer-canvas';
        canvas.width = 640;
        canvas.height = 180;
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', 'AI FFT 주파수 스펙트럼 그래프');

        const axis = doc.createElement('div');
        axis.className = 'spectrum-visualizer-axis';
        AXIS_LABELS.forEach(label => {
            const item = doc.createElement('span');
            item.textContent = label;
            axis.appendChild(item);
        });

        const status = doc.createElement('p');
        status.className = 'spectrum-visualizer-status';
        const meta = doc.createElement('p');
        meta.className = 'spectrum-visualizer-meta';

        panel.append(head, canvas, axis, status, meta);

        state.canvas = canvas;
        state.statusNode = status;
        state.metaNode = meta;
        state.track = track;
        state.getActiveAudio = typeof options.getActiveAudio === 'function' ? options.getActiveAudio : null;
        bindVisibilityLifecycle();
        drawStatic(track);
        clearActivationTimer();
        state.activateTimer = global.setTimeout?.(() => {
            state.activateTimer = 0;
            if (state.canvas !== canvas || canvas.isConnected === false) return;
            activateCurrentAudio();
        }, 40) || 0;
        return panel;
    }

    function dispose(reason = 'dispose') {
        if (state.disposing) return false;
        state.disposing = true;
        clearActivationTimer();
        state.live = false;
        if (state.raf) {
            cancelFrame(state.raf);
            state.raf = 0;
        }
        Array.from(registeredAudio).forEach(audio => unregisterAudio(audio, reason));
        state.analyser = null;
        state.data = null;
        releaseOwnedContext(`spectrum-${reason}`);
        try { state.lifecycleObserver?.disconnect?.(); } catch (error) {}
        state.lifecycleObserver = null;
        if (state.lifecycleBound) {
            global.document?.removeEventListener?.('visibilitychange', handleVisibilityChange);
            global.removeEventListener?.('pageshow', handlePageShow);
            global.removeEventListener?.('pagehide', handlePageHide);
        }
        state.lifecycleBound = false;
        state.canvas = null;
        state.statusNode = null;
        state.metaNode = null;
        state.track = null;
        state.getActiveAudio = null;
        state.disposing = false;
        return true;
    }

    function getDiagnostics() {
        pruneDisconnectedCanvases();
        const prunedCount = pruneDisconnectedAudio();
        const active = getLikelyActiveAudio();
        return Object.freeze({
            version: VISUALIZER_VERSION,
            live: Boolean(state.live),
            hasAnalyser: Boolean(state.analyser),
            contextState: state.context?.state || '',
            hasPanelCanvas: Boolean(state.canvas && state.canvas.isConnected !== false),
            activeLabel: active?.dataset?.spectrumLabel || '',
            lastError: state.lastError || '',
            lastLiveValueCount: state.lastLiveValues.length,
            registeredAudioCount: registeredAudio.size,
            prunedCount,
            totalPrunedAudioCount: state.prunedAudioCount,
            disposedAudioCount: state.disposedAudioCount,
            lifecycleBound: state.lifecycleBound
        });
    }

    global.FoxBearSpectrumVisualizer = Object.freeze({
        version: VISUALIZER_VERSION,
        renderPanel,
        registerAudio,
        unregisterAudio,
        registerExternalAnalyser,
        pruneDisconnectedAudio,
        activateCurrentAudio,
        drawStatic,
        dispose,
        getDiagnostics
    });
})(window);
