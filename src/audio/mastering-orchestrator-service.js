// FoxBear mastering orchestrator service v1.4.28 - batch flow extracted from app.js
'use strict';

(function attachFoxBearMasteringOrchestratorService(global) {
    function createMasteringBatchRunner(options = {}) {
        async function runBatch(tracks, batchOptions = {}) {
            const items = Array.isArray(tracks) ? tracks.filter(Boolean) : [];
            if (!items.length) return Object.freeze({ total: 0, completed: 0, failed: 0, ok: false });

            if (typeof options.beginHudBatch === 'function') options.beginHudBatch(items, batchOptions);
            if (typeof options.setBusy === 'function') options.setBusy(true);
            if (typeof options.beforeBatch === 'function') options.beforeBatch(items, batchOptions);
            if (typeof options.render === 'function') options.render(batchOptions.initialRenderOptions || {});

            let completed = 0;
            let failed = 0;
            try {
                for (const track of items) {
                    if (typeof options.prepareTrack === 'function') options.prepareTrack(track, batchOptions);
                    if (typeof options.masterTrack !== 'function') throw new Error('masterTrack callback missing');
                    const ok = await options.masterTrack(track, true, Object.assign({
                        awaitAnalysis: true,
                        notifyBlocked: true,
                        source: batchOptions.source || 'batch'
                    }, batchOptions.masterOptions || {}));
                    if (ok) completed += 1;
                    else failed += 1;
                }
                if (typeof options.afterBatch === 'function') options.afterBatch({ items, completed, failed, batchOptions });
                return Object.freeze({ total: items.length, completed, failed, ok: completed > 0 });
            } finally {
                if (typeof options.setBusy === 'function') options.setBusy(false);
                if (typeof options.render === 'function') options.render(batchOptions.finalRenderOptions || {});
            }
        }

        return Object.freeze({
            version: '1.4.28-app-slimdown',
            runBatch
        });
    }

    global.FoxBearMasteringOrchestratorService = Object.freeze({
        version: '1.4.28-app-slimdown',
        createMasteringBatchRunner
    });
})(window);
