// FoxBear detail panel view module - Stage12
// Keeps detail rendering isolated from src/app.js while using explicit dependency injection.
(function initFoxBearDetailView(global) {
    'use strict';

function renderDetail(options = {}, deps = {}) {
    const {
        state, el, PRESET_LABELS, PLATFORM_EXPORT_PRESETS, MASTER_PREVIEW_DURATION_SEC,
        getSelectedTrack, statusLabel, updateConfidenceUI, computeEngineSafetyInfo,
        renderAll, renderMasterComparisonPanel, renderABStudioPanel, renderWaveformPanel,
        renderMasterReportPanel, renderQualityGatePanel, renderProcessingFlowPanel,
        renderEngineSafetyPanel, renderLowMonoPanel, addDetailRow, formatBytes,
        getOutputFormatLabel, getMasterGoalLabel, getMasterGoalDescription,
        getMasterStyleLabel, getMasterStyleDescription, getMasterStrengthLabel,
        getMasterStrengthDescription, getReferenceMatchStrengthLabel, getReferenceMatchStrengthAmount,
        getPlatformPresetLabel, getMasteringIntensity, formatSigned, getBeatPresetLabel,
        getBeatPresetForRatio, getInstrumentDetailText, featureLabelText, shouldApplyAiHumanizer,
        shouldApplyVocalProtection, formatPerformanceGuardInfo, formatInstrumentLayerResult,
        formatPerformanceInfo, getHeaviestPerformanceStage, formatDurationMs, ampToDb,
        getDspAmountScoreLabel, formatDspAmountSummary, getClippingRiskText, getQualityModeLabel,
        formatTime, getLowMonoRiskLabel, formatMobileSpeakerRisk, applyTrackToControls
    } = deps;
    const renderMasterPreviewQuickBar = activeTrack => renderMasterPreviewQuickBarView(activeTrack, deps);
    const renderAiMasteringCard = activeTrack => renderAiMasteringCardView(activeTrack, deps);
    const isAnalysisDetailOpen = activeTrack => isAnalysisDetailOpenView(activeTrack, deps);
    const toggleAnalysisDetailOpen = trackId => toggleAnalysisDetailOpenView(trackId, deps);
    const track = getSelectedTrack();
    el.trackDetail.textContent = '';
    if (!track) {
        el.detailStatus.className = 'status-pill';
        el.detailStatus.textContent = '선택 없음';
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = '트랙을 선택하면 정밀 비교와 진행 상태가 표시됩니다.';
        el.trackDetail.appendChild(empty);
        updateConfidenceUI(null);
        return;
    }

    el.detailStatus.className = `status-pill status-${track.status}`;
    el.detailStatus.textContent = statusLabel(track.status);

    const title = document.createElement('h3');
    title.textContent = track.name;
    el.trackDetail.appendChild(title);

    const compact = document.createElement('div');
    compact.className = 'detail-compact-summary';
    const presetText = PRESET_LABELS[track.preset] || track.preset || '커스텀';
    const safetyInfo = track.safetyInfo || (track.analysis ? computeEngineSafetyInfo(track, null, track.finalizeInfo || null) : null);
    compact.textContent = track.analysis ? `${presetText} · ${track.status === 'done' ? '완료' : statusLabel(track.status)}${safetyInfo ? ` · 안전 ${safetyInfo.score}점` : ''}` : statusLabel(track.status);
    el.trackDetail.appendChild(compact);
    renderMasterPreviewQuickBar(track);

    const isOpen = isAnalysisDetailOpen(track);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'analysis-detail-toggle btn-secondary';
    toggle.textContent = isOpen ? '분석 상세 닫기' : '분석 상세보기';
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.addEventListener('click', () => {
        toggleAnalysisDetailOpen(track.id);
        renderAll({ keepDetailAudio: true });
    });
    el.trackDetail.appendChild(toggle);

    if (isOpen) {
        renderAiMasteringCard(track);
        renderReferenceMatchInspector(track, deps);
        renderMasterComparisonPanel(track);
        renderABStudioPanel(track);
        renderWaveformPanel(track);
        renderMasterReportPanel(track);
        renderQualityGatePanel(track);
        renderProcessingFlowPanel(track);
        renderEngineSafetyPanel(track);
        renderLowMonoPanel(track);
        const detailsWrap = document.createElement('div');
        detailsWrap.className = 'analysis-detail-list';
        const addRow = (label, value) => addDetailRow(label, value, detailsWrap);

        addRow('파일명', track.name);
        addRow('파일 형식', track.type);
        addRow('파일 용량', formatBytes(track.size));
        addRow('프리셋 상태', `${PRESET_LABELS[track.preset] || track.preset} · 신뢰지수 ${track.confidence || 0}%${track.genreLocked ? ' · 잠금' : ''}`);
        addRow('분석 캐시', track.analysisCacheHit ? '사용됨 · 재분석 시간 절약' : '신규 분석');
        if (track.outName) addRow('출력 파일', track.outName);
        addRow('출력 포맷', getOutputFormatLabel(track.outFormat || state.outputFormat || 'wav24'));
        addRow('마스터링 목표', `${getMasterGoalLabel(state.masterGoal)} · ${getMasterGoalDescription(state.masterGoal)}`);
        addRow('스타일 프리셋', `${getMasterStyleLabel(state.masterStyle)} · ${getMasterStyleDescription(state.masterStyle)}`);
        addRow('마스터링 성향', `${getMasterStrengthLabel(state.masterStrength)} · ${getMasterStrengthDescription(state.masterStrength)}`);
        addRow('레퍼런스 매칭 강도', `${getReferenceMatchStrengthLabel()} · ${Math.round(getReferenceMatchStrengthAmount() * 100)}%`);
        addRow('플랫폼 저장 프리셋', `${getPlatformPresetLabel()} · ${PLATFORM_EXPORT_PRESETS[state.platformPreset]?.note || '직접 설정 유지'}`);
        if (state.referenceProfile?.status === 'ready') addRow('레퍼런스 트랙', `${state.referenceProfile.name} · ${state.referenceProfile.report}`);
        if (track.genreReason) addRow('장르 판단 근거', track.genreReason);
        addRow('마스터링 강도', `${track.settings.intensity ?? 100}% · ${getMasteringIntensity(track.settings).high ? 'HIGH 비선형' : 'NORMAL'}`);
        addRow('금속성 제거', `${track.settings.metallicRemoval ?? 0}% · 높일수록 더 많이 제거`);
        addRow('피치/속도', `${formatSigned(track.transform?.pitchSemitones || 0, 2)} st · BPM ${(track.transform?.speedRatio || 1).toFixed(2)}x · ${getBeatPresetLabel(track.transform?.beatPreset || getBeatPresetForRatio(track.transform?.speedRatio || 1))}`);
        addRow('악기 추가', getInstrumentDetailText(track));
        addRow('활성 기능', featureLabelText());
        addRow('AI 티 완화 엔진', shouldApplyAiHumanizer(track.preset) ? 'ON · 250/400/500Hz 온기 보강 · De-esser · 16kHz 하이컷' : 'OFF 또는 커스텀 수동 우선');
        addRow('보컬 보호 모드', shouldApplyVocalProtection(track.preset, track.analysis) ? 'ON · 감정선/멜로디 보존 · 치찰음 섬세 제어' : 'OFF 또는 비보컬/커스텀 우선');
        addRow('스마트 과처리 방지', state.featureFlags.smartGuard ? 'ON · 밝기/저역/피크 과잉을 렌더 직전 보정' : 'OFF · 설정값 그대로 렌더');
        addRow('신규 플러그인', `${state.featureFlags.vocalFocusPlus ? '보컬+' : '보컬 OFF'} · ${state.featureFlags.adaptiveAir ? '에어+' : '에어 OFF'} · ${state.featureFlags.translationGuard ? '모바일+' : '모바일 OFF'} · ${state.featureFlags.referenceMatch ? '레퍼런스+' : '레퍼런스 OFF'} · ${state.featureFlags.earFatigueGuard ? '피로가드+' : '피로가드 OFF'}`);
        addRow('스마트 성능 가드', formatPerformanceGuardInfo(track.performanceGuardInfo));
        if (track.safetyInfo) addRow('엔진 안전 점수', `${track.safetyInfo.score}점 · ${track.safetyInfo.label} · ${track.safetyInfo.notes.join(', ')}`);
        if (track.qualityGate) addRow('품질 게이트', `${track.qualityGate.label} · ${track.qualityGate.summary}`);
        if (track.masterReport) addRow('리포트 저장', '트랙 카드의 리포트 저장 버튼으로 별도 저장');
        addRow('실시간 엔진 로그', track.report || '-');

        if (track.instrumentInfo && track.instrumentInfo.applied) addRow('리듬 레이어 결과', formatInstrumentLayerResult(track.instrumentInfo));
        if (track.performanceInfo) {
            addRow('처리 성능 체크', formatPerformanceInfo(track.performanceInfo));
            const heavy = getHeaviestPerformanceStage(track.performanceInfo);
            if (heavy) addRow('가장 무거운 단계', `${heavy.label} · ${formatDurationMs(heavy.ms)}`);
        }
        if (track.trimInfo) addRow('무음 정리', track.trimInfo.applied ? `앞 ${track.trimInfo.startTrimSec.toFixed(2)}초 · 뒤 ${track.trimInfo.endTrimSec.toFixed(2)}초 정리` : '정리할 무음 구간 없음');
        if (track.dcInfo) addRow('DC offset 정리', track.dcInfo.applied ? `최대 ${track.dcInfo.maxOffsetDb.toFixed(1)} dBFS offset 제거` : '유의미한 DC offset 없음');
        if (track.exportFallbackInfo) addRow('출력 fallback', `${getOutputFormatLabel(track.exportFallbackInfo.from)} 실패 → ${getOutputFormatLabel(track.exportFallbackInfo.to)} 저장 · ${track.exportFallbackInfo.reason}`);
        if (track.albumApplied) addRow('앨범 통일', `레벨 ${formatSigned(track.albumApplied.levelDeltaDb, 2)} dB · 톤 ${formatSigned(track.albumApplied.toneDelta * 100, 1)}%`);
        if (track.truePeakInfo) {
            const beforeDb = ampToDb(track.truePeakInfo.peakBefore).toFixed(2);
            const afterDb = ampToDb(track.truePeakInfo.peakAfter).toFixed(2);
            addRow('피크 가드', `${track.truePeakInfo.mode === 'truePeak' ? '4x FIR True Peak' : 'Sample Peak'} · 전 ${beforeDb} dB · 후 ${afterDb} dB`);
        }
        if (track.finalizeInfo) {
            addRow('DSP 적용량 Inspector', `${getDspAmountScoreLabel(track)} · ${formatDspAmountSummary(track)}`);
            addRow('클리핑 위험', getClippingRiskText(track));
            const before = Number.isFinite(track.finalizeInfo.loudnessBefore) ? `${track.finalizeInfo.loudnessBefore.toFixed(1)} LUFS` : '-';
            const after = Number.isFinite(track.finalizeInfo.loudnessAfter) ? `${track.finalizeInfo.loudnessAfter.toFixed(1)} LUFS` : '-';
            addRow('K-weighted 2-Pass 라우드니스', `${before} → ${after} · 목표 ${track.finalizeInfo.targetLufs} LUFS`);
            addRow('엔진 품질 모드', `${getQualityModeLabel(track.finalizeInfo.qualityMode)} · ${track.finalizeInfo.oversampleMode || `${track.finalizeInfo.oversample || 4}x 피크 검사`}`);
            if (track.finalizeInfo.multibandMode) {
                const bands = track.finalizeInfo.multibandBands || {};
                addRow('멀티밴드 다이내믹스', `Low ${formatSigned(Number(bands.low || 0), 2)} dB · Mid ${formatSigned(Number(bands.mid || 0), 2)} dB · High ${formatSigned(Number(bands.high || 0), 2)} dB`);
            }
            if (track.finalizeInfo.mobileSpeakerMode && track.finalizeInfo.mobileSpeakerMode !== 'bypass') {
                const cuts = track.finalizeInfo.mobileSpeakerCuts || {};
                addRow('폰 스피커 번역 가드', `위험 ${Math.round(Number(track.finalizeInfo.mobileSpeakerRisk || 0) * 100)}% · 저역 ${formatSigned(Number(cuts.lowShelfDb || 0), 2)} dB · 박스 ${formatSigned(Number(cuts.mudDb || 0), 2)} dB · 폰공진 ${formatSigned(Number(cuts.phoneDb || 0), 2)} dB`);
            }
            if (track.finalizeInfo.dynamicDeEsserMode && track.finalizeInfo.dynamicDeEsserMode !== 'bypass') {
                const bands = track.finalizeInfo.dynamicDeEsserBands || {};
                addRow('동적 디에서/하쉬 억제', `위험 ${Math.round(Number(track.finalizeInfo.dynamicDeEsserRisk || 0) * 100)}% · Presence ${formatSigned(Number(bands.presence || 0), 2)} dB · Sibilance ${formatSigned(Number(bands.sibilance || 0), 2)} dB · Air ${formatSigned(Number(bands.air || 0), 2)} dB`);
            }
            const spatialBudget = track.analysis?.spatialBudgetApplied;
            if (spatialBudget) {
                const grooveText = `${Math.round(Number(spatialBudget.rawStereoGroove || 0))}% → ${Math.round(Number(spatialBudget.stereoGroove || 0))}%`;
                addRow('위상 세이프 공간 예산', `Width x${Number(spatialBudget.rawWidthFactor || 1).toFixed(2)} → x${Number(spatialBudget.widthFactor || 1).toFixed(2)} · Groove ${grooveText}`);
            }
        }

        if (track.analysis) {
            addRow('재생 시간', formatTime(track.analysis.duration));
            addRow('원본 샘플레이트', `${track.analysis.sampleRate.toLocaleString()} Hz`);
            addRow('채널 수', `${track.analysis.channels} ch`);
            addRow('피크 레벨', `${track.analysis.peakDb.toFixed(1)} dBFS`);
            addRow('RMS 레벨', `${track.analysis.loudnessHint.toFixed(1)} dB`);
            if (Number.isFinite(track.analysis.loudnessIntegrated)) addRow('K-weighted 통합 라우드니스', `${track.analysis.loudnessIntegrated.toFixed(1)} LUFS`);
            addRow('밝기/스테레오 폭', `${Math.round(track.analysis.brightness * 100)}% / ${Math.round(track.analysis.stereoWidth * 100)}%`);
            if (Number.isFinite(track.analysis.lowMonoScore)) addRow('저역 모노 호환', `${Math.round(track.analysis.lowMonoScore)}점 · 상관도 ${Number(track.analysis.lowMonoCorrelation || 0).toFixed(2)} · ${getLowMonoRiskLabel(track.analysis.lowMonoRisk)}`);
            addRow('저역/중역/고역', `${Math.round((track.analysis.bassRatio || 0) * 100)}% / ${Math.round((track.analysis.midRatio || 0) * 100)}% / ${Math.round((track.analysis.highRatio || 0) * 100)}%`);
            addRow('트랜지언트 밀도', `${Math.round((track.analysis.transientDensity || 0) * 100)}%`);
            addRow('금속성 지수', `${Math.round(track.analysis.metallicHint * 100)}%`);
            if (Number.isFinite(Number(track.analysis.mobileSpeakerRisk))) addRow('폰 스피커 울림 위험', formatMobileSpeakerRisk({ ...(track.analysis.mobileSpeakerDetail || {}), risk: Number(track.analysis.mobileSpeakerRisk || 0), label: track.analysis.mobileSpeakerRiskLabel || 'safe' }));
            addRow('공진 추적 주파수', `${track.analysis.targetDynamicFreq} Hz`);
        }
        if (track.error) addRow('오류 내용', track.error);
        el.trackDetail.appendChild(detailsWrap);
    }

    updateConfidenceUI(track);
    if (!options.keepDetailAudio) applyTrackToControls(track);
}

function isDesktopDetailDefaultOpen() {
    return Boolean(window.matchMedia && window.matchMedia('(min-width: 821px)').matches);
}

function isAnalysisDetailOpenView(track, deps = {}) {
    const { state } = deps;
    if (!track) return false;
    if (!state.expandedDetailIds) state.expandedDetailIds = new Set();
    if (!state.collapsedDetailIds) state.collapsedDetailIds = new Set();
    if (isDesktopDetailDefaultOpen()) return !state.collapsedDetailIds.has(track.id);
    return state.expandedDetailIds.has(track.id);
}

function toggleAnalysisDetailOpenView(trackId, deps = {}) {
    const { state } = deps;
    if (!trackId) return;
    if (!state.expandedDetailIds) state.expandedDetailIds = new Set();
    if (!state.collapsedDetailIds) state.collapsedDetailIds = new Set();
    if (isDesktopDetailDefaultOpen()) {
        if (state.collapsedDetailIds.has(trackId)) state.collapsedDetailIds.delete(trackId);
        else state.collapsedDetailIds.add(trackId);
        return;
    }
    if (state.expandedDetailIds.has(trackId)) state.expandedDetailIds.delete(trackId);
    else state.expandedDetailIds.add(trackId);
}

function renderMasterPreviewQuickBarView(track, deps = {}) {
    const { el, canStartMasterPreview, renderMasterPreviewForTrack, formatTime, MASTER_PREVIEW_DURATION_SEC } = deps;
    if (!track || !el.trackDetail) return;
    const bar = document.createElement('div');
    bar.className = 'master-preview-quickbar';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn-secondary master-preview-inline-btn';
    button.textContent = track.masterPreviewStatus === 'processing' ? '하이라이트 듣기 생성 중' : '하이라이트 듣기 · 15초';
    button.disabled = !canStartMasterPreview(track);
    button.addEventListener('click', () => renderMasterPreviewForTrack(track, { source: 'detail' }));
    const note = document.createElement('small');
    note.textContent = track.masterPreviewUrl && track.masterPreviewInfo ? `하이라이트 ${formatTime(track.masterPreviewInfo.startSec || 0)}부터 ${Math.round(track.masterPreviewInfo.durationSec || MASTER_PREVIEW_DURATION_SEC)}초 샘플 준비됨` : '전체 렌더 전에 하이라이트 구간만 먼저 확인합니다.';
    bar.append(button, note);
    el.trackDetail.appendChild(bar);
}

function renderAiMasteringCardView(track, deps = {}) {
    const {
        el, state, statusLabel, getAiConfidenceTone, getAiConfidenceLabel, buildAiMasteringSummary,
        buildAiMasteringGridItems, buildRecommendationExplainability, simplifyAiReason, getAiCandidatePresets,
        getOriginalSelectionCandidate, buildCandidateExplainText, applyOriginalManualSelection, applyAiPresetCandidate,
        getAiMasteringRiskNotes, applyAIRecommendationToTrack, canStartAiMastering, masterTrackWithAiRecommendation,
        shouldOfferAiSafeRemaster, aiSafeRemasterTrack
    } = deps;
    if (!track || !el.trackDetail) return;
    const panel = document.createElement('section');
    const analyzed = Boolean(track.analysis);
    const confidenceTone = getAiConfidenceTone(track);
    panel.className = `ai-master-card ai-master-${confidenceTone} ${analyzed ? '' : 'ai-master-pending'}`;

    const head = document.createElement('div');
    head.className = 'ai-master-head';
    const title = document.createElement('div');
    title.className = 'ai-master-title';
    const kicker = document.createElement('span');
    kicker.textContent = 'AI 자동 마스터링';
    const strong = document.createElement('strong');
    strong.textContent = analyzed ? '추천 설정이 준비되었습니다' : '분석 후 추천 설정을 준비합니다';
    title.append(kicker, strong);
    const badge = document.createElement('b');
    badge.className = 'ai-master-confidence';
    badge.textContent = analyzed ? `${getAiConfidenceLabel(track)} · ${track.confidence || 0}%` : statusLabel(track.status);
    head.append(title, badge);

    const summary = document.createElement('p');
    summary.className = 'ai-master-summary';
    summary.textContent = analyzed ? buildAiMasteringSummary(track) : '파일 분석이 끝나면 장르, 목표 음압, 보호 가드, 추천 이유를 한 카드에서 확인할 수 있습니다.';

    const grid = document.createElement('div');
    grid.className = 'ai-master-grid';
    buildAiMasteringGridItems(track).forEach(item => grid.appendChild(makeAiMasteringMetric(item.label, item.value, item.tone)));

    const reason = document.createElement('div');
    reason.className = 'ai-master-reason';
    const reasonTitle = document.createElement('span');
    reasonTitle.textContent = '추천 이유';
    const reasonText = document.createElement('p');
    const explainability = analyzed ? buildRecommendationExplainability(track) : null;
    reasonText.textContent = analyzed ? (explainability.summary || simplifyAiReason(track.genreReason)) : '분석 중입니다.';
    reason.append(reasonTitle, reasonText);
    if (analyzed && explainability.chips.length) {
        const chipList = document.createElement('div');
        chipList.className = 'ai-master-explain-chip-list';
        explainability.chips.slice(0, 6).forEach(chip => {
            const chipEl = document.createElement('em');
            chipEl.className = `ai-master-explain-chip ai-master-explain-${chip.tone || 'neutral'}`;
            chipEl.textContent = chip.text;
            chipList.appendChild(chipEl);
        });
        reason.appendChild(chipList);
    }

    const candidates = document.createElement('div');
    candidates.className = 'ai-master-candidates';
    const candidateLabel = document.createElement('span');
    candidateLabel.textContent = '대안 프리셋';
    candidates.appendChild(candidateLabel);
    const candidateList = document.createElement('div');
    candidateList.className = 'ai-master-candidate-list';
    [...getAiCandidatePresets(track), getOriginalSelectionCandidate(track)].forEach(candidate => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `ai-candidate-chip ${(candidate.active ?? (candidate.preset === track.preset)) ? 'active' : ''} ${candidate.manual ? 'manual-original' : ''}`;
        button.textContent = candidate.label;
        button.title = analyzed ? buildCandidateExplainText(track, candidate) : '';
        button.disabled = !analyzed || state.busy;
        button.addEventListener('click', () => candidate.manual ? applyOriginalManualSelection(track) : applyAiPresetCandidate(track, candidate.preset));
        candidateList.appendChild(button);
    });
    if (!candidateList.childNodes.length) {
        const empty = document.createElement('small');
        empty.textContent = analyzed ? '추천 후보가 충분하지 않습니다.' : '분석 후 표시됩니다.';
        candidateList.appendChild(empty);
    }
    candidates.appendChild(candidateList);

    const risk = document.createElement('div');
    risk.className = 'ai-master-risk';
    const riskTitle = document.createElement('span');
    riskTitle.textContent = '체크 포인트';
    const riskList = document.createElement('div');
    riskList.className = 'ai-master-risk-list';
    const notes = getAiMasteringRiskNotes(track);
    (notes.length ? notes : ['특별한 위험 요소 없음']).slice(0, 3).forEach(note => {
        const item = document.createElement('em');
        item.textContent = note;
        riskList.appendChild(item);
    });
    risk.append(riskTitle, riskList);

    const actions = document.createElement('div');
    actions.className = 'ai-master-actions';
    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'btn-secondary';
    applyBtn.textContent = '추천값 적용';
    applyBtn.disabled = !analyzed || state.busy;
    applyBtn.addEventListener('click', () => applyAIRecommendationToTrack(track));
    const masterBtn = document.createElement('button');
    masterBtn.type = 'button';
    masterBtn.className = 'btn-primary';
    masterBtn.textContent = '추천 설정으로 마스터링';
    masterBtn.disabled = !canStartAiMastering(track);
    masterBtn.addEventListener('click', () => masterTrackWithAiRecommendation(track));
    actions.append(applyBtn, masterBtn);

    if (shouldOfferAiSafeRemaster(track)) {
        const remasterBtn = document.createElement('button');
        remasterBtn.type = 'button';
        remasterBtn.className = 'btn-secondary ai-safe-remaster-btn';
        remasterBtn.textContent = 'AI가 안전하게 다시 마스터링';
        remasterBtn.disabled = state.busy || track.status === 'processing' || track.status === 'analyzing';
        remasterBtn.addEventListener('click', () => aiSafeRemasterTrack(track));
        actions.appendChild(remasterBtn);
    }

    panel.append(head, summary, grid, reason, candidates, risk, actions);
    el.trackDetail.appendChild(panel);
}


function renderReferenceMatchInspector(track, deps = {}) {
    const { state, el } = deps;
    const match = track?.referenceMatch2;
    if (state?.referenceProfile?.status !== 'ready' || !match) return;
    const panel = document.createElement('section'); panel.className = 'reference-match-inspector'; panel.setAttribute('aria-label', 'Reference Match Inspector');
    const head = document.createElement('div'); head.className = 'reference-match-head';
    const copy = document.createElement('div'), kicker = document.createElement('span'), title = document.createElement('strong'), desc = document.createElement('small');
    kicker.className = 'reference-match-kicker'; kicker.textContent = 'REFERENCE MATCH 2.0'; title.textContent = '레퍼런스 매칭 분석'; desc.textContent = `${state.referenceProfile.name || '레퍼런스'} 기준 · 신뢰 ${Math.round(Number(match.confidence) || 0)}%`; copy.append(kicker,title,desc);
    const score = document.createElement('div'); score.className = `reference-match-score ${match.score >= 85 ? 'excellent' : match.score >= 70 ? 'good' : 'needs-work'}`;
    const scoreValue=document.createElement('b'), scoreUnit=document.createElement('span'); scoreValue.textContent=String(Math.round(Number(match.score)||0)); scoreUnit.textContent='/ 100'; score.append(scoreValue,scoreUnit); head.append(copy,score);
    const metricGrid=document.createElement('div'); metricGrid.className='reference-match-metrics';
    [['Tonal',match.tonal?.score],['Dynamics',match.dynamics?.score],['Stereo',match.stereo?.score],['Character',match.character?.score]].forEach(([label,value])=>{ const item=document.createElement('div'),name=document.createElement('span'),val=document.createElement('b'); item.className='reference-match-metric'; name.textContent=label; val.textContent=String(Math.round(Number(value)||0)); item.append(name,val); metricGrid.appendChild(item); });
    const labels={sub:'Sub 20–60Hz',bass:'Bass 60–180Hz',mud:'Mud 180–420Hz',body:'Body 420Hz–1.2k',vocal:'Vocal 1.2–2.8k',presence:'Presence 2.8–5k',harsh:'Harsh 4–7.1k',sibilance:'Sibilance 5.6–10k',air:'Air 10–20k'};
    const differences=[]; Object.entries(match.tonal?.regions||{}).forEach(([key,value])=>{ const n=Number(value)||0; differences.push({label:labels[key]||key,amount:n,weight:Math.abs(n)}); });
    const dyn=match.dynamics?.delta||{}, stereo=match.stereo?.delta||{}, character=match.character?.delta||{};
    [['Loudness',dyn.loudness,.8],['Crest / Punch',dyn.crest,.65],['Stereo Width',stereo.width,.7],['Brightness',character.brightness,.65]].forEach(([label,value,mult])=>{ const n=Number(value); if(Number.isFinite(n)) differences.push({label,amount:n,weight:Math.abs(n)*mult}); });
    const diffWrap=document.createElement('div'); diffWrap.className='reference-match-differences'; const diffTitle=document.createElement('span'); diffTitle.textContent='가장 큰 차이'; const diffList=document.createElement('div'); diffList.className='reference-match-difference-list';
    differences.sort((a,b)=>b.weight-a.weight).slice(0,3).forEach(item=>{ const chip=document.createElement('em'); chip.className=item.amount>=0?'reference-diff-up':'reference-diff-down'; chip.textContent=`${item.label} · ${item.amount>=0?'보강':'절제'} ${Math.max(1,Math.round(Math.abs(item.amount)*100))}%`; diffList.appendChild(chip); });
    if(!diffList.childNodes.length){ const chip=document.createElement('em'); chip.textContent='레퍼런스와 큰 차이가 없습니다'; diffList.appendChild(chip); } diffWrap.append(diffTitle,diffList);
    const decision=document.createElement('div'); decision.className='reference-match-decision'; const dl=document.createElement('span'),dv=document.createElement('b'); dl.textContent='Adaptive 선택'; const adaptive=track.adaptiveDecisionInfo; dv.textContent=adaptive?.selectedLabel?`${adaptive.selectedLabel} · 신뢰 ${Math.round(Number(adaptive.confidence)||0)}%`:'다음 마스터링에서 자동 평가'; decision.append(dl,dv);
    panel.append(head,metricGrid,diffWrap,decision); el.trackDetail.appendChild(panel);
}

function makeAiMasteringMetric(label, value, tone = 'neutral') {
    const item = document.createElement('div');
    item.className = `ai-master-metric ai-master-metric-${tone || 'neutral'}`;
    const name = document.createElement('span');
    name.textContent = label;
    const val = document.createElement('b');
    val.textContent = value;
    item.append(name, val);
    return item;
}



    global.FoxBearDetailView = Object.freeze({
        renderDetail,
        isDesktopDetailDefaultOpen,
        isAnalysisDetailOpen: isAnalysisDetailOpenView,
        toggleAnalysisDetailOpen: toggleAnalysisDetailOpenView,
        renderMasterPreviewQuickBar: renderMasterPreviewQuickBarView,
        renderAiMasteringCard: renderAiMasteringCardView,
        makeAiMasteringMetric
    });
})(window);
