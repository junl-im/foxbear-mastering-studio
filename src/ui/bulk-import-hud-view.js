// FoxBear Bulk Import HUD view - v1.5.3
(function initBulkImportHudView(global) {
    'use strict';

    const VIEW_VERSION = '1.5.95-bulk-pause-skip-reorder-summary';
    // v1.5.95 compatibility QA anchor: const VIEW_VERSION = '1.5.95-popup-settings-mail-test-recovery'
    // compatibility anchor: const VIEW_VERSION = '1.5.95-bulk-control-eta-result-filter'
    // Legacy copy contract retained for regression discovery: 대량 마스터링 HUD
    const defaultDeps = Object.freeze({});
    let deps = defaultDeps;
    let eventsBound = false;
    const hudState = {
        batchId: '',
        phase: 'import',
        total: 0,
        startedAt: 0,
        completedAt: 0,
        dismissedBatchId: '',
        expanded: true,
        autoAdvancedBatchId: '',
        lastAutoScrolledTrackId: '',
        resultFilter: 'all',
        cancelRequested: false,
        paused: false,
        skipRequested: false
    };

    function configure(nextDeps = {}) {
        deps = Object.assign({}, deps, nextDeps || {});
        return api;
    }

    function getEl(key, id = key) {
        return deps.el?.[key] || global.document?.getElementById?.(id) || null;
    }

    function clampValue(value, min, max) {
        if (typeof deps.clamp === 'function') return deps.clamp(value, min, max);
        return Math.max(min, Math.min(max, value));
    }

    function getStateTracks() {
        return Array.isArray(deps.state?.tracks) ? deps.state.tracks : [];
    }

    function getMinTracks() {
        return Math.max(2, Number(deps.minTracks || 2) || 2);
    }

    function getHoldMs() {
        return Math.max(3000, Number(deps.doneHoldMs || 15000) || 15000);
    }

    function getLargeBatchThreshold() {
        if (typeof deps.getLargeBatchThreshold === 'function') return Math.max(2, Number(deps.getLargeBatchThreshold()) || 12);
        return Math.max(2, Number(deps.largeBatchThreshold || 12) || 12);
    }

    function init(nextDeps = null) {
        if (nextDeps) configure(nextDeps);
        if (eventsBound) return api;
        eventsBound = true;
        const toggle = getEl('bulkImportHudToggle');
        const close = getEl('bulkImportHudClose');
        const masterAll = getEl('bulkImportHudMasterAll');
        const pauseBatch = getEl('bulkImportHudPause');
        const skipCurrent = getEl('bulkImportHudSkip');
        const cancelBatch = getEl('bulkImportHudCancel');
        const retryFailed = getEl('bulkImportHudRetryFailed');
        const resultFilter = getEl('bulkImportHudFilter');
        if (toggle) {
            toggle.addEventListener('click', hideCurrentHud);
        }
        if (close) {
            close.addEventListener('click', hideCurrentHud);
        }
        if (masterAll) {
            masterAll.addEventListener('click', runMasterAllFromHud);
        }
        if (pauseBatch) pauseBatch.addEventListener('click', toggleMasteringPause);
        if (skipCurrent) skipCurrent.addEventListener('click', skipCurrentMasteringTrack);
        if (cancelBatch) {
            cancelBatch.addEventListener('click', cancelMasteringBatch);
        }
        if (retryFailed) {
            retryFailed.addEventListener('click', retryFailedMasteringTracks);
        }
        if (resultFilter) {
            resultFilter.addEventListener('change', () => {
                hudState.resultFilter = normalizeResultFilter(resultFilter.value);
                update();
            });
        }
        global.document?.addEventListener?.('click', event => {
            const restore = event.target?.closest?.('#bulkImportHudRestore');
            if (!restore) return;
            event.preventDefault();
            restoreHud();
        });
        return api;
    }

    function makeBatchId(prefix, tracks = [], options = {}) {
        if (options.batchId) return String(options.batchId);
        if (options.inheritImportBatch !== false) {
            const inherited = tracks.map(track => track && track.bulkImportBatchId).filter(Boolean);
            if (inherited.length && inherited.every(id => id === inherited[0])) return inherited[0];
        }
        return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function beginBatch(tracks, options = {}) {
        const items = Array.isArray(tracks) ? tracks.filter(Boolean) : [];
        if (items.length < getMinTracks()) return getSnapshot();
        const batchId = makeBatchId('bulk-import', items, Object.assign({}, options, { inheritImportBatch: false }));
        hudState.batchId = batchId;
        hudState.phase = 'import';
        hudState.total = items.length;
        hudState.startedAt = Date.now();
        hudState.completedAt = 0;
        hudState.dismissedBatchId = '';
        hudState.expanded = true;
        hudState.autoAdvancedBatchId = '';
        hudState.lastAutoScrolledTrackId = '';
        hudState.resultFilter = 'all';
        hudState.cancelRequested = false;
        hudState.paused = false;
        hudState.skipRequested = false;
        items.forEach((track, index) => {
            track.bulkImportBatchId = batchId;
            track.bulkImportOrder = index + 1;
            track.bulkImportTotal = items.length;
            track.bulkImportLargeBatch = Boolean(options.largeBatch);
        });
        update();
        return getSnapshot();
    }

    function beginMasteringBatch(tracks, options = {}) {
        const items = Array.isArray(tracks) ? tracks.filter(Boolean) : [];
        if (items.length < getMinTracks()) return getSnapshot();
        const batchId = makeBatchId('bulk-mastering', items, options);
        hudState.batchId = batchId;
        hudState.phase = 'mastering';
        hudState.total = items.length;
        hudState.startedAt = Date.now();
        hudState.completedAt = 0;
        hudState.dismissedBatchId = '';
        hudState.expanded = true;
        hudState.lastAutoScrolledTrackId = '';
        hudState.resultFilter = 'all';
        hudState.cancelRequested = false;
        hudState.paused = false;
        hudState.skipRequested = false;
        items.forEach((track, index) => {
            track.bulkMasteringBatchId = batchId;
            track.bulkMasteringOrder = index + 1;
            track.bulkMasteringTotal = items.length;
            track.bulkMasteringLargeBatch = Boolean(options.largeBatch || items.length >= getLargeBatchThreshold());
            track.bulkMasteringStartedAt = hudState.startedAt;
            track.bulkMasteringQueuedAt = Date.now();
            track.bulkMasteringTrackStartedAt = 0;
            track.bulkMasteringTrackCompletedAt = 0;
            track.bulkMasteringDurationMs = 0;
            track.bulkMasteringCancelReason = '';
            track.bulkMasteringSkipReason = '';
            track.bulkMasteringResult = 'queued';
            track.bulkMasteringSource = String(options.source || 'batch');
        });
        update();
        return getSnapshot();
    }

    function hideCurrentHud() {
        hudState.dismissedBatchId = hudState.batchId || hudState.dismissedBatchId;
        hudState.expanded = true;
        update();
    }

    function restoreHud() {
        hudState.dismissedBatchId = '';
        hudState.expanded = true;
        update();
        try { if (typeof deps.showToast === 'function') deps.showToast('대량 작업 HUD를 다시 표시했습니다.'); }
        catch (error) {}
        return getSnapshot();
    }

    function runMasterAllFromHud() {
        const localButton = getEl('bulkImportHudMasterAll');
        if (localButton?.disabled) return false;
        const mainButton = getEl('masterAllBtn');
        if (mainButton && !mainButton.disabled && typeof mainButton.click === 'function') {
            mainButton.click();
            return true;
        }
        if (typeof deps.onMasterAll === 'function') {
            deps.onMasterAll();
            return true;
        }
        return false;
    }

    // v1.5.95 compatibility: ['all', 'active', 'completed', 'failed', 'cancelled', 'pending']
    function normalizeResultFilter(value) {
        const filter = String(value || 'all');
        return ['all', 'active', 'completed', 'failed', 'skipped', 'cancelled', 'pending'].includes(filter) ? filter : 'all';
    }

    function toggleMasteringPause() {
        if (!isMasteringPhase()) return false;
        const accepted = hudState.paused
            ? (typeof deps.onResumeBatch === 'function' && deps.onResumeBatch('user-resume') !== false)
            : (typeof deps.onPauseBatch === 'function' && deps.onPauseBatch('user-pause-between-tracks') !== false);
        if (accepted) update();
        return Boolean(accepted);
    }

    function skipCurrentMasteringTrack() {
        if (!isMasteringPhase() || hudState.skipRequested) return false;
        const summary = getSummary();
        if (!summary.currentTrackId) return false;
        const accepted = typeof deps.onSkipCurrent === 'function' ? deps.onSkipCurrent('user-skip-current') !== false : false;
        if (accepted) { hudState.skipRequested = true; update(); }
        return Boolean(accepted);
    }

    function movePendingTrack(trackId, direction) {
        if (!isMasteringPhase() || typeof deps.onMoveTrack !== 'function') return false;
        const accepted = deps.onMoveTrack(trackId, direction) !== false;
        if (accepted) update();
        return Boolean(accepted);
    }

    function cancelMasteringBatch() {
        if (!isMasteringPhase() || hudState.cancelRequested) return false;
        const summary = getSummary();
        if (!summary.active && !summary.pending) return false;
        const accepted = typeof deps.onCancelBatch === 'function' ? deps.onCancelBatch('user-request') !== false : false;
        if (accepted) {
            hudState.cancelRequested = true;
            try { if (typeof deps.showToast === 'function') deps.showToast('현재 곡을 안전하게 중단하고 남은 다중 작업을 취소합니다.'); } catch (error) {}
            update();
        }
        return accepted;
    }

    function retryFailedMasteringTracks() {
        if (!isMasteringPhase()) return false;
        const summary = getSummary();
        if (summary.active || summary.pending || !summary.errors) return false;
        return typeof deps.onRetryFailed === 'function' ? deps.onRetryFailed() !== false : false;
    }

    function markMasteringTrackStart(track, meta = {}) {
        if (!track || !track.bulkMasteringBatchId) return false;
        track.bulkMasteringResult = 'running';
        track.bulkMasteringTrackStartedAt = Number(meta.startedAt || Date.now());
        track.bulkMasteringTrackCompletedAt = 0;
        track.bulkMasteringDurationMs = 0;
        track.bulkMasteringCancelReason = '';
        track.bulkMasteringAttempt = Math.max(1, Number(track.bulkMasteringAttempt || 0) + 1);
        hudState.cancelRequested = false;
        update();
        return true;
    }

    function markMasteringTrackResult(track, meta = {}) {
        if (!track || !track.bulkMasteringBatchId) return false;
        const outcome = ['completed', 'failed', 'skipped', 'cancelled'].includes(meta.outcome) ? meta.outcome : (meta.ok ? 'completed' : 'failed');
        const completedAt = Number(meta.completedAt || Date.now());
        const startedAt = Number(meta.startedAt || track.bulkMasteringTrackStartedAt || completedAt);
        track.bulkMasteringResult = outcome === 'completed' ? 'done' : (outcome === 'failed' ? 'error' : (outcome === 'skipped' ? 'skipped' : 'cancelled'));
        track.bulkMasteringTrackStartedAt = startedAt;
        track.bulkMasteringTrackCompletedAt = completedAt;
        track.bulkMasteringDurationMs = Math.max(0, completedAt - startedAt);
        track.bulkMasteringCancelReason = outcome === 'cancelled' ? String(meta.reason || meta.signal?.reason || 'user-request') : '';
        track.bulkMasteringSkipReason = outcome === 'skipped' ? String(meta.reason || 'user-skip-current') : '';
        hudState.skipRequested = false;
        update();
        return true;
    }

    function markMasteringBatchCancelled(meta = {}) {
        const reason = String(meta.reason || 'user-request');
        const batchId = hudState.batchId;
        getStateTracks().forEach(track => {
            if (!track || track.bulkMasteringBatchId !== batchId) return;
            if (['done', 'error', 'skipped'].includes(track.bulkMasteringResult)) return;
            track.bulkMasteringResult = 'cancelled';
            track.bulkMasteringCancelReason = reason;
            if (!track.bulkMasteringTrackCompletedAt) track.bulkMasteringTrackCompletedAt = Date.now();
            if (track.bulkMasteringTrackStartedAt && !track.bulkMasteringDurationMs) {
                track.bulkMasteringDurationMs = Math.max(0, track.bulkMasteringTrackCompletedAt - track.bulkMasteringTrackStartedAt);
            }
        });
        hudState.cancelRequested = false;
        update();
        return true;
    }

    function markMasteringPauseChanged(meta = {}) {
        hudState.paused = Boolean(meta.paused);
        update();
        return true;
    }

    function markMasteringSkipRequested(meta = {}) {
        hudState.skipRequested = Boolean(meta.requested);
        update();
        return true;
    }

    function markMasteringQueueChanged(meta = {}) {
        const items = Array.isArray(meta.items) ? meta.items : [];
        items.forEach((track, index) => { if (track) track.bulkMasteringOrder = index + 1; });
        update();
        return true;
    }

    function getFailedTracks() {
        if (!isMasteringPhase()) return [];
        return getTracks().filter(track => track && (track.bulkMasteringResult === 'error' || track.status === 'error'));
    }

    function isMasteringPhase() {
        return hudState.phase === 'mastering';
    }

    function getTrackOrder(track, index = 0) {
        if (!track) return index + 1;
        return isMasteringPhase()
            ? Number(track.bulkMasteringOrder || track.bulkImportOrder || index + 1)
            : Number(track.bulkImportOrder || track.bulkMasteringOrder || index + 1);
    }

    function getTracks() {
        const allTracks = getStateTracks();
        if (hudState.batchId) {
            const batch = allTracks.filter(track => track && (
                isMasteringPhase()
                    ? track.bulkMasteringBatchId === hudState.batchId
                    : track.bulkImportBatchId === hudState.batchId
            ));
            if (batch.length) return batch.sort((a, b) => getTrackOrder(a) - getTrackOrder(b));
        }
        const visibleStatuses = isMasteringPhase()
            ? ['queued', 'analyzing', 'ready', 'processing', 'done', 'error']
            : ['queued', 'analyzing', 'ready', 'error'];
        return allTracks.filter(track => track && track.bulkRecommendationMode === 'auto-apply' && visibleStatuses.includes(track.status));
    }

    function isActiveMasteringTrack(track) {
        return Boolean(track && track.bulkMasteringBatchId && Number(track.bulkMasteringTotal || 0) >= getMinTracks());
    }

    function detachTrackFromMasteringBatch(track) {
        if (!track) return track;
        track.bulkMasteringBatchId = '';
        track.bulkMasteringOrder = 0;
        track.bulkMasteringTotal = 0;
        track.bulkMasteringLargeBatch = false;
        track.bulkMasteringSource = 'single';
        track.bulkMasteringResult = '';
        track.bulkMasteringQueuedAt = 0;
        track.bulkMasteringTrackStartedAt = 0;
        track.bulkMasteringTrackCompletedAt = 0;
        track.bulkMasteringDurationMs = 0;
        track.bulkMasteringCancelReason = '';
        track.bulkMasteringSkipReason = '';
        return track;
    }

    function getMasteringResult(track) {
        if (!track) return '';
        const result = String(track.bulkMasteringResult || '');
        if (['queued', 'running', 'done', 'error', 'skipped', 'cancelled'].includes(result)) return result;
        if (track.status === 'processing') return 'running';
        if (track.status === 'done' || track.outBlob || track.masteredUrl) return 'done';
        if (track.status === 'error') return 'error';
        return 'queued';
    }

    function getTrackProgress(track) {
        if (!track) return 0;
        if (isMasteringPhase()) {
            const result = getMasteringResult(track);
            if (['done', 'error', 'skipped', 'cancelled'].includes(result)) return 100;
            if (result === 'running' || track.status === 'processing') return clampValue(Number(track.progress || 0), 0, 99);
            return 0;
        }
        if (track.status === 'error') return 100;
        if (track.status === 'ready' || track.status === 'done' || track.analysis) return 100;
        return clampValue(Number(track.progress || 0), 0, 100);
    }

    function getStatusLabel(track) {
        if (!track) return '대기';
        if (isMasteringPhase()) {
            const result = getMasteringResult(track);
            if (result === 'queued') return '마스터링 대기';
            if (result === 'running') return '마스터링 중';
            if (result === 'done') return '완성';
            if (result === 'error') return '오류';
            if (result === 'skipped') return '건너뜀';
            if (result === 'cancelled') return '취소';
        }
        if (track.status === 'queued') return '대기';
        if (track.status === 'analyzing') return track.analysisCacheHit ? '캐시 적용' : '분석 중';
        if (track.status === 'ready') return '추천 완료';
        if (track.status === 'processing') return '마스터링 중';
        if (track.status === 'done') return '완성';
        if (track.status === 'error') return '오류';
        if (typeof deps.statusLabel === 'function') return deps.statusLabel(track.status || 'queued');
        return track.status || '대기';
    }

    function isTrackDoneForSummary(track) {
        if (!track) return false;
        if (isMasteringPhase()) return getMasteringResult(track) === 'done';
        return Boolean(track.analysis || ['ready', 'processing', 'done'].includes(track.status));
    }

    function isTrackErrorForSummary(track) {
        return Boolean(track && (isMasteringPhase() ? getMasteringResult(track) === 'error' : track.status === 'error'));
    }

    function isTrackSkippedForSummary(track) {
        return Boolean(track && isMasteringPhase() && getMasteringResult(track) === 'skipped');
    }

    function isTrackCancelledForSummary(track) {
        return Boolean(track && isMasteringPhase() && getMasteringResult(track) === 'cancelled');
    }

    function isTrackActiveForSummary(track) {
        if (!track) return false;
        return isMasteringPhase() ? getMasteringResult(track) === 'running' : track.status === 'analyzing';
    }

    function isTrackPendingForSummary(track) {
        if (!track) return false;
        if (isMasteringPhase()) return getMasteringResult(track) === 'queued';
        return track.status === 'queued';
    }

    function formatDuration(ms, options = {}) {
        const value = Math.max(0, Number(ms || 0));
        if (!value) return options.zero || '';
        const totalSeconds = Math.max(1, Math.round(value / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const remainMinutes = minutes % 60;
            return remainMinutes ? `${hours}시간 ${remainMinutes}분` : `${hours}시간`;
        }
        if (minutes) return seconds ? `${minutes}분 ${seconds}초` : `${minutes}분`;
        return `${seconds}초`;
    }

    function getAverageMasteringDurationMs(tracks, currentTrack = null) {
        const durations = tracks
            .map(track => Number(track?.bulkMasteringDurationMs || 0))
            .filter(value => Number.isFinite(value) && value >= 1000 && value <= 3 * 60 * 60 * 1000)
            .sort((a, b) => a - b);
        if (durations.length) {
            const trimmed = durations.length >= 5 ? durations.slice(1, -1) : durations;
            return Math.round(trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length);
        }
        if (currentTrack?.bulkMasteringTrackStartedAt) {
            const elapsed = Math.max(1000, Date.now() - Number(currentTrack.bulkMasteringTrackStartedAt));
            const progress = clampValue(Number(currentTrack.progress || 0), 0, 99);
            if (progress >= 8) return Math.round(clampValue(elapsed / (progress / 100), 15000, 45 * 60 * 1000));
            return Math.round(clampValue(elapsed * 2.5, 30000, 45 * 60 * 1000));
        }
        return 0;
    }

    function getSummary() {
        const tracks = getTracks();
        const total = Math.max(Number(hudState.total || 0), tracks.length);
        const done = tracks.filter(isTrackDoneForSummary).length;
        const errors = tracks.filter(isTrackErrorForSummary).length;
        const skipped = tracks.filter(isTrackSkippedForSummary).length;
        const cancelled = tracks.filter(isTrackCancelledForSummary).length;
        const active = tracks.filter(isTrackActiveForSummary).length;
        const pending = tracks.filter(isTrackPendingForSummary).length;
        const progressSum = tracks.reduce((sum, track) => sum + getTrackProgress(track), 0);
        const percent = total > 0 ? Math.round(clampValue(progressSum / total, 0, 100)) : 0;
        const currentTrack = tracks.find(isTrackActiveForSummary) || null;
        const currentTrackIndex = currentTrack ? Math.max(0, tracks.indexOf(currentTrack)) : -1;
        const currentTrackOrder = currentTrack ? getTrackOrder(currentTrack, currentTrackIndex) : 0;
        const currentTrackProgress = currentTrack ? Math.round(getTrackProgress(currentTrack)) : 0;
        const complete = total > 0 && tracks.length > 0 && done + errors + skipped + cancelled >= total && !active && !pending;
        const averageDurationMs = isMasteringPhase() ? getAverageMasteringDurationMs(tracks, currentTrack) : 0;
        let currentRemainingMs = 0;
        if (currentTrack && currentTrack.bulkMasteringTrackStartedAt) {
            const elapsed = Math.max(0, Date.now() - Number(currentTrack.bulkMasteringTrackStartedAt));
            const projected = currentTrackProgress >= 5
                ? Math.max(elapsed, Math.round(elapsed / Math.max(0.05, currentTrackProgress / 100)))
                : Math.max(averageDurationMs, elapsed * 2);
            currentRemainingMs = Math.max(0, projected - elapsed);
        }
        const remainingMs = isMasteringPhase()
            ? Math.max(0, currentRemainingMs + pending * Math.max(averageDurationMs, currentTrack ? 0 : averageDurationMs))
            : 0;
        if (complete && !hudState.completedAt) hudState.completedAt = Date.now();
        if (!complete) hudState.completedAt = 0;
        return Object.freeze({
            version: VIEW_VERSION,
            batchId: hudState.batchId,
            phase: hudState.phase || 'import',
            total,
            count: tracks.length,
            done,
            errors,
            skipped,
            cancelled,
            active,
            pending,
            percent,
            complete,
            currentTrack,
            currentTrackId: currentTrack?.id || '',
            currentTrackOrder,
            currentTrackProgress,
            currentRemainingMs,
            averageDurationMs,
            remainingMs,
            etaLabel: remainingMs ? `예상 남은 시간 ${formatDuration(remainingMs)}` : '',
            resultFilter: normalizeResultFilter(hudState.resultFilter),
            cancelRequested: Boolean(hudState.cancelRequested),
            paused: Boolean(hudState.paused),
            skipRequested: Boolean(hudState.skipRequested),
            expanded: Boolean(hudState.expanded),
            dismissed: Boolean(hudState.dismissedBatchId && hudState.dismissedBatchId === hudState.batchId),
            restorable: Boolean(hudState.dismissedBatchId && hudState.dismissedBatchId === hudState.batchId && total >= getMinTracks() && (!complete || !hudState.completedAt || Date.now() - hudState.completedAt <= getHoldMs())),
            startedAt: hudState.startedAt || 0,
            completedAt: hudState.completedAt || 0,
            holdMs: getHoldMs(),
            tracks
        });
    }

    function getSnapshot() {
        const summary = getSummary();
        return Object.freeze({
            version: summary.version,
            batchId: summary.batchId,
            phase: summary.phase,
            total: summary.total,
            count: summary.count,
            done: summary.done,
            errors: summary.errors,
            skipped: summary.skipped,
            cancelled: summary.cancelled,
            active: summary.active,
            pending: summary.pending,
            percent: summary.percent,
            complete: summary.complete,
            currentTrackId: summary.currentTrackId,
            currentTrackOrder: summary.currentTrackOrder,
            currentTrackProgress: summary.currentTrackProgress,
            currentRemainingMs: summary.currentRemainingMs,
            averageDurationMs: summary.averageDurationMs,
            remainingMs: summary.remainingMs,
            etaLabel: summary.etaLabel,
            resultFilter: summary.resultFilter,
            cancelRequested: summary.cancelRequested,
            paused: summary.paused,
            skipRequested: summary.skipRequested,
            expanded: summary.expanded,
            dismissed: summary.dismissed,
            restorable: summary.restorable,
            minTracks: getMinTracks(),
            holdMs: summary.holdMs
        });
    }

    function shouldShow(summary) {
        if (!summary || summary.total < getMinTracks() || summary.dismissed) return false;
        if (summary.active || summary.pending) return true;
        if (summary.phase === 'mastering' && summary.count && !summary.complete) return true;
        if (summary.complete && summary.completedAt) return Date.now() - summary.completedAt <= getHoldMs();
        return false;
    }

    function shouldAutoAdvanceAfterImport(summary) {
        return Boolean(summary
            && summary.phase === 'import'
            && summary.complete
            && summary.batchId
            && !summary.dismissed
            && hudState.autoAdvancedBatchId !== summary.batchId);
    }

    function navigateToMasterAllAfterBulkAnalysis(summary = {}) {
        if (!summary.batchId) return false;
        try { if (typeof deps.scheduleRender === 'function') deps.scheduleRender('bulk-analysis-complete-navigation'); }
        catch (error) {}
        global.setTimeout?.(() => {
            const button = getEl('masterAllBtn');
            const actionPanel = button?.closest?.('.action-grid-pro') || button?.parentElement || button;
            if (!button || !actionPanel) return;
            const reducedMotion = Boolean(global.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
            const rect = actionPanel.getBoundingClientRect?.();
            const viewport = global.innerHeight || global.document?.documentElement?.clientHeight || 720;
            const dockHeight = Number(getEl('bottomPreviewDock')?.getBoundingClientRect?.().height || 0);
            if (rect) {
                const targetTop = Math.max(0, global.scrollY + rect.top - Math.max(96, viewport * 0.34 - Math.min(72, dockHeight * 0.25)));
                try { global.scrollTo({ top: targetTop, behavior: reducedMotion ? 'auto' : 'smooth' }); }
                catch (error) { actionPanel.scrollIntoView?.({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center', inline: 'nearest' }); }
            } else actionPanel.scrollIntoView?.({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });
            actionPanel.classList.add('bulk-analysis-next-step-panel');
            button.classList.add('bulk-analysis-next-step');
            button.setAttribute('data-next-step-label', '다음 단계');
            const focusTarget = button.disabled ? actionPanel : button;
            if (focusTarget === actionPanel && !actionPanel.hasAttribute('tabindex')) actionPanel.setAttribute('tabindex', '-1');
            global.setTimeout?.(() => {
                try { focusTarget.focus({ preventScroll: true }); } catch (error) { try { focusTarget.focus(); } catch (focusError) {} }
            }, reducedMotion ? 0 : 420);
            const done = Math.max(0, Number(summary.done || 0));
            const errors = Math.max(0, Number(summary.errors || 0));
            try { if (typeof deps.showToast === 'function') deps.showToast(errors
                ? `곡 분석 완료 · 성공 ${done} / 오류 ${errors} · 전체 마스터링 버튼으로 이동했습니다.`
                : `${done || Number(summary.total || 0)}곡 분석 완료 · 전체 마스터링 버튼으로 이동했습니다.`); }
            catch (error) {}
            global.setTimeout?.(() => {
                actionPanel.classList.remove('bulk-analysis-next-step-panel');
                button.classList.remove('bulk-analysis-next-step');
                button.removeAttribute('data-next-step-label');
            }, 6200);
        }, 140);
        return true;
    }

    function update() {
        init();
        const hud = getEl('bulkImportHud');
        if (!hud) return getSnapshot();
        let summary = getSummary();
        const autoAdvance = shouldAutoAdvanceAfterImport(summary);
        if (autoAdvance) {
            hudState.autoAdvancedBatchId = summary.batchId;
            hudState.dismissedBatchId = summary.batchId;
            navigateToMasterAllAfterBulkAnalysis(summary);
            summary = getSummary();
        }
        const visible = shouldShow(summary);
        updateRestoreButton(summary);
        hud.classList.toggle('show', visible);
        hud.setAttribute('aria-hidden', visible ? 'false' : 'true');
        hud.dataset.expanded = summary.expanded ? 'true' : 'false';
        hud.dataset.complete = summary.complete ? 'true' : 'false';
        hud.dataset.phase = summary.phase || 'import';
        hud.dataset.bulkMode = summary.total >= getLargeBatchThreshold() ? 'large' : 'multi';
        hud.dataset.currentTrackId = summary.currentTrackId || '';
        hud.dataset.resultFilter = summary.resultFilter || 'all';
        hud.dataset.cancelRequested = summary.cancelRequested ? 'true' : 'false';
        hud.dataset.paused = summary.paused ? 'true' : 'false';
        hud.dataset.skipRequested = summary.skipRequested ? 'true' : 'false';
        hud.classList.toggle('has-current-track', Boolean(summary.currentTrackId));
        if (!visible) {
            syncStack();
            return getSnapshot();
        }
        const title = getEl('bulkImportHudTitle');
        const text = getEl('bulkImportHudText');
        const percent = getEl('bulkImportHudPercent');
        const bar = getEl('bulkImportHudBar');
        const list = getEl('bulkImportHudList');
        const toggle = getEl('bulkImportHudToggle');
        const masterAll = getEl('bulkImportHudMasterAll');
        const pauseBatch = getEl('bulkImportHudPause');
        const skipCurrent = getEl('bulkImportHudSkip');
        const cancelBatch = getEl('bulkImportHudCancel');
        const retryFailed = getEl('bulkImportHudRetryFailed');
        const resultFilter = getEl('bulkImportHudFilter');
        const summaryCard = getEl('bulkImportHudSummary');
        const face = hud.querySelector?.('.bulk-import-hud-face');
        const mastering = summary.phase === 'mastering';
        if (face) face.textContent = mastering ? (summary.cancelRequested ? '⏹️' : (summary.paused ? '⏸️' : '🎛️')) : '📦';
        if (title) {
            if (mastering && summary.complete && summary.cancelled) title.textContent = '여러 곡 마스터링 중단';
            else title.textContent = summary.complete
                ? (mastering ? '여러 곡 마스터링 완료' : '대량 업로드 분석 완료')
                : (mastering ? `여러 곡 마스터링 · ${summary.total}곡` : `대량 업로드 분석 · ${summary.total}곡`);
        }
        if (text) {
            if (mastering && summary.currentTrack) {
                const eta = summary.currentRemainingMs ? ` · 현재 곡 약 ${formatDuration(summary.currentRemainingMs)} 남음` : '';
                text.textContent = `현재 ${summary.currentTrackOrder}/${summary.total} · ${summary.currentTrack.name || '트랙'} · ${summary.currentTrackProgress}%${eta} · 완료 ${summary.done} · 대기 ${summary.pending} · 오류 ${summary.errors} · 건너뜀 ${summary.skipped} · 취소 ${summary.cancelled}${summary.paused ? ' · 다음 곡 전 일시정지' : ''}`;
            } else {
                text.textContent = mastering
                    ? `${summary.done}/${summary.total} 완성 · 대기 ${summary.pending} · 오류 ${summary.errors} · 건너뜀 ${summary.skipped} · 취소 ${summary.cancelled}${summary.etaLabel ? ` · ${summary.etaLabel}` : ''}${summary.paused ? ' · 일시정지됨' : ''}`
                    : `${summary.done}/${summary.total} 완료 · 분석 ${summary.active} · 대기 ${summary.pending} · 오류 ${summary.errors}`;
            }
        }
        if (percent) percent.textContent = `${summary.percent}%`;
        if (bar) bar.style.width = `${summary.percent}%`;
        if (toggle) {
            toggle.textContent = '숨김';
            toggle.setAttribute('aria-label', '대량 작업 HUD 숨김');
            toggle.setAttribute('aria-expanded', 'true');
        }
        updateMasterAllButton(masterAll, summary);
        updateMasteringActionControls({ pauseBatch, skipCurrent, cancelBatch, retryFailed, resultFilter }, summary);
        renderBatchSummary(summaryCard, summary);
        if (list) renderList(list, summary);
        syncStack();
        return getSnapshot();
    }

    function updateRestoreButton(summary) {
        const restore = getEl('bulkImportHudRestore');
        if (!restore) return;
        const show = Boolean(summary?.restorable);
        restore.hidden = !show;
        restore.classList.toggle('show', show);
        restore.setAttribute('aria-hidden', show ? 'false' : 'true');
        restore.disabled = !show;
    }

    function updateMasterAllButton(button, summary) {
        if (!button) return;
        const mainButton = getEl('masterAllBtn');
        const mastering = summary?.phase === 'mastering';
        const phaseBusy = mastering && (Number(summary.active || 0) > 0 || Number(summary.pending || 0) > 0) && !summary.complete;
        const disabled = Boolean(phaseBusy || mainButton?.disabled);
        button.hidden = mastering;
        button.disabled = disabled;
        button.textContent = phaseBusy ? '전체 마스터링 중' : '전체 마스터링';
        button.dataset.phase = summary?.phase || 'import';
    }

    function updateMasteringActionControls(controls, summary) {
        const mastering = summary?.phase === 'mastering';
        const busy = mastering && !summary.complete && (summary.active > 0 || summary.pending > 0);
        if (controls.pauseBatch) {
            controls.pauseBatch.hidden = !mastering || !busy;
            controls.pauseBatch.disabled = !busy || summary.cancelRequested;
            controls.pauseBatch.textContent = summary.paused ? '계속 진행' : '다음 곡 전 일시정지';
            controls.pauseBatch.setAttribute('aria-pressed', String(summary.paused));
        }
        if (controls.skipCurrent) {
            controls.skipCurrent.hidden = !mastering || !summary.currentTrackId || summary.complete;
            controls.skipCurrent.disabled = !summary.currentTrackId || summary.skipRequested || summary.cancelRequested;
            controls.skipCurrent.textContent = summary.skipRequested ? '건너뛰는 중' : '현재 곡 건너뛰기';
        }
        if (controls.cancelBatch) {
            controls.cancelBatch.hidden = !mastering || !busy;
            controls.cancelBatch.disabled = !busy || summary.cancelRequested;
            controls.cancelBatch.textContent = summary.cancelRequested ? '취소 요청 중' : '다중 작업 취소';
        }
        if (controls.retryFailed) {
            controls.retryFailed.hidden = !mastering || busy || summary.errors < 1;
            controls.retryFailed.disabled = busy || summary.errors < 1;
            controls.retryFailed.textContent = summary.errors > 0 ? `실패 ${summary.errors}곡 다시 실행` : '실패 곡 다시 실행';
        }
        if (controls.resultFilter) {
            const filterWrap = controls.resultFilter.closest?.('.bulk-import-hud-filter-wrap');
            if (filterWrap) filterWrap.hidden = !mastering;
            controls.resultFilter.hidden = !mastering;
            controls.resultFilter.disabled = !mastering || summary.count < 1;
            controls.resultFilter.value = normalizeResultFilter(summary.resultFilter);
            controls.resultFilter.setAttribute('aria-label', `마스터링 결과 필터 · 현재 ${controls.resultFilter.options?.[controls.resultFilter.selectedIndex]?.text || '전체'}`);
        }
    }

    function renderBatchSummary(container, summary) {
        if (!container) return;
        const show = Boolean(summary?.phase === 'mastering' && summary.complete);
        container.hidden = !show;
        container.replaceChildren();
        if (!show) return;
        const title = global.document.createElement('strong');
        title.textContent = summary.cancelled ? '배치 중단 요약' : '배치 완료 요약';
        const detail = global.document.createElement('span');
        const elapsedMs = Math.max(0, Number(summary.completedAt || Date.now()) - Number(summary.startedAt || Date.now()));
        detail.textContent = `완료 ${summary.done} · 실패 ${summary.errors} · 건너뜀 ${summary.skipped} · 취소 ${summary.cancelled}${elapsedMs ? ` · 총 ${formatDuration(elapsedMs)}` : ''}${summary.averageDurationMs ? ` · 곡당 평균 ${formatDuration(summary.averageDurationMs)}` : ''}`;
        container.append(title, detail);
    }

    function trackMatchesFilter(track, filter) {
        if (!isMasteringPhase() || filter === 'all') return true;
        const result = getMasteringResult(track);
        if (filter === 'active') return result === 'running';
        if (filter === 'completed') return result === 'done';
        if (filter === 'failed') return result === 'error';
        if (filter === 'skipped') return result === 'skipped';
        if (filter === 'cancelled') return result === 'cancelled';
        if (filter === 'pending') return result === 'queued';
        return true;
    }

    function getTrackTimingLabel(track, summary, index) {
        if (!isMasteringPhase() || !track) return '';
        const result = getMasteringResult(track);
        const duration = Number(track.bulkMasteringDurationMs || 0);
        if (result === 'done' && duration) return `소요 ${formatDuration(duration)}`;
        if (result === 'error' && duration) return `실패까지 ${formatDuration(duration)}`;
        if (result === 'skipped') return '건너뜀';
        if (result === 'cancelled') return '작업 취소됨';
        if (result === 'running' && summary.currentRemainingMs) return `남은 약 ${formatDuration(summary.currentRemainingMs)}`;
        if (result === 'queued' && summary.averageDurationMs) {
            const queuedBefore = summary.tracks
                .slice(0, index + 1)
                .filter(item => getMasteringResult(item) === 'queued').length;
            const etaMs = Math.max(0, summary.currentRemainingMs + queuedBefore * summary.averageDurationMs);
            return etaMs ? `완료 예상 약 ${formatDuration(etaMs)} 후` : '';
        }
        return '';
    }

    function renderList(list, summary) {
        list.textContent = '';
        const allTracks = summary.tracks.slice(0, Math.max(summary.total, summary.tracks.length));
        const filter = normalizeResultFilter(summary.resultFilter);
        const queuedTrackIds = allTracks.filter(track => getMasteringResult(track) === 'queued').map(track => track.id);
        const tracks = allTracks.map((track, originalIndex) => ({ track, originalIndex })).filter(item => trackMatchesFilter(item.track, filter));
        let currentRow = null;
        if (!tracks.length) {
            const empty = global.document.createElement('div');
            empty.className = 'bulk-import-list-empty';
            empty.setAttribute('role', 'status');
            empty.textContent = '현재 필터에 해당하는 곡이 없습니다.';
            list.appendChild(empty);
            return;
        }
        tracks.forEach(({ track, originalIndex }) => {
            const result = isMasteringPhase() ? getMasteringResult(track) : (track.status || 'queued');
            const isCurrent = Boolean(summary.phase === 'mastering' && track.id && track.id === summary.currentTrackId);
            const row = global.document.createElement('div');
            row.className = `bulk-import-row is-${result}${isCurrent ? ' is-current' : ''}`;
            row.setAttribute('role', 'listitem');
            if (isCurrent) row.setAttribute('aria-current', 'step');
            row.dataset.trackId = track.id || '';
            row.dataset.trackOrder = String(getTrackOrder(track, originalIndex));
            row.dataset.result = result;
            const number = global.document.createElement('span');
            number.className = 'bulk-import-row-number';
            number.textContent = String(getTrackOrder(track, originalIndex)).padStart(2, '0');
            const main = global.document.createElement('span');
            main.className = 'bulk-import-row-main';
            const name = global.document.createElement('strong');
            name.textContent = track.name || `트랙 ${originalIndex + 1}`;
            const report = global.document.createElement('small');
            const timing = getTrackTimingLabel(track, summary, originalIndex);
            const reportText = result === 'cancelled'
                ? '다중 작업 취소로 실행하지 않았습니다.'
                : (result === 'skipped' ? '관리자가 현재 곡을 건너뛰었습니다.' : (track.error || track.report || getStatusLabel(track)));
            report.textContent = timing ? `${reportText} · ${timing}` : reportText;
            main.append(name, report);
            const stateBadge = global.document.createElement('span');
            stateBadge.className = 'bulk-import-row-state';
            stateBadge.textContent = isCurrent ? '현재 진행' : getStatusLabel(track);
            const trackPercent = Math.round(getTrackProgress(track));
            const meter = global.document.createElement('span');
            meter.className = 'bulk-import-row-meter';
            meter.setAttribute('aria-label', `${track.name || `트랙 ${originalIndex + 1}`} ${trackPercent}% · ${getStatusLabel(track)}${timing ? ` · ${timing}` : ''}`);
            const fill = global.document.createElement('i');
            fill.style.width = `${trackPercent}%`;
            meter.appendChild(fill);
            const orderActions = global.document.createElement('span');
            orderActions.className = 'bulk-import-row-order-actions';
            if (summary.phase === 'mastering' && result === 'queued') {
                const up = global.document.createElement('button');
                up.type = 'button';
                up.className = 'bulk-import-row-order-btn';
                up.textContent = '↑';
                up.setAttribute('aria-label', `${track.name || `트랙 ${originalIndex + 1}`} 순서를 위로 이동`);
                const queuedIndex = queuedTrackIds.indexOf(track.id);
                up.disabled = queuedIndex <= 0;
                up.addEventListener('click', () => movePendingTrack(track.id, -1));
                const down = global.document.createElement('button');
                down.type = 'button';
                down.className = 'bulk-import-row-order-btn';
                down.textContent = '↓';
                down.setAttribute('aria-label', `${track.name || `트랙 ${originalIndex + 1}`} 순서를 아래로 이동`);
                down.disabled = queuedIndex < 0 || queuedIndex >= queuedTrackIds.length - 1;
                down.addEventListener('click', () => movePendingTrack(track.id, 1));
                orderActions.append(up, down);
            }
            const pct = global.document.createElement('span');
            pct.className = 'bulk-import-row-percent';
            pct.textContent = `${trackPercent}%`;
            row.append(number, main, stateBadge, meter, orderActions, pct);
            list.appendChild(row);
            if (isCurrent) currentRow = row;
        });
        if (currentRow && summary.currentTrackId && hudState.lastAutoScrolledTrackId !== summary.currentTrackId) {
            hudState.lastAutoScrolledTrackId = summary.currentTrackId;
            const reducedMotion = Boolean(global.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
            global.requestAnimationFrame?.(() => {
                const targetTop = Math.max(0, currentRow.offsetTop - Math.max(12, (list.clientHeight - currentRow.offsetHeight) * 0.36));
                try { list.scrollTo({ top: targetTop, behavior: reducedMotion ? 'auto' : 'smooth' }); }
                catch (error) { list.scrollTop = targetTop; }
            });
        }
    }

    function syncStack() {
        try { if (typeof deps.syncFloatingOverlayStack === 'function') deps.syncFloatingOverlayStack(); }
        catch (error) {}
    }

    const api = Object.freeze({
        version: VIEW_VERSION,
        configure,
        init,
        beginBatch,
        beginMasteringBatch,
        update,
        getSnapshot,
        getSummary,
        getFailedTracks,
        isActiveMasteringTrack,
        markMasteringTrackStart,
        markMasteringTrackResult,
        markMasteringBatchCancelled,
        markMasteringPauseChanged,
        markMasteringSkipRequested,
        markMasteringQueueChanged,
        detachTrackFromMasteringBatch,
        pause: toggleMasteringPause,
        skipCurrent: skipCurrentMasteringTrack,
        movePendingTrack,
        cancel: cancelMasteringBatch,
        retryFailed: retryFailedMasteringTracks,
        restore: restoreHud,
        hide: hideCurrentHud
    });

    global.FoxBearBulkImportHudView = api;
    global.FoxBearBulkImportHud = Object.freeze({
        getSnapshot,
        update,
        restore: restoreHud,
        hide: hideCurrentHud,
        get minTracks() { return getMinTracks(); },
        get doneHoldMs() { return getHoldMs(); }
    });
})(window);
