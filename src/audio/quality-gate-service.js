// FoxBear QualityGate v2.2 service v1.6.0 - dynamics, spectral preservation, phase, pumping, and True Peak checks
'use strict';

(function attachFoxBearQualityGateService(global) {
    const DEFAULT_RULES = Object.freeze({
        lufsToleranceDb: 1.6,
        peakMarginDb: 0.15,
        warnGainDb: 8,
        maxDcOffset: 0.006,
        minUsefulDurationSec: 1.0,
        warnClippedSamples: 8,
        mobileSpeakerWarn: 0.62,
        mobileSpeakerInfo: 0.42,
        shortTermRangeWarnDb: 7.5,
        shortTermOverTargetWarnDb: 3.0,
        shortTermOverTargetFailDb: 5.5,
        limiterWarnDb: 3.2,
        limiterFailDb: 6.0,
        deEsserWarnDb: 2.4,
        deEsserFailDb: 4.8,
        multibandWarnDb: 4.5,
        multibandFailDb: 7.5,
        mobileCutWarnDb: 2.4,
        mobileCutFailDb: 4.2,
        pumpingBassRatio: 0.30,
        pumpingLimiterWarnDb: 3.5,
        pumpingLimiterFailDb: 6.0,
        pumpingActiveWarnPct: 45,
        pumpingActiveFailPct: 75
    });

    function toNumber(value, fallback = NaN) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function ampToDb(value) {
        const amplitude = Math.abs(toNumber(value, 0));
        return 20 * Math.log10(Math.max(0.000001, amplitude));
    }

    function absMax(values) {
        return values.reduce((max, value) => Math.max(max, Math.abs(toNumber(value, 0))), 0);
    }

    function formatSigned(value, digits = 1) {
        const n = toNumber(value, 0);
        return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
    }

    function formatDb(value, digits = 1) {
        const n = toNumber(value, 0);
        return `${n.toFixed(digits)} dB`;
    }

    function addItem(items, label, status, detail, meta = null) {
        items.push(meta ? { label, status, detail, meta } : { label, status, detail });
    }

    function getShortTermStats(report = {}, finalizeInfo = {}) {
        return report?.loudness?.shortTermAfter || report?.loudness?.afterShortTerm || finalizeInfo?.shortTermLufs || null;
    }

    function statusByThreshold(value, warn, fail) {
        const amount = Math.abs(toNumber(value, 0));
        if (amount >= fail) return 'fail';
        if (amount >= warn) return 'warn';
        return 'pass';
    }

    function makeRiskFlags(items) {
        return items
            .filter(item => item.status === 'warn' || item.status === 'fail')
            .map(item => ({
                label: item.label,
                status: item.status,
                detail: item.detail,
                code: String(item.meta?.code || '')
            }));
    }

    function createReport(input = {}) {
        const rules = Object.assign({}, DEFAULT_RULES, input.rules || {});
        const report = input.report || {};
        const track = input.track || {};
        const finalizeInfo = input.finalizeInfo || {};
        const encoded = input.encoded || {};
        const finalizer = report.finalizer || {};
        const items = [];

        const target = toNumber(report?.target?.lufs ?? finalizeInfo?.targetLufs ?? input.targetLufs);
        const afterLufs = toNumber(report?.after?.approxLufs ?? finalizeInfo?.loudnessAfter);
        const lufsDiff = Number.isFinite(target) && Number.isFinite(afterLufs) ? afterLufs - target : NaN;
        addItem(items, '라우드니스 목표', Math.abs(lufsDiff) <= rules.lufsToleranceDb ? 'pass' : 'warn', Number.isFinite(lufsDiff) ? `목표 대비 ${formatSigned(lufsDiff, 1)} LUFS` : '측정값 없음');

        const shortTerm = getShortTermStats(report, finalizeInfo);
        if (shortTerm && Number.isFinite(toNumber(shortTerm.max))) {
            const max = toNumber(shortTerm.max);
            const min = toNumber(shortTerm.min);
            const range = toNumber(shortTerm.range, Number.isFinite(min) ? max - min : 0);
            const overTarget = Number.isFinite(target) ? max - target : 0;
            const shortTermStatus = overTarget >= rules.shortTermOverTargetFailDb ? 'fail' : (overTarget >= rules.shortTermOverTargetWarnDb || range >= rules.shortTermRangeWarnDb ? 'warn' : 'pass');
            addItem(items, 'Short-term LUFS', shortTermStatus, `최대 ${max.toFixed(1)} LUFS · 범위 ${range.toFixed(1)} dB${Number.isFinite(target) ? ` · 목표 대비 최대 ${formatSigned(overTarget, 1)}` : ''}`, { max, min, range, overTarget });
        } else {
            addItem(items, 'Short-term LUFS', 'warn', '구간별 라우드니스 통계 없음');
        }

        const reportedTruePeakDb = toNumber(report?.after?.truePeakDbTP);
        const finalizerTruePeak = toNumber(finalizeInfo?.peakAfter);
        const truePeakDb = Number.isFinite(reportedTruePeakDb)
            ? reportedTruePeakDb
            : (Number.isFinite(finalizerTruePeak) && finalizerTruePeak > 0 ? ampToDb(finalizerTruePeak) : NaN);
        const samplePeakDb = toNumber(report?.after?.samplePeakDb ?? report?.after?.peakDb);
        const peakDb = Number.isFinite(truePeakDb) ? truePeakDb : samplePeakDb;
        const peakUnit = Number.isFinite(truePeakDb) ? 'dBTP' : 'dBFS';
        const ceiling = toNumber(report?.target?.ceilingDb ?? finalizeInfo?.ceilingDb ?? input.ceilingDb);
        addItem(items, Number.isFinite(truePeakDb) ? 'True Peak 천장' : '피크 천장', Number.isFinite(peakDb) && peakDb <= ceiling + rules.peakMarginDb ? 'pass' : 'warn', Number.isFinite(peakDb) ? `최종 ${peakDb.toFixed(2)} ${peakUnit} · 천장 ${ceiling.toFixed(1)} dB` : '측정값 없음', { peakDb, peakUnit, samplePeakDb, truePeakDb });

        const invalid = toNumber(report?.after?.invalidSamples || 0, 0);
        addItem(items, 'Invalid sample scan', invalid === 0 ? 'pass' : 'fail', invalid === 0 ? 'NaN/Infinity 없음' : `${invalid}개 비정상 샘플 감지`);

        const clipped = toNumber(report?.after?.clippedSamples || 0, 0);
        addItem(items, '클리핑 샘플', clipped === 0 ? 'pass' : (clipped < rules.warnClippedSamples ? 'warn' : 'fail'), clipped === 0 ? '0개' : `${clipped}개`);

        const gainDb = toNumber(finalizeInfo?.gainDb || finalizer?.gainDb || 0, 0);
        addItem(items, '보정 게인', Math.abs(gainDb) <= rules.warnGainDb ? 'pass' : 'warn', `${formatSigned(gainDb, 1)} dB`);

        const limiterReduction = Math.abs(toNumber(finalizeInfo?.limiterReductionDb ?? finalizer?.limiterReductionDb, 0));
        addItem(items, 'Limiter 과보정', statusByThreshold(limiterReduction, rules.limiterWarnDb, rules.limiterFailDb), `${formatDb(limiterReduction)} · ${finalizeInfo?.limiterMode || finalizer?.limiterMode || 'lookahead'}`, { limiterReductionDb: limiterReduction });

        const deEsserReduction = Math.abs(toNumber(finalizeInfo?.dynamicDeEsserReductionDb ?? finalizer?.dynamicDeEsserReductionDb, 0));
        const deEsserRisk = toNumber(finalizeInfo?.dynamicDeEsserRisk ?? finalizer?.dynamicDeEsserRisk, 0);
        addItem(items, 'De-esser 과보정', statusByThreshold(deEsserReduction, rules.deEsserWarnDb, rules.deEsserFailDb), `${formatDb(deEsserReduction)} · 위험 ${Math.round(clamp(deEsserRisk, 0, 1) * 100)}%`, { dynamicDeEsserReductionDb: deEsserReduction, dynamicDeEsserRisk: deEsserRisk });

        const multibandReduction = Math.abs(toNumber(finalizeInfo?.multibandReductionDb ?? finalizer?.multibandReductionDb, 0));
        addItem(items, 'Multiband 과보정', statusByThreshold(multibandReduction, rules.multibandWarnDb, rules.multibandFailDb), `${formatDb(multibandReduction)} · ${finalizeInfo?.multibandMode || finalizer?.multibandMode || 'adaptive'}`, { multibandReductionDb: multibandReduction });

        const limiterActivePct = Math.max(0, toNumber(finalizeInfo?.limiterActivePct ?? finalizer?.limiterActivePct, 0));
        const bassRatio = Math.max(0, toNumber(track?.analysis?.bassRatio, 0));
        if (limiterActivePct > 0) {
            const sustainedFail = limiterReduction >= rules.pumpingLimiterFailDb && limiterActivePct >= rules.pumpingActiveFailPct;
            const sustainedWarn = limiterReduction >= rules.pumpingLimiterWarnDb && limiterActivePct >= rules.pumpingActiveWarnPct;
            const sustainedStatus = sustainedFail ? 'fail' : (sustainedWarn ? 'warn' : 'pass');
            const bassHint = bassRatio >= rules.pumpingBassRatio ? ` · 저역 펌핑 주의 ${Math.round(bassRatio * 100)}%` : '';
            addItem(items, '리미터 지속 동작', sustainedStatus, `활성 ${limiterActivePct.toFixed(1)}% · 최대 ${formatDb(limiterReduction)}${bassHint}`, { bassRatio, limiterActivePct, limiterReductionDb: limiterReduction });
        }

        const duration = toNumber(report?.after?.durationSec || track?.masteredDurationSec || 0, 0);
        addItem(items, '재생 길이', duration >= rules.minUsefulDurationSec ? 'pass' : 'warn', `${duration.toFixed(2)}초`);

        const dc = toNumber(report?.after?.dcOffsetAvg || 0, 0);
        addItem(items, 'DC offset', Math.abs(dc) <= rules.maxDcOffset ? 'pass' : 'warn', `${dc.toFixed(5)}`);

        if (encoded?.fallbackFrom) addItem(items, '출력 fallback', 'warn', `${encoded.fallbackFrom} 실패 → ${encoded.format || 'fallback'} 저장`);
        if (track?.performanceGuardInfo?.changed) addItem(items, '성능 가드', 'warn', input.performanceGuardLabel || '성능 가드 적용');

        const mobileRisk = toNumber(finalizeInfo?.mobileSpeakerRisk ?? finalizer?.mobileSpeakerRisk ?? track?.analysis?.mobileSpeakerRisk, 0);
        if (mobileRisk > rules.mobileSpeakerInfo) {
            addItem(items, '폰 스피커 울림', mobileRisk > rules.mobileSpeakerWarn ? 'warn' : 'pass', `위험 ${Math.round(mobileRisk * 100)}% · 모바일 번역 가드 적용`, { mobileSpeakerRisk: mobileRisk });
        }

        const cuts = finalizeInfo?.mobileSpeakerCuts || finalizer?.mobileSpeakerCuts || {};
        const mobileCutDb = absMax([cuts.lowShelfDb, cuts.mudDb, cuts.phoneDb, cuts.harshDb]);
        if (mobileRisk > rules.mobileSpeakerInfo || mobileCutDb > 0.05) {
            const cutStatus = statusByThreshold(mobileCutDb, rules.mobileCutWarnDb, rules.mobileCutFailDb);
            addItem(items, '모바일 번역 보정량', cutStatus, `최대 ${formatDb(mobileCutDb)} · 저역 ${formatSigned(cuts.lowShelfDb || 0, 1)} / 박스 ${formatSigned(cuts.mudDb || 0, 1)} / 폰공진 ${formatSigned(cuts.phoneDb || 0, 1)}`, { mobileCutDb, cuts });
        }

        const audit = report?.qualityAudit;
        if (audit?.flags?.length) {
            const labels = { DYNAMIC_COLLAPSE: '과도한 리미팅', HIGH_LOSS: '고역 손실', LOW_PUMPING: '저역 펌핑', PHASE_RISK: '스테레오 위상', INVALID_OUTPUT: '출력 샘플 무결성' };
            audit.flags.forEach(flag => addItem(items, labels[flag.code] || flag.code, flag.severity === 'fail' ? 'fail' : 'warn', flag.detail, { code: flag.code }));
        } else if (audit) addItem(items, '전후 품질 회귀', 'pass', `최대 ${audit.boundedSamples || 0} 샘플 경량 검사 통과`);

        const fail = items.filter(item => item.status === 'fail').length;
        const warn = items.filter(item => item.status === 'warn').length;
        const pass = items.filter(item => item.status === 'pass').length;
        const score = clamp(Math.round(100 - fail * 26 - warn * 7), 0, 100);
        const status = fail ? 'fail' : (warn ? 'warn' : 'pass');
        const label = status === 'pass' ? 'PASS' : (status === 'warn' ? 'CHECK' : 'FAIL');
        const summary = `${pass} 통과 · ${warn} 주의 · ${fail} 실패`;
        const riskFlags = makeRiskFlags(items);
        return Object.freeze({ status, label, score, summary, items, riskFlags, createdAt: new Date().toISOString(), version: 'QualityGate v2.2' });
    }

    global.FoxBearQualityGateService = Object.freeze({
        version: '1.6.0-engine-quality-regression', legacyVersion: '1.5.0-engine-quality-gate',
        rules: DEFAULT_RULES,
        createReport
    });
})(window);
