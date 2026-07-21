// FoxBear mastering orchestrator service v1.5.53 - batch flow and one-shot quality recovery planning
'use strict';

(function attachFoxBearMasteringOrchestratorService(global) {
    function toFinite(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function normalizeSettings(settings = {}) {
        return Object.freeze({
            clarity: clamp(toFinite(settings.clarity, 50), 0, 100),
            warmth: clamp(toFinite(settings.warmth, 55), 0, 100),
            width: clamp(toFinite(settings.width, 35), 0, 100),
            stereoGroove: clamp(toFinite(settings.stereoGroove, 8), 0, 100),
            analogGroove: clamp(toFinite(settings.analogGroove, 6), 0, 100),
            dynamicPunch: clamp(toFinite(settings.dynamicPunch, 35), 0, 100),
            metallicRemoval: clamp(toFinite(settings.metallicRemoval, 42), 0, 100),
            intensity: clamp(toFinite(settings.intensity, 100), 50, 200)
        });
    }

    function createQualityRecoveryPlan(input = {}) {
        const gate = input.gate || null;
        if (!gate || gate.status !== 'fail' || input.alreadyAttempted) return null;
        const failedFlags = (gate.riskFlags || gate.items || [])
            .filter(item => item && item.status === 'fail')
            .map(item => ({ label: String(item.label || '품질 실패'), detail: String(item.detail || '') }));
        if (!failedFlags.length) return null;

        const sourceSettings = normalizeSettings(input.settings || {});
        const failedText = failedFlags.map(item => `${item.label} ${item.detail}`).join(' ');
        const loudnessRisk = /Short-term|클리핑|리미터|과도한 리미팅|저역 펌핑|라우드니스/i.test(failedText);
        const spectralRisk = /고역 손실|De-esser|Multiband|모바일 번역/i.test(failedText);
        const targetLufs = toFinite(input.targetLufs, -14);
        const ceilingDb = toFinite(input.ceilingDb, -1);
        const safeSettings = Object.freeze({
            clarity: Math.min(sourceSettings.clarity, spectralRisk ? 48 : 54),
            warmth: clamp(sourceSettings.warmth, 38, 64),
            width: Math.min(sourceSettings.width, 38),
            stereoGroove: Math.min(sourceSettings.stereoGroove, 8),
            analogGroove: Math.min(sourceSettings.analogGroove, 10),
            dynamicPunch: Math.min(sourceSettings.dynamicPunch, loudnessRisk ? 28 : 34),
            metallicRemoval: Math.min(sourceSettings.metallicRemoval, spectralRisk ? 46 : 52),
            intensity: Math.min(sourceSettings.intensity, loudnessRisk ? 88 : 95)
        });
        const safeTargetLufs = loudnessRisk ? Math.min(targetLufs - 1.5, -12) : targetLufs;
        const safeCeilingDb = Math.min(ceilingDb - 0.5, -1.5);
        return Object.freeze({
            version: '1.5.53-engine-recovery-performance-diagnostics',
            attemptLimit: 1,
            failedFlags: Object.freeze(failedFlags),
            reason: failedFlags.map(item => item.label).join(', '),
            requestedSettings: sourceSettings,
            safeSettings,
            targetLufs: safeTargetLufs,
            ceilingDb: safeCeilingDb,
            qualityMode: 'fast',
            truePeak: true,
            loudnessAdjusted: safeTargetLufs !== targetLufs,
            ceilingAdjusted: safeCeilingDb !== ceilingDb
        });
    }

    function createMasteringBatchRunner(options = {}) {
        async function runBatch(tracks, batchOptions = {}) {
            const items = Array.isArray(tracks) ? tracks.filter(Boolean) : [];
            if (!items.length) return Object.freeze({ total: 0, completed: 0, failed: 0, ok: false });
            let completed = 0;
            let failed = 0;
            let result = null;
            try {
                if (typeof options.beginHudBatch === 'function') options.beginHudBatch(items, batchOptions);
                if (typeof options.setBusy === 'function') options.setBusy(true);
                if (typeof options.beforeBatch === 'function') await options.beforeBatch(items, batchOptions);
                if (typeof options.render === 'function') options.render(batchOptions.initialRenderOptions || {});

                for (const track of items) {
                    try {
                        if (typeof options.prepareTrack === 'function') await options.prepareTrack(track, batchOptions);
                        if (typeof options.masterTrack !== 'function') throw new Error('masterTrack callback missing');
                        const ok = await options.masterTrack(track, true, Object.assign({
                            awaitAnalysis: true,
                            notifyBlocked: true,
                            source: batchOptions.source || 'batch'
                        }, batchOptions.masterOptions || {}));
                        if (ok) completed += 1;
                        else failed += 1;
                    } catch (error) {
                        failed += 1;
                        if (typeof options.onTrackError === 'function') {
                            try { await options.onTrackError(error, track, batchOptions); } catch (callbackError) {}
                        }
                    }
                }
                result = Object.freeze({ total: items.length, completed, failed, ok: completed > 0 });
                if (typeof options.afterBatch === 'function') await options.afterBatch({ items, completed, failed, batchOptions, result });
                return result;
            } catch (error) {
                if (typeof options.onBatchError === 'function') {
                    try { await options.onBatchError(error, { items, completed, failed, batchOptions }); } catch (callbackError) {}
                }
                throw error;
            } finally {
                if (typeof options.setBusy === 'function') {
                    try { options.setBusy(false); } catch (error) {}
                }
                if (typeof options.render === 'function') {
                    try { options.render(batchOptions.finalRenderOptions || {}); } catch (error) {}
                }
            }
        }

        return Object.freeze({
            version: '1.5.53-engine-recovery-performance-diagnostics',
            runBatch
        });
    }

    global.FoxBearMasteringOrchestratorService = Object.freeze({
        version: '1.5.53-engine-recovery-performance-diagnostics',
        createQualityRecoveryPlan,
        createMasteringBatchRunner
    });
})(window);
