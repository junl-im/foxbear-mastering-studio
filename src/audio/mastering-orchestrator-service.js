// FoxBear mastering orchestrator service v1.5.62 - batch flow and risk-specific one-shot quality recovery planning
'use strict';

(function attachFoxBearMasteringOrchestratorService(global) {
    const RECOVERY_PROFILE_DEFS = Object.freeze({
        integrity: Object.freeze({ id: 'integrity-reset', label: '출력 무결성 복구', priority: 100 }),
        loudness: Object.freeze({ id: 'loudness-relief', label: '라우드니스 압력 완화', priority: 90 }),
        lowEnd: Object.freeze({ id: 'low-end-control', label: '저역 펌핑 제어', priority: 80 }),
        phase: Object.freeze({ id: 'phase-stabilization', label: '스테레오 위상 안정화', priority: 70 }),
        spectral: Object.freeze({ id: 'spectral-preservation', label: '고역 보존 복구', priority: 60 }),
        translation: Object.freeze({ id: 'translation-balance', label: '모바일 번역 균형', priority: 50 }),
        balanced: Object.freeze({ id: 'balanced-safety', label: '균형 안전 복구', priority: 10 })
    });

    function toFinite(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function normalizeSettings(settings = {}) {
        return Object.freeze({
            clarity: clamp(toFinite(settings.clarity, 50), 0, 100),
            warmth: clamp(toFinite(settings.warmth, 55), 0, 100),
            width: clamp(toFinite(settings.width, 35), 0, 100),
            stereoGroove: clamp(toFinite(settings.stereoGroove, 8), 0, 100),
            analogGroove: clamp(toFinite(settings.analogGroove, 6), 0, 100),
            dynamicPunch: clamp(toFinite(settings.dynamicPunch, 35), 0, 100),
            metallicRemoval: clamp(toFinite(settings.metallicRemoval, 42), 0, 100),
            intensity: clamp(toFinite(settings.intensity, 100), 50, 200)
        });
    }

    function normalizeRiskFlag(item = {}) {
        const label = String(item.label || '품질 실패');
        const detail = String(item.detail || '');
        const code = String(item.code || item.meta?.code || '').trim().toUpperCase();
        return Object.freeze({ label, detail, code, status: String(item.status || 'fail') });
    }

    function classifyRiskFlag(flag) {
        const code = String(flag.code || '').toUpperCase();
        const text = `${flag.label} ${flag.detail}`;
        const categories = [];
        if (code === 'INVALID_OUTPUT' || /Invalid sample|NaN|Infinity|출력 샘플 무결성|비정상 샘플/i.test(text)) categories.push('integrity');
        if (code === 'DYNAMIC_COLLAPSE' || /Short-term|클리핑|리미터|과도한 리미팅|라우드니스|피크 천장|True Peak/i.test(text)) categories.push('loudness');
        if (code === 'LOW_PUMPING' || /저역 펌핑|리미터 지속 동작|bass pumping|low[- ]end pumping/i.test(text)) categories.push('lowEnd');
        if (code === 'PHASE_RISK' || /스테레오 위상|phase risk|상관도|mono compatibility/i.test(text)) categories.push('phase');
        if (code === 'HIGH_LOSS' || /고역 손실|De-esser|Multiband|과보정|high[- ]frequency loss/i.test(text)) categories.push('spectral');
        if (/모바일 번역|폰 스피커|mobile speaker|translation/i.test(text)) categories.push('translation');
        return categories;
    }

    function collectRecoveryProfiles(failedFlags) {
        const categorySet = new Set();
        failedFlags.forEach(flag => classifyRiskFlag(flag).forEach(category => categorySet.add(category)));
        if (!categorySet.size) categorySet.add('balanced');
        return [...categorySet]
            .map(category => Object.freeze({ category, ...RECOVERY_PROFILE_DEFS[category] }))
            .sort((a, b) => b.priority - a.priority);
    }

    function applyBalancedSafety(settings) {
        settings.clarity = Math.min(settings.clarity, 54);
        settings.warmth = clamp(settings.warmth, 38, 64);
        settings.width = Math.min(settings.width, 38);
        settings.stereoGroove = Math.min(settings.stereoGroove, 8);
        settings.analogGroove = Math.min(settings.analogGroove, 10);
        settings.dynamicPunch = Math.min(settings.dynamicPunch, 34);
        settings.metallicRemoval = Math.min(settings.metallicRemoval, 52);
        settings.intensity = Math.min(settings.intensity, 95);
    }

    function applyRecoveryProfile(settings, category) {
        applyBalancedSafety(settings);
        if (category === 'integrity') {
            settings.clarity = Math.min(settings.clarity, 44);
            settings.warmth = clamp(settings.warmth, 40, 58);
            settings.width = Math.min(settings.width, 24);
            settings.stereoGroove = Math.min(settings.stereoGroove, 3);
            settings.analogGroove = Math.min(settings.analogGroove, 5);
            settings.dynamicPunch = Math.min(settings.dynamicPunch, 20);
            settings.metallicRemoval = Math.min(settings.metallicRemoval, 36);
            settings.intensity = Math.min(settings.intensity, 80);
        } else if (category === 'loudness') {
            settings.width = Math.min(settings.width, 34);
            settings.analogGroove = Math.min(settings.analogGroove, 8);
            settings.dynamicPunch = Math.min(settings.dynamicPunch, 24);
            settings.intensity = Math.min(settings.intensity, 84);
        } else if (category === 'lowEnd') {
            settings.warmth = Math.min(settings.warmth, 50);
            settings.analogGroove = Math.min(settings.analogGroove, 4);
            settings.dynamicPunch = Math.min(settings.dynamicPunch, 18);
            settings.intensity = Math.min(settings.intensity, 82);
        } else if (category === 'phase') {
            settings.width = Math.min(settings.width, 20);
            settings.stereoGroove = Math.min(settings.stereoGroove, 2);
            settings.analogGroove = Math.min(settings.analogGroove, 8);
            settings.intensity = Math.min(settings.intensity, 90);
        } else if (category === 'spectral') {
            settings.clarity = Math.min(settings.clarity, 48);
            settings.warmth = clamp(settings.warmth, 40, 60);
            settings.metallicRemoval = Math.min(settings.metallicRemoval, 32);
            settings.intensity = Math.min(settings.intensity, 90);
        } else if (category === 'translation') {
            settings.warmth = Math.min(settings.warmth, 52);
            settings.width = Math.min(settings.width, 28);
            settings.analogGroove = Math.min(settings.analogGroove, 6);
            settings.dynamicPunch = Math.min(settings.dynamicPunch, 28);
        }
    }

    function createAdjustmentSummary(requested, safe) {
        return Object.freeze(Object.keys(requested)
            .filter(key => Number(requested[key]) !== Number(safe[key]))
            .map(key => Object.freeze({ key, from: Number(requested[key]), to: Number(safe[key]) })));
    }

    function createQualityRecoveryPlan(input = {}) {
        const gate = input.gate || null;
        if (!gate || gate.status !== 'fail' || input.alreadyAttempted) return null;
        const failedFlags = (gate.riskFlags || gate.items || [])
            .filter(item => item && item.status === 'fail')
            .map(normalizeRiskFlag);
        if (!failedFlags.length) return null;

        const sourceSettings = normalizeSettings(input.settings || {});
        const profiles = collectRecoveryProfiles(failedFlags);
        const safeSettingsMutable = { ...sourceSettings };
        profiles.forEach(profile => applyRecoveryProfile(safeSettingsMutable, profile.category));
        const safeSettings = Object.freeze(safeSettingsMutable);
        const categories = new Set(profiles.map(profile => profile.category));
        const targetLufs = toFinite(input.targetLufs, -14);
        const ceilingDb = toFinite(input.ceilingDb, -1);
        let safeTargetLufs = targetLufs;
        let safeCeilingDb = Math.min(ceilingDb - 0.5, -1.5);
        if (categories.has('integrity')) {
            safeTargetLufs = Math.min(targetLufs - 2.5, -14);
            safeCeilingDb = Math.min(ceilingDb - 1, -2);
        } else if (categories.has('loudness')) {
            safeTargetLufs = Math.min(targetLufs - 2, -12);
            safeCeilingDb = Math.min(ceilingDb - 0.8, -1.8);
        } else if (categories.has('lowEnd')) {
            safeTargetLufs = Math.min(targetLufs - 1.8, -12);
            safeCeilingDb = Math.min(ceilingDb - 0.8, -1.8);
        } else if (categories.has('phase') || categories.has('translation')) {
            safeCeilingDb = Math.min(ceilingDb - 0.5, -1.5);
        }
        const primaryProfile = profiles[0];
        const riskCodes = Object.freeze([...new Set(failedFlags.map(flag => flag.code).filter(Boolean))]);
        const profileIds = Object.freeze(profiles.map(profile => profile.id));
        const profileLabels = Object.freeze(profiles.map(profile => profile.label));
        return Object.freeze({
            version: '1.5.62-incident-delivery-watchdog-package-gate',
            attemptLimit: 1,
            failedFlags: Object.freeze(failedFlags),
            riskCodes,
            profileId: primaryProfile.id,
            profileLabel: primaryProfile.label,
            profileIds,
            profileLabels,
            reason: `${primaryProfile.label} · ${failedFlags.map(item => item.label).join(', ')}`,
            requestedSettings: sourceSettings,
            safeSettings,
            adjustments: createAdjustmentSummary(sourceSettings, safeSettings),
            targetLufs: safeTargetLufs,
            ceilingDb: safeCeilingDb,
            qualityMode: 'fast',
            truePeak: true,
            loudnessAdjusted: safeTargetLufs !== targetLufs,
            ceilingAdjusted: safeCeilingDb !== ceilingDb
        });
    }

    function createMasteringBatchRunner(options = {}) {
        async function runBatch(tracks, batchOptions = {}) {
            const items = Array.isArray(tracks) ? tracks.filter(Boolean) : [];
            if (!items.length) return Object.freeze({ total: 0, completed: 0, failed: 0, ok: false });
            let completed = 0;
            let failed = 0;
            let result = null;
            try {
                if (typeof options.beginHudBatch === 'function') options.beginHudBatch(items, batchOptions);
                if (typeof options.setBusy === 'function') options.setBusy(true);
                if (typeof options.beforeBatch === 'function') await options.beforeBatch(items, batchOptions);
                if (typeof options.render === 'function') options.render(batchOptions.initialRenderOptions || {});

                for (const track of items) {
                    try {
                        if (typeof options.prepareTrack === 'function') await options.prepareTrack(track, batchOptions);
                        if (typeof options.masterTrack !== 'function') throw new Error('masterTrack callback missing');
                        const ok = await options.masterTrack(track, true, Object.assign({
                            awaitAnalysis: true,
                            notifyBlocked: true,
                            source: batchOptions.source || 'batch'
                        }, batchOptions.masterOptions || {}));
                        if (ok) completed += 1;
                        else failed += 1;
                    } catch (error) {
                        failed += 1;
                        if (typeof options.onTrackError === 'function') {
                            try { await options.onTrackError(error, track, batchOptions); } catch (callbackError) {}
                        }
                    }
                }
                result = Object.freeze({ total: items.length, completed, failed, ok: completed > 0 });
                if (typeof options.afterBatch === 'function') await options.afterBatch({ items, completed, failed, batchOptions, result });
                return result;
            } catch (error) {
                if (typeof options.onBatchError === 'function') {
                    try { await options.onBatchError(error, { items, completed, failed, batchOptions }); } catch (callbackError) {}
                }
                throw error;
            } finally {
                if (typeof options.setBusy === 'function') {
                    try { options.setBusy(false); } catch (error) {}
                }
                if (typeof options.render === 'function') {
                    try { options.render(batchOptions.finalRenderOptions || {}); } catch (error) {}
                }
            }
        }

        return Object.freeze({
            version: '1.5.62-incident-delivery-watchdog-package-gate',
            runBatch
        });
    }

    global.FoxBearMasteringOrchestratorService = Object.freeze({
        version: '1.5.62-incident-delivery-watchdog-package-gate',
        recoveryProfiles: RECOVERY_PROFILE_DEFS,
        createQualityRecoveryPlan,
        createMasteringBatchRunner
    });
})(window);
