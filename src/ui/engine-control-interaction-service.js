// FoxBear engine-control interaction service - v1.6.105
(function attachFoxBearEngineControlInteraction(global) {
    'use strict';

    const VERSION = global.FoxBearBuildInfo?.assetVersion || '1.6.105-header-dock-css-ownership-hardening';
    const CONTROL_IDS = Object.freeze(['masterGoalSelect', 'masterStyleSelect', 'masterStrengthSelect', 'platformPresetSelect']);
    const CONTROL_ID_SET = new Set(CONTROL_IDS);
    const state = {
        openCount: 0,
        closeCount: 0,
        selectionCount: 0,
        changeDispatchCount: 0,
        pendingChangeCount: 0,
        activeSelectId: '',
        lastSelectId: '',
        lastValue: '',
        lastOpenAt: 0,
        lastCloseAt: 0,
        lastSelectionAt: 0,
        lastDispatchAt: 0,
        lastDispatchDelayMs: 0,
        lastDispatchDurationMs: 0,
        managedOverlay: false
    };

    const getId = target => String(typeof target === 'string' ? target : target?.id || '');
    const isEngineControl = target => CONTROL_ID_SET.has(getId(target));
    const now = () => global.performance && typeof global.performance.now === 'function' ? global.performance.now() : Date.now();
    const roundMs = value => Math.max(0, Math.round(Number(value || 0) * 10) / 10);

    function noteOpen(target, managedOverlay = false) {
        const id = getId(target);
        if (!CONTROL_ID_SET.has(id)) return false;
        state.openCount += 1;
        state.activeSelectId = id;
        state.lastSelectId = id;
        state.lastOpenAt = Date.now();
        state.managedOverlay = Boolean(managedOverlay);
        return true;
    }

    function noteClose(target) {
        const id = getId(target);
        if (!CONTROL_ID_SET.has(id)) return false;
        state.closeCount += 1;
        state.activeSelectId = '';
        state.lastSelectId = id;
        state.lastCloseAt = Date.now();
        return true;
    }

    function noteSelection(target, value = undefined) {
        const id = getId(target);
        if (!CONTROL_ID_SET.has(id)) return false;
        state.selectionCount += 1;
        state.lastSelectId = id;
        state.lastValue = String(value === undefined ? target?.value || '' : value || '');
        state.lastSelectionAt = Date.now();
        return true;
    }

    function scheduleChange(target, dispatch) {
        const tracked = isEngineControl(target);
        const scheduledAt = now();
        if (tracked) state.pendingChangeCount += 1;
        const run = () => {
            const startedAt = now();
            try {
                if (typeof dispatch === 'function') dispatch();
            } finally {
                if (tracked) {
                    state.changeDispatchCount += 1;
                    state.pendingChangeCount = Math.max(0, state.pendingChangeCount - 1);
                    state.lastDispatchAt = Date.now();
                    state.lastDispatchDelayMs = roundMs(startedAt - scheduledAt);
                    state.lastDispatchDurationMs = roundMs(now() - startedAt);
                }
            }
        };
        if (typeof global.requestAnimationFrame === 'function') global.requestAnimationFrame(run);
        else global.setTimeout(run, 0);
        return true;
    }

    function getSnapshot() {
        const doc = global.document;
        const popup = doc?.querySelector?.('.select-popup-backdrop.show');
        const panel = popup?.querySelector?.('.select-popup-panel');
        const popupSelectId = String(panel?.dataset?.select || '');
        const activeSelectId = popupSelectId || state.activeSelectId || '';
        const body = doc?.body;
        const root = doc?.documentElement;
        const bodyLocked = Boolean(
            body?.classList?.contains('foxbear-modal-layer-open')
            || body?.classList?.contains('select-popup-open')
            || body?.style?.position === 'fixed'
            || body?.style?.touchAction === 'none'
            || root?.style?.overflow === 'hidden'
        );
        const nowAt = Date.now();
        const activeEngineControl = CONTROL_ID_SET.has(activeSelectId);
        return Object.freeze({
            version: VERSION,
            openCount: state.openCount,
            closeCount: state.closeCount,
            selectionCount: state.selectionCount,
            changeDispatchCount: state.changeDispatchCount,
            pendingChangeCount: state.pendingChangeCount,
            activeSelectId,
            activeEngineControl,
            popupVisible: Boolean(popup),
            bodyLocked,
            historyIsolated: true,
            globalScrollLockDisabled: true,
            managedOverlay: state.managedOverlay,
            lastSelectId: state.lastSelectId,
            lastValue: state.lastValue,
            lastOpenAt: state.lastOpenAt,
            lastCloseAt: state.lastCloseAt,
            lastSelectionAt: state.lastSelectionAt,
            lastDispatchAt: state.lastDispatchAt,
            lastDispatchDelayMs: state.lastDispatchDelayMs,
            lastDispatchDurationMs: state.lastDispatchDurationMs,
            openAgeMs: activeEngineControl && state.lastOpenAt ? Math.max(0, nowAt - state.lastOpenAt) : 0,
            pendingAgeMs: state.pendingChangeCount > 0 && state.lastSelectionAt ? Math.max(0, nowAt - state.lastSelectionAt) : 0
        });
    }

    const api = Object.freeze({ version: VERSION, controlIds: CONTROL_IDS, isEngineControl, noteOpen, noteClose, noteSelection, scheduleChange, getSnapshot });
    global.FoxBearEngineControlInteraction = api;
    global.FoxBearEngineControlDiagnostics = Object.freeze({ version: VERSION, controlIds: CONTROL_IDS, getSnapshot });
})(window);
