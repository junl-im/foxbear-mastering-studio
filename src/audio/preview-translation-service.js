// FoxBear preview translation service - persistent WebAudio routing with click-free mode changes.
(function attachFoxBearPreviewTranslationService(global) {
    'use strict';

    const SERVICE_VERSION = '1.6.65-firestore-write-fencing';
    const MODES = Object.freeze(['studio', 'phone', 'laptop', 'mono']);
    const DEFAULT_FADE_MS = 120;
    const CLEANUP_GRACE_MS = 48;
    const MODE_LEVELS = Object.freeze({ studio: 1, phone: 0.92, laptop: 0.96, mono: 0.96 });
    const activeControllers = new Set();
    let lifecycleObserver = null;

    function getContextManager() {
        return global.FoxBearAudioContextManager || global.FoxBearAudioContexts || null;
    }

    function closeManagedContext(context, reason = 'preview-translation-close') {
        if (!context || context.state === 'closed') return Promise.resolve(true);
        const manager = getContextManager();
        if (manager && typeof manager.close === 'function') return Promise.resolve(manager.close(context, reason));
        if (typeof context.close === 'function') return Promise.resolve(context.close()).then(() => true).catch(() => false);
        return Promise.resolve(false);
    }

    function pruneDisconnected() {
        let count = 0;
        Array.from(activeControllers).forEach(controller => {
            if (controller.audio?.isConnected !== false) return;
            controller.close('dom-detached');
            count += 1;
        });
        return count;
    }

    function installDomLifecycleAudit(root = global.document) {
        if (lifecycleObserver || !root || typeof global.MutationObserver !== 'function') return false;
        const target = root.documentElement || root.body || root;
        if (!target || typeof target.nodeType !== 'number') return false;
        lifecycleObserver = new global.MutationObserver(() => { pruneDisconnected(); });
        lifecycleObserver.observe(target, { childList: true, subtree: true });
        return true;
    }

    function normalizeMode(mode) {
        return MODES.includes(String(mode || '')) ? String(mode) : 'studio';
    }

    function createFilterChain(context, modeId) {
        const highPass = context.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = modeId === 'phone' ? 170 : (modeId === 'laptop' ? 105 : 55);
        highPass.Q.value = modeId === 'phone' ? 0.78 : 0.65;
        const lowShelf = context.createBiquadFilter();
        lowShelf.type = 'lowshelf';
        lowShelf.frequency.value = modeId === 'phone' ? 310 : (modeId === 'laptop' ? 180 : 130);
        lowShelf.gain.value = modeId === 'phone' ? -9 : (modeId === 'laptop' ? -5.5 : -1.2);
        const bodyCut = context.createBiquadFilter();
        bodyCut.type = 'peaking';
        bodyCut.frequency.value = modeId === 'phone' ? 430 : (modeId === 'laptop' ? 360 : 260);
        bodyCut.Q.value = modeId === 'phone' ? 1.05 : 0.82;
        bodyCut.gain.value = modeId === 'phone' ? -3.2 : (modeId === 'laptop' ? -1.6 : -0.6);
        const presence = context.createBiquadFilter();
        presence.type = 'peaking';
        presence.frequency.value = modeId === 'phone' ? 3300 : (modeId === 'laptop' ? 2900 : 2500);
        presence.Q.value = modeId === 'phone' ? 1.28 : 0.95;
        presence.gain.value = modeId === 'phone' ? 2.6 : (modeId === 'laptop' ? 1.2 : 0);
        const harsh = context.createBiquadFilter();
        harsh.type = 'peaking';
        harsh.frequency.value = modeId === 'phone' ? 4700 : 5200;
        harsh.Q.value = 1.15;
        harsh.gain.value = modeId === 'phone' ? 1.1 : (modeId === 'laptop' ? 0.6 : 0);
        const lowPass = context.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.value = modeId === 'phone' ? 7200 : (modeId === 'laptop' ? 11800 : 18000);
        lowPass.Q.value = modeId === 'phone' ? 0.62 : 0.55;
        const nodes = [highPass, lowShelf, bodyCut, presence, harsh, lowPass];
        nodes.slice(1).forEach((node, index) => nodes[index].connect(node));
        return nodes;
    }

    function connectMonoMatrix(context, source, firstNode) {
        const splitter = context.createChannelSplitter(2);
        const merger = context.createChannelMerger(2);
        const gains = Array.from({ length: 4 }, () => context.createGain());
        gains.forEach(gain => { gain.gain.value = 0.5; });
        source.connect(splitter);
        splitter.connect(gains[0], 0); gains[0].connect(merger, 0, 0);
        splitter.connect(gains[1], 1); gains[1].connect(merger, 0, 0);
        splitter.connect(gains[2], 0); gains[2].connect(merger, 0, 1);
        splitter.connect(gains[3], 1); gains[3].connect(merger, 0, 1);
        merger.connect(firstNode);
        const nodes = [splitter, merger, ...gains];
        nodes.entryNode = splitter;
        nodes.nodes = nodes;
        return nodes;
    }

    function setParamSmooth(param, value, context, durationMs) {
        if (!param) return;
        const now = Number(context.currentTime || 0);
        const end = now + Math.max(0.024, Number(durationMs || DEFAULT_FADE_MS) / 1000);
        const current = Number.isFinite(Number(param.value)) ? Number(param.value) : 0;
        try {
            if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
            else { param.cancelScheduledValues(now); param.setValueAtTime(current, now); }
            param.linearRampToValueAtTime(Number(value), end);
        } catch (error) {
            param.value = Number(value);
        }
    }

    function attach(audio, options = {}) {
        if (!audio) return null;
        if (audio._foxbearTranslationController && !audio._foxbearTranslationController.closed) {
            return audio._foxbearTranslationController;
        }
        const createContext = options.createContext;
        if (typeof createContext !== 'function') return null;
        const context = createContext();
        const source = context.createMediaElementSource(audio);
        const masterGain = context.createGain();
        masterGain.gain.value = 1;
        const analyser = typeof options.createAnalyser === 'function' ? options.createAnalyser(context) : null;
        if (analyser) masterGain.connect(analyser).connect(context.destination);
        else masterGain.connect(context.destination);

        const persistent = options.persistent !== false;
        const initialMode = normalizeMode(options.mode);
        const paths = {};
        let currentMode = initialMode;
        let closed = false;
        let cleanupTimer = null;
        let switchRevision = 0;

        const buildPath = (modeId, initialGain = 0) => {
            if (paths[modeId]) return paths[modeId];
            const gain = context.createGain();
            gain.gain.value = Number(initialGain || 0);
            const nodes = [gain];
            let entryNode = gain;
            if (modeId === 'studio') source.connect(gain);
            else {
                const filters = createFilterChain(context, modeId);
                entryNode = filters[0];
                if (modeId === 'mono') {
                    const matrix = connectMonoMatrix(context, source, filters[0]);
                    entryNode = matrix.entryNode || matrix[0];
                    nodes.push(...(matrix.nodes || matrix));
                } else source.connect(filters[0]);
                filters[filters.length - 1].connect(gain);
                nodes.push(...filters);
            }
            gain.connect(masterGain);
            const path = { modeId, gain, entryNode, nodes };
            paths[modeId] = path;
            return path;
        };

        const disconnectPath = modeId => {
            const path = paths[modeId];
            if (!path) return;
            try { source.disconnect(path.entryNode); } catch (error) {}
            path.nodes.forEach(node => { try { node.disconnect(); } catch (error) {} });
            delete paths[modeId];
        };

        buildPath(initialMode, MODE_LEVELS[initialMode]);

        const resume = () => {
            if (closed || context.state === 'running' || context.state === 'closed') return Promise.resolve(context.state === 'running');
            const manager = getContextManager();
            return Promise.resolve(manager?.resume?.(context, 'preview-translation-switch') || context.resume?.()).then(() => true).catch(() => false);
        };

        const scheduleCleanup = durationMs => {
            const revision = ++switchRevision;
            if (cleanupTimer) clearTimeout(cleanupTimer);
            cleanupTimer = setTimeout(() => {
                cleanupTimer = null;
                if (closed || revision !== switchRevision) return;
                Object.keys(paths).forEach(modeId => {
                    if (modeId !== currentMode) disconnectPath(modeId);
                });
            }, Math.max(24, Number(durationMs || DEFAULT_FADE_MS)) + CLEANUP_GRACE_MS);
        };

        const setMode = (mode, setOptions = {}) => {
            if (closed) return false;
            const target = normalizeMode(mode);
            if (!persistent && !paths[target]) return false;
            const durationMs = Math.max(24, Number(setOptions.fadeMs || DEFAULT_FADE_MS));
            buildPath(target, target === currentMode ? MODE_LEVELS[target] : 0);
            Object.keys(paths).forEach(modeId => {
                setParamSmooth(paths[modeId].gain.gain, modeId === target ? MODE_LEVELS[modeId] : 0, context, durationMs);
            });
            currentMode = target;
            audio.dataset.previewTranslationMode = target;
            scheduleCleanup(durationMs);
            if (!audio.paused && !audio.ended) resume();
            return true;
        };

        let controller = null;
        const onPlay = () => { resume(); };
        const onTerminal = () => { controller?.close(); };
        const close = (reason = 'preview-translation-close') => {
            if (closed) return;
            closed = true;
            switchRevision += 1;
            if (cleanupTimer) clearTimeout(cleanupTimer);
            cleanupTimer = null;
            audio.removeEventListener?.('play', onPlay);
            audio.removeEventListener?.('emptied', onTerminal);
            audio.removeEventListener?.('error', onTerminal);
            Object.keys(paths).forEach(disconnectPath);
            try { source.disconnect(); } catch (error) {}
            try { masterGain.disconnect(); } catch (error) {}
            try { analyser?.disconnect?.(); } catch (error) {}
            if (audio._foxbearTranslationController === controller) audio._foxbearTranslationController = null;
            if (audio._foxbearTranslationContext === context) audio._foxbearTranslationContext = null;
            activeControllers.delete(controller);
            closeManagedContext(context, reason);
        };
        controller = {
            version: SERVICE_VERSION,
            audio,
            context,
            analyser,
            paths,
            get mode() { return currentMode; },
            get closed() { return closed; },
            setMode,
            resume,
            close,
            getSnapshot: () => Object.freeze({
                mode: currentMode,
                closed,
                contextState: context.state,
                pathCount: Object.keys(paths).length,
                persistent
            })
        };
        audio.dataset.previewTranslationMode = initialMode;
        audio._foxbearTranslationContext = context;
        audio._foxbearTranslationController = controller;
        activeControllers.add(controller);
        installDomLifecycleAudit();
        audio.addEventListener('play', onPlay);
        audio.addEventListener('emptied', onTerminal, { once: true });
        audio.addEventListener('error', onTerminal, { once: true });
        return controller;
    }

    global.FoxBearPreviewTranslationService = Object.freeze({
        version: SERVICE_VERSION,
        modes: MODES,
        DEFAULT_FADE_MS,
        modeLevels: MODE_LEVELS,
        normalizeMode,
        createFilterChain,
        connectMonoMatrix,
        attach,
        pruneDisconnected,
        installDomLifecycleAudit,
        getDiagnostics: () => Object.freeze({
            version: SERVICE_VERSION,
            activeCount: activeControllers.size,
            connectedCount: Array.from(activeControllers).filter(controller => controller.audio?.isConnected !== false).length,
            contexts: Object.freeze(Array.from(activeControllers).map(controller => controller.getSnapshot()))
        })
    });
})(window);
