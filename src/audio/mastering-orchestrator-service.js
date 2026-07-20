// FoxBear mastering orchestrator service v1.4.28 - batch flow extracted from app.js
'use strict';

(function attachFoxBearMasteringOrchestratorService(global) {
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
            version: '1.5.43-export-pipeline-integrity',
            runBatch
        });
    }

    global.FoxBearMasteringOrchestratorService = Object.freeze({
        version: '1.5.43-export-pipeline-integrity',
        createMasteringBatchRunner
    });
})(window);
