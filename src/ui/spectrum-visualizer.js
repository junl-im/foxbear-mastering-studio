// FoxBear spectrum visualizer module - v1.4.2
// Shows the same FFT evidence used by the AI analysis as a compact realtime/static canvas.
(function initFoxBearSpectrumVisualizer(global) {
    'use strict';

    const VISUALIZER_VERSION = '1.4.2-crossfade-zoom-spectrum';
    const PROFILE_RANGES = Object.freeze([
        [20, 32], [32, 45], [45, 63], [63, 90], [90, 125], [125, 180],
        [180, 250], [250, 355], [355, 500], [500, 710], [710, 1000], [1000, 1400],
        [1400, 2000], [2000, 2800], [2800, 4000], [4000, 5600], [5600, 7100], [7100, 9000],
        [9000, 11200], [11200, 14000], [14000, 16000], [16000, 18000], [18000, 20000], [20000, 22000]
    ]);
    const AXIS_LABELS = Object.freeze(['20Hz', '100', '1k', '10k', '22k']);
    const sourceNodes = new WeakMap();
    const registeredAudio = new WeakSet();
    const state = {
        context: null,
        analyser: null,
        data: null,
        canvas: null,
        miniCanvases: new Set(),
        statusNode: null,
        metaNode: null,
        track: null,
        getActiveAudio: null,
        raf: 0,
        live: false,
        lastError: ''
    };

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

    function pruneMiniCanvases() {
        if (!state.miniCanvases || typeof state.miniCanvases.forEach !== 'function') return;
        state.miniCanvases.forEach(canvas => {
            if (!canvas || !canvas.isConnected) state.miniCanvases.delete(canvas);
        });
    }

    function drawEveryCanvas(values, options = {}) {
        drawBars(state.canvas, values, options);
        pruneMiniCanvases();
        state.miniCanvases.forEach(canvas => drawBars(canvas, values, { ...options, mini: true }));
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

    function ensureContext() {
        const AudioContextClass = global.AudioContext || global.webkitAudioContext;
        if (!AudioContextClass) throw new Error('Web Audio API 미지원');
        if (!state.context || state.context.state === 'closed') state.context = new AudioContextClass();
        if (state.context.state === 'suspended' && typeof state.context.resume === 'function') {
            state.context.resume().catch(() => undefined);
        }
        return state.context;
    }

    function connectAudio(audio) {
        if (!audio) return null;
        const context = ensureContext();
        let record = sourceNodes.get(audio);
        if (!record) {
            const source = context.createMediaElementSource(audio);
            const analyser = context.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.82;
            source.connect(analyser);
            analyser.connect(context.destination);
            record = { source, analyser };
            sourceNodes.set(audio, record);
        }
        return record.analyser;
    }

    function activateAudio(audio, meta = {}) {
        try {
            const analyser = connectAudio(audio);
            if (!analyser) return false;
            state.analyser = analyser;
            state.data = new Uint8Array(analyser.frequencyBinCount);
            state.live = true;
            setStatus(`실시간 FFT 분석 중 · ${meta.label || audio.dataset.spectrumLabel || '재생 소스'}`, 'live');
            startLoop();
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
            global.cancelAnimationFrame(state.raf);
            state.raf = 0;
        }
        drawStatic();
    }

    function startLoop() {
        if (state.raf) global.cancelAnimationFrame(state.raf);
        const tick = () => {
            if (!state.live || !state.analyser || !state.data || !state.canvas) {
                state.raf = 0;
                return;
            }
            const values = profileFromAnalyser(state.analyser, state.data);
            drawEveryCanvas(values, { focusHz: state.track?.analysis?.targetDynamicFreq || state.track?.analysis?.harshPeakHz || 0 });
            state.raf = global.requestAnimationFrame(tick);
        };
        state.raf = global.requestAnimationFrame(tick);
    }

    function registerAudio(audio, meta = {}) {
        if (!audio || registeredAudio.has(audio)) return audio || null;
        registeredAudio.add(audio);
        if (meta.trackId) audio.dataset.spectrumTrackId = String(meta.trackId);
        if (meta.mode) audio.dataset.spectrumMode = String(meta.mode);
        if (meta.label) audio.dataset.spectrumLabel = String(meta.label);
        audio.addEventListener('play', () => activateAudio(audio, meta));
        audio.addEventListener('pause', () => {
            const active = getLikelyActiveAudio();
            if (state.live && (!active || active === audio)) stopLoopToStatic();
        });
        audio.addEventListener('ended', stopLoopToStatic);
        return audio;
    }

    function getLikelyActiveAudio() {
        if (typeof state.getActiveAudio === 'function') {
            const active = state.getActiveAudio();
            if (active) return active;
        }
        return Array.from(document.querySelectorAll('audio')).find(audio => !audio.paused && !audio.ended) || null;
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
        drawStatic(track);
        setTimeout(activateCurrentAudio, 40);
        return panel;
    }

    function renderMini(options = {}) {
        const doc = options.document || global.document;
        const track = options.track || state.track || null;
        const shell = doc.createElement('div');
        shell.className = 'spectrum-mini-panel';
        shell.dataset.spectrumMini = VISUALIZER_VERSION;
        shell.dataset.spectrumMode = options.mode || '';
        const label = doc.createElement('span');
        label.className = 'spectrum-mini-label';
        label.textContent = 'FFT';
        const canvas = doc.createElement('canvas');
        canvas.className = 'spectrum-mini-canvas';
        canvas.width = 220;
        canvas.height = 48;
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', 'Dock mini realtime spectrum');
        const badge = doc.createElement('span');
        badge.className = 'spectrum-mini-badge';
        badge.textContent = options.mode === 'mastered' ? 'B' : (options.mode === 'masterPreview' ? 'H' : 'A');
        shell.append(label, canvas, badge);
        state.track = track;
        state.getActiveAudio = typeof options.getActiveAudio === 'function' ? options.getActiveAudio : state.getActiveAudio;
        state.miniCanvases.add(canvas);
        drawStatic(track);
        setTimeout(activateCurrentAudio, 40);
        return shell;
    }

    global.FoxBearSpectrumVisualizer = Object.freeze({
        version: VISUALIZER_VERSION,
        renderPanel,
        renderMini,
        registerAudio,
        activateCurrentAudio,
        drawStatic
    });
})(window);
