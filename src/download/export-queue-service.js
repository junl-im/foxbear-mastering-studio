// FoxBear individual export queue v1.6.89 - pause, recovery, failure diagnostics and advisory ETA
'use strict';

(function attachFoxBearExportQueueService(global) {
    const VERSION = 'v1.6.89-mobile-header-flex-ownership-browser-gate-recovery';
    const MB = 1024 * 1024;
    const MAX_ITEMS = 200;
    const MIN_THROUGHPUT_BYTES_PER_MS = 0.5 * MB / 1000;
    const MAX_THROUGHPUT_BYTES_PER_MS = 200 * MB / 1000;
    const state = {
        active: false,
        preparing: false,
        delivering: false,
        paused: false,
        pauseReason: '',
        backgrounded: false,
        cancelRequested: false,
        controller: null,
        items: [],
        currentIndex: 0,
        mode: 'download',
        startedAt: 0,
        options: null,
        storage: null,
        lastMessage: '',
        throughputBytesPerMs: 0,
        lastDeliveryMs: 0
    };

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, Number(value) || 0));
    }

    function reportExportIncident(error, context = '') {
        global.FoxBearIncidentReporter?.report?.({
            category: 'export', severity: 'error', reason: error?.code || 'export-queue-failed',
            message: error?.message || 'Export queue delivery failed', error, context
        }, { automatic: true }).catch?.(() => {});
    }

    function cloneItem(item) {
        return Object.freeze({
            id: item.id,
            trackId: item.trackId,
            fileName: item.fileName,
            size: item.size,
            status: item.status,
            attempts: item.attempts,
            error: item.error || '',
            errorCode: item.errorCode || '',
            errorKind: item.errorKind || '',
            errorHint: item.errorHint || '',
            retryable: item.retryable !== false,
            estimatedMs: Number(item.estimatedMs || 0),
            lastDurationMs: Number(item.lastDurationMs || 0)
        });
    }

    function getCounts() {
        const counts = { pending: 0, ready: 0, delivering: 0, done: 0, failed: 0, skipped: 0 };
        state.items.forEach(item => {
            if (Object.prototype.hasOwnProperty.call(counts, item.status)) counts[item.status] += 1;
        });
        return counts;
    }

    function getCurrentItem() {
        for (let index = Math.max(0, state.currentIndex); index < state.items.length; index += 1) {
            const item = state.items[index];
            if (item && !['done', 'skipped'].includes(item.status)) {
                state.currentIndex = index;
                return item;
            }
        }
        return null;
    }

    function getDefaultThroughputBytesPerMs(options = state.options) {
        const env = options?.environment || {};
        const mobile = Boolean(env.mobile || env.coarsePointer || /Android|iPhone|iPad|Mobile/i.test(String(global.navigator?.userAgent || '')));
        return (mobile ? 8 : 28) * MB / 1000;
    }

    function estimateItemMs(item) {
        if (!item || state.mode !== 'picker') return 0;
        const throughput = clamp(state.throughputBytesPerMs || getDefaultThroughputBytesPerMs(), MIN_THROUGHPUT_BYTES_PER_MS, MAX_THROUGHPUT_BYTES_PER_MS);
        return clamp(Number(item.size || 0) / throughput + 350, 500, 180000);
    }

    function estimateRemainingMs() {
        if (state.mode !== 'picker') return 0;
        return state.items.reduce((sum, item) => {
            if (!item || ['done', 'skipped'].includes(item.status)) return sum;
            return sum + estimateItemMs(item);
        }, 0);
    }

    function getSnapshot() {
        const counts = getCounts();
        const current = getCurrentItem();
        if (current) current.estimatedMs = estimateItemMs(current);
        return Object.freeze({
            version: VERSION,
            active: Boolean(state.active),
            preparing: Boolean(state.preparing),
            delivering: Boolean(state.delivering),
            paused: Boolean(state.paused),
            pauseReason: state.pauseReason,
            backgrounded: Boolean(state.backgrounded),
            cancelRequested: Boolean(state.cancelRequested),
            mode: state.mode,
            startedAt: state.startedAt,
            elapsedMs: state.startedAt ? Math.max(0, Date.now() - state.startedAt) : 0,
            lastDeliveryMs: Number(state.lastDeliveryMs || 0),
            estimatedCurrentMs: current ? estimateItemMs(current) : 0,
            estimatedRemainingMs: estimateRemainingMs(),
            total: state.items.length,
            currentIndex: current ? state.currentIndex : state.items.length,
            current: current ? cloneItem(current) : null,
            counts: Object.freeze({ ...counts }),
            storage: state.storage ? Object.freeze({ ...state.storage }) : null,
            message: state.lastMessage,
            items: Object.freeze(state.items.map(cloneItem))
        });
    }

    function dispatchSnapshot(snapshot) {
        try { global.dispatchEvent?.(new CustomEvent('foxbear:export-queue-state', { detail: snapshot })); } catch (error) {}
    }

    function notify(message = '', options = state.options) {
        if (message) state.lastMessage = String(message);
        const snapshot = getSnapshot();
        try { options?.onStateChange?.(snapshot); } catch (error) {}
        try {
            global.FoxBearServiceWorkerUpdateService?.publishActivity?.(Boolean(snapshot.active || snapshot.preparing || snapshot.delivering));
        } catch (error) {}
        dispatchSnapshot(snapshot);
        return snapshot;
    }

    function makeAbortError(reason) {
        const error = new Error(String(reason || 'export-queue-cancelled'));
        error.name = 'AbortError';
        error.code = 'FOXBEAR_EXPORT_QUEUE_CANCELLED';
        return error;
    }

    function isQueueAbort(error) {
        return Boolean(error?.code === 'FOXBEAR_EXPORT_QUEUE_CANCELLED' || (state.controller?.signal?.aborted && error?.name === 'AbortError'));
    }

    function isUserDismiss(error) {
        return Boolean(error?.name === 'AbortError' && !state.controller?.signal?.aborted);
    }

    function classifyDeliveryError(error, mode = state.mode) {
        const name = String(error?.name || 'Error');
        const message = String(error?.message || error || '저장 실패');
        const text = `${name} ${message}`.toLowerCase();
        if (isUserDismiss(error)) {
            return Object.freeze({ code: 'user-dismissed', kind: 'dismissed', title: '저장창을 닫았습니다.', hint: '같은 파일을 다시 시도할 수 있습니다.', retryable: true });
        }
        if (name === 'QuotaExceededError' || /quota|disk full|not enough space|no space|저장.?공간|용량.?부족/.test(text)) {
            return Object.freeze({ code: 'storage-full', kind: 'storage', title: '저장 공간이 부족할 수 있습니다.', hint: '기기 저장 공간을 확보한 뒤 현재 파일을 다시 시도하세요.', retryable: true });
        }
        if (['NotAllowedError', 'SecurityError', 'InvalidStateError'].includes(name) || /permission|activation|user gesture|권한|허용/.test(text)) {
            return Object.freeze({ code: 'permission-required', kind: 'permission', title: '브라우저가 저장 권한을 허용하지 않았습니다.', hint: '페이지를 활성화한 뒤 현재 파일 저장 버튼을 다시 누르세요.', retryable: true });
        }
        if (['NotSupportedError', 'DataError'].includes(name) || /not supported|unsupported|지원하지/.test(text)) {
            const hint = mode === 'share' ? '외부 브라우저에서 직접 저장을 사용하세요.' : '다른 저장 방식이나 외부 브라우저를 사용하세요.';
            return Object.freeze({ code: 'delivery-unsupported', kind: 'unsupported', title: '현재 브라우저의 저장 방식이 지원되지 않습니다.', hint, retryable: false });
        }
        if (['NotFoundError', 'NoModificationAllowedError', 'InvalidModificationError', 'UnknownError'].includes(name) || /file system|write|writable|파일.?시스템|쓰기/.test(text)) {
            return Object.freeze({ code: 'file-write-failed', kind: 'filesystem', title: '파일 쓰기를 완료하지 못했습니다.', hint: '다른 폴더를 선택하거나 파일 앱 권한을 확인한 뒤 다시 시도하세요.', retryable: true });
        }
        if (name === 'NetworkError' || (name === 'TypeError' && mode === 'download') || /network|fetch|offline|네트워크/.test(text)) {
            return Object.freeze({ code: 'network-failed', kind: 'network', title: '브라우저 다운로드 요청이 중단됐습니다.', hint: '연결 상태와 브라우저 다운로드 권한을 확인한 뒤 다시 시도하세요.', retryable: true });
        }
        return Object.freeze({ code: 'delivery-failed', kind: 'unknown', title: '파일 저장에 실패했습니다.', hint: '현재 파일을 다시 시도하거나 건너뛰세요.', retryable: true });
    }

    async function getStorageAdvisory(outputBytes = 0) {
        const storage = global.navigator?.storage;
        if (!storage || typeof storage.estimate !== 'function') {
            return Object.freeze({ supported: false, scope: 'origin-cache-only', reliableForDownloadDestination: false, warning: '' });
        }
        try {
            const estimate = await storage.estimate();
            const quota = Math.max(0, Number(estimate?.quota || 0));
            const usage = Math.max(0, Number(estimate?.usage || 0));
            const available = Math.max(0, quota - usage);
            const cautionThreshold = Math.max(64 * MB, Math.min(256 * MB, Math.round(Math.max(0, Number(outputBytes) || 0) * 0.15)));
            const warning = quota > 0 && available < cautionThreshold
                ? '브라우저 앱 임시 저장공간이 부족합니다. 다운로드 폴더 여유와는 별도이며, 캐시·복구 기능이 불안정할 수 있습니다.'
                : '';
            return Object.freeze({ supported: true, quota, usage, available, cautionThreshold, scope: 'origin-cache-only', reliableForDownloadDestination: false, warning });
        } catch (error) {
            return Object.freeze({ supported: false, scope: 'origin-cache-only', reliableForDownloadDestination: false, warning: '' });
        }
    }

    function resolveMode(options, files) {
        const env = options.environment || {};
        if (env.restricted) {
            const shareable = typeof options.canShareFile === 'function' && files.every(file => options.canShareFile(file.blob, file.fileName));
            return shareable && typeof options.shareFile === 'function' ? 'share' : 'unsupported';
        }
        if (options.preferPicker !== false && typeof options.saveWithPicker === 'function' && options.supportsPicker === true) return 'picker';
        return typeof options.downloadFile === 'function' ? 'download' : 'unsupported';
    }

    function normalizeFiles(options) {
        const input = Array.isArray(options.files) ? options.files : [];
        if (!input.length) return [];
        if (input.length > MAX_ITEMS) throw new Error(`순차 저장 파일 수가 안전 한도(${MAX_ITEMS}개)를 넘었습니다.`);
        return input.map((file, index) => {
            if (!(file?.blob instanceof global.Blob) || !Number.isFinite(file.blob.size) || file.blob.size <= 0) {
                throw new Error(`${index + 1}번째 내보내기 파일이 올바르지 않습니다.`);
            }
            return {
                id: String(file.id || `export-${index + 1}`),
                trackId: String(file.trackId || file.id || ''),
                fileName: String(file.fileName || `mastered ${index + 1}.wav`),
                blob: file.blob,
                size: file.blob.size,
                status: 'pending',
                attempts: 0,
                error: '',
                errorCode: '',
                errorKind: '',
                errorHint: '',
                retryable: true,
                estimatedMs: 0,
                lastDurationMs: 0
            };
        });
    }

    function resetState() {
        state.active = false;
        state.preparing = false;
        state.delivering = false;
        state.paused = false;
        state.pauseReason = '';
        state.backgrounded = false;
        state.cancelRequested = false;
        state.controller = null;
        state.items = [];
        state.currentIndex = 0;
        state.mode = 'download';
        state.startedAt = 0;
        state.options = null;
        state.storage = null;
        state.lastMessage = '';
        state.throughputBytesPerMs = 0;
        state.lastDeliveryMs = 0;
    }

    async function start(options = {}) {
        const progressView = options.progressView || global.FoxBearExportProgressView;
        if (state.active || state.preparing || state.delivering) {
            progressView?.show?.();
            options.showToast?.('곡별 순차 저장이 이미 진행 중입니다. 진행 패널을 확인하세요.');
            return Object.freeze({ ok: false, duplicate: true, snapshot: getSnapshot() });
        }
        if (global.FoxBearZipExportService?.getSnapshot?.().active) {
            options.showToast?.('ZIP 내보내기를 먼저 취소하거나 완료해 주세요.');
            return Object.freeze({ ok: false, conflictingExport: true });
        }

        let files;
        try { files = normalizeFiles(options); }
        catch (error) {
            progressView?.failQueue?.(error?.message || '순차 저장 파일을 준비하지 못했습니다.');
            return Object.freeze({ ok: false, error });
        }
        if (!files.length) return Object.freeze({ ok: false, empty: true });

        const mode = resolveMode(options, files);
        if (mode === 'unsupported') {
            const message = options.environment?.restricted
                ? '현재 인앱 브라우저는 파일 공유를 지원하지 않습니다. 외부 브라우저에서 곡별 순차 저장을 사용하세요.'
                : '현재 브라우저에서는 곡별 순차 저장을 시작할 수 없습니다.';
            progressView?.failQueue?.(message);
            options.showToast?.(message);
            return Object.freeze({ ok: false, unsupported: true });
        }

        state.active = true;
        state.preparing = true;
        state.delivering = false;
        state.paused = false;
        state.pauseReason = '';
        state.backgrounded = Boolean(global.document?.hidden);
        state.cancelRequested = false;
        state.controller = new global.AbortController();
        state.items = files;
        state.currentIndex = 0;
        state.mode = mode;
        state.startedAt = Date.now();
        state.options = options;
        state.storage = null;
        state.lastMessage = '파일을 검증하는 중입니다.';
        state.throughputBytesPerMs = 0;
        state.lastDeliveryMs = 0;
        progressView?.beginQueue?.({ total: files.length, outputBytes: files.reduce((sum, file) => sum + file.size, 0), mode });
        notify('', options);

        try {
            const outputBytes = files.reduce((sum, file) => sum + file.size, 0);
            state.storage = await getStorageAdvisory(outputBytes);
            for (let index = 0; index < files.length; index += 1) {
                if (state.controller.signal.aborted) throw makeAbortError(state.controller.signal.reason);
                const item = files[index];
                await options.validateFile?.(item.blob, item.fileName);
                if (state.controller.signal.aborted) throw makeAbortError(state.controller.signal.reason);
                item.status = 'ready';
                item.estimatedMs = estimateItemMs(item);
                state.currentIndex = Math.min(state.currentIndex, index);
                progressView?.updateQueue?.({ ...getSnapshot(), phase: 'preparing', prepared: index + 1 });
            }
            state.preparing = false;
            if (state.backgrounded) {
                state.paused = true;
                state.pauseReason = 'background';
                state.lastMessage = '앱이 백그라운드에 있어 순차 저장을 일시정지했습니다.';
            } else {
                state.lastMessage = state.storage?.warning || '파일 준비 완료 · 다음 파일 저장 버튼을 누르세요.';
            }
            progressView?.updateQueue?.({ ...getSnapshot(), phase: state.paused ? 'paused' : 'ready' });
            options.showToast?.(`${files.length}개 파일을 순차 저장할 준비가 됐습니다.`);
            notify('', options);
            return Object.freeze({ ok: true, snapshot: getSnapshot() });
        } catch (error) {
            if (isQueueAbort(error)) {
                progressView?.cancelQueue?.('곡별 순차 저장 준비를 취소했습니다.');
                const snapshot = getSnapshot();
                resetState();
                notify('', options);
                return Object.freeze({ ok: false, cancelled: true, snapshot });
            }
            const message = error?.message || '곡별 순차 저장 파일 검증에 실패했습니다.';
            progressView?.failQueue?.(message);
            options.showToast?.(message);
            const snapshot = getSnapshot();
            resetState();
            notify('', options);
            return Object.freeze({ ok: false, error, snapshot });
        }
    }

    function updateThroughput(item, durationMs) {
        if (state.mode !== 'picker' || !item || durationMs < 250 || !Number.isFinite(item.size)) return;
        const measured = clamp(item.size / durationMs, MIN_THROUGHPUT_BYTES_PER_MS, MAX_THROUGHPUT_BYTES_PER_MS);
        state.throughputBytesPerMs = state.throughputBytesPerMs > 0
            ? state.throughputBytesPerMs * 0.65 + measured * 0.35
            : measured;
    }

    async function deliverCurrent() {
        const options = state.options || {};
        const progressView = options.progressView || global.FoxBearExportProgressView;
        if (!state.active || state.preparing || state.delivering) return Object.freeze({ ok: false, unavailable: true, snapshot: getSnapshot() });
        if (state.paused || state.backgrounded) return Object.freeze({ ok: false, paused: true, snapshot: getSnapshot() });
        const item = getCurrentItem();
        if (!item) return finishQueue();
        if (state.controller?.signal?.aborted) return Object.freeze({ ok: false, cancelled: true, snapshot: getSnapshot() });

        state.delivering = true;
        item.status = 'delivering';
        item.error = '';
        item.errorCode = '';
        item.errorKind = '';
        item.errorHint = '';
        item.retryable = true;
        item.attempts += 1;
        item.estimatedMs = estimateItemMs(item);
        const deliveryStartedAt = Date.now();
        state.lastMessage = `${item.fileName} 저장 요청 중`;
        progressView?.updateQueue?.({ ...getSnapshot(), phase: 'delivering' });
        notify('', options);

        try {
            let result;
            if (state.mode === 'share') result = await options.shareFile(item.blob, item.fileName);
            else if (state.mode === 'picker') result = await options.saveWithPicker(item.blob, item.fileName);
            else result = await options.downloadFile(item.blob, item.fileName);
            if (state.controller?.signal?.aborted || state.cancelRequested) throw makeAbortError(state.controller?.signal?.reason || 'queue-cancelled-after-delivery');
            const durationMs = Math.max(0, Date.now() - deliveryStartedAt);
            item.lastDurationMs = durationMs;
            state.lastDeliveryMs = durationMs;
            updateThroughput(item, durationMs);
            item.status = 'done';
            item.error = '';
            state.currentIndex += 1;
            state.delivering = false;
            const next = getCurrentItem();
            if (!next) return finishQueue(result);
            if (state.backgrounded) {
                state.paused = true;
                state.pauseReason = 'background';
                state.lastMessage = `${item.fileName} 처리 완료 · 앱으로 돌아오면 다음 파일을 저장할 수 있습니다.`;
            } else {
                state.lastMessage = `${item.fileName} 처리 완료 · 다음 파일을 저장하세요.`;
            }
            progressView?.updateQueue?.({ ...getSnapshot(), phase: state.paused ? 'paused' : 'ready', lastResult: result || null });
            notify('', options);
            return Object.freeze({ ok: true, complete: false, result, snapshot: getSnapshot() });
        } catch (error) {
            state.delivering = false;
            if (isQueueAbort(error)) {
                item.status = 'ready';
                return cancel('queue-cancelled-during-delivery');
            }
            const diagnosis = classifyDeliveryError(error, state.mode);
            if (diagnosis.kind === 'dismissed') {
                item.status = 'ready';
                item.error = '';
                item.errorCode = diagnosis.code;
                item.errorKind = diagnosis.kind;
                item.errorHint = diagnosis.hint;
                state.lastMessage = `${diagnosis.title} ${diagnosis.hint}`;
                progressView?.updateQueue?.({ ...getSnapshot(), phase: 'ready', dismissed: true, diagnosis });
                notify('', options);
                return Object.freeze({ ok: false, dismissed: true, diagnosis, snapshot: getSnapshot() });
            }
            reportExportIncident(error, `mode=${state.mode}; kind=${diagnosis.kind}; code=${diagnosis.code}; attempts=${item.attempts}; size=${item.size}`);
            item.status = 'failed';
            item.error = diagnosis.title;
            item.errorCode = diagnosis.code;
            item.errorKind = diagnosis.kind;
            item.errorHint = diagnosis.hint;
            item.retryable = diagnosis.retryable;
            state.lastMessage = `${diagnosis.title} ${diagnosis.hint}`;
            progressView?.updateQueue?.({ ...getSnapshot(), phase: 'failed', error: item.error, diagnosis });
            options.showToast?.(diagnosis.title);
            notify('', options);
            return Object.freeze({ ok: false, error, diagnosis, snapshot: getSnapshot() });
        }
    }

    function skipCurrent() {
        if (!state.active || state.preparing || state.delivering || state.paused) return Object.freeze({ ok: false, unavailable: true, snapshot: getSnapshot() });
        const item = getCurrentItem();
        if (!item) return finishQueue();
        item.status = 'skipped';
        item.error = '';
        item.errorCode = '';
        item.errorKind = '';
        item.errorHint = '';
        state.currentIndex += 1;
        const next = getCurrentItem();
        if (!next) return finishQueue();
        state.lastMessage = `${item.fileName}을 건너뛰었습니다.`;
        state.options?.progressView?.updateQueue?.({ ...getSnapshot(), phase: 'ready' });
        notify();
        return Object.freeze({ ok: true, skipped: true, snapshot: getSnapshot() });
    }

    function pause(reason = 'user-paused') {
        if (!state.active || state.preparing || state.delivering) return Object.freeze({ ok: false, unavailable: true, snapshot: getSnapshot() });
        if (state.paused) return Object.freeze({ ok: true, alreadyPaused: true, snapshot: getSnapshot() });
        state.paused = true;
        state.pauseReason = String(reason || 'user-paused');
        state.lastMessage = state.pauseReason === 'background'
            ? '앱이 백그라운드에 있어 순차 저장을 일시정지했습니다.'
            : '곡별 순차 저장을 일시정지했습니다.';
        state.options?.progressView?.updateQueue?.({ ...getSnapshot(), phase: 'paused' });
        const snapshot = notify();
        return Object.freeze({ ok: true, paused: true, snapshot });
    }

    function resume(reason = 'user-resumed') {
        if (!state.active || state.preparing || state.delivering) return Object.freeze({ ok: false, unavailable: true, snapshot: getSnapshot() });
        if (state.backgrounded) return Object.freeze({ ok: false, backgrounded: true, snapshot: getSnapshot() });
        if (!state.paused) return Object.freeze({ ok: true, alreadyRunning: true, snapshot: getSnapshot() });
        state.paused = false;
        state.pauseReason = '';
        const item = getCurrentItem();
        state.lastMessage = reason === 'foreground-restored'
            ? '앱 복귀 완료 · 현재 파일부터 계속 저장할 수 있습니다.'
            : '곡별 순차 저장을 계속합니다.';
        const phase = item?.status === 'failed' ? 'failed' : 'ready';
        state.options?.progressView?.updateQueue?.({ ...getSnapshot(), phase });
        const snapshot = notify();
        return Object.freeze({ ok: true, resumed: true, snapshot });
    }

    function togglePause() {
        return state.paused ? resume('user-resumed') : pause('user-paused');
    }

    function finishQueue(result = null) {
        const options = state.options || {};
        const progressView = options.progressView || global.FoxBearExportProgressView;
        const counts = getCounts();
        state.active = false;
        state.preparing = false;
        state.delivering = false;
        state.paused = false;
        state.pauseReason = '';
        state.backgrounded = false;
        state.cancelRequested = false;
        state.controller = null;
        state.currentIndex = state.items.length;
        state.lastMessage = counts.skipped || counts.failed
            ? `순차 저장 종료 · 완료 ${counts.done}개 · 건너뜀 ${counts.skipped}개 · 실패 ${counts.failed}개`
            : `${counts.done}개 파일 순차 저장을 완료했습니다.`;
        progressView?.completeQueue?.(getSnapshot());
        options.showToast?.(state.lastMessage);
        try { options.onFinally?.(); } catch (error) {}
        const snapshot = notify('', options);
        state.options = null;
        return Object.freeze({ ok: true, complete: true, result, snapshot });
    }

    function cancel(reason = 'user-cancelled') {
        if (!state.active && !state.preparing && !state.delivering) return Object.freeze({ ok: false, inactive: true, snapshot: getSnapshot() });
        const options = state.options || {};
        const progressView = options.progressView || global.FoxBearExportProgressView;
        state.cancelRequested = true;
        try { state.controller?.abort?.(String(reason || 'user-cancelled')); } catch (error) {}
        state.active = false;
        state.preparing = false;
        state.delivering = false;
        state.paused = false;
        state.pauseReason = '';
        state.backgrounded = false;
        state.lastMessage = '곡별 순차 저장을 취소했습니다.';
        progressView?.cancelQueue?.(state.lastMessage);
        try { options.onFinally?.(); } catch (error) {}
        const snapshot = notify('', options);
        state.controller = null;
        state.options = null;
        return Object.freeze({ ok: true, cancelled: true, snapshot });
    }

    function refreshView() {
        const snapshot = getSnapshot();
        if ((snapshot.active || snapshot.preparing || snapshot.delivering) && state.options?.progressView?.updateQueue) {
            const phase = snapshot.preparing ? 'preparing' : (snapshot.delivering ? 'delivering' : (snapshot.paused ? 'paused' : (snapshot.current?.status === 'failed' ? 'failed' : 'ready')));
            state.options.progressView.updateQueue({ ...snapshot, phase });
        }
        return snapshot;
    }

    function handleVisibilityChange() {
        const hidden = Boolean(global.document?.hidden);
        state.backgrounded = hidden;
        if (!state.active) return getSnapshot();
        if (hidden) {
            if (!state.preparing && !state.delivering && !state.paused) pause('background');
            else refreshView();
            return getSnapshot();
        }
        if (state.paused && state.pauseReason === 'background') return resume('foreground-restored').snapshot;
        return refreshView();
    }

    global.addEventListener?.('foxbear:export-queue-next', () => { deliverCurrent(); });
    global.addEventListener?.('foxbear:export-queue-skip', () => { skipCurrent(); });
    global.addEventListener?.('foxbear:export-queue-cancel', () => { cancel('user-cancelled'); });
    global.addEventListener?.('foxbear:export-queue-pause-toggle', () => { togglePause(); });
    global.addEventListener?.('pageshow', () => { state.backgrounded = Boolean(global.document?.hidden); handleVisibilityChange(); });
    global.addEventListener?.('pagehide', event => {
        if (!event?.persisted) cancel('pagehide');
        else {
            state.backgrounded = true;
            if (state.active && !state.preparing && !state.delivering && !state.paused) pause('background');
        }
    });
    global.document?.addEventListener?.('visibilitychange', handleVisibilityChange);

    global.FoxBearExportQueueService = Object.freeze({
        version: VERSION,
        start,
        deliverCurrent,
        skipCurrent,
        pause,
        resume,
        togglePause,
        cancel,
        getSnapshot,
        getStorageAdvisory,
        classifyDeliveryError,
        refreshView
    });
})(window);
