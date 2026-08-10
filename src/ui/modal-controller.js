// FoxBear Modal State Machine Controller v1.6.85
'use strict';

(function exposeFoxBearModalStateMachine(global) {
    const openLayers = new Set();
    const layerStack = [];
    const layerOptions = new WeakMap();
    const FOCUSABLE_SELECTOR = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
    ].join(',');
    const PANEL_SELECTOR = [
        '[data-foxbear-overlay-panel]',
        '.feature-dialog-panel',
        '.preview-dialog-panel',
        '.program-info-panel',
        '.support-settings-panel',
        '.foxbear-perf-panel',
        '.select-popup-panel',
        '.ai-recommend-dialog-panel',
        '.download-options-panel',
        '.admin-dialog-panel',
        '[role="document"]'
    ].join(',');
    let scrollLockSnapshot = null;
    let viewportListenersInstalled = false;
    let historyListenersInstalled = false;
    let historySentinelActive = false;
    let historyReleaseInFlight = false;
    let historyReleaseStalled = false;
    let historyReleaseTimer = 0;
    let historyReleaseEpoch = 0;
    let historyGenerationCounter = 0;
    let historySentinelGeneration = 0;
    let historyReleaseGeneration = 0;
    let historyReleaseSuspended = false;
    let historyPopHandling = false;
    const pendingHistoryReleaseGenerations = new Map();
    const HISTORY_SENTINEL_KEY = '__foxbearOverlaySentinel';
    const HISTORY_SENTINEL_GENERATION_KEY = '__foxbearOverlaySentinelGeneration';
    const HISTORY_BASE_GENERATION_KEY = '__foxbearOverlayBaseGeneration';
    const HISTORY_RELEASE_WATCHDOG_MS = 1500;
    const HISTORY_RELEASE_HARD_STALL_RECOVERY_MS = 30000;
    const HISTORY_RELEASE_GENERATION_TTL_MS = 30000;
    const HISTORY_TERMINAL_RELEASE_GRACE_MS = 500;
    const HISTORY_PENDING_RELEASE_LIMIT = 8;
    const historyDiagnostics = {
        sentinelPushCount: 0,
        releaseRequestCount: 0,
        coalescedReleaseCount: 0,
        internalReleasePopCount: 0,
        releaseRearmCount: 0,
        releaseWatchdogCount: 0,
        userBackCloseCount: 0,
        passThroughPopCount: 0,
        staleSentinelResetCount: 0,
        releaseGenerationMismatchCount: 0,
        staleInternalReleasePopCount: 0,
        releaseSuspendCount: 0,
        releaseResumeCount: 0,
        releaseRecoveredCount: 0,
        releaseWatchdogRecoveredCount: 0,
        releaseHardStallCount: 0,
        releaseHardStallRecoveredCount: 0,
        releaseHardStallRetainedSentinelCount: 0,
        releaseTerminalGraceCount: 0,
        releasePageUnloadResetCount: 0,
        pendingReleaseTrimCount: 0,
        lastTransition: 'boot'
    };

    function setHistoryTransition(transition) {
        historyDiagnostics.lastTransition = String(transition || 'unknown').slice(0, 48);
    }

    function clearHistoryReleaseTimer() {
        if (!historyReleaseTimer) return;
        try { global.clearTimeout?.(historyReleaseTimer); } catch (_) {}
        historyReleaseTimer = 0;
    }

    function readHistoryGeneration(value) {
        const generation = Number(value || 0);
        return Number.isSafeInteger(generation) && generation > 0 ? generation : 0;
    }

    function getHistoryState(event = null) {
        const state = event && typeof event.state === 'object' ? event.state : global.history?.state;
        return state && typeof state === 'object' ? state : {};
    }

    function getSentinelGeneration(state = global.history?.state) {
        if (!state || state[HISTORY_SENTINEL_KEY] !== true) return 0;
        return readHistoryGeneration(state[HISTORY_SENTINEL_GENERATION_KEY]);
    }

    function getBaseGeneration(state = global.history?.state) {
        if (!state || state[HISTORY_SENTINEL_KEY] === true) return 0;
        return readHistoryGeneration(state[HISTORY_BASE_GENERATION_KEY]);
    }

    function hasCurrentHistorySentinel() {
        return Boolean(global.history?.state?.[HISTORY_SENTINEL_KEY]);
    }

    function prunePendingHistoryReleaseGenerations(now = Date.now()) {
        for (const [generation, expiresAt] of pendingHistoryReleaseGenerations.entries()) {
            if (Number(expiresAt || 0) <= now) pendingHistoryReleaseGenerations.delete(generation);
        }
    }

    function rememberPendingHistoryRelease(generation, ttlMs = HISTORY_RELEASE_GENERATION_TTL_MS) {
        if (!generation) return;
        prunePendingHistoryReleaseGenerations();
        const ttl = Math.max(50, Number(ttlMs) || HISTORY_RELEASE_GENERATION_TTL_MS);
        pendingHistoryReleaseGenerations.set(generation, Date.now() + ttl);
        while (pendingHistoryReleaseGenerations.size > HISTORY_PENDING_RELEASE_LIMIT) {
            const oldest = pendingHistoryReleaseGenerations.keys().next().value;
            pendingHistoryReleaseGenerations.delete(oldest);
            historyDiagnostics.pendingReleaseTrimCount += 1;
        }
    }

    function forgetPendingHistoryRelease(generation) {
        if (generation) pendingHistoryReleaseGenerations.delete(generation);
    }

    function isInternalHistoryReleaseEvent(event) {
        const generation = getBaseGeneration(getHistoryState(event));
        if (!generation) return historyReleaseInFlight && historyReleaseGeneration === 0;
        prunePendingHistoryReleaseGenerations();
        return generation === historyReleaseGeneration || pendingHistoryReleaseGenerations.has(generation);
    }

    function getHistoryDiagnostics() {
        prunePendingHistoryReleaseGenerations();
        return Object.freeze({
            version: '1.6.85-browser-sentinel-ui-mode-header-recovery',
            sentinelActive: historySentinelActive,
            sentinelGeneration: historySentinelGeneration,
            releaseInFlight: historyReleaseInFlight,
            releaseGeneration: historyReleaseGeneration,
            releaseSuspended: historyReleaseSuspended,
            releaseStalled: historyReleaseStalled,
            pendingReleaseGenerationCount: pendingHistoryReleaseGenerations.size,
            eligibleLayerCount: historyEligibleLayers().length,
            ...historyDiagnostics
        });
    }

    function isElement(value) {
        return Boolean(value && typeof value === 'object' && value.nodeType === 1);
    }

    function stopEvent(event) {
        if (!event) return;
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }

    function getDocument(dialog = null) {
        return dialog?.ownerDocument || global.document || null;
    }

    function isFocusCandidateAvailable(element, boundary) {
        if (!isElement(element) || element.disabled) return false;
        if (element.getAttribute?.('aria-disabled') === 'true' || element.getAttribute?.('tabindex') === '-1') return false;
        let current = element;
        while (isElement(current)) {
            if (current.hidden || current.inert === true || current.getAttribute?.('aria-hidden') === 'true' || current.hasAttribute?.('inert')) return false;
            if (typeof global.getComputedStyle === 'function') {
                try {
                    const style = global.getComputedStyle(current);
                    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || style.contentVisibility === 'hidden') return false;
                } catch (_) {}
            }
            if (current === boundary) break;
            current = current.parentElement;
        }
        return true;
    }

    function getFocusable(dialog) {
        if (!isElement(dialog) || typeof dialog.querySelectorAll !== 'function') return [];
        return Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter(element => isFocusCandidateAvailable(element, dialog));
    }

    function focusFirst(dialog) {
        const candidates = getFocusable(dialog);
        const panel = dialog?.querySelector?.(`[tabindex="-1"], [tabindex], ${PANEL_SELECTOR}`);
        const target = candidates[0] || panel || dialog;
        if (target && typeof target.focus === 'function') {
            try { target.focus({ preventScroll: true }); } catch (_) {}
        }
        return target || null;
    }

    function getVisualViewportRect() {
        const viewport = global.visualViewport;
        const doc = global.document;
        const width = Math.max(1, Number(viewport?.width || global.innerWidth || doc?.documentElement?.clientWidth || 1));
        const height = Math.max(1, Number(viewport?.height || global.innerHeight || doc?.documentElement?.clientHeight || 1));
        return {
            top: Math.max(0, Number(viewport?.offsetTop || 0)),
            left: Math.max(0, Number(viewport?.offsetLeft || 0)),
            width,
            height
        };
    }

    function syncVisualViewport() {
        const doc = global.document;
        const root = doc?.documentElement;
        if (!root?.style || typeof root.style.setProperty !== 'function') return;
        const viewport = getVisualViewportRect();
        root.style.setProperty('--foxbear-visual-viewport-top', `${viewport.top}px`);
        root.style.setProperty('--foxbear-visual-viewport-left', `${viewport.left}px`);
        root.style.setProperty('--foxbear-visual-viewport-width', `${viewport.width}px`);
        root.style.setProperty('--foxbear-visual-viewport-height', `${viewport.height}px`);
        layerStack.forEach(layer => {
            if (!isElement(layer) || !layer.isConnected) return;
            const options = layerOptions.get(layer) || {};
            if (typeof options.onViewportChange === 'function') {
                try { options.onViewportChange(viewport, layer); } catch (_) {}
            }
        });
    }

    function installViewportListeners() {
        if (viewportListenersInstalled) return;
        viewportListenersInstalled = true;
        global.addEventListener?.('resize', syncVisualViewport, { passive: true });
        global.addEventListener?.('orientationchange', syncVisualViewport, { passive: true });
        global.visualViewport?.addEventListener?.('resize', syncVisualViewport, { passive: true });
        global.visualViewport?.addEventListener?.('scroll', syncVisualViewport, { passive: true });
        syncVisualViewport();
    }

    function lockDocument(doc) {
        if (!doc?.body || scrollLockSnapshot) return;
        const body = doc.body;
        const root = doc.documentElement;
        const scrollY = Number(global.scrollY || root?.scrollTop || body.scrollTop || 0);
        scrollLockSnapshot = {
            body,
            root,
            scrollY,
            bodyPosition: body.style.position,
            bodyTop: body.style.top,
            bodyLeft: body.style.left,
            bodyRight: body.style.right,
            bodyWidth: body.style.width,
            bodyOverflow: body.style.overflow,
            bodyTouchAction: body.style.touchAction,
            rootOverflow: root?.style?.overflow || ''
        };
        body.dataset.foxbearModalScrollY = String(scrollY);
        body.style.position = 'fixed';
        body.style.top = `${-scrollY}px`;
        body.style.left = '0';
        body.style.right = '0';
        body.style.width = '100%';
        body.style.overflow = 'hidden';
        body.style.touchAction = 'none';
        if (root?.style) root.style.overflow = 'hidden';
        body.classList.add('foxbear-modal-layer-open');
    }

    function unlockDocument() {
        if (!scrollLockSnapshot) return;
        const snapshot = scrollLockSnapshot;
        scrollLockSnapshot = null;
        const { body, root, scrollY } = snapshot;
        if (body?.style) {
            body.style.position = snapshot.bodyPosition;
            body.style.top = snapshot.bodyTop;
            body.style.left = snapshot.bodyLeft;
            body.style.right = snapshot.bodyRight;
            body.style.width = snapshot.bodyWidth;
            body.style.overflow = snapshot.bodyOverflow;
            body.style.touchAction = snapshot.bodyTouchAction;
            body.classList.remove('foxbear-modal-layer-open');
            delete body.dataset.foxbearModalScrollY;
        }
        if (root?.style) root.style.overflow = snapshot.rootOverflow;
        if (typeof global.scrollTo === 'function') {
            try { global.scrollTo({ top: scrollY, left: 0, behavior: 'auto' }); }
            catch (_) { try { global.scrollTo(0, scrollY); } catch (_) {} }
        }
    }

    function shouldLockDocument() {
        return layerStack.some(layer => (layerOptions.get(layer) || {}).lockScroll !== false);
    }

    function syncDocumentLock(dialog = null) {
        if (shouldLockDocument()) lockDocument(getDocument(dialog));
        else unlockDocument();
    }

    function inferLayerMode(layer, options = {}) {
        if (options.mode) return options.mode;
        const names = Array.from(layer.classList || []).join(' ');
        if (/backdrop|overlay|modal-layer/i.test(names) || layer.getAttribute('aria-modal') === 'true') return 'dialog';
        return 'floating';
    }

    function resolveLayerPanel(layer, options = {}) {
        if (isElement(options.panel)) return options.panel;
        if (typeof options.panel === 'string') return layer.querySelector?.(options.panel) || null;
        if (layer.matches?.(PANEL_SELECTOR)) return layer;
        return layer.querySelector?.(PANEL_SELECTOR) || layer.firstElementChild || null;
    }

    function updateLayerDepths() {
        layerStack.forEach((layer, index) => {
            if (!isElement(layer)) return;
            layer.dataset.foxbearOverlayDepth = String(index + 1);
            const overlayZ = String(30000 + (index * 80));
            if (typeof layer.style?.setProperty === 'function') layer.style.setProperty('--foxbear-overlay-z', overlayZ);
            else if (layer.style) layer.style['--foxbear-overlay-z'] = overlayZ;
        });
    }

    function findContainingLayer(element, exclude = null) {
        if (!isElement(element)) return null;
        for (let index = layerStack.length - 1; index >= 0; index -= 1) {
            const layer = layerStack[index];
            if (!isElement(layer) || layer === exclude || !layer.isConnected || layer.hidden) continue;
            if (layer === element || layer.contains?.(element)) return layer;
        }
        return null;
    }

    function hasOpenChildLayer(parentLayer) {
        return layerStack.some(layer => {
            if (!isElement(layer) || layer === parentLayer || layer.hidden || !layer.isConnected) return false;
            return (layerOptions.get(layer) || {}).parentLayer === parentLayer;
        });
    }

    function setLayerSuspended(layer, suspended) {
        if (!isElement(layer)) return;
        if (suspended) {
            layer.dataset.foxbearOverlaySuspended = 'true';
            if ('inert' in layer) layer.inert = true;
        } else {
            delete layer.dataset.foxbearOverlaySuspended;
            if ('inert' in layer) layer.inert = false;
        }
    }

    function historyEligibleLayers() {
        return layerStack.filter(layer => {
            const options = layerOptions.get(layer) || {};
            return isElement(layer) && layer.isConnected && !layer.hidden && options.history !== false && options.mode === 'dialog';
        });
    }

    function resetActiveHistoryRelease({ forgetGeneration = false } = {}) {
        const generation = historyReleaseGeneration;
        clearHistoryReleaseTimer();
        historyReleaseInFlight = false;
        historyReleaseSuspended = false;
        historyReleaseStalled = false;
        historyReleaseGeneration = 0;
        if (forgetGeneration) forgetPendingHistoryRelease(generation);
        return generation;
    }

    function settleInternalHistoryRelease(event, generation, { recovered = false, stale = false, watchdog = false } = {}) {
        try { event.foxbearOverlayHandled = true; } catch (_) {}
        try { event.foxbearOverlayHistorySource = stale ? 'stale-internal-release' : 'internal-release'; } catch (_) {}
        if (generation === historyReleaseGeneration) resetActiveHistoryRelease({ forgetGeneration: true });
        else forgetPendingHistoryRelease(generation);
        historySentinelActive = false;
        historySentinelGeneration = 0;
        historyDiagnostics.internalReleasePopCount += 1;
        if (stale) historyDiagnostics.staleInternalReleasePopCount += 1;
        if (recovered) historyDiagnostics.releaseRecoveredCount += 1;
        if (watchdog) historyDiagnostics.releaseWatchdogRecoveredCount += 1;
        setHistoryTransition(watchdog
            ? 'release-recovered-watchdog'
            : (recovered ? 'release-recovered-pageshow' : (stale ? 'stale-internal-release-popstate' : 'internal-release-popstate')));
        if (historyEligibleLayers().length) {
            historyDiagnostics.releaseRearmCount += 1;
            ensureHistorySentinel();
        }
    }

    function abandonMismatchedHistoryRelease() {
        if (!historyReleaseInFlight) return;
        clearHistoryReleaseTimer();
        historyReleaseInFlight = false;
        historyReleaseSuspended = false;
        historyReleaseStalled = false;
        historyReleaseGeneration = 0;
        historyDiagnostics.releaseGenerationMismatchCount += 1;
        setHistoryTransition('release-generation-mismatch');
    }

    function scheduleHistoryReleaseWatchdog(releaseEpoch, delayMs = HISTORY_RELEASE_WATCHDOG_MS, terminal = false) {
        clearHistoryReleaseTimer();
        historyReleaseTimer = global.setTimeout?.(() => {
            if (terminal) reconcileTerminalHistoryRelease(releaseEpoch);
            else reconcileHistoryReleaseWatchdog(releaseEpoch);
        }, Math.max(250, Number(delayMs) || HISTORY_RELEASE_WATCHDOG_MS)) || 0;
        return historyReleaseTimer;
    }

    function recoverHardStalledSentinel(expectedGeneration) {
        const layers = historyEligibleLayers();
        resetActiveHistoryRelease();
        rememberPendingHistoryRelease(expectedGeneration, HISTORY_TERMINAL_RELEASE_GRACE_MS);
        historyDiagnostics.releaseTerminalGraceCount += 1;
        if (layers.length) {
            historySentinelActive = true;
            historySentinelGeneration = expectedGeneration;
            historyDiagnostics.releaseHardStallRetainedSentinelCount += 1;
            setHistoryTransition('release-hard-stall-retained-sentinel');
            return true;
        }
        const currentState = getHistoryState();
        const nextState = { ...currentState, [HISTORY_BASE_GENERATION_KEY]: expectedGeneration };
        delete nextState[HISTORY_SENTINEL_KEY];
        delete nextState[HISTORY_SENTINEL_GENERATION_KEY];
        try { global.history?.replaceState?.(nextState, '', global.location?.href); } catch (_) {}
        historySentinelActive = false;
        historySentinelGeneration = 0;
        setHistoryTransition('release-hard-stall-neutralized');
        return true;
    }

    function reconcileTerminalHistoryRelease(releaseEpoch) {
        if (!historyReleaseInFlight || historyReleaseSuspended || releaseEpoch !== historyReleaseEpoch) return;
        historyReleaseTimer = 0;
        const expectedGeneration = historyReleaseGeneration;
        const currentState = getHistoryState();
        const currentBaseGeneration = getBaseGeneration(currentState);
        const currentSentinelGeneration = getSentinelGeneration(currentState);
        if (expectedGeneration && currentBaseGeneration === expectedGeneration) {
            settleInternalHistoryRelease({}, expectedGeneration, { recovered: true, watchdog: true });
            return;
        }
        if (expectedGeneration && currentSentinelGeneration === expectedGeneration) {
            historyDiagnostics.releaseHardStallRecoveredCount += 1;
            recoverHardStalledSentinel(expectedGeneration);
            return;
        }
        abandonMismatchedHistoryRelease();
        historySentinelActive = Boolean(currentSentinelGeneration);
        historySentinelGeneration = currentSentinelGeneration;
        if (historyEligibleLayers().length && !historySentinelActive) ensureHistorySentinel();
    }

    function reconcileHistoryReleaseWatchdog(releaseEpoch) {
        if (!historyReleaseInFlight || historyReleaseSuspended || releaseEpoch !== historyReleaseEpoch) return;
        historyReleaseTimer = 0;
        const expectedGeneration = historyReleaseGeneration;
        const currentState = getHistoryState();
        const currentBaseGeneration = getBaseGeneration(currentState);
        const currentSentinelGeneration = getSentinelGeneration(currentState);
        if (expectedGeneration && currentBaseGeneration === expectedGeneration) {
            settleInternalHistoryRelease({}, expectedGeneration, { recovered: true, watchdog: true });
            return;
        }
        if (expectedGeneration && currentSentinelGeneration !== expectedGeneration) {
            abandonMismatchedHistoryRelease();
            historySentinelActive = Boolean(currentSentinelGeneration);
            historySentinelGeneration = currentSentinelGeneration;
            if (historyEligibleLayers().length && !historySentinelActive) ensureHistorySentinel();
            return;
        }
        historyReleaseStalled = true;
        historyDiagnostics.releaseWatchdogCount += 1;
        historyDiagnostics.releaseHardStallCount += 1;
        setHistoryTransition('release-popstate-stalled');
        scheduleHistoryReleaseWatchdog(
            releaseEpoch,
            Math.max(250, HISTORY_RELEASE_HARD_STALL_RECOVERY_MS - HISTORY_RELEASE_WATCHDOG_MS),
            true
        );
    }

    function reconcileHistoryAfterPageShow(event) {
        const layers = historyEligibleLayers();
        const currentState = getHistoryState();
        const currentSentinelGeneration = getSentinelGeneration(currentState);
        const currentBaseGeneration = getBaseGeneration(currentState);
        if (historyReleaseInFlight || historyReleaseSuspended) {
            historyDiagnostics.releaseResumeCount += 1;
            const expectedGeneration = historyReleaseGeneration;
            if (expectedGeneration && currentBaseGeneration === expectedGeneration) {
                settleInternalHistoryRelease(event || {}, expectedGeneration, { recovered: true });
                return;
            }
            if (expectedGeneration && currentSentinelGeneration === expectedGeneration) {
                resetActiveHistoryRelease({ forgetGeneration: true });
                historySentinelActive = true;
                historySentinelGeneration = currentSentinelGeneration;
                setHistoryTransition(layers.length ? 'release-resume-overlay-open' : 'release-resume-retry');
                if (!layers.length) releaseHistorySentinelIfIdle();
                return;
            }
            resetActiveHistoryRelease({ forgetGeneration: true });
            historyDiagnostics.releaseGenerationMismatchCount += 1;
            setHistoryTransition('release-resume-state-mismatch');
        }
        historySentinelActive = Boolean(currentSentinelGeneration);
        historySentinelGeneration = currentSentinelGeneration;
        historyGenerationCounter = Math.max(historyGenerationCounter, currentSentinelGeneration, currentBaseGeneration);
        if (layers.length && !historySentinelActive) ensureHistorySentinel();
    }

    function installHistoryListeners() {
        if (historyListenersInstalled) return;
        if (!global.history?.pushState || !global.addEventListener) return;
        historyListenersInstalled = true;
        global.addEventListener('popstate', event => {
            const internalReleaseGeneration = getBaseGeneration(getHistoryState(event));
            if (isInternalHistoryReleaseEvent(event)) {
                settleInternalHistoryRelease(event, internalReleaseGeneration, {
                    stale: internalReleaseGeneration !== historyReleaseGeneration
                });
                return;
            }
            if (historyReleaseInFlight) abandonMismatchedHistoryRelease();
            const layers = historyEligibleLayers();
            historySentinelActive = false;
            historySentinelGeneration = 0;
            if (!layers.length) {
                historyDiagnostics.passThroughPopCount += 1;
                setHistoryTransition('pass-through-popstate');
                return;
            }
            try { event.foxbearOverlayHandled = true; } catch (_) {}
            try { event.foxbearOverlayHistorySource = 'user-back-overlay-close'; } catch (_) {}
            const topLayer = layers[layers.length - 1];
            historyDiagnostics.userBackCloseCount += 1;
            setHistoryTransition('user-back-overlay-close');
            historyPopHandling = true;
            requestCloseLayer(topLayer, 'browser-back');
            historyPopHandling = false;
            if (historyEligibleLayers().length) ensureHistorySentinel();
        });
        global.addEventListener('pagehide', event => {
            if (!historyReleaseInFlight) return;
            clearHistoryReleaseTimer();
            if (!event?.persisted) {
                resetActiveHistoryRelease({ forgetGeneration: true });
                historySentinelActive = false;
                historySentinelGeneration = 0;
                historyDiagnostics.releasePageUnloadResetCount += 1;
                setHistoryTransition('release-reset-page-unload');
                return;
            }
            historyReleaseSuspended = true;
            historyDiagnostics.releaseSuspendCount += 1;
            setHistoryTransition('release-suspended-bfcache');
        });
        global.addEventListener('pageshow', event => {
            if (!event?.persisted && !historyReleaseSuspended) return;
            reconcileHistoryAfterPageShow(event);
        });
    }

    function ensureHistorySentinel() {
        if (historyReleaseInFlight || historyPopHandling || !historyEligibleLayers().length) return false;
        const currentState = getHistoryState();
        const currentSentinelGeneration = getSentinelGeneration(currentState);
        if (currentSentinelGeneration) {
            historySentinelActive = true;
            historySentinelGeneration = currentSentinelGeneration;
            historyGenerationCounter = Math.max(historyGenerationCounter, currentSentinelGeneration);
            return false;
        }
        if (historySentinelActive && hasCurrentHistorySentinel()) return false;
        if (historySentinelActive && !hasCurrentHistorySentinel()) {
            historySentinelActive = false;
            historySentinelGeneration = 0;
            historyDiagnostics.staleSentinelResetCount += 1;
            setHistoryTransition('stale-sentinel-reset');
        }
        if (!global.history?.pushState || !global.location) return false;
        installHistoryListeners();
        if (typeof global.history.replaceState !== 'function') {
            try {
                global.history.pushState({ ...currentState, [HISTORY_SENTINEL_KEY]: true }, '', global.location.href);
                historySentinelActive = true;
                historySentinelGeneration = 0;
                historyDiagnostics.sentinelPushCount += 1;
                setHistoryTransition('sentinel-pushed-legacy');
                return true;
            } catch (_) {
                return false;
            }
        }
        const generation = Math.max(
            historyGenerationCounter + 1,
            getBaseGeneration(currentState) + 1,
            getSentinelGeneration(currentState) + 1
        );
        historyGenerationCounter = generation;
        const baseState = { ...currentState, [HISTORY_BASE_GENERATION_KEY]: generation };
        delete baseState[HISTORY_SENTINEL_KEY];
        delete baseState[HISTORY_SENTINEL_GENERATION_KEY];
        try {
            global.history.replaceState(baseState, '', global.location.href);
            global.history.pushState({
                ...baseState,
                [HISTORY_SENTINEL_KEY]: true,
                [HISTORY_SENTINEL_GENERATION_KEY]: generation
            }, '', global.location.href);
            historySentinelActive = true;
            historySentinelGeneration = generation;
            historyDiagnostics.sentinelPushCount += 1;
            setHistoryTransition('sentinel-pushed');
            return true;
        } catch (_) {
            historySentinelGeneration = 0;
            return false;
        }
    }

    function releaseHistorySentinelIfIdle() {
        if (historyReleaseInFlight) {
            historyDiagnostics.coalescedReleaseCount += 1;
            setHistoryTransition('release-coalesced');
            return true;
        }
        if (historyPopHandling || historyEligibleLayers().length) return false;
        const currentSentinelGeneration = getSentinelGeneration(getHistoryState());
        if (!historySentinelActive && currentSentinelGeneration) historySentinelActive = true;
        if (currentSentinelGeneration) historySentinelGeneration = currentSentinelGeneration;
        if (!historySentinelActive) return false;
        if (!historySentinelGeneration && typeof global.history?.replaceState === 'function') {
            const current = getHistoryState();
            const next = { ...current };
            delete next[HISTORY_SENTINEL_KEY];
            delete next[HISTORY_SENTINEL_GENERATION_KEY];
            try { global.history.replaceState(next, '', global.location?.href); } catch (_) {}
            historySentinelActive = false;
            historyDiagnostics.staleSentinelResetCount += 1;
            setHistoryTransition('legacy-sentinel-replaced');
            return true;
        }
        if (!global.history?.back) {
            historySentinelActive = false;
            historySentinelGeneration = 0;
            return false;
        }
        const releaseEpoch = ++historyReleaseEpoch;
        historyReleaseInFlight = true;
        historyReleaseSuspended = false;
        historyReleaseStalled = false;
        historyReleaseGeneration = historySentinelGeneration;
        rememberPendingHistoryRelease(historyReleaseGeneration);
        historyDiagnostics.releaseRequestCount += 1;
        setHistoryTransition('release-requested');
        try { global.history.back(); }
        catch (_) {
            resetActiveHistoryRelease({ forgetGeneration: true });
            historySentinelActive = false;
            historySentinelGeneration = 0;
            setHistoryTransition('release-back-error');
            return false;
        }
        scheduleHistoryReleaseWatchdog(releaseEpoch);
        return true;
    }

    function requestCloseLayer(layer, reason = 'request-close', event = null) {
        if (!isElement(layer)) return false;
        const options = layerOptions.get(layer) || {};
        if (typeof options.onRequestClose === 'function') {
            try {
                const result = options.onRequestClose({ layer, reason, event });
                return result !== false;
            } catch (_) {}
        }
        const closeButton = layer.querySelector?.(
            '.foxbear-modal-close, [data-foxbear-modal-close], [data-modal-close], button[aria-label*="닫기"]'
        );
        if (closeButton && !closeButton.disabled && closeButton.getAttribute?.('aria-disabled') !== 'true') {
            try { closeButton.click(); return true; } catch (_) {}
        }
        layer.hidden = true;
        layer.classList?.remove('show');
        layer.setAttribute?.('aria-hidden', 'true');
        setExternalLayerOpen(layer, false);
        return true;
    }

    function setExternalLayerOpen(layer, open, options = {}) {
        if (!isElement(layer)) return false;
        installViewportListeners();
        if (open) {
            const opener = isElement(options.opener) ? options.opener : null;
            const parentLayer = findContainingLayer(opener, layer);
            const normalized = {
                mode: inferLayerMode(layer, options),
                lockScroll: options.lockScroll !== false,
                panel: resolveLayerPanel(layer, options),
                opener,
                parentLayer,
                history: options.history !== false,
                onRequestClose: typeof options.onRequestClose === 'function' ? options.onRequestClose : null,
                onViewportChange: typeof options.onViewportChange === 'function' ? options.onViewportChange : null
            };
            layerOptions.set(layer, normalized);
            openLayers.add(layer);
            const existingIndex = layerStack.indexOf(layer);
            if (existingIndex >= 0) layerStack.splice(existingIndex, 1);
            layerStack.push(layer);
            layer.classList.add('foxbear-fixed-overlay-layer');
            layer.classList.toggle('foxbear-overlay-dialog', normalized.mode === 'dialog');
            layer.classList.toggle('foxbear-overlay-floating', normalized.mode !== 'dialog');
            const activeDialog = normalized.opener?.closest?.('[role="dialog"][aria-hidden="false"], .show[role="dialog"]');
            const nested = Boolean(normalized.parentLayer || (activeDialog && activeDialog !== layer));
            layer.dataset.foxbearNestedOverlay = nested ? 'true' : 'false';
            if (normalized.parentLayer) setLayerSuspended(normalized.parentLayer, true);
            if (isElement(normalized.panel)) normalized.panel.classList.add('foxbear-viewport-panel');
            updateLayerDepths();
            syncVisualViewport();
            if (normalized.mode === 'dialog' && normalized.history !== false) ensureHistorySentinel();
        } else {
            openLayers.delete(layer);
            const index = layerStack.indexOf(layer);
            if (index >= 0) layerStack.splice(index, 1);
            const normalized = layerOptions.get(layer) || {};
            if (isElement(normalized.panel)) normalized.panel.classList.remove('foxbear-viewport-panel');
            layer.classList.remove('foxbear-fixed-overlay-layer', 'foxbear-overlay-dialog', 'foxbear-overlay-floating');
            delete layer.dataset.foxbearOverlayDepth;
            delete layer.dataset.foxbearNestedOverlay;
            delete layer.dataset.foxbearOverlaySuspended;
            if ('inert' in layer) layer.inert = false;
            if (normalized.parentLayer && !hasOpenChildLayer(normalized.parentLayer)) setLayerSuspended(normalized.parentLayer, false);
            if (typeof layer.style?.removeProperty === 'function') layer.style.removeProperty('--foxbear-overlay-z');
            else if (layer.style) delete layer.style['--foxbear-overlay-z'];
            layerOptions.delete(layer);
            updateLayerDepths();
        }
        syncDocumentLock(layer);
        if (!open) releaseHistorySentinelIfIdle();
        return true;
    }

    function getTopExternalLayer() {
        for (let index = layerStack.length - 1; index >= 0; index -= 1) {
            const layer = layerStack[index];
            if (isElement(layer) && layer.isConnected && !layer.hidden) return layer;
        }
        return null;
    }

    function hasOpenRuntimePopup(doc = global.document) {
        if (!doc || typeof doc.querySelector !== 'function') return false;
        return Boolean(doc.querySelector([
            '.select-popup-backdrop.show',
            '#downloadAssist.show',
            '.ai-recommend-dialog-backdrop.show',
            '.download-format-quality-menu-portal:not([hidden])'
        ].join(', ')));
    }

    function hardSet(dialog, open, bodyClass, options = {}) {
        if (!isElement(dialog)) return false;
        dialog.hidden = !open;
        dialog.classList.toggle('show', Boolean(open));
        dialog.setAttribute('aria-hidden', open ? 'false' : 'true');
        dialog.style.display = open ? 'flex' : 'none';
        dialog.style.pointerEvents = open ? 'auto' : 'none';
        if (bodyClass && getDocument(dialog)?.body) {
            getDocument(dialog).body.classList.toggle(bodyClass, Boolean(open));
        }
        setExternalLayerOpen(dialog, Boolean(open), { mode: 'dialog', panel: resolveLayerPanel(dialog), lockScroll: true, ...options });
        return true;
    }

    class FoxBearModalStateMachine {
        constructor(options = {}) {
            this.document = options.document || global.document;
            this.getElement = options.getElement || (id => this.document.getElementById(id));
            this.modals = new Map();
            this.returnFocusByName = new Map();
            this.openStack = [];
            this.active = null;
            this.installed = false;
            this.boundClick = this.handleClick.bind(this);
            this.boundKeydown = this.handleKeydown.bind(this);
        }

        register(name, config = {}) {
            if (!name || !config.dialog) return this;
            const normalized = {
                name,
                dialog: config.dialog,
                openers: config.openers || [],
                closers: config.closers || [],
                closeSelector: config.closeSelector || '',
                openerSelector: config.openerSelector || '',
                bodyClass: config.bodyClass || `${name}-dialog-open`,
                onOpen: config.onOpen || null,
                onClose: config.onClose || null,
                returnFocus: config.returnFocus || null,
                closeOnBackdrop: config.closeOnBackdrop !== false,
                allowNested: config.allowNested !== false
            };
            this.modals.set(name, normalized);
            this.decorateCloseButtons(normalized);
            return this;
        }

        decorateCloseButtons(cfg) {
            if (!cfg) return;
            const dialog = this.resolve(cfg.dialog);
            const buttons = [];
            for (const id of cfg.closers || []) {
                const button = this.resolve(id);
                if (button) buttons.push(button);
            }
            if (dialog && cfg.closeSelector) {
                dialog.querySelectorAll(cfg.closeSelector).forEach(button => buttons.push(button));
            }
            buttons.forEach(button => {
                button.classList.add('foxbear-modal-close');
                button.dataset.foxbearModalClose = cfg.name;
            });
        }

        resolve(ref) {
            if (!ref) return null;
            if (isElement(ref)) return ref;
            return this.getElement(String(ref)) || null;
        }

        isOpen(name) {
            const cfg = this.modals.get(name);
            const dialog = cfg ? this.resolve(cfg.dialog) : null;
            return Boolean(dialog && !dialog.hidden && dialog.classList.contains('show'));
        }

        currentName() {
            return this.openStack[this.openStack.length - 1] || null;
        }

        currentDialog() {
            const cfg = this.modals.get(this.currentName());
            return cfg ? this.resolve(cfg.dialog) : null;
        }

        rememberReturnFocus(name, options = {}) {
            const candidate = this.resolve(options.opener) || options.event?.currentTarget || options.event?.target || this.document?.activeElement;
            if (isElement(candidate) && candidate !== this.document?.body) this.returnFocusByName.set(name, candidate);
        }

        restoreFocus(name, cfg) {
            const remembered = this.returnFocusByName.get(name);
            this.returnFocusByName.delete(name);
            const focusTarget = remembered || this.resolve(cfg.returnFocus || cfg.openers[0]);
            if (focusTarget && this.document?.body?.contains?.(focusTarget) && !focusTarget.hidden && focusTarget.getAttribute?.('aria-hidden') !== 'true') {
                try { focusTarget.focus({ preventScroll: true }); } catch (_) {}
                return true;
            }
            return false;
        }

        suspend(name) {
            const cfg = this.modals.get(name);
            const dialog = cfg ? this.resolve(cfg.dialog) : null;
            if (!dialog || !this.isOpen(name)) return;
            dialog.dataset.foxbearModalSuspended = 'true';
            if ('inert' in dialog) dialog.inert = true;
        }

        resume(name) {
            const cfg = this.modals.get(name);
            const dialog = cfg ? this.resolve(cfg.dialog) : null;
            if (!dialog || !this.isOpen(name)) return;
            delete dialog.dataset.foxbearModalSuspended;
            if ('inert' in dialog) dialog.inert = false;
        }

        shouldStack(name, cfg, options = {}) {
            if (!this.active || this.active === name || cfg.allowNested === false || options.stack === false) return false;
            if (options.stack === true) return true;
            const opener = this.resolve(options.opener) || options.event?.currentTarget || options.event?.target || this.document?.activeElement;
            const activeDialog = this.currentDialog();
            return Boolean(isElement(opener) && activeDialog?.contains?.(opener));
        }

        closeAbove(name, options = {}) {
            const index = this.openStack.indexOf(name);
            if (index < 0) return;
            const names = this.openStack.slice(index + 1).reverse();
            names.forEach(childName => this.setOpen(childName, false, { ...options, restoreFocus: false, silent: true }));
        }

        setOpen(name, open, options = {}) {
            const cfg = this.modals.get(name);
            if (!cfg) return false;
            const dialog = this.resolve(cfg.dialog);
            if (!dialog) return false;

            if (open) {
                if (this.isOpen(name)) {
                    this.closeAbove(name, { restoreFocus: false });
                    this.openStack = this.openStack.filter(item => item !== name);
                    this.openStack.push(name);
                    this.active = name;
                    this.resume(name);
                    focusFirst(dialog);
                    return true;
                }
                const stackNested = this.shouldStack(name, cfg, options);
                if (this.active && this.active !== name) {
                    if (stackNested) this.suspend(this.active);
                    else this.closeAll(null, { restoreFocus: false, silent: true });
                }
                this.rememberReturnFocus(name, options);
                hardSet(dialog, true, cfg.bodyClass, {
                    opener: this.returnFocusByName.get(name) || null,
                    onRequestClose: () => this.setOpen(name, false, { restoreFocus: true, fromHistory: true })
                });
                dialog.dataset.foxbearModalDepth = String(this.openStack.length + 1);
                dialog.dataset.foxbearNestedOverlay = stackNested ? 'true' : 'false';
                this.openStack.push(name);
                this.active = name;
                if (!options.silent && typeof cfg.onOpen === 'function') cfg.onOpen({ name, dialog, controller: this, event: options.event || null, nested: stackNested });
                focusFirst(dialog);
                return true;
            }

            if (!this.isOpen(name)) return false;
            this.closeAbove(name, { restoreFocus: false });
            hardSet(dialog, false, cfg.bodyClass);
            this.openStack = this.openStack.filter(item => item !== name);
            delete dialog.dataset.foxbearModalDepth;
            delete dialog.dataset.foxbearNestedOverlay;
            delete dialog.dataset.foxbearModalSuspended;
            if ('inert' in dialog) dialog.inert = false;
            if (!options.silent && typeof cfg.onClose === 'function') cfg.onClose({ name, dialog, controller: this, event: options.event || null });
            const restored = options.restoreFocus !== false ? this.restoreFocus(name, cfg) : false;
            if (!restored) this.returnFocusByName.delete(name);
            this.active = this.currentName();
            if (this.active) {
                this.resume(this.active);
                if (!restored && options.restoreFocus !== false) focusFirst(this.currentDialog());
            }
            return true;
        }

        open(name, event = null, opener = null) {
            stopEvent(event);
            return this.setOpen(name, true, { event, opener });
        }

        close(name, event = null, options = {}) {
            stopEvent(event);
            return this.setOpen(name, false, { event, restoreFocus: options.restoreFocus !== false });
        }

        closeAll(event = null, options = {}) {
            if (event) stopEvent(event);
            let changed = false;
            this.openStack.slice().reverse().forEach(name => {
                if (this.isOpen(name)) changed = this.setOpen(name, false, { event, restoreFocus: false, silent: options.silent === true }) || changed;
            });
            this.openStack = [];
            this.active = null;
            return changed;
        }

        matchByIdOrSelector(target, ids = [], selector = '') {
            if (!target || typeof target.closest !== 'function') return null;
            for (const id of ids) {
                const hit = target.closest(`#${id}`);
                if (hit) return hit;
            }
            if (selector) {
                const hit = target.closest(selector);
                if (hit) return hit;
            }
            return null;
        }

        isGenericBackdrop(target) {
            if (!isElement(target) || target.getAttribute('role') !== 'dialog') return false;
            if (target.dataset.foxbearBackdropClose === 'false') return false;
            return Array.from(target.classList || []).some(name => /(?:backdrop|overlay|modal-layer)/i.test(name));
        }

        closeGenericBackdrop(target, event) {
            if (!this.isGenericBackdrop(target)) return false;
            const closeButton = target.querySelector(
                '.foxbear-modal-close, [data-foxbear-modal-close], [data-modal-close], button[aria-label*="닫기"]'
            );
            if (!closeButton || closeButton.disabled || closeButton.getAttribute('aria-disabled') === 'true') return false;
            stopEvent(event);
            closeButton.click();
            return true;
        }

        trapFocus(event) {
            if (!this.active || event.key !== 'Tab') return false;
            const cfg = this.modals.get(this.active);
            const dialog = cfg ? this.resolve(cfg.dialog) : null;
            if (!dialog || !this.isOpen(this.active)) return false;
            const focusable = getFocusable(dialog);
            if (!focusable.length) {
                stopEvent(event);
                focusFirst(dialog);
                return true;
            }
            const current = this.document?.activeElement;
            const index = focusable.indexOf(current);
            const nextIndex = event.shiftKey
                ? (index <= 0 ? focusable.length - 1 : index - 1)
                : (index < 0 || index >= focusable.length - 1 ? 0 : index + 1);
            stopEvent(event);
            try { focusable[nextIndex].focus({ preventScroll: true }); } catch (_) {}
            return true;
        }

        handleClick(event) {
            const target = event.target;
            if (!target || typeof target.closest !== 'function') return;
            for (const [name, cfg] of this.modals.entries()) {
                const opener = this.matchByIdOrSelector(target, cfg.openers, cfg.openerSelector);
                if (opener) {
                    this.open(name, event, opener);
                    return;
                }
                if (this.matchByIdOrSelector(target, cfg.closers, cfg.closeSelector)) {
                    this.close(name, event, { restoreFocus: true });
                    return;
                }
                const dialog = this.resolve(cfg.dialog);
                if (cfg.closeOnBackdrop && dialog && target === dialog && this.active === name && this.isOpen(name)) {
                    this.close(name, event, { restoreFocus: true });
                    return;
                }
            }
            this.closeGenericBackdrop(target, event);
        }

        handleKeydown(event) {
            if (this.trapFocus(event)) return;
            if (event.key === 'Escape') {
                const topLayer = getTopExternalLayer();
                const activeDialog = this.currentDialog();
                if ((topLayer && topLayer !== activeDialog) || hasOpenRuntimePopup(this.document)) return;
                if (this.active) this.close(this.active, event, { restoreFocus: true });
                else this.closeAll(event);
                return;
            }
            if (event.key !== 'Enter' && event.key !== ' ') return;
            const target = event.target;
            if (!target || typeof target.closest !== 'function') return;
            for (const [name, cfg] of this.modals.entries()) {
                const opener = this.matchByIdOrSelector(target, cfg.openers, cfg.openerSelector);
                if (opener) {
                    this.open(name, event, opener);
                    return;
                }
            }
        }

        install() {
            if (this.installed || !this.document) return this;
            this.installed = true;
            this.document.addEventListener('click', this.boundClick, { capture: true });
            this.document.addEventListener('keydown', this.boundKeydown, { capture: true });
            return this;
        }
    }

    global.FoxBearModalStateMachine = {
        FoxBearModalStateMachine,
        hardSet,
        setExternalLayerOpen,
        getTopExternalLayer,
        requestCloseLayer,
        findContainingLayer,
        hasOpenRuntimePopup,
        getOpenLayerCount: () => openLayers.size,
        getOpenLayerStack: () => layerStack.slice(),
        isHistoryReleaseInFlight: () => historyReleaseInFlight,
        isInternalHistoryReleaseEvent,
        getHistoryDiagnostics,
        isDocumentLocked: () => Boolean(scrollLockSnapshot),
        getVisualViewportRect,
        syncVisualViewport,
        getFocusable,
        focusFirst
    };
})(window);
