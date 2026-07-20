// FoxBear export progress view v1.5.42 - cancellable ZIP worker progress and recovery
'use strict';

(function attachFoxBearExportProgressView(global) {
    const VERSION = 'v1.5.42-zip-worker-cancellation';
    const LEGACY_VERSION = 'v1.5.6-export-progress-recovery';
    let snapshot = Object.freeze({ version: VERSION, visible: false, state: 'idle', percent: 0, completedCount: 0, outputBytes: 0, message: '', cancellable: false });
    let refs = null;

    function $(id) { return document.getElementById(id); }

    function ensureRefs() {
        if (refs && refs.panel) return refs;
        refs = {
            panel: $('exportProgressPanel'),
            title: $('exportProgressTitle'),
            status: $('exportProgressStatus'),
            percent: $('exportProgressPercent'),
            bar: $('exportProgressBar'),
            meter: document.querySelector('#exportProgressPanel .export-progress-meter'),
            checklist: $('exportProgressChecklist'),
            openDownloads: $('exportProgressOpenDownloads'),
            cancel: $('exportProgressCancel'),
            close: $('exportProgressClose')
        };
        if (refs.close) refs.close.addEventListener('click', hide);
        if (refs.cancel) refs.cancel.addEventListener('click', () => {
            if (!snapshot.cancellable) return;
            refs.cancel.disabled = true;
            if (refs.status) refs.status.textContent = 'ZIP 작업을 취소하는 중...';
            try { global.dispatchEvent(new CustomEvent('foxbear:zip-export-cancel', { detail: { source: VERSION } })); } catch (error) {}
        });
        if (refs.openDownloads) refs.openDownloads.addEventListener('click', () => {
            try { global.dispatchEvent(new CustomEvent('foxbear:export-show-track-downloads', { detail: { source: VERSION } })); } catch (error) {}
        });
        return refs;
    }

    function formatBytes(bytes) {
        const value = Number(bytes) || 0;
        if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
        if (value >= 1024 * 1024) return `${Math.round(value / (1024 * 1024))} MB`;
        if (value >= 1024) return `${Math.round(value / 1024)} KB`;
        return `${Math.max(0, Math.round(value))} B`;
    }

    function setVisible(visible) {
        const r = ensureRefs();
        if (!r.panel) return;
        r.panel.hidden = !visible;
        r.panel.classList.toggle('hidden', !visible);
        r.panel.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }

    function setProgress(percent) {
        const r = ensureRefs();
        const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
        if (r.percent) r.percent.textContent = `${Math.round(safePercent)}%`;
        if (r.bar) r.bar.style.width = `${safePercent}%`;
        if (r.meter) r.meter.setAttribute('aria-valuenow', String(Math.round(safePercent)));
        return safePercent;
    }

    function setCancellable(enabled) {
        const r = ensureRefs();
        const active = Boolean(enabled);
        if (r.cancel) { r.cancel.hidden = !active; r.cancel.disabled = false; }
        if (r.close) r.close.disabled = active;
        snapshot = Object.freeze({ ...snapshot, cancellable: active });
        return snapshot;
    }

    function renderChecklist(plan = {}) {
        const r = ensureRefs();
        if (!r.checklist) return;
        const warnings = Array.isArray(plan.warnings) ? plan.warnings : [];
        const items = [
            `완료 파일 ${Number(plan.completedCount || 0)}개`,
            `포장 방식 ${plan.compression || 'STORE'} · ${plan.strategy || 'zip'}`,
            `예상 ZIP 크기 ${formatBytes(plan.estimatedZipBytes || plan.outputBytes || 0)}`,
            plan.estimatedWorkingSetBytes ? `예상 작업 메모리 ${formatBytes(plan.estimatedWorkingSetBytes)} / 한도 ${formatBytes(plan.workingSetLimitBytes || 0)}` : `메모리 상태 ${plan.memoryPressure || 'normal'}`,
            warnings.length ? `주의 ${warnings[0]}` : '전용 Worker에서 ZIP을 생성합니다.'
        ];
        r.checklist.textContent = '';
        items.forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            r.checklist.appendChild(li);
        });
    }

    function begin(plan = {}) {
        const r = ensureRefs();
        setVisible(true);
        if (r.panel) {
            r.panel.classList.remove('is-complete', 'is-failed', 'is-cancelled');
            r.panel.classList.add('is-active');
        }
        if (r.title) r.title.textContent = 'ZIP 내보내기 진행';
        if (r.status) r.status.textContent = '파일 검증 완료 · ZIP Worker 준비 중';
        if (r.openDownloads) r.openDownloads.hidden = Number(plan.completedCount || 0) <= 0;
        const percent = setProgress(0);
        renderChecklist(plan);
        snapshot = Object.freeze({ version: VERSION, legacyVersion: LEGACY_VERSION, visible: true, state: 'planning', percent, completedCount: Number(plan.completedCount || 0), outputBytes: Number(plan.outputBytes || 0), estimatedWorkingSetBytes: Number(plan.estimatedWorkingSetBytes || 0), workingSetLimitBytes: Number(plan.workingSetLimitBytes || 0), memoryPressure: plan.memoryPressure || 'normal', strategy: plan.strategy || 'zip', message: '', cancellable: false });
        return snapshot;
    }

    function update(meta = {}) {
        const r = ensureRefs();
        setVisible(true);
        setCancellable(true);
        const percent = setProgress(meta.percent);
        const stage = String(meta.stage || 'ZIP 생성 중');
        const currentFile = meta.currentFile ? ` · ${meta.currentFile}` : '';
        if (r.status) r.status.textContent = `${stage}${currentFile}`;
        snapshot = Object.freeze({ ...snapshot, visible: true, state: 'generating', percent, message: r.status?.textContent || '', cancellable: true, elapsedMs: Number(meta.elapsedMs || 0) });
        return snapshot;
    }

    function finishPanel(kind, title, message, result = {}) {
        const r = ensureRefs();
        setVisible(true);
        setCancellable(false);
        if (r.panel) {
            r.panel.classList.remove('is-active', 'is-complete', 'is-failed', 'is-cancelled');
            r.panel.classList.add(`is-${kind}`);
        }
        if (r.title) r.title.textContent = title;
        if (r.status) r.status.textContent = message;
        if (r.openDownloads) r.openDownloads.hidden = kind === 'complete';
        return { r, result };
    }

    function complete(result = {}) {
        const { r } = finishPanel('complete', 'ZIP 내보내기 완료', `검증 완료 · ${formatBytes(result.size || 0)} ZIP 다운로드를 시작했습니다.`, result);
        const percent = setProgress(100);
        snapshot = Object.freeze({ ...snapshot, visible: true, state: 'complete', percent, zipBytes: Number(result.size || 0), message: r.status?.textContent || '', cancellable: false });
        return snapshot;
    }

    function fail(message = 'ZIP 내보내기에 실패했습니다. 곡별 다운로드를 사용해 주세요.') {
        const { r } = finishPanel('failed', 'ZIP 내보내기 확인 필요', String(message || 'ZIP 내보내기에 실패했습니다.'));
        snapshot = Object.freeze({ ...snapshot, visible: true, state: 'failed', percent: snapshot.percent || 0, message: r.status?.textContent || '', cancellable: false });
        return snapshot;
    }

    function cancel(message = 'ZIP 생성을 취소했습니다.') {
        const { r } = finishPanel('cancelled', 'ZIP 내보내기 취소됨', String(message || 'ZIP 생성을 취소했습니다.'));
        snapshot = Object.freeze({ ...snapshot, visible: true, state: 'cancelled', percent: snapshot.percent || 0, message: r.status?.textContent || '', cancellable: false });
        return snapshot;
    }

    function show() { setVisible(true); return getSnapshot(); }
    function hide() {
        if (snapshot.cancellable || snapshot.state === 'generating') return snapshot;
        setVisible(false);
        snapshot = Object.freeze({ ...snapshot, visible: false });
        return snapshot;
    }

    function getSnapshot() { return Object.freeze({ ...snapshot }); }

    global.FoxBearExportProgressView = Object.freeze({ version: VERSION, legacyVersion: LEGACY_VERSION, begin, update, complete, fail, cancel, show, hide, setCancellable, getSnapshot, formatBytes });
})(window);
