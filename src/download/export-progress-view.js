// FoxBear export progress view v1.6.66 - queue pause, recovery, failure guidance and ETA
'use strict';

(function attachFoxBearExportProgressView(global) {
    const VERSION = 'v1.6.66-static-gate-hygiene-repair';
    const LEGACY_VERSION = 'v1.5.6-export-progress-recovery';
    let snapshot = Object.freeze({ version: VERSION, visible: false, mode: 'zip', state: 'idle', percent: 0, completedCount: 0, outputBytes: 0, message: '', cancellable: false });
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
            next: $('exportProgressNext'),
            skip: $('exportProgressSkip'),
            pause: $('exportProgressPause'),
            cancel: $('exportProgressCancel'),
            close: $('exportProgressClose')
        };
        if (refs.close) refs.close.addEventListener('click', hide);
        if (refs.cancel) refs.cancel.addEventListener('click', () => {
            if (!snapshot.cancellable) return;
            refs.cancel.disabled = true;
            if (refs.status) refs.status.textContent = snapshot.mode === 'queue' ? '순차 저장을 취소하는 중...' : 'ZIP 작업을 취소하는 중...';
            const eventName = snapshot.mode === 'queue' ? 'foxbear:export-queue-cancel' : 'foxbear:zip-export-cancel';
            try { global.dispatchEvent(new CustomEvent(eventName, { detail: { source: VERSION } })); } catch (error) {}
        });
        if (refs.next) refs.next.addEventListener('click', () => {
            if (snapshot.mode !== 'queue' || snapshot.state === 'preparing' || snapshot.state === 'delivering') return;
            refs.next.disabled = true;
            try { global.dispatchEvent(new CustomEvent('foxbear:export-queue-next', { detail: { source: VERSION } })); } catch (error) {}
        });
        if (refs.skip) refs.skip.addEventListener('click', () => {
            if (snapshot.mode !== 'queue' || ['preparing', 'delivering', 'paused'].includes(snapshot.state)) return;
            try { global.dispatchEvent(new CustomEvent('foxbear:export-queue-skip', { detail: { source: VERSION } })); } catch (error) {}
        });
        if (refs.pause) refs.pause.addEventListener('click', () => {
            if (snapshot.mode !== 'queue' || ['preparing', 'delivering', 'complete'].includes(snapshot.state)) return;
            try { global.dispatchEvent(new CustomEvent('foxbear:export-queue-pause-toggle', { detail: { source: VERSION } })); } catch (error) {}
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

    function formatDuration(ms) {
        const value = Math.max(0, Number(ms) || 0);
        if (!value) return '';
        if (value < 1000) return '1초 미만';
        if (value < 60000) return `약 ${Math.max(1, Math.round(value / 1000))}초`;
        const minutes = Math.floor(value / 60000);
        const seconds = Math.round((value % 60000) / 1000);
        return `약 ${minutes}분${seconds ? ` ${seconds}초` : ''}`;
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

    function setQueueButtons(meta = {}) {
        const r = ensureRefs();
        const queueMode = snapshot.mode === 'queue' || meta.mode === 'queue';
        const paused = Boolean(meta.paused || meta.state === 'paused');
        const blocked = Boolean(meta.preparing || meta.delivering || meta.state === 'preparing' || meta.state === 'delivering' || paused);
        const done = Boolean(meta.complete || meta.state === 'complete' || meta.active === false && Number(meta.total || 0) > 0 && !meta.current);
        const mode = meta.deliveryMode || meta.modeName || meta.queueMode || snapshot.deliveryMode || 'download';
        if (r.next) {
            r.next.hidden = !queueMode || done;
            r.next.disabled = blocked || !meta.current;
            r.next.textContent = meta.current?.status === 'failed'
                ? '현재 파일 다시 시도'
                : (mode === 'share' ? '다음 파일 공유/저장' : (mode === 'picker' ? '다음 파일 직접 저장' : '다음 파일 다운로드'));
        }
        if (r.skip) {
            r.skip.hidden = !queueMode || done || !meta.current;
            r.skip.disabled = blocked;
        }
        if (r.pause) {
            r.pause.hidden = !queueMode || done || Boolean(meta.preparing || meta.delivering || meta.state === 'preparing' || meta.state === 'delivering');
            r.pause.disabled = false;
            r.pause.textContent = paused ? '저장 계속' : '일시정지';
        }
        if (r.openDownloads) r.openDownloads.hidden = queueMode || Number(meta.completedCount || 0) <= 0;
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

    function renderQueueChecklist(meta = {}) {
        const r = ensureRefs();
        if (!r.checklist) return;
        const counts = meta.counts || {};
        const storage = meta.storage || null;
        const modeLabel = meta.deliveryMode === 'share' ? '공유창' : (meta.deliveryMode === 'picker' ? '직접 저장창' : '브라우저 다운로드');
        const currentEta = formatDuration(meta.estimatedCurrentMs || meta.current?.estimatedMs || 0);
        const remainingEta = formatDuration(meta.estimatedRemainingMs || 0);
        const failureText = meta.current?.errorHint
            ? `${meta.current.error || '저장 실패'} · ${meta.current.errorHint}`
            : '';
        const stateText = meta.paused
            ? (meta.pauseReason === 'background' ? '백그라운드 복귀 대기 · 앱으로 돌아오면 현재 파일부터 복구' : '사용자 일시정지 · 저장 계속 버튼으로 재개')
            : (meta.backgrounded ? '앱이 백그라운드에 있습니다.' : '현재 큐 상태 정상');
        const items = [
            `대상 파일 ${Number(meta.total || 0)}개 · 완료 ${Number(counts.done || 0)}개 · 건너뜀 ${Number(counts.skipped || 0)}개`,
            `저장 방식 ${modeLabel} · 파일마다 사용자 클릭 1회`,
            meta.current ? `현재 ${Math.min(Number(meta.currentIndex || 0) + 1, Number(meta.total || 0))} / ${Number(meta.total || 0)} · ${meta.current.fileName}${currentEta ? ` · 예상 ${currentEta}` : ''}` : '대기 파일 없음',
            remainingEta ? `남은 직접 저장 예상 ${remainingEta} · 사용자 선택 시간에 따라 달라질 수 있음` : stateText,
            failureText || (storage?.supported ? `브라우저 임시 공간 ${formatBytes(storage.available || 0)} 남음 · 다운로드 폴더 여유와 별도` : '기기 다운로드 폴더의 실제 남은 공간은 브라우저에서 확인할 수 없습니다.'),
            storage?.warning || '자동 연속 다운로드 대신 다음 파일 버튼으로 차단을 방지합니다.'
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
            r.panel.classList.remove('is-complete', 'is-failed', 'is-cancelled', 'is-queue');
            r.panel.classList.add('is-active');
        }
        if (r.title) r.title.textContent = 'ZIP 내보내기 진행';
        if (r.status) r.status.textContent = '파일 검증 완료 · ZIP Worker 준비 중';
        if (r.next) r.next.hidden = true;
        if (r.skip) r.skip.hidden = true;
        if (r.pause) r.pause.hidden = true;
        if (r.openDownloads) r.openDownloads.hidden = Number(plan.completedCount || 0) <= 0;
        const percent = setProgress(0);
        renderChecklist(plan);
        snapshot = Object.freeze({ version: VERSION, legacyVersion: LEGACY_VERSION, visible: true, mode: 'zip', state: 'planning', percent, completedCount: Number(plan.completedCount || 0), outputBytes: Number(plan.outputBytes || 0), estimatedWorkingSetBytes: Number(plan.estimatedWorkingSetBytes || 0), workingSetLimitBytes: Number(plan.workingSetLimitBytes || 0), memoryPressure: plan.memoryPressure || 'normal', strategy: plan.strategy || 'zip', message: '', cancellable: false });
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
        snapshot = Object.freeze({ ...snapshot, visible: true, mode: 'zip', state: 'generating', percent, message: r.status?.textContent || '', cancellable: true, elapsedMs: Number(meta.elapsedMs || 0) });
        return snapshot;
    }

    function beginQueue(plan = {}) {
        const r = ensureRefs();
        setVisible(true);
        if (r.panel) {
            r.panel.classList.remove('is-complete', 'is-failed', 'is-cancelled');
            r.panel.classList.add('is-active', 'is-queue');
        }
        if (r.title) r.title.textContent = '곡별 순차 저장';
        if (r.status) r.status.textContent = '파일을 먼저 검증하고 있습니다.';
        if (r.pause) r.pause.hidden = true;
        const percent = setProgress(0);
        snapshot = Object.freeze({ version: VERSION, legacyVersion: LEGACY_VERSION, visible: true, mode: 'queue', deliveryMode: plan.mode || 'download', state: 'preparing', percent, total: Number(plan.total || 0), outputBytes: Number(plan.outputBytes || 0), message: r.status?.textContent || '', cancellable: true });
        setCancellable(true);
        setQueueButtons({ mode: 'queue', state: 'preparing', current: null, total: plan.total || 0, deliveryMode: plan.mode || 'download' });
        renderQueueChecklist({ total: plan.total || 0, counts: {}, deliveryMode: plan.mode || 'download' });
        return snapshot;
    }

    function updateQueue(meta = {}) {
        const r = ensureRefs();
        setVisible(true);
        const total = Math.max(0, Number(meta.total || snapshot.total || 0));
        const counts = meta.counts || {};
        const doneCount = Number(counts.done || 0) + Number(counts.skipped || 0);
        const prepared = Number(meta.prepared || 0);
        const phase = String(meta.phase || (meta.preparing ? 'preparing' : (meta.delivering ? 'delivering' : 'ready')));
        const percent = phase === 'preparing'
            ? setProgress(total ? (prepared / total) * 20 : 0)
            : setProgress(total ? 20 + (doneCount / total) * 80 : 0);
        const currentLabel = meta.current?.fileName ? ` · ${meta.current.fileName}` : '';
        let message = meta.message || '';
        if (!message) {
            if (phase === 'preparing') message = `파일 검증 중 ${prepared} / ${total}`;
            else if (phase === 'delivering') message = `저장 요청 중${currentLabel}`;
            else if (phase === 'failed') message = meta.current?.errorHint ? `${meta.current.error || '저장 실패'} · ${meta.current.errorHint}` : `저장 실패${currentLabel} · 다시 시도하거나 건너뛰세요.`;
            else if (phase === 'paused') message = meta.pauseReason === 'background' ? '백그라운드 복귀를 기다리고 있습니다.' : '곡별 순차 저장을 일시정지했습니다.';
            else message = meta.current ? `준비 완료${currentLabel}` : '대기 파일이 없습니다.';
        }
        if (r.status) r.status.textContent = message;
        if (r.panel) r.panel.classList.toggle('is-paused', phase === 'paused');
        snapshot = Object.freeze({ ...snapshot, visible: true, mode: 'queue', deliveryMode: meta.mode || snapshot.deliveryMode || 'download', state: phase, percent, total, current: meta.current || null, currentIndex: Number(meta.currentIndex || 0), counts: Object.freeze({ ...counts }), storage: meta.storage || snapshot.storage || null, paused: Boolean(meta.paused), pauseReason: String(meta.pauseReason || ''), backgrounded: Boolean(meta.backgrounded), estimatedCurrentMs: Number(meta.estimatedCurrentMs || 0), estimatedRemainingMs: Number(meta.estimatedRemainingMs || 0), lastDeliveryMs: Number(meta.lastDeliveryMs || 0), message, cancellable: Boolean(meta.active !== false) });
        setCancellable(Boolean(meta.active !== false));
        setQueueButtons({ ...meta, mode: 'queue', state: phase, deliveryMode: snapshot.deliveryMode });
        renderQueueChecklist({ ...meta, total, counts, deliveryMode: snapshot.deliveryMode, storage: snapshot.storage });
        return snapshot;
    }

    function finishPanel(kind, title, message, result = {}) {
        const r = ensureRefs();
        setVisible(true);
        setCancellable(false);
        if (r.panel) {
            r.panel.classList.remove('is-active', 'is-complete', 'is-failed', 'is-cancelled', 'is-paused');
            r.panel.classList.add(`is-${kind}`);
        }
        if (r.title) r.title.textContent = title;
        if (r.status) r.status.textContent = message;
        if (r.next) r.next.hidden = true;
        if (r.skip) r.skip.hidden = true;
        if (r.pause) r.pause.hidden = true;
        if (r.openDownloads) r.openDownloads.hidden = kind === 'complete' || snapshot.mode === 'queue';
        return { r, result };
    }

    function complete(result = {}) {
        const { r } = finishPanel('complete', 'ZIP 내보내기 완료', `검증 완료 · ${formatBytes(result.size || 0)} ZIP 다운로드를 시작했습니다.`, result);
        const percent = setProgress(100);
        snapshot = Object.freeze({ ...snapshot, visible: true, mode: 'zip', state: 'complete', percent, zipBytes: Number(result.size || 0), message: r.status?.textContent || '', cancellable: false });
        return snapshot;
    }

    function fail(message = 'ZIP 내보내기에 실패했습니다. 곡별 다운로드를 사용해 주세요.') {
        const { r } = finishPanel('failed', 'ZIP 내보내기 확인 필요', String(message || 'ZIP 내보내기에 실패했습니다.'));
        snapshot = Object.freeze({ ...snapshot, visible: true, mode: 'zip', state: 'failed', percent: snapshot.percent || 0, message: r.status?.textContent || '', cancellable: false });
        return snapshot;
    }

    function cancel(message = 'ZIP 생성을 취소했습니다.') {
        const { r } = finishPanel('cancelled', 'ZIP 내보내기 취소됨', String(message || 'ZIP 생성을 취소했습니다.'));
        snapshot = Object.freeze({ ...snapshot, visible: true, mode: 'zip', state: 'cancelled', percent: snapshot.percent || 0, message: r.status?.textContent || '', cancellable: false });
        return snapshot;
    }

    function completeQueue(meta = {}) {
        const counts = meta.counts || {};
        const message = meta.message || `순차 저장 완료 · 완료 ${Number(counts.done || 0)}개 · 건너뜀 ${Number(counts.skipped || 0)}개`;
        const { r } = finishPanel('complete', '곡별 순차 저장 완료', message, meta);
        if (r.panel) r.panel.classList.add('is-queue');
        const percent = setProgress(100);
        snapshot = Object.freeze({ ...snapshot, visible: true, mode: 'queue', state: 'complete', percent, counts: Object.freeze({ ...counts }), message: r.status?.textContent || '', cancellable: false });
        renderQueueChecklist({ ...meta, deliveryMode: snapshot.deliveryMode });
        return snapshot;
    }

    function failQueue(message = '곡별 순차 저장을 시작하지 못했습니다.') {
        const { r } = finishPanel('failed', '곡별 순차 저장 확인 필요', String(message || '곡별 순차 저장에 실패했습니다.'));
        if (r.panel) r.panel.classList.add('is-queue');
        snapshot = Object.freeze({ ...snapshot, visible: true, mode: 'queue', state: 'failed', message: r.status?.textContent || '', cancellable: false });
        return snapshot;
    }

    function cancelQueue(message = '곡별 순차 저장을 취소했습니다.') {
        const { r } = finishPanel('cancelled', '곡별 순차 저장 취소됨', String(message || '곡별 순차 저장을 취소했습니다.'));
        if (r.panel) r.panel.classList.add('is-queue');
        snapshot = Object.freeze({ ...snapshot, visible: true, mode: 'queue', state: 'cancelled', message: r.status?.textContent || '', cancellable: false });
        return snapshot;
    }

    function show() { setVisible(true); return getSnapshot(); }
    function hide() {
        if (snapshot.cancellable || ['generating', 'preparing', 'delivering', 'ready', 'failed'].includes(snapshot.state) && snapshot.mode === 'queue' && snapshot.cancellable) return snapshot;
        setVisible(false);
        snapshot = Object.freeze({ ...snapshot, visible: false });
        return snapshot;
    }

    function getSnapshot() { return Object.freeze({ ...snapshot }); }

    global.FoxBearExportProgressView = Object.freeze({
        version: VERSION,
        legacyVersion: LEGACY_VERSION,
        begin,
        update,
        complete,
        fail,
        cancel,
        beginQueue,
        updateQueue,
        completeQueue,
        failQueue,
        cancelQueue,
        show,
        hide,
        setCancellable,
        getSnapshot,
        formatBytes,
        formatDuration
    });
})(window);
