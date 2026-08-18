// FoxBear app-level Worker recovery bridge v1.6.105 - rebuilds work from retained track sources
'use strict';

(function attachFoxBearWorkerRecoveryAppBridge(global) {
    const VERSION = '1.6.105-header-dock-css-ownership-hardening';
    const coordinator = global.FoxBearWorkerRecoveryCoordinator;
    if (!coordinator?.registerHandler) return;

    function parseTarget(job) {
        const jobId = String(job?.jobId || '');
        let match = /^analysis:([^:]+)$/.exec(jobId);
        if (match) return Object.freeze({ kind: 'analysis', trackId: match[1], jobId });
        match = /^master:([^:]+):/.exec(jobId);
        if (match) return Object.freeze({ kind: 'mastering', trackId: match[1], jobId });
        match = /^master-preview:([^:]+):/.exec(jobId);
        if (match) return Object.freeze({ kind: 'preview', trackId: match[1], jobId });
        return null;
    }

    function findTrack(trackId) {
        return Array.isArray(state?.tracks) ? state.tracks.find(track => String(track?.id || '') === String(trackId || '')) || null : null;
    }

    function sleep(ms) {
        return new Promise(resolve => global.setTimeout(resolve, Math.max(0, Number(ms) || 0)));
    }

    async function waitUntil(predicate, timeoutMs = 6000) {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
            try { if (predicate()) return true; } catch (error) {}
            await sleep(60);
        }
        try { return Boolean(predicate()); } catch (error) { return false; }
    }

    function canRetry(target) {
        const track = findTrack(target?.trackId);
        if (!track?.file) return false;
        if (target.kind === 'preview') return Boolean(track.analysis && !track.error);
        return true;
    }

    async function retryAnalysis(track) {
        const settled = await waitUntil(() => !track.analysisPromise && !track.analysisTask, 6000);
        if (!settled) throw Object.assign(new Error('기존 분석 작업 종료를 기다리는 중입니다.'), { code: 'FOXBEAR_WORKER_RETRY_NOT_SETTLED' });
        if (track.analysis && !track.error) return true;
        track.error = null;
        track.status = 'queued';
        track.progress = 0;
        track.report = '정체 분석 복구 · 다시 분석 대기 중';
        const queue = getImportAnalysisQueueController();
        const queued = Boolean(queue?.queueTrack?.(track));
        if (queued) queue.schedule?.(0);
        scheduleRenderAll?.('worker-recovery-analysis', { keepDetailAudio: true, immediate: true });
        return queued;
    }

    async function retryMastering(track) {
        const settled = await waitUntil(() => track.status !== 'processing' && !track.masteringAbortController, 7000);
        if (!settled) throw Object.assign(new Error('기존 마스터링 작업 종료를 기다리는 중입니다.'), { code: 'FOXBEAR_WORKER_RETRY_NOT_SETTLED' });
        clearStaleBusyFlagIfIdle?.('worker-recovery-mastering');
        if (state.busy && hasActiveBlockingWork?.()) throw Object.assign(new Error('다른 작업이 진행 중이라 재시도를 시작할 수 없습니다.'), { code: 'FOXBEAR_WORKER_RETRY_BUSY' });
        track.error = null;
        track.status = track.analysis ? 'ready' : 'queued';
        track.progress = 0;
        track.report = '정체 Worker 복구 · 마스터링 다시 시작 중';
        preparePrimaryActionTrack?.(track);
        renderAll?.({ keepDetailAudio: true });
        return await masterTrack(track, false, { source: 'worker-recovery', notifyBlocked: true, forceIfIdle: true });
    }

    async function retryPreview(track) {
        const settled = await waitUntil(() => track.masterPreviewStatus !== 'processing' && !track.masterPreviewAbortController, 7000);
        if (!settled) throw Object.assign(new Error('기존 하이라이트 작업 종료를 기다리는 중입니다.'), { code: 'FOXBEAR_WORKER_RETRY_NOT_SETTLED' });
        clearStaleBusyFlagIfIdle?.('worker-recovery-preview');
        if (state.busy && hasActiveBlockingWork?.()) throw Object.assign(new Error('다른 작업이 진행 중이라 하이라이트를 다시 만들 수 없습니다.'), { code: 'FOXBEAR_WORKER_RETRY_BUSY' });
        track.masterPreviewStatus = 'idle';
        track.report = '정체 Worker 복구 · 하이라이트 다시 생성 중';
        await renderMasterPreviewForTrack(track, { source: 'worker-recovery' });
        return track.masterPreviewStatus === 'ready';
    }

    coordinator.registerHandler({
        id: 'foxbear-track-worker-recovery',
        match: parseTarget,
        canRetry,
        getKey: target => `${target.kind}:${target.trackId}`,
        async retry(target) {
            const track = findTrack(target.trackId);
            if (!track) return false;
            if (target.kind === 'analysis') return retryAnalysis(track);
            if (target.kind === 'mastering') return retryMastering(track);
            if (target.kind === 'preview') return retryPreview(track);
            return false;
        }
    });

    global.FoxBearWorkerRecoveryAppBridge = Object.freeze({ version: VERSION, parseTarget, canRetry: job => Boolean(parseTarget(job) && canRetry(parseTarget(job))) });
})(window);
