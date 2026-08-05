// FoxBear incident connectivity and resume lifecycle coordinator - v1.6.61
(function attachFoxBearIncidentLifecycle(global) {
    'use strict';

    const LONG_BACKGROUND_MS = 5 * 60 * 1000;
    const CONNECTION_CHANGE_DEBOUNCE_MS = 750;

    function safeNow(now) {
        const value = Number(typeof now === 'function' ? now() : Date.now());
        return Number.isFinite(value) ? value : Date.now();
    }

    function createController(options = {}) {
        const globalRef = options.global || global;
        const documentRef = options.document || globalRef.document;
        const navigatorRef = options.navigator || globalRef.navigator || {};
        const routePolicy = options.routePolicy || globalRef.FoxBearIncidentRoutePolicy;
        const now = typeof options.now === 'function' ? options.now : Date.now;
        const setTimer = options.setTimeout || globalRef.setTimeout?.bind(globalRef);
        const clearTimer = options.clearTimeout || globalRef.clearTimeout?.bind(globalRef);
        const connection = options.connection || navigatorRef.connection || navigatorRef.mozConnection || navigatorRef.webkitConnection;
        let disposed = false;
        let hiddenAt = documentRef?.visibilityState === 'hidden' ? safeNow(now) : 0;
        let offlineAt = navigatorRef.onLine === false ? safeNow(now) : 0;
        let lastVisibleAt = documentRef?.visibilityState === 'visible' ? safeNow(now) : 0;
        let lastOnlineAt = navigatorRef.onLine === false ? 0 : safeNow(now);
        let connectionTimer = 0;
        let lastConnectionKey = routePolicy?.currentNetworkKey?.() || '';

        function notifyError(phase, error) {
            if (disposed || typeof options.onError !== 'function') return;
            const detail = Object.freeze({
                phase: String(phase || 'lifecycle').slice(0, 80),
                name: String(error?.name || 'Error').slice(0, 80),
                code: String(error?.code || '').slice(0, 80),
                message: String(error?.message || error || 'Lifecycle callback failed').replace(/\s+/g, ' ').trim().slice(0, 240)
            });
            try {
                const result = options.onError(detail, error);
                if (result && typeof result.catch === 'function') result.catch(() => {});
            } catch (handlerError) {}
        }

        function runEvent(handler, phase) {
            if (disposed || typeof handler !== 'function') return;
            try {
                const result = handler();
                if (result && typeof result.catch === 'function') result.catch(error => notifyError(phase, error));
            } catch (error) { notifyError(phase, error); }
        }

        function invoke(callback, detail) {
            if (disposed || typeof callback !== 'function') return Promise.resolve(null);
            try { return Promise.resolve(callback(Object.freeze(detail || {}))); }
            catch (error) { return Promise.reject(error); }
        }

        function observeRoutePolicy() {
            try { return routePolicy?.observeNetworkChange?.() || routePolicy?.getHealth?.() || null; }
            catch (error) { return null; }
        }

        async function handleOnline() {
            if (disposed) return;
            const timestamp = safeNow(now);
            const offlineDurationMs = offlineAt > 0 ? Math.max(0, timestamp - offlineAt) : 0;
            offlineAt = 0;
            lastOnlineAt = timestamp;
            const routeHealth = observeRoutePolicy();
            lastConnectionKey = routeHealth?.networkKey || routePolicy?.currentNetworkKey?.() || lastConnectionKey;
            await invoke(options.onOnline, { at: timestamp, offlineDurationMs, routeHealth, networkKey: lastConnectionKey });
        }

        async function handleOffline() {
            if (disposed) return;
            const timestamp = safeNow(now);
            if (!offlineAt) offlineAt = timestamp;
            const routeHealth = observeRoutePolicy();
            lastConnectionKey = routeHealth?.networkKey || routePolicy?.currentNetworkKey?.() || lastConnectionKey;
            await invoke(options.onOffline, { at: timestamp, routeHealth, networkKey: lastConnectionKey });
        }

        async function handleVisibilityChange() {
            if (disposed) return;
            const timestamp = safeNow(now);
            const visibilityState = String(documentRef?.visibilityState || 'visible');
            if (visibilityState === 'hidden') {
                hiddenAt = timestamp;
                await invoke(options.onHidden, { at: timestamp });
                return;
            }
            const backgroundDurationMs = hiddenAt > 0 ? Math.max(0, timestamp - hiddenAt) : 0;
            hiddenAt = 0;
            lastVisibleAt = timestamp;
            const detail = { at: timestamp, backgroundDurationMs, longBackground: backgroundDurationMs >= LONG_BACKGROUND_MS };
            await invoke(options.onVisible, detail);
            if (detail.longBackground) await invoke(options.onLongResume, detail);
        }

        function handleConnectionChange() {
            if (disposed) return;
            if (connectionTimer && clearTimer) clearTimer(connectionTimer);
            const run = async () => {
                connectionTimer = 0;
                const timestamp = safeNow(now);
                const previousNetworkKey = lastConnectionKey;
                const routeHealth = observeRoutePolicy();
                const networkKey = routeHealth?.networkKey || routePolicy?.currentNetworkKey?.() || '';
                lastConnectionKey = networkKey || lastConnectionKey;
                await invoke(options.onConnectionChange, {
                    at: timestamp,
                    previousNetworkKey,
                    networkKey: lastConnectionKey,
                    changed: Boolean(lastConnectionKey && previousNetworkKey && lastConnectionKey !== previousNetworkKey),
                    routeHealth
                });
            };
            const execute = () => run().catch(error => notifyError('connection-change', error));
            if (setTimer) connectionTimer = setTimer(execute, CONNECTION_CHANGE_DEBOUNCE_MS);
            else execute();
        }

        const onlineListener = () => runEvent(handleOnline, 'online');
        const offlineListener = () => runEvent(handleOffline, 'offline');
        const visibilityListener = () => runEvent(handleVisibilityChange, 'visibility-change');
        const connectionListener = () => runEvent(handleConnectionChange, 'connection-change-schedule');

        globalRef.addEventListener?.('online', onlineListener);
        globalRef.addEventListener?.('offline', offlineListener);
        documentRef?.addEventListener?.('visibilitychange', visibilityListener);
        connection?.addEventListener?.('change', connectionListener);

        function dispose() {
            if (disposed) return;
            disposed = true;
            if (connectionTimer && clearTimer) clearTimer(connectionTimer);
            connectionTimer = 0;
            globalRef.removeEventListener?.('online', onlineListener);
            globalRef.removeEventListener?.('offline', offlineListener);
            documentRef?.removeEventListener?.('visibilitychange', visibilityListener);
            connection?.removeEventListener?.('change', connectionListener);
        }

        function getState() {
            return Object.freeze({
                hiddenAt,
                offlineAt,
                lastVisibleAt,
                lastOnlineAt,
                networkKey: lastConnectionKey,
                online: navigatorRef.onLine !== false,
                visible: String(documentRef?.visibilityState || 'visible') !== 'hidden'
            });
        }

        return Object.freeze({
            handleOnline,
            handleOffline,
            handleVisibilityChange,
            handleConnectionChange,
            getState,
            dispose
        });
    }

    global.FoxBearIncidentLifecycle = Object.freeze({
        version: '1.6.61',
        longBackgroundMs: LONG_BACKGROUND_MS,
        connectionChangeDebounceMs: CONNECTION_CHANGE_DEBOUNCE_MS,
        createController
    });
})(typeof window !== 'undefined' ? window : globalThis);
