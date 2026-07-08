// FoxBear QualityGate v2 service v1.4.27 - reusable mastering result checks
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
        mobileSpeakerInfo: 0.42
    });

    function toNumber(value, fallback = NaN) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function formatSigned(value, digits = 1) {
        const n = toNumber(value, 0);
        return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
    }

    function addItem(items, label, status, detail) {
        items.push({ label, status, detail });
    }

    function createReport(input = {}) {
        const rules = Object.assign({}, DEFAULT_RULES, input.rules || {});
        const report = input.report || {};
        const track = input.track || {};
        const finalizeInfo = input.finalizeInfo || {};
        const encoded = input.encoded || {};
        const items = [];

        const target = toNumber(report?.target?.lufs ?? input.targetLufs);
        const afterLufs = toNumber(report?.after?.approxLufs);
        const lufsDiff = Number.isFinite(target) && Number.isFinite(afterLufs) ? afterLufs - target : NaN;
        addItem(items, '라우드니스 목표', Math.abs(lufsDiff) <= rules.lufsToleranceDb ? 'pass' : 'warn', Number.isFinite(lufsDiff) ? `목표 대비 ${formatSigned(lufsDiff, 1)} LUFS` : '측정값 없음');

        const peakDb = toNumber(report?.after?.peakDb);
        const ceiling = toNumber(report?.target?.ceilingDb ?? input.ceilingDb);
        addItem(items, '피크 천장', Number.isFinite(peakDb) && peakDb <= ceiling + rules.peakMarginDb ? 'pass' : 'warn', Number.isFinite(peakDb) ? `최종 ${peakDb.toFixed(2)} dBFS · 천장 ${ceiling.toFixed(1)} dB` : '측정값 없음');

        const invalid = toNumber(report?.after?.invalidSamples || 0, 0);
        addItem(items, 'Invalid sample scan', invalid === 0 ? 'pass' : 'fail', invalid === 0 ? 'NaN/Infinity 없음' : `${invalid}개 비정상 샘플 감지`);

        const clipped = toNumber(report?.after?.clippedSamples || 0, 0);
        addItem(items, '클리핑 샘플', clipped === 0 ? 'pass' : (clipped < rules.warnClippedSamples ? 'warn' : 'fail'), clipped === 0 ? '0개' : `${clipped}개`);

        const gainDb = toNumber(finalizeInfo?.gainDb || 0, 0);
        addItem(items, '보정 게인', Math.abs(gainDb) <= rules.warnGainDb ? 'pass' : 'warn', `${formatSigned(gainDb, 1)} dB`);

        const duration = toNumber(report?.after?.durationSec || track?.masteredDurationSec || 0, 0);
        addItem(items, '재생 길이', duration >= rules.minUsefulDurationSec ? 'pass' : 'warn', `${duration.toFixed(2)}초`);

        const dc = toNumber(report?.after?.dcOffsetAvg || 0, 0);
        addItem(items, 'DC offset', Math.abs(dc) <= rules.maxDcOffset ? 'pass' : 'warn', `${dc.toFixed(5)}`);

        if (encoded?.fallbackFrom) addItem(items, '출력 fallback', 'warn', `${encoded.fallbackFrom} 실패 → ${encoded.format || 'fallback'} 저장`);
        if (track?.performanceGuardInfo?.changed) addItem(items, '성능 가드', 'warn', input.performanceGuardLabel || '성능 가드 적용');

        const mobileRisk = toNumber(track?.analysis?.mobileSpeakerRisk ?? finalizeInfo?.mobileSpeakerRisk, 0);
        if (mobileRisk > rules.mobileSpeakerInfo) {
            addItem(items, '폰 스피커 울림', mobileRisk > rules.mobileSpeakerWarn ? 'warn' : 'pass', `위험 ${Math.round(mobileRisk * 100)}% · 모바일 번역 가드 적용`);
        }

        const fail = items.filter(item => item.status === 'fail').length;
        const warn = items.filter(item => item.status === 'warn').length;
        const pass = items.filter(item => item.status === 'pass').length;
        const score = clamp(Math.round(100 - fail * 30 - warn * 9), 0, 100);
        const status = fail ? 'fail' : (warn ? 'warn' : 'pass');
        const label = status === 'pass' ? 'PASS' : (status === 'warn' ? 'CHECK' : 'FAIL');
        const summary = `${pass} 통과 · ${warn} 주의 · ${fail} 실패`;
        return Object.freeze({ status, label, score, summary, items, createdAt: new Date().toISOString(), version: 'QualityGate v2' });
    }

    global.FoxBearQualityGateService = Object.freeze({
        version: '1.4.27-release-cleanup',
        createReport
    });
})(window);
