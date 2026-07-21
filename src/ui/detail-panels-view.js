// FoxBear detail sub-panel view module - Stage20
// Extracts quality gate, master report, engine safety, and comparison panels from src/app.js.
(function attachFoxBearDetailPanelsView(global) {
    'use strict';

    function pick(deps, name, fallback) {
        return deps && Object.prototype.hasOwnProperty.call(deps, name) ? deps[name] : fallback;
    }

    function renderQualityGatePanel(track, deps = {}) {
        const el = pick(deps, 'el', {});
        if (!track || !track.qualityGate || !el.trackDetail) return;
        const gate = track.qualityGate;
        const panel = document.createElement('section');
        panel.className = `quality-gate-panel quality-gate-${gate.status}`;
        const head = document.createElement('div');
        head.className = 'quality-gate-head';
        const title = document.createElement('strong');
        title.textContent = '마스터링 품질 게이트';
        const score = document.createElement('b');
        score.textContent = `${gate.label} · ${gate.score}점`;
        head.append(title, score);
        const summary = document.createElement('p');
        summary.textContent = gate.summary;
        const recovery = track.engineRecoveryInfo?.attempted ? document.createElement('div') : null;
        if (recovery) {
            const status = track.engineRecoveryInfo.status || 'running';
            recovery.className = `engine-recovery-note recovery-${status}`;
            recovery.textContent = status === 'recovered'
                ? `자동 복구 완료 · 안전 설정으로 1회 재렌더 · 최종 ${gate.label}`
                : status === 'failed-after-retry'
                    ? '자동 복구 1회 수행 · 최종 품질 게이트도 실패하여 추가 자동 재시도는 중단됨'
                    : status === 'error'
                        ? `자동 복구 오류 · 최초 렌더 유지 · ${track.engineRecoveryInfo.error || '세부 오류 없음'}`
                        : `자동 복구 진행 중 · ${track.engineRecoveryInfo.reason || '안전 설정 적용'}`;
        }
        const list = document.createElement('div');
        list.className = 'quality-gate-list';
        (gate.items || []).forEach(item => {
            const row = document.createElement('div');
            row.className = `quality-gate-item gate-${item.status}`;
            const status = document.createElement('span');
            status.textContent = item.status === 'pass' ? '통과' : (item.status === 'warn' ? '주의' : '실패');
            const label = document.createElement('b');
            label.textContent = item.label;
            const detail = document.createElement('small');
            detail.textContent = item.detail;
            row.append(status, label, detail);
            list.appendChild(row);
        });
        panel.append(head, summary);
        if (recovery) panel.appendChild(recovery);
        panel.appendChild(list);
        el.trackDetail.appendChild(panel);
    }

    function renderABStudioPanel(track, deps = {}) {
        const el = pick(deps, 'el', {});
        const createABSwitchPlayer = pick(deps, 'createABSwitchPlayer', () => null);
        if (!track || !track.masteredUrl || !el.trackDetail) return;
        const panel = document.createElement('section');
        panel.className = 'ab-studio-panel';
        const title = document.createElement('strong');
        title.textContent = '전/후 비교 플레이어';
        const deck = createABSwitchPlayer(track);
        panel.append(title);
        if (deck) panel.appendChild(deck);
        el.trackDetail.appendChild(panel);
    }

    function renderMasterReportPanel(track, deps = {}) {
        const el = pick(deps, 'el', {});
        const state = pick(deps, 'state', {});
        const getMasterStyleLabel = pick(deps, 'getMasterStyleLabel', value => value || '마스터');
        const formatSigned = pick(deps, 'formatSigned', (value, digits = 1) => `${Number(value).toFixed(digits)}`);
        const getOutputFormatLabel = pick(deps, 'getOutputFormatLabel', value => value || '출력');
        if (!track || !track.masterReport || !el.trackDetail) return;
        const report = track.masterReport;
        const panel = document.createElement('div');
        panel.className = 'master-report-panel';
        const head = document.createElement('div');
        head.className = 'master-report-head';
        const title = document.createElement('strong');
        title.textContent = '마스터링 전/후 리포트';
        const badge = document.createElement('span');
        badge.textContent = `${getMasterStyleLabel(report.target?.masterStyle)} · 목표 ${Number(report.target?.lufs ?? state.targetLufs).toFixed(0)} LUFS`;
        head.append(title, badge);
        const grid = document.createElement('div');
        grid.className = 'master-report-grid';
        const rows = [
            ['LUFS', report.before?.approxLufs, report.after?.approxLufs, ' LUFS'],
            ['RMS', report.before?.rmsDb, report.after?.rmsDb, ' dB'],
            ['Peak', report.before?.peakDb, report.after?.peakDb, ' dBFS'],
            ['Crest', report.before?.crestDb, report.after?.crestDb, ' dB']
        ];
        rows.forEach(([label, before, after, unit]) => {
            const card = document.createElement('div');
            card.className = 'master-report-card';
            const span = document.createElement('span');
            span.textContent = label;
            const value = document.createElement('b');
            value.textContent = `${formatMetric(before, unit)} → ${formatMetric(after, unit)}`;
            const delta = document.createElement('small');
            const d = Number(after) - Number(before);
            delta.textContent = Number.isFinite(d) ? `변화 ${formatSigned(d, 1)}${unit}` : '변화 -';
            card.append(span, value, delta);
            grid.appendChild(card);
        });
        const note = document.createElement('div');
        note.className = 'master-report-note';
        const fallback = report.output?.fallbackFrom ? ` · ${getOutputFormatLabel(report.output.fallbackFrom)} 실패로 ${getOutputFormatLabel(report.output.format)} 저장` : '';
        const clipped = Number(report.after?.clippedSamples || 0);
        note.textContent = `클리핑 위험: ${report.clippingRisk} · 최종 clipped sample ${clipped}개${fallback}`;
        panel.append(head, grid, note);
        el.trackDetail.appendChild(panel);
    }

    function formatMetric(value, unit = '') {
        const n = Number(value);
        if (!Number.isFinite(n)) return '-';
        return `${n.toFixed(1)}${unit}`;
    }

    function renderProcessingFlowPanel(track, deps = {}) {
        const el = pick(deps, 'el', {});
        const MASTER_FLOW_STEPS = pick(deps, 'MASTER_FLOW_STEPS', []);
        const clamp = pick(deps, 'clamp', (value, min, max) => Math.min(max, Math.max(min, value)));
        if (!track || !el.trackDetail) return;
        const panel = document.createElement('div');
        panel.className = `processing-flow-panel ${track.status === 'processing' ? 'is-running' : ''}`;

        const head = document.createElement('div');
        head.className = 'processing-flow-head';
        const title = document.createElement('strong');
        title.textContent = track.status === 'processing' ? '진행 흐름 표시' : '처리 흐름';
        const pct = document.createElement('span');
        pct.textContent = `${Math.round(Number(track.progress || 0))}%`;
        head.append(title, pct);

        const rail = document.createElement('div');
        rail.className = 'processing-flow-rail';
        const fill = document.createElement('i');
        fill.style.width = `${clamp(Number(track.progress || 0), 0, 100)}%`;
        rail.appendChild(fill);

        const steps = document.createElement('div');
        steps.className = 'processing-flow-steps';
        const progress = Number(track.progress || 0);
        MASTER_FLOW_STEPS.forEach((step, index) => {
            const item = document.createElement('div');
            item.className = 'processing-step';
            if (progress >= step.at || track.status === 'done') item.classList.add('done');
            const next = MASTER_FLOW_STEPS[index + 1];
            if (track.status === 'processing' && progress >= step.at && (!next || progress < next.at)) item.classList.add('active');
            const b = document.createElement('b');
            b.textContent = step.label;
            const small = document.createElement('small');
            small.textContent = step.hint;
            item.append(b, small);
            steps.appendChild(item);
        });

        const report = document.createElement('div');
        report.className = 'processing-flow-report';
        report.textContent = track.status === 'processing' ? (track.report || '현재 렌더링 단계를 표시합니다.') : (track.status === 'done' ? (track.report || '마스터링 완료 · 다운로드 또는 재마스터링 가능') : (track.status === 'error' ? (track.report || '오류 내용을 확인하세요.') : '마스터링을 실행하면 단계별 진행이 표시됩니다.'));

        panel.append(head, rail, steps, report);
        el.trackDetail.appendChild(panel);
    }

    function renderEngineSafetyPanel(track, deps = {}) {
        const el = pick(deps, 'el', {});
        const state = pick(deps, 'state', {});
        const computeEngineSafetyInfo = pick(deps, 'computeEngineSafetyInfo', () => null);
        const formatPerformanceGuardInfo = pick(deps, 'formatPerformanceGuardInfo', () => '대기');
        const clamp = pick(deps, 'clamp', (value, min, max) => Math.min(max, Math.max(min, value)));
        if (!state.engineSafetyMeter || !track || !el.trackDetail) return;
        const info = track.safetyInfo || computeEngineSafetyInfo(track, null, track.finalizeInfo || null);
        if (!info) return;
        const panel = document.createElement('div');
        panel.className = `engine-safety-panel engine-safety-${info.tone}`;
        const head = document.createElement('div');
        head.className = 'engine-safety-head';
        const title = document.createElement('strong');
        title.textContent = '엔진 안전 점수';
        const score = document.createElement('b');
        score.textContent = `${info.score}점 · ${info.label}`;
        head.append(title, score);

        const bar = document.createElement('div');
        bar.className = 'engine-safety-bar';
        const fill = document.createElement('i');
        fill.style.width = `${clamp(info.score, 0, 100)}%`;
        bar.appendChild(fill);

        const notes = document.createElement('div');
        notes.className = 'engine-safety-notes';
        notes.textContent = (info.notes || []).join(' · ');

        const guard = document.createElement('small');
        guard.className = 'engine-safety-guard';
        guard.textContent = `성능 가드: ${formatPerformanceGuardInfo(track.performanceGuardInfo)}`;

        panel.append(head, bar, notes, guard);
        el.trackDetail.appendChild(panel);
    }

    function renderLowMonoPanel(track, deps = {}) {
        const el = pick(deps, 'el', {});
        const state = pick(deps, 'state', {});
        const clamp = pick(deps, 'clamp', (value, min, max) => Math.min(max, Math.max(min, value)));
        if (!track || !track.analysis || !Number.isFinite(Number(track.analysis.lowMonoScore)) || !el.trackDetail) return;
        const score = Math.round(Number(track.analysis.lowMonoScore));
        const risk = track.analysis.lowMonoRisk || (score >= 82 ? 'safe' : score >= 64 ? 'watch' : 'risk');
        const panel = document.createElement('div');
        panel.className = `low-mono-panel low-mono-${risk}`;
        const head = document.createElement('div');
        head.className = 'low-mono-head';
        const title = document.createElement('strong');
        title.textContent = '저역 모노 호환 체크';
        const value = document.createElement('b');
        value.textContent = `${score}점 · ${getLowMonoRiskLabel(risk)}`;
        head.append(title, value);
        const bar = document.createElement('div');
        bar.className = 'low-mono-bar';
        const fill = document.createElement('i');
        fill.style.width = `${clamp(score, 0, 100)}%`;
        bar.appendChild(fill);
        const note = document.createElement('small');
        const corr = Number(track.analysis.lowMonoCorrelation || 0);
        const ratio = Number(track.analysis.lowSideRatio || 0);
        note.textContent = `120Hz 이하 L/R 상관도 ${corr.toFixed(2)} · 사이드 비율 ${ratio.toFixed(2)} · 저역 중심 고정 ${state.featureFlags?.lowEndAnchor ? 'ON' : 'OFF'}`;
        panel.append(head, bar, note);
        el.trackDetail.appendChild(panel);
    }

    function getLowMonoRiskLabel(risk) {
        if (risk === 'safe') return '안정';
        if (risk === 'watch') return '점검';
        return '위험';
    }

    function renderMasterComparisonPanel(track, deps = {}) {
        const el = pick(deps, 'el', {});
        const ampToDb = pick(deps, 'ampToDb', amp => 20 * Math.log10(Math.max(1e-9, Number(amp || 0))));
        const stripTags = pick(deps, 'stripTags', value => String(value || '').replace(/<[^>]+>/g, ''));
        const getClippingRiskText = pick(deps, 'getClippingRiskText', () => '렌더 후 판단');
        const getHeaviestPerformanceStage = pick(deps, 'getHeaviestPerformanceStage', () => null);
        const formatPerformanceInfo = pick(deps, 'formatPerformanceInfo', () => '측정 전');
        const formatDurationMs = pick(deps, 'formatDurationMs', ms => `${Math.round(Number(ms || 0))}ms`);
        if (!track || !track.analysis || !el.trackDetail) return;
        const panel = document.createElement('div');
        panel.className = 'compare-panel';
        const title = document.createElement('strong');
        title.textContent = '정밀 비교 / 성능 미터';
        panel.appendChild(title);
        const grid = document.createElement('div');
        grid.className = 'compare-grid';
        const before = Number.isFinite(track.analysis.loudnessIntegrated) ? track.analysis.loudnessIntegrated : track.analysis.loudnessHint;
        const after = track.finalizeInfo && Number.isFinite(track.finalizeInfo.loudnessAfter) ? track.finalizeInfo.loudnessAfter : NaN;
        [
            ['원본 LUFS', Number.isFinite(before) ? before.toFixed(1) : '-'],
            ['마스터 LUFS', Number.isFinite(after) ? after.toFixed(1) : '렌더 전'],
            ['클리핑 위험', stripTags(getClippingRiskText(track))]
        ].forEach(([label, value]) => {
            const chip = document.createElement('div');
            chip.className = 'compare-chip';
            const span = document.createElement('span');
            span.textContent = label;
            const b = document.createElement('b');
            b.textContent = value;
            chip.append(span, b);
            grid.appendChild(chip);
        });
        panel.appendChild(grid);
        if (track.performanceInfo) {
            const perf = document.createElement('div');
            perf.className = 'performance-meter-row';
            const heavy = getHeaviestPerformanceStage(track.performanceInfo);
            const speedFactor = Number(track.performanceInfo.speedFactor || 0);
            const chips = [
                ['곡 전체 DSP', formatDurationMs(track.performanceInfo.totalMs)],
                ['가장 느린 단계', heavy ? `${heavy.label} · ${formatDurationMs(heavy.ms)}` : '측정 전'],
                ['실시간 처리 배속', speedFactor > 0 ? `${speedFactor.toFixed(2)}x` : '계산 전'],
                ['파이널라이저', track.performanceInfo.finalizerProcessingMs ? formatDurationMs(track.performanceInfo.finalizerProcessingMs) : '측정 전']
            ];
            chips.forEach(([label, value]) => {
                const chip = document.createElement('div');
                chip.className = 'performance-meter-chip';
                const span = document.createElement('span');
                span.textContent = label;
                const b = document.createElement('b');
                b.textContent = value;
                chip.append(span, b);
                perf.appendChild(chip);
            });
            panel.appendChild(perf);
            const stages = (track.performanceInfo.stages || []).filter(stage => Number(stage.ms || 0) >= 0);
            if (stages.length) {
                const stageList = document.createElement('div');
                stageList.className = 'performance-stage-list';
                const maxStageMs = Math.max(1, ...stages.map(stage => Number(stage.ms || 0)));
                stages.forEach(stage => {
                    const row = document.createElement('div');
                    row.className = 'performance-stage-row';
                    const label = document.createElement('span');
                    label.textContent = stage.label;
                    const rail = document.createElement('i');
                    const fill = document.createElement('em');
                    fill.style.width = `${Math.max(2, Math.min(100, Number(stage.ms || 0) / maxStageMs * 100))}%`;
                    rail.appendChild(fill);
                    const value = document.createElement('b');
                    value.textContent = formatDurationMs(stage.ms);
                    row.append(label, rail, value);
                    stageList.appendChild(row);
                });
                panel.appendChild(stageList);
            }
        }
        const bars = document.createElement('div');
        bars.className = 'lufs-bars';
        bars.appendChild(makeLufsBar('원본', before, deps));
        bars.appendChild(makeLufsBar('마스터', after, deps));
        panel.appendChild(bars);
        const diff = document.createElement('div');
        diff.className = 'diff-meter';
        diff.textContent = buildTrackDiffText(track, deps);
        panel.appendChild(diff);
        el.trackDetail.appendChild(panel);
    }

    function makeLufsBar(label, lufs, deps = {}) {
        const clamp = pick(deps, 'clamp', (value, min, max) => Math.min(max, Math.max(min, value)));
        const row = document.createElement('div');
        row.className = 'lufs-row';
        const l = document.createElement('span');
        l.textContent = label;
        const track = document.createElement('div');
        track.className = 'lufs-track';
        const fill = document.createElement('div');
        fill.className = 'lufs-fill';
        const pct = Number.isFinite(lufs) ? clamp((lufs + 30) / 22 * 100, 0, 100) : 0;
        fill.style.width = `${pct}%`;
        track.appendChild(fill);
        const value = document.createElement('span');
        value.textContent = Number.isFinite(lufs) ? `${lufs.toFixed(1)}` : '-';
        row.append(l, track, value);
        return row;
    }

    function buildTrackDiffText(track, deps = {}) {
        const createComparisonInfo = pick(deps, 'createComparisonInfo', () => ({}));
        const formatSigned = pick(deps, 'formatSigned', (value, digits = 1) => `${Number(value).toFixed(digits)}`);
        const getDspAmountScoreLabel = pick(deps, 'getDspAmountScoreLabel', () => '-');
        if (!track || !track.finalizeInfo) return '마스터링 후 LUFS 변화, 피크 위험, DSP 적용량을 표시합니다.';
        const c = track.comparison || createComparisonInfo(track, track.finalizeInfo);
        const delta = Number.isFinite(c.loudnessDelta) ? `${formatSigned(c.loudnessDelta, 1)} LUFS` : '-';
        const peak = Number.isFinite(c.peakAfterDb) ? `${c.peakAfterDb.toFixed(2)} dBTP 유사` : '-';
        return `라우드니스 변화 ${delta} · 최종 피크 ${peak} · DSP ${getDspAmountScoreLabel(track)}`;
    }

    global.FoxBearDetailPanelsView = Object.freeze({
        renderQualityGatePanel,
        renderABStudioPanel,
        renderMasterReportPanel,
        renderProcessingFlowPanel,
        renderEngineSafetyPanel,
        renderLowMonoPanel,
        getLowMonoRiskLabel,
        renderMasterComparisonPanel,
        makeLufsBar,
        buildTrackDiffText
    });
})(window);
