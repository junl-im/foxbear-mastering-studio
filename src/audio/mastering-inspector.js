// FoxBear AI Mastering Studio Pro v1.6.74 - DSP amount inspector and adaptive target helpers
'use strict';

(function attachFoxBearMasteringInspector(global) {
    const core = global.FoxBearCoreUtils || {};
    const clamp = core.clamp || ((value, min, max) => Math.max(min, Math.min(max, value)));
    const clamp01 = core.clamp01 || (value => clamp(Number(value) || 0, 0, 1));

    function getReferenceStrengthAmount(value) {
        const raw = String(value ?? '').trim().toLowerCase();
        if (raw === 'light') return 0.35;
        if (raw === 'balanced') return 0.62;
        if (raw === 'strong') return 0.86;
        if (raw === 'full') return 1.0;
        return clamp(Number(value ?? 0.62), 0, 1);
    }

    function getReferenceStrengthLabel(value) {
        const amount = getReferenceStrengthAmount(value);
        if (amount <= 0.38) return 'Light';
        if (amount >= 0.94) return 'Full';
        if (amount >= 0.78) return 'Strong';
        return 'Balanced';
    }

    function computeAdaptiveTargetLufs(analysis = {}, options = {}) {
        const base = Number.isFinite(Number(options.baseTarget)) ? Number(options.baseTarget) : -14;
        const preset = String(options.preset || 'custom').toLowerCase();
        const strength = String(options.masterStrength || 'balanced').toLowerCase();
        const goal = String(options.masterGoal || '').toLowerCase();
        let target = base;
        const mobileRisk = clamp01(analysis.mobileSpeakerRisk);
        const metallic = clamp01(analysis.metallicHint);
        const mid = clamp01(analysis.midRatio);
        const transient = clamp01(analysis.transientDensity);
        const crest = Number(analysis.crest || 0);
        const vocalish = /ballad|vocal|rnb|acoustic|podcast|kballad/.test(preset) || mid > 0.32 || goal === 'melody';
        const clubish = /edm|dance|house|trap|drill|futurebass|club/.test(preset) || strength === 'loud';
        if (vocalish) target = Math.min(target, -14.8);
        if (metallic > 0.62) target = Math.min(target, -14.5);
        if (mobileRisk > 0.35) target = Math.min(target, -14.6 - mobileRisk * 0.8);
        if (crest < 4.2 && transient > 0.55) target = Math.min(target, base - 0.6);
        if (clubish && mobileRisk < 0.34 && metallic < 0.58) target = Math.max(target, strength === 'loud' ? -10.6 : -12.2);
        if (strength === 'natural' || strength === 'vocal_safe') target = Math.min(target, -15.0);
        if (strength === 'mobile_safe') target = Math.min(target, -14.4);
        return Number(clamp(target, -16.5, -9.5).toFixed(1));
    }

    function createDspAmountSummary(finalizeInfo = {}, analysis = {}) {
        const spatial = analysis.spatialBudgetApplied || {};
        const limiter = Math.abs(Number(finalizeInfo.limiterReductionDb || 0));
        const multiband = Math.abs(Number(finalizeInfo.multibandReductionDb || 0));
        const deesser = Math.abs(Number(finalizeInfo.dynamicDeEsserReductionDb || 0));
        const mobile = clamp01(finalizeInfo.mobileSpeakerRisk ?? analysis.mobileSpeakerRisk) * 100;
        const widthBefore = Number(spatial.rawWidthFactor || 1);
        const widthAfter = Number(spatial.widthFactor || widthBefore || 1);
        const spatialClamp = Math.max(0, widthBefore - widthAfter) * 100;
        const items = [
            { key: 'limiter', label: 'Limiter', value: limiter, unit: 'dB' },
            { key: 'multiband', label: 'Multiband', value: multiband, unit: 'dB' },
            { key: 'deesser', label: 'De-esser', value: deesser, unit: 'dB' },
            { key: 'mobile', label: 'Mobile Guard', value: mobile, unit: '%' },
            { key: 'spatial', label: 'Spatial Clamp', value: spatialClamp, unit: '%' }
        ];
        const score = clamp(Math.round(limiter * 9 + multiband * 7 + deesser * 8 + mobile * 0.34 + spatialClamp * 0.42), 0, 100);
        const label = score >= 64 ? 'strong' : score >= 34 ? 'medium' : 'light';
        return { score, label, items };
    }

    global.FoxBearMasteringInspector = Object.freeze({
        getReferenceStrengthAmount,
        getReferenceStrengthLabel,
        computeAdaptiveTargetLufs,
        createDspAmountSummary
    });
})(window);
