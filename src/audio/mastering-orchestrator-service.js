// FoxBear mastering orchestrator service v1.6.103 - batch flow and risk-specific one-shot quality recovery planning
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
            version: '1.6.103-ci-hygiene-mail-routing-hardening',
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
        let activeBatch = null;

        function isAbortError(error) {
            return Boolean(error && (error.name === 'AbortError' || /abort|cancel|skip/i.test(String(error.code || ''))));
        }

        function releasePauseWaiters(batch = activeBatch) {
            if (!batch || !Array.isArray(batch.pauseWaiters)) return;
            const waiters = batch.pauseWaiters.splice(0);
            waiters.forEach(resolve => { try { resolve(); } catch (error) {} });
        }

        function notifyControlChange(type, detail = {}) {
            const callback = type === 'pause' ? options.onPauseChanged
                : type === 'skip' ? options.onSkipRequested
                    : type === 'queue' ? options.onQueueChanged
                        : null;
            if (typeof callback !== 'function') return;
            try { callback(Object.assign({ snapshot: getActiveBatchSnapshot() }, detail)); } catch (error) {}
        }

        function getActiveBatchSnapshot() {
            if (!activeBatch) return null;
            return Object.freeze({
                id: activeBatch.id,
                total: activeBatch.items.length,
                currentIndex: activeBatch.currentIndex,
                currentTrackId: activeBatch.currentTrackId || '',
                startedAt: activeBatch.startedAt,
                cancelRequested: Boolean(activeBatch.controller?.signal?.aborted),
                paused: Boolean(activeBatch.paused),
                pauseReason: activeBatch.pauseReason || '',
                autoPaused: Boolean(activeBatch.autoPaused),
                performanceLevel: activeBatch.performanceLevel || 'normal',
                performanceMeasuredLevel: activeBatch.performanceMeasuredLevel || 'normal',
                performanceWarnings: Object.freeze([...(activeBatch.performanceWarnings || [])]),
                performanceRecoverySamples: Math.max(0, Number(activeBatch.performanceRecoverySamples || 0)),
                performanceRecoveryRequired: Math.max(1, Number(activeBatch.performanceRecoveryRequired || 2)),
                skipRequested: Boolean(activeBatch.skipRequested),
                skipReason: activeBatch.skipReason || '',
                orderedTrackIds: Object.freeze(activeBatch.items.map(track => track?.id || '')),
                settled: Boolean(activeBatch.settled)
            });
        }

        function cancelActiveBatch(reason = 'user-request') {
            if (!activeBatch || activeBatch.settled || activeBatch.controller?.signal?.aborted) return false;
            try { activeBatch.controller?.abort?.(reason); } catch (error) { return false; }
            try { activeBatch.trackController?.abort?.(reason); } catch (error) {}
            activeBatch.paused = false;
            releasePauseWaiters(activeBatch);
            if (typeof options.onCancelRequested === 'function') {
                try { options.onCancelRequested({ reason, snapshot: getActiveBatchSnapshot() }); } catch (error) {}
            }
            return true;
        }

        function pauseActiveBatch(reason = 'user-request') {
            if (!activeBatch || activeBatch.settled || activeBatch.controller?.signal?.aborted || activeBatch.paused) return false;
            activeBatch.paused = true;
            activeBatch.pauseReason = String(reason || 'user-request');
            activeBatch.autoPaused = activeBatch.pauseReason === 'performance-danger';
            notifyControlChange('pause', { paused: true, autoPaused: activeBatch.autoPaused, reason: activeBatch.pauseReason });
            return true;
        }

        function resumeActiveBatch(reason = 'user-request') {
            if (!activeBatch || activeBatch.settled || !activeBatch.paused) return false;
            const resumeReason = String(reason || 'user-request');
            if (activeBatch.autoPaused && resumeReason !== 'performance-recovered') return false;
            activeBatch.paused = false;
            activeBatch.pauseReason = '';
            activeBatch.autoPaused = false;
            releasePauseWaiters(activeBatch);
            notifyControlChange('pause', { paused: false, autoPaused: false, reason: resumeReason });
            return true;
        }

        function handleAmbientHealthChange(event) {
            const detail = event?.detail || {};
            const level = String(detail.level || 'normal');
            if (!activeBatch || activeBatch.settled || activeBatch.controller?.signal?.aborted) return false;
            activeBatch.performanceLevel = level;
            activeBatch.performanceMeasuredLevel = String(detail.measuredLevel || level);
            activeBatch.performanceWarnings = Array.isArray(detail.warnings) ? detail.warnings.slice(0, 6) : [];
            activeBatch.performanceRecoverySamples = Math.max(0, Number(detail.confirmation?.recoverySamples || 0));
            activeBatch.performanceRecoveryRequired = Math.max(1, Number(detail.confirmation?.recoveryRequired || 2));
            if (level === 'danger' && !activeBatch.paused) return pauseActiveBatch('performance-danger');
            if (level === 'normal' && activeBatch.paused && activeBatch.autoPaused) return resumeActiveBatch('performance-recovered');
            notifyControlChange('pause', {
                paused: Boolean(activeBatch.paused), autoPaused: Boolean(activeBatch.autoPaused),
                reason: activeBatch.pauseReason || 'performance-status', performanceOnly: true
            });
            return false;
        }

        function skipCurrentTrack(reason = 'user-skip') {
            if (!activeBatch || activeBatch.settled || activeBatch.controller?.signal?.aborted || !activeBatch.currentTrackId || !activeBatch.trackController) return false;
            if (activeBatch.skipRequested || activeBatch.trackController.signal?.aborted) return false;
            activeBatch.skipRequested = true;
            activeBatch.skipReason = String(reason || 'user-skip');
            notifyControlChange('skip', { requested: true, reason: activeBatch.skipReason, trackId: activeBatch.currentTrackId });
            try { activeBatch.trackController.abort(activeBatch.skipReason); } catch (error) { return false; }
            return true;
        }

        function movePendingTrack(trackId, direction = 0) {
            if (!activeBatch || activeBatch.settled || activeBatch.controller?.signal?.aborted) return false;
            const id = String(trackId || '');
            const delta = Number(direction) < 0 ? -1 : Number(direction) > 0 ? 1 : 0;
            if (!id || !delta) return false;
            const from = activeBatch.items.findIndex(track => String(track?.id || '') === id);
            const firstPending = Math.max(0, Number(activeBatch.currentIndex || -1) + 1);
            if (from < firstPending) return false;
            const to = from + delta;
            if (to < firstPending || to >= activeBatch.items.length) return false;
            const [track] = activeBatch.items.splice(from, 1);
            activeBatch.items.splice(to, 0, track);
            notifyControlChange('queue', { items: activeBatch.items.slice(), trackId: id, from, to });
            return true;
        }

        async function waitWhilePaused(batch) {
            while (batch && batch.paused && !batch.controller?.signal?.aborted) {
                await new Promise(resolve => batch.pauseWaiters.push(resolve));
            }
        }

        async function runBatch(tracks, batchOptions = {}) {
            const items = Array.isArray(tracks) ? tracks.filter(Boolean) : [];
            if (!items.length) return Object.freeze({ total: 0, completed: 0, failed: 0, skipped: 0, cancelled: 0, ok: false, stopped: false });
            if (activeBatch && !activeBatch.settled) {
                const error = new Error('이미 다른 다중 마스터링 작업이 진행 중입니다.');
                error.code = 'BATCH_ALREADY_RUNNING';
                throw error;
            }

            const controller = typeof AbortController === 'function' ? new AbortController() : null;
            const externalSignal = batchOptions.signal || null;
            const forwardAbort = () => {
                try { controller?.abort?.(externalSignal?.reason || 'external-cancel'); } catch (error) {}
            };
            if (externalSignal?.aborted) forwardAbort();
            else externalSignal?.addEventListener?.('abort', forwardAbort, { once: true });

            let completed = 0;
            let failed = 0;
            let skipped = 0;
            let cancelled = 0;
            let processed = 0;
            let result = null;
            const startedAt = Date.now();
            let hudSnapshot = null;

            try {
                if (typeof options.beginHudBatch === 'function') hudSnapshot = options.beginHudBatch(items, batchOptions) || null;
                activeBatch = {
                    id: String(hudSnapshot?.batchId || batchOptions.batchId || `mastering-batch-${startedAt}`),
                    items,
                    currentIndex: -1,
                    currentTrackId: '',
                    startedAt,
                    controller,
                    trackController: null,
                    paused: false,
                    pauseReason: '',
                    autoPaused: false,
                    performanceLevel: 'normal',
                    performanceMeasuredLevel: 'normal',
                    performanceWarnings: [],
                    performanceRecoverySamples: 0,
                    performanceRecoveryRequired: 2,
                    pauseWaiters: [],
                    skipRequested: false,
                    skipReason: '',
                    settled: false
                };
                if (typeof options.setBusy === 'function') options.setBusy(true);
                if (typeof options.beforeBatch === 'function') await options.beforeBatch(items, batchOptions);
                if (typeof options.render === 'function') options.render(batchOptions.initialRenderOptions || {});

                for (let index = 0; index < items.length; index += 1) {
                    await waitWhilePaused(activeBatch);
                    if (controller?.signal?.aborted) break;
                    const track = items[index];
                    activeBatch.currentIndex = index;
                    activeBatch.currentTrackId = track?.id || '';
                    activeBatch.skipRequested = false;
                    activeBatch.skipReason = '';
                    const trackController = typeof AbortController === 'function' ? new AbortController() : null;
                    activeBatch.trackController = trackController;
                    const forwardBatchAbort = () => { try { trackController?.abort?.(controller?.signal?.reason || 'batch-cancelled'); } catch (error) {} };
                    if (controller?.signal?.aborted) forwardBatchAbort();
                    else controller?.signal?.addEventListener?.('abort', forwardBatchAbort, { once: true });
                    const trackStartedAt = Date.now();
                    let outcome = 'failed';
                    let trackError = null;
                    let ok = false;

                    if (typeof options.onTrackStart === 'function') {
                        try { await options.onTrackStart(track, { index, total: items.length, startedAt: trackStartedAt, batchOptions, signal: trackController?.signal || controller?.signal || null }); }
                        catch (error) {}
                    }

                    try {
                        if (typeof options.prepareTrack === 'function') await options.prepareTrack(track, batchOptions);
                        if (controller?.signal?.aborted) {
                            outcome = 'cancelled';
                        } else {
                            if (typeof options.masterTrack !== 'function') throw new Error('masterTrack callback missing');
                            ok = await options.masterTrack(track, true, Object.assign({
                                awaitAnalysis: true,
                                notifyBlocked: true,
                                source: batchOptions.source || 'batch',
                                signal: trackController?.signal || controller?.signal || null
                            }, batchOptions.masterOptions || {}));
                            if (controller?.signal?.aborted) outcome = 'cancelled';
                            else if (activeBatch.skipRequested || trackController?.signal?.aborted) outcome = 'skipped';
                            else outcome = ok ? 'completed' : 'failed';
                        }
                    } catch (error) {
                        trackError = error;
                        if (controller?.signal?.aborted) outcome = 'cancelled';
                        else if (activeBatch.skipRequested || (trackController?.signal?.aborted && isAbortError(error))) outcome = 'skipped';
                        else outcome = isAbortError(error) ? 'cancelled' : 'failed';
                        if (outcome === 'failed' && typeof options.onTrackError === 'function') {
                            try { await options.onTrackError(error, track, batchOptions); } catch (callbackError) {}
                        }
                    } finally {
                        controller?.signal?.removeEventListener?.('abort', forwardBatchAbort);
                        activeBatch.trackController = null;
                    }

                    processed += 1;
                    if (outcome === 'completed') completed += 1;
                    else if (outcome === 'skipped') skipped += 1;
                    else if (outcome === 'cancelled') cancelled += 1;
                    else failed += 1;

                    if (typeof options.onTrackComplete === 'function') {
                        try {
                            await options.onTrackComplete(track, {
                                index,
                                total: items.length,
                                outcome,
                                ok,
                                error: trackError,
                                reason: outcome === 'skipped' ? activeBatch.skipReason : '',
                                startedAt: trackStartedAt,
                                completedAt: Date.now(),
                                batchOptions,
                                signal: trackController?.signal || controller?.signal || null
                            });
                        } catch (error) {}
                    }
                    activeBatch.skipRequested = false;
                    activeBatch.skipReason = '';
                    notifyControlChange('skip', { requested: false, trackId: track?.id || '' });
                    if (controller?.signal?.aborted) break;
                }

                if (controller?.signal?.aborted) {
                    const remaining = items.slice(processed);
                    cancelled += remaining.length;
                    if (typeof options.onBatchCancelled === 'function') {
                        try {
                            await options.onBatchCancelled({
                                items,
                                remaining,
                                processed,
                                completed,
                                failed,
                                skipped,
                                cancelled,
                                reason: controller.signal.reason || 'user-request',
                                batchOptions
                            });
                        } catch (error) {}
                    }
                }

                result = Object.freeze({
                    total: items.length,
                    completed,
                    failed,
                    skipped,
                    cancelled,
                    ok: completed > 0,
                    stopped: Boolean(controller?.signal?.aborted),
                    elapsedMs: Math.max(0, Date.now() - startedAt)
                });
                if (typeof options.afterBatch === 'function') await options.afterBatch({ items, completed, failed, skipped, cancelled, batchOptions, result });
                return result;
            } catch (error) {
                if (controller?.signal?.aborted || isAbortError(error)) {
                    const remaining = items.slice(processed);
                    cancelled += remaining.length;
                    result = Object.freeze({
                        total: items.length,
                        completed,
                        failed,
                        skipped,
                        cancelled,
                        ok: completed > 0,
                        stopped: true,
                        elapsedMs: Math.max(0, Date.now() - startedAt)
                    });
                    if (typeof options.onBatchCancelled === 'function') {
                        try { await options.onBatchCancelled({ items, remaining, processed, completed, failed, skipped, cancelled, reason: controller?.signal?.reason || 'cancelled', batchOptions }); }
                        catch (callbackError) {}
                    }
                    if (typeof options.afterBatch === 'function') {
                        try { await options.afterBatch({ items, completed, failed, skipped, cancelled, batchOptions, result }); } catch (callbackError) {}
                    }
                    return result;
                }
                if (typeof options.onBatchError === 'function') {
                    try { await options.onBatchError(error, { items, completed, failed, skipped, cancelled, batchOptions }); } catch (callbackError) {}
                }
                throw error;
            } finally {
                externalSignal?.removeEventListener?.('abort', forwardAbort);
                if (activeBatch) {
                    activeBatch.currentTrackId = '';
                    activeBatch.trackController = null;
                    activeBatch.paused = false;
                    activeBatch.autoPaused = false;
                    activeBatch.settled = true;
                    releasePauseWaiters(activeBatch);
                }
                if (typeof options.setBusy === 'function') {
                    try { options.setBusy(false); } catch (error) {}
                }
                if (typeof options.render === 'function') {
                    try { options.render(batchOptions.finalRenderOptions || {}); } catch (error) {}
                }
                activeBatch = null;
            }
        }

        global.addEventListener?.('foxbear:ambient-health-change', handleAmbientHealthChange);

        return Object.freeze({
            version: '1.6.103-performance-recovery-stage-hud',
            runBatch,
            cancelActiveBatch,
            pauseActiveBatch,
            resumeActiveBatch,
            skipCurrentTrack,
            movePendingTrack,
            getActiveBatchSnapshot,
            handleAmbientHealthChange
        });
    }

    global.FoxBearMasteringOrchestratorService = Object.freeze({
        version: '1.6.103-ci-hygiene-mail-routing-hardening',
        recoveryProfiles: RECOVERY_PROFILE_DEFS,
        createQualityRecoveryPlan,
        createMasteringBatchRunner
    });
})(window);
