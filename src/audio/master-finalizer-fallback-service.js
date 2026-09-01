// FoxBear main-thread finalizer recovery service v1.7.4
'use strict';
(function attachFoxBearMasterFinalizerFallbackService(global) {
    const VERSION = '1.7.4-reload-reentry-mode-chooser';
    function requireFn(value, name) { if (typeof value !== 'function') throw new Error(`파이널라이저 복구 의존성이 없습니다: ${name}`); return value; }
    async function run(buffer, options = {}, deps = {}) {
        const clamp = requireFn(deps.clamp, 'clamp');
        const yieldFn = requireFn(deps.yieldFn, 'yieldFn');
        const makeAudioBuffer = requireFn(deps.makeAudioBuffer, 'makeAudioBuffer');
        const sanitizeCooperative = requireFn(deps.sanitizeAudioBufferCooperative, 'sanitizeAudioBufferCooperative');
        const removeDcCooperative = requireFn(deps.removeDcOffsetAudioBufferCooperative, 'removeDcOffsetAudioBufferCooperative');
        const throwIfCancelled = typeof deps.throwIfCancelled === 'function' ? deps.throwIfCancelled : () => {};
        const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
        const label = '파이널라이저 메인 스레드 복구';
        const emit = (percent, stage, detail = '') => { throwIfCancelled(`finalizer-fallback:${stage}`); onProgress?.({ percent: clamp(Number(percent) || 0, 0, 100), stage, detail }); };
        const checkpoint = async (percent, stage, detail = '') => { emit(percent, stage, detail); await yieldFn(); throwIfCancelled(`finalizer-fallback:${stage}`); };
        await checkpoint(1, `${label} 시작`, options.fallbackReason || 'Worker 사용 불가');
        const output = makeAudioBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
        const chunkSamples = 65536, totalSamples = Math.max(1, buffer.numberOfChannels * buffer.length), budgetMs = 10;
        let processed = 0, lastYieldAt = Date.now();
        for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
            const source = buffer.getChannelData(ch);
            for (let offset = 0; offset < source.length; offset += chunkSamples) {
                throwIfCancelled('finalizer-fallback:clone');
                const end = Math.min(source.length, offset + chunkSamples);
                output.copyToChannel(source.subarray(offset, end), ch, offset);
                processed += end - offset;
                if (Date.now() - lastYieldAt >= budgetMs || end >= source.length) {
                    emit(2 + processed / totalSamples * 8, '파이널라이저 복구 버퍼 복사', `${ch + 1}/${buffer.numberOfChannels}ch`);
                    await yieldFn();
                    throwIfCancelled('finalizer-fallback:clone-resume');
                    lastYieldAt = Date.now();
                }
            }
        }
        await sanitizeCooperative(output, 'finalizer-fallback-input', { yieldFn, throwIfCancelled: () => throwIfCancelled('finalizer-fallback-input'), onProgress: p => emit(10 + clamp(Number(p?.percent || 0), 0, 100) * 0.08, p?.stage || '복구 입력 안전 점검', p?.detail || '') });
        const dcInfo = await removeDcCooperative(output, { yieldFn, throwIfCancelled: () => throwIfCancelled('finalizer-fallback-dc'), onProgress: p => emit(18 + clamp(Number(p?.percent || 0), 0, 100) * 0.06, p?.stage || '복구 DC offset 정리', p?.detail || '') });
        const targetDb = Number(options.ceilingDb ?? -1.0), targetLufs = Number(options.targetLufs ?? -14), qualityMode = options.qualityMode || 'balanced';
        await checkpoint(25, '모바일 스피커 공진 보호 준비');
        const mobileInfo = requireFn(deps.applyMobileSpeakerResonanceGuardBuffer, 'mobileSpeakerGuard')(output, qualityMode, options.analysis || {});
        await checkpoint(38, '다이내믹 디에서 처리 준비');
        const deEsserInfo = requireFn(deps.applyDynamicDeEsserBuffer, 'dynamicDeEsser')(output, qualityMode, options.analysis || {});
        await checkpoint(50, '멀티밴드 다이내믹 처리 준비');
        const multibandInfo = requireFn(deps.applyGentleMultibandDynamicsBuffer, 'multibandDynamics')(output, qualityMode, options.analysis || {});
        await checkpoint(62, '러드니스 측정 준비');
        const loudnessBefore = requireFn(deps.measureApproxGatedLoudness, 'measureApproxGatedLoudness')(output);
        throwIfCancelled('finalizer-fallback-loudness-before');
        const maxGainDb = qualityMode === 'max' ? 9 : qualityMode === 'fast' ? 5 : 7;
        const loudnessGainDb = clamp(targetLufs - loudnessBefore, -8, maxGainDb);
        requireFn(deps.applyBufferGain, 'applyBufferGain')(output, Math.pow(10, loudnessGainDb / 20));
        await checkpoint(74, 'True Peak 보호 준비');
        const peakInfo = requireFn(deps.applyTransparentLimiterGuard, 'transparentLimiter')(output, targetDb, options.truePeak !== false, qualityMode, options.analysis || {});
        await sanitizeCooperative(output, 'finalizer-fallback-output', { yieldFn, throwIfCancelled: () => throwIfCancelled('finalizer-fallback-output'), onProgress: p => emit(84 + clamp(Number(p?.percent || 0), 0, 100) * 0.08, p?.stage || '복구 출력 안전 점검', p?.detail || '') });
        await checkpoint(93, '최종 러드니스 검증 준비');
        const finalLoudness = requireFn(deps.measureKWeightedLoudnessBundleAudioBuffer, 'measureLoudnessBundle')(output);
        throwIfCancelled('finalizer-fallback-loudness-after');
        emit(100, `${label} 완료`);
        const getShared = requireFn(deps.getSharedDspSummaryForReport, 'getSharedDspSummaryForReport');
        return { buffer: output, info: {
            mode: options.truePeak === false ? 'K-weighted multiband lookahead sample peak fallback' : 'K-weighted multiband + 4x FIR true peak fallback', qualityMode, targetLufs, ceilingDb: targetDb,
            loudnessBefore, loudnessAfter: finalLoudness.integrated, shortTermLufs: finalLoudness.shortTerm, peakBefore: peakInfo.peakBefore, peakAfter: peakInfo.peakAfter,
            gainDb: loudnessGainDb + 20 * Math.log10(Math.max(1e-9, peakInfo.gain || 1)), limiterReductionDb: peakInfo.limiterReductionDb || 0, limiterActivePct: peakInfo.limiterActivePct || 0, limiterMeanReductionDb: peakInfo.limiterMeanReductionDb || 0, limiterGainMovement: peakInfo.limiterGainMovement || 0, dcRemoved: dcInfo,
            oversample: options.truePeak === false ? 1 : 4, oversampleMode: options.truePeak === false ? 'sample peak' : '4x windowed-sinc FIR true peak', multibandMode: multibandInfo.mode, multibandReductionDb: multibandInfo.reductionDb, multibandBands: multibandInfo.bands,
            mobileSpeakerMode: mobileInfo.mode, mobileSpeakerRisk: mobileInfo.risk, mobileSpeakerCuts: mobileInfo.cuts, dynamicDeEsserMode: deEsserInfo.mode, dynamicDeEsserRisk: deEsserInfo.risk,
            dynamicDeEsserReductionDb: deEsserInfo.reductionDb, dynamicDeEsserBands: deEsserInfo.bands, limiterMode: peakInfo.limiterMode, lookaheadMs: peakInfo.lookaheadMs, lookaheadSamples: peakInfo.lookaheadSamples,
            preLimiterPeak: peakInfo.preLimiterPeak, loudnessStandard: 'ITU-R BS.1770 K-weighting + EBU R128 gates', sharedDspProfileVersion: deps.sharedDspProfileVersion || '', sharedDspProfile: getShared(options.dspProfile)
        }};
    }
    global.FoxBearMasterFinalizerFallbackService = Object.freeze({ VERSION, run });
})(window);
