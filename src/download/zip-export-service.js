// FoxBear ZIP export service v1.5.96 - cancellable worker orchestration and single-job ownership
'use strict';

(function attachFoxBearZipExportService(global) {
    const VERSION = 'v1.5.96-modal-focus-memory-diagnostics';
    const state = { controller: null, jobId: '', startedAt: 0, options: null };

    function getSnapshot() {
        return Object.freeze({
            version: VERSION,
            active: Boolean(state.controller && !state.controller.signal.aborted),
            jobId: state.jobId,
            startedAt: state.startedAt,
            elapsedMs: state.startedAt ? Math.max(0, Date.now() - state.startedAt) : 0
        });
    }

    function notify(options = state.options) {
        try { options?.onStateChange?.(getSnapshot()); } catch (error) {}
        try { global.FoxBearServiceWorkerUpdateService?.publishActivity?.(true); } catch (error) {}
    }

    function cancel(reason = 'user-cancelled') {
        if (!state.controller || state.controller.signal.aborted) return false;
        try { state.controller.abort(String(reason || 'user-cancelled')); }
        catch (error) { return false; }
        notify();
        return true;
    }

    function getTimeoutMs(outputBytes = 0, fileCount = 0) {
        const bytes = Math.max(0, Number(outputBytes) || 0);
        const files = Math.max(1, Number(fileCount) || 1);
        return Math.max(45000, Math.min(10 * 60 * 1000, 30000 + Math.ceil(bytes / (8 * 1024 * 1024)) * 1000 + files * 750));
    }

    function makeAbortError(options, reason) {
        return options?.workerJobService?.makeAbortError?.(reason) || Object.assign(new Error(String(reason || 'zip-cancelled')), { name: 'AbortError', code: 'FOXBEAR_WORKER_JOB_CANCELLED' });
    }

    function isAbortError(options, error) {
        return Boolean(options?.workerJobService?.isAbortError?.(error) || error?.name === 'AbortError' || error?.code === 'FOXBEAR_WORKER_JOB_CANCELLED');
    }

    function messageOf(options, error, fallback) {
        try { return options?.getErrorMessage?.(error, fallback) || error?.message || fallback; }
        catch (nested) { return error?.message || fallback; }
    }

    function reportExportIncident(error, context = '') {
        global.FoxBearIncidentReporter?.report?.({
            category: 'export', severity: 'error', reason: error?.code || 'zip-export-failed',
            message: error?.message || 'ZIP export failed', error, context
        }, { automatic: true }).catch?.(() => {});
    }

    async function start(options = {}) {
        const progressView = options.progressView || global.FoxBearExportProgressView;
        const queueSnapshot = global.FoxBearExportQueueService?.getSnapshot?.();
        if (queueSnapshot?.active || queueSnapshot?.preparing || queueSnapshot?.delivering) {
            progressView?.show?.();
            options.showToast?.('곡별 순차 저장을 먼저 취소하거나 완료해 주세요.');
            return Object.freeze({ ok: false, conflictingExport: true });
        }
        if (getSnapshot().active) {
            progressView?.show?.();
            options.showToast?.('ZIP 내보내기가 이미 진행 중입니다. 진행 패널에서 상태를 확인하세요.');
            return Object.freeze({ ok: false, duplicate: true });
        }
        const completed = Array.isArray(options.completed) ? options.completed.filter(track => track?.outBlob) : [];
        if (!completed.length) return Object.freeze({ ok: false, empty: true });
        const plan = options.plan || null;
        progressView?.begin?.(plan || { completedCount: completed.length, outputBytes: completed.reduce((sum, track) => sum + Number(track.outBlob?.size || 0), 0), estimatedZipBytes: 0, memoryPressure: 'unknown', warnings: [] });
        if (plan && !plan.ok) {
            const message = plan.warningMessage || 'ZIP으로 내보낼 파일을 확인하세요.';
            progressView?.fail?.(message);
            options.showToast?.(message);
            return Object.freeze({ ok: false, invalidPlan: true });
        }
        if (plan?.requiresIndividualDownload || plan?.canCreateZip === false) {
            const message = plan.blockReason || '현재 환경에서는 ZIP보다 곡별 다운로드가 안전합니다.';
            progressView?.fail?.(message);
            options.showToast?.(message);
            options.focusTrack?.(completed[0]);
            return Object.freeze({ ok: false, individual: true });
        }
        if (typeof global.Worker !== 'function' || typeof global.AbortController !== 'function' || typeof options.runWorkerJob !== 'function') {
            const message = '이 브라우저는 취소 가능한 ZIP 작업을 지원하지 않습니다. 곡별 다운로드를 사용하세요.';
            progressView?.fail?.(message);
            options.showToast?.(message);
            if (completed.length === 1) options.focusTrack?.(completed[0]);
            return Object.freeze({ ok: false, unsupported: true });
        }

        const controller = new global.AbortController();
        const jobId = options.workerJobService?.createJobId?.('zip-export') || `zip-export:${Date.now()}`;
        state.controller = controller;
        state.jobId = jobId;
        state.startedAt = Date.now();
        state.options = options;
        progressView?.setCancellable?.(true);
        notify(options);

        let zipBlob = null;
        try {
            const files = (plan?.files || completed.map(track => ({ fileName: track.outName || `${String(track.name || 'track').replace(/\.[^.]+$/, '')}_mastered.wav`, blob: track.outBlob })))
                .map(file => ({ fileName: file.fileName, blob: file.blob }));
            if (plan?.warningMessage) options.showToast?.(plan.warningMessage);
            options.showToast?.(`${files.length}개 마스터 파일을 백그라운드 ZIP으로 묶는 중...`);
            const result = await options.runWorkerJob(options.workerUrl, { files }, [], {
                signal: controller.signal,
                jobId,
                label: 'ZIP 생성',
                timeoutMs: getTimeoutMs(plan?.outputBytes, files.length),
                onProgress: progress => progressView?.update?.({ percent: progress.percent, currentFile: progress.detail, stage: progress.stage, elapsedMs: progress.elapsedMs })
            });
            if (!result?.ok || !(result.blob instanceof global.Blob)) throw new Error(result?.error || 'ZIP 워커가 올바른 파일을 반환하지 않았습니다.');
            if (controller.signal.aborted || state.jobId !== jobId) throw makeAbortError(options, controller.signal.reason || 'zip-stale-result');
            zipBlob = result.blob;
            const validation = options.validateZipBlob?.(zipBlob, plan || { completedCount: completed.length, outputBytes: completed.reduce((sum, track) => sum + Number(track.outBlob?.size || 0), 0), compression: 'STORE' }) || { ok: Boolean(zipBlob), size: zipBlob?.size || 0 };
            if (!validation.ok) throw Object.assign(new Error('ZIP 검증 실패 · 곡별 다운로드를 사용해 주세요.'), { code: 'FOXBEAR_ZIP_VALIDATION_FAILED' });
            if (controller.signal.aborted || state.jobId !== jobId) throw makeAbortError(options, controller.signal.reason || 'zip-cancel-before-download');
            await options.downloadBlob?.(zipBlob, options.fileName || `foxbear_mastered_${Date.now()}.zip`);
            progressView?.complete?.(validation);
            options.showToast?.('마스터 파일 ZIP 다운로드를 시작했습니다.');
            return Object.freeze({ ok: true, validation });
        } catch (error) {
            if (isAbortError(options, error)) {
                progressView?.cancel?.('ZIP 생성을 취소했습니다. 생성 중이던 임시 데이터는 폐기했습니다.');
                options.showToast?.('ZIP 생성을 취소했습니다.');
                return Object.freeze({ ok: false, cancelled: true });
            }
            const message = messageOf(options, error, 'ZIP 생성 중 오류가 발생했습니다. 곡별 다운로드를 사용해 주세요.');
            reportExportIncident(error, `files=${completed.length}; outputBytes=${Number(plan?.outputBytes || 0)}; message=${message}`);
            const timeout = error?.code === 'FOXBEAR_WORKER_JOB_TIMEOUT';
            progressView?.fail?.(timeout ? 'ZIP 생성 제한시간을 초과했습니다. 곡별 다운로드를 사용해 주세요.' : message);
            options.showToast?.(timeout ? 'ZIP 생성 시간이 너무 길어 중단했습니다. 곡별 다운로드를 사용해 주세요.' : (/memory|allocation|arraybuffer|too large|out of memory/i.test(message) ? 'ZIP 메모리 한계에 도달했습니다. 곡별 다운로드를 사용해 주세요.' : 'ZIP 생성 실패 · 곡별 다운로드를 사용해 주세요.'));
            return Object.freeze({ ok: false, error });
        } finally {
            zipBlob = null;
            if (state.jobId === jobId) {
                state.controller = null;
                state.jobId = '';
                state.startedAt = 0;
                state.options = null;
            }
            progressView?.setCancellable?.(false);
            try { options.onFinally?.(); } catch (error) {}
            notify(options);
        }
    }

    global.addEventListener?.('foxbear:zip-export-cancel', () => cancel('user-cancelled'));
    global.addEventListener?.('pagehide', event => { if (!event?.persisted) cancel('pagehide'); });

    const api = Object.freeze({ version: VERSION, start, cancel, getSnapshot, getTimeoutMs });
    global.FoxBearZipExportService = api;
    global.FoxBearZipExport = api;
})(window);
