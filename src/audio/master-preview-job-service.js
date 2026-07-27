// FoxBear master preview job service v1.6.10 - cancellable preview ownership and stale-result isolation
'use strict';

(function attachFoxBearMasterPreviewJobService(global) {
    const VERSION = '1.6.10-incident-readiness-contract-csp-cache-hardening';
    let sequence = 0;

    function createFallbackAbortController() {
        const listeners = new Set();
        const signal = {
            aborted: false,
            reason: undefined,
            addEventListener(type, listener) { if (type === 'abort' && typeof listener === 'function') listeners.add(listener); },
            removeEventListener(type, listener) { if (type === 'abort') listeners.delete(listener); }
        };
        return {
            signal,
            abort(reason = 'master-preview-cancelled') {
                if (signal.aborted) return;
                signal.aborted = true;
                signal.reason = reason;
                Array.from(listeners).forEach(listener => { try { listener.call(signal, { type: 'abort', target: signal }); } catch (error) {} });
                listeners.clear();
            }
        };
    }

    function createController() {
        return typeof global.AbortController === 'function' ? new global.AbortController() : createFallbackAbortController();
    }

    function createJobId(label = 'master-preview') {
        sequence = (sequence + 1) % 0x7fffffff;
        return `${String(label || 'master-preview')}:${Date.now().toString(36)}:${sequence.toString(36)}`;
    }

    function makeAbortError(reason = 'master-preview-cancelled', stage = '') {
        if (reason instanceof Error) return reason;
        const detail = String(reason || 'master-preview-cancelled');
        const error = new Error(stage ? `${detail} (${stage})` : detail);
        error.name = 'AbortError';
        error.code = 'FOXBEAR_MASTER_PREVIEW_CANCELLED';
        error.stage = String(stage || '');
        return error;
    }

    function isAbortError(error) {
        return Boolean(error && (error.name === 'AbortError' || error.code === 'FOXBEAR_MASTER_PREVIEW_CANCELLED' || error.code === 'FOXBEAR_WORKER_JOB_CANCELLED'));
    }

    function owns(track, job) {
        return Boolean(track && job && track.masterPreviewAbortController === job.controller && String(track.masterPreviewJobId || '') === String(job.id || ''));
    }

    function cancel(track, reason = 'master-preview-cancelled') {
        if (!track) return false;
        const controller = track.masterPreviewAbortController || null;
        const hadJob = Boolean(controller || track.masterPreviewJobId);
        track.masterPreviewAbortController = null;
        track.masterPreviewJobId = '';
        try { if (controller && !controller.signal?.aborted) controller.abort(reason); } catch (error) {}
        return hadJob;
    }

    function create(track, options = {}) {
        if (!track) throw new TypeError('마스터 미리듣기 작업 트랙이 없습니다.');
        cancel(track, options.supersedeReason || 'master-preview-superseded');
        const controller = createController();
        const id = String(options.jobId || createJobId(options.label));
        const job = Object.freeze({ id, controller, signal: controller.signal, startedAt: Date.now() });
        track.masterPreviewAbortController = controller;
        track.masterPreviewJobId = id;
        return job;
    }

    function assertActive(track, job, isTrackActive = null, stage = '') {
        if (!owns(track, job)) throw makeAbortError('master-preview-stale-owner', stage);
        if (job.signal?.aborted) throw makeAbortError(job.signal.reason || 'master-preview-aborted', stage);
        if (typeof isTrackActive === 'function' && !isTrackActive(track)) throw makeAbortError('master-preview-track-detached', stage);
        return true;
    }

    function finish(track, job) {
        if (!owns(track, job)) return false;
        track.masterPreviewAbortController = null;
        track.masterPreviewJobId = '';
        return true;
    }

    global.FoxBearMasterPreviewJobService = Object.freeze({
        version: VERSION,
        createJobId,
        makeAbortError,
        isAbortError,
        owns,
        create,
        cancel,
        assertActive,
        finish
    });
})(window);
