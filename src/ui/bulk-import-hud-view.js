// FoxBear Bulk Import HUD view - v1.5.3
(function initBulkImportHudView(global) {
    'use strict';

    const VIEW_VERSION = '1.5.3-bulk-hud-visibility-masterall';
    // v1.5.36 compatibility QA anchor: const VIEW_VERSION = '1.5.36-interaction-lifecycle-hardening'
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
        expanded: true
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
        if (toggle) {
            toggle.addEventListener('click', hideCurrentHud);
        }
        if (close) {
            close.addEventListener('click', hideCurrentHud);
        }
        if (masterAll) {
            masterAll.addEventListener('click', runMasterAllFromHud);
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
        items.forEach((track, index) => {
            track.bulkMasteringBatchId = batchId;
            track.bulkMasteringOrder = index + 1;
            track.bulkMasteringTotal = items.length;
            track.bulkMasteringLargeBatch = Boolean(options.largeBatch || items.length >= getLargeBatchThreshold());
            track.bulkMasteringStartedAt = hudState.startedAt;
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

    function getTrackProgress(track) {
        if (!track) return 0;
        if (track.status === 'error') return 100;
        if (isMasteringPhase()) {
            if (track.status === 'done' || track.outBlob || track.masteredUrl) return 100;
            if (track.status === 'processing') return clampValue(Number(track.progress || 0), 0, 99);
            return 0;
        }
        if (track.status === 'ready' || track.status === 'done' || track.analysis) return 100;
        return clampValue(Number(track.progress || 0), 0, 100);
    }

    function getStatusLabel(track) {
        if (!track) return '대기';
        if (isMasteringPhase()) {
            if (track.status === 'queued' || track.status === 'ready') return '마스터링 대기';
            if (track.status === 'analyzing') return track.analysisCacheHit ? '캐시 적용' : '사전 분석 중';
            if (track.status === 'processing') return '마스터링 중';
            if (track.status === 'done') return '완성';
            if (track.status === 'error') return '오류';
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
        if (isMasteringPhase()) return track.status === 'done' || Boolean(track.outBlob || track.masteredUrl);
        return Boolean(track.analysis || ['ready', 'processing', 'done'].includes(track.status));
    }

    function isTrackActiveForSummary(track) {
        if (!track) return false;
        return isMasteringPhase() ? track.status === 'processing' : track.status === 'analyzing';
    }

    function isTrackPendingForSummary(track) {
        if (!track) return false;
        if (isMasteringPhase()) return !isTrackDoneForSummary(track) && track.status !== 'processing' && track.status !== 'error';
        return track.status === 'queued';
    }

    function getSummary() {
        const tracks = getTracks();
        const total = Math.max(Number(hudState.total || 0), tracks.length);
        const done = tracks.filter(isTrackDoneForSummary).length;
        const errors = tracks.filter(track => track && track.status === 'error').length;
        const active = tracks.filter(isTrackActiveForSummary).length;
        const pending = tracks.filter(isTrackPendingForSummary).length;
        const progressSum = tracks.reduce((sum, track) => sum + getTrackProgress(track), 0);
        const percent = total > 0 ? Math.round(clampValue(progressSum / total, 0, 100)) : 0;
        const complete = total > 0 && tracks.length > 0 && done + errors >= total && !active && !pending;
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
            active,
            pending,
            percent,
            complete,
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
            active: summary.active,
            pending: summary.pending,
            percent: summary.percent,
            complete: summary.complete,
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

    function update() {
        init();
        const hud = getEl('bulkImportHud');
        if (!hud) return getSnapshot();
        const summary = getSummary();
        const visible = shouldShow(summary);
        updateRestoreButton(summary);
        hud.classList.toggle('show', visible);
        hud.setAttribute('aria-hidden', visible ? 'false' : 'true');
        hud.dataset.expanded = summary.expanded ? 'true' : 'false';
        hud.dataset.complete = summary.complete ? 'true' : 'false';
        hud.dataset.phase = summary.phase || 'import';
        hud.dataset.bulkMode = summary.total >= getLargeBatchThreshold() ? 'large' : 'multi';
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
        const face = hud.querySelector?.('.bulk-import-hud-face');
        const mastering = summary.phase === 'mastering';
        if (face) face.textContent = mastering ? '🎛️' : '📦';
        if (title) title.textContent = summary.complete
            ? (mastering ? '대량 마스터링 완료' : '대량 업로드 분석 완료')
            : (mastering ? `대량 마스터링 HUD · ${summary.total}곡` : `대량 업로드 분석 HUD · ${summary.total}곡`);
        if (text) text.textContent = mastering
            ? `${summary.done}/${summary.total} 완성 · 마스터링 ${summary.active} · 대기 ${summary.pending} · 오류 ${summary.errors}`
            : `${summary.done}/${summary.total} 완료 · 분석 ${summary.active} · 대기 ${summary.pending} · 오류 ${summary.errors}`;
        if (percent) percent.textContent = `${summary.percent}%`;
        if (bar) bar.style.width = `${summary.percent}%`;
        if (toggle) {
            toggle.textContent = '숨김';
            toggle.setAttribute('aria-label', '대량 작업 HUD 숨김');
            toggle.setAttribute('aria-expanded', 'true');
        }
        updateMasterAllButton(masterAll, summary);
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
        const phaseBusy = summary?.phase === 'mastering' && (Number(summary.active || 0) > 0 || Number(summary.pending || 0) > 0) && !summary.complete;
        const disabled = Boolean(phaseBusy || mainButton?.disabled);
        button.disabled = disabled;
        button.textContent = phaseBusy ? '전체 마스터링 중' : '전체 마스터링';
        button.dataset.phase = summary?.phase || 'import';
    }

    function renderList(list, summary) {
        list.textContent = '';
        const tracks = summary.tracks.slice(0, Math.max(summary.total, summary.tracks.length));
        tracks.forEach((track, index) => {
            const row = global.document.createElement('div');
            row.className = `bulk-import-row is-${track.status || 'queued'}`;
            row.setAttribute('role', 'listitem');
            row.dataset.trackId = track.id || '';
            const number = global.document.createElement('span');
            number.className = 'bulk-import-row-number';
            number.textContent = String(getTrackOrder(track, index)).padStart(2, '0');
            const main = global.document.createElement('span');
            main.className = 'bulk-import-row-main';
            const name = global.document.createElement('strong');
            name.textContent = track.name || `트랙 ${index + 1}`;
            const report = global.document.createElement('small');
            report.textContent = track.error || track.report || getStatusLabel(track);
            main.append(name, report);
            const stateBadge = global.document.createElement('span');
            stateBadge.className = 'bulk-import-row-state';
            stateBadge.textContent = getStatusLabel(track);
            const trackPercent = Math.round(getTrackProgress(track));
            const meter = global.document.createElement('span');
            meter.className = 'bulk-import-row-meter';
            const fill = global.document.createElement('i');
            fill.style.width = `${trackPercent}%`;
            meter.appendChild(fill);
            const pct = global.document.createElement('span');
            pct.className = 'bulk-import-row-percent';
            pct.textContent = `${trackPercent}%`;
            row.append(number, main, stateBadge, meter, pct);
            list.appendChild(row);
        });
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
