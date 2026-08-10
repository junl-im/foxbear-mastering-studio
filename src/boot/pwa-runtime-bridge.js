// FoxBear PWA runtime registration and share-launch bridge - v1.6.86
(function attachFoxBearPwaRuntimeBridge(global) {
    'use strict';

    function createBridge(options = {}) {
        const navigatorRef = options.navigator || global.navigator || {};
        const locationRef = options.location || global.location || {};
        const setTimeoutRef = options.setTimeout || global.setTimeout?.bind(global) || (() => 0);
        const ensureMobileState = typeof options.ensureMobileState === 'function' ? options.ensureMobileState : () => ({});
        const updateMobileUi = typeof options.updateMobileUi === 'function' ? options.updateMobileUi : () => undefined;
        const resolveScriptUrl = typeof options.resolveScriptUrl === 'function' ? options.resolveScriptUrl : value => value;
        const serviceWorkerUrl = String(options.serviceWorkerUrl || './sw.js');
        const recoveryService = options.recoveryService || global.FoxBearServiceWorkerRecoveryService || null;
        const updateService = options.updateService || global.FoxBearServiceWorkerUpdateService || null;
        const shareService = options.shareService || global.FoxBearPwaShareTargetService || null;

        async function registerServiceWorker(registerOptions = {}) {
            const mobile = ensureMobileState();
            if (!('serviceWorker' in navigatorRef) || locationRef.protocol === 'file:') return Object.freeze({ ok: false, reason: 'unsupported' });
            const bypassOnce = !registerOptions.ignoreRecoveryBypass && await recoveryService?.consumeOneShotBypass?.();
            if (bypassOnce) {
                mobile.serviceWorkerReady = false;
                updateMobileUi();
                setTimeoutRef(() => registerServiceWorker({ ignoreRecoveryBypass: true }), 12000);
                return Object.freeze({ ok: false, reason: 'recovery-bypass' });
            }
            try {
                const registration = await navigatorRef.serviceWorker.register(resolveScriptUrl(serviceWorkerUrl));
                updateService?.coordinate?.(registration, { stableIdleMs: 1800, pollMs: 500 });
                const readyRegistration = await Promise.race([
                    navigatorRef.serviceWorker.ready.catch(() => null),
                    new Promise(resolve => setTimeoutRef(() => resolve(null), 15000))
                ]);
                const activeWorker = readyRegistration?.active || registration?.active || null;
                mobile.serviceWorkerReady = Boolean(activeWorker);
                if (activeWorker && !global.__FOXBEAR_E2E__) activeWorker.postMessage({ type: 'FOXBEAR_WARM_CACHE' });
                updateMobileUi();
                return Object.freeze({ ok: Boolean(activeWorker), reason: activeWorker ? 'ready' : 'not-active', registration });
            } catch (error) {
                mobile.serviceWorkerReady = false;
                updateMobileUi();
                console.warn('Service worker registration skipped:', error);
                return Object.freeze({ ok: false, reason: 'registration-failed', error });
            }
        }

        async function processShareLaunch(processOptions = {}) {
            if (!shareService?.processLaunch) return Object.freeze({ handled: false, reason: 'service-unavailable' });
            return shareService.processLaunch({
                state: ensureMobileState(),
                validateAudioFile: processOptions.validateAudioFile,
                handleFiles: processOptions.handleFiles,
                showToast: processOptions.showToast
            });
        }

        return Object.freeze({ registerServiceWorker, processShareLaunch });
    }

    global.FoxBearPwaRuntimeBridge = Object.freeze({ version: '1.6.86', createBridge });
})(typeof window !== 'undefined' ? window : globalThis);
