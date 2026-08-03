// FoxBear export guard service v1.6.56 - ZIP working-set limits and STORE-only audio packaging
'use strict';

(function attachFoxBearExportGuardService(global) {
    const VERSION = 'v1.6.56-playback-blob-source-resilience';
    const LEGACY_VERSION = 'v1.5.2-export-guard-low-memory-ux';
    const MB = 1024 * 1024;
    const GB = 1024 * MB;
    const MAX_DIAGNOSTICS = 20;
    const diagnostics = [];

    function toNumber(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function getBlobBytes(blob) {
        return Math.max(0, toNumber(blob?.size, 0));
    }

    function isProbablyMobile() {
        const ua = String(global.navigator?.userAgent || '').toLowerCase();
        const coarse = Boolean(global.matchMedia && global.matchMedia('(pointer: coarse)').matches);
        return coarse || /android|iphone|ipad|ipod|mobile|kakaotalk|naver|instagram|fbav|samsungbrowser/.test(ua);
    }

    function getEnvironment(options = {}) {
        return Object.freeze({
            mobile: options.mobile != null ? Boolean(options.mobile) : isProbablyMobile(),
            deviceMemoryGb: options.deviceMemoryGb != null ? toNumber(options.deviceMemoryGb, 0) : toNumber(global.navigator?.deviceMemory, 0)
        });
    }

    function pushDiagnostic(type, detail = {}) {
        const event = Object.freeze({ at: new Date().toISOString(), type: String(type || 'event'), detail: JSON.parse(JSON.stringify(detail || {})) });
        diagnostics.push(event);
        while (diagnostics.length > MAX_DIAGNOSTICS) diagnostics.shift();
        return event;
    }

    function getDiagnostics() {
        return diagnostics.map(event => ({ ...event, detail: JSON.parse(JSON.stringify(event.detail || {})) }));
    }

    const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

    function sanitizeName(name) {
        let safeName = String(name || 'mastered.wav');
        try { safeName = safeName.normalize('NFC'); } catch (error) {}
        safeName = safeName.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]+/g, '_').replace(/\s+/g, ' ').trim().replace(/[. ]+$/g, '');
        if (!safeName) safeName = 'mastered.wav';
        if (WINDOWS_RESERVED_NAME.test(safeName)) safeName = `_${safeName}`;
        const dot = safeName.lastIndexOf('.');
        const ext = dot > 0 ? safeName.slice(dot, dot + 17) : '';
        const base = dot > 0 ? safeName.slice(0, dot) : safeName;
        return `${base.slice(0, Math.max(1, 180 - ext.length))}${ext}` || 'mastered.wav';
    }

    function makeUniqueName(fileName, usedNames) {
        const safeName = sanitizeName(fileName);
        const dot = safeName.lastIndexOf('.');
        const base = dot > 0 ? safeName.slice(0, dot) : safeName;
        const ext = dot > 0 ? safeName.slice(dot) : '';
        let index = 2;
        let candidate = safeName;
        let key = candidate.toLocaleLowerCase('en-US');
        while (usedNames.has(key)) {
            candidate = `${base.slice(0, Math.max(1, 170 - String(index).length - ext.length))}_${index}${ext}`;
            key = candidate.toLocaleLowerCase('en-US');
            index += 1;
        }
        usedNames.add(key);
        return candidate;
    }

    function classifyMemoryPressure(memorySnapshot, completedCount = 0, outputBytes = 0, options = {}) {
        const pressure = String(memorySnapshot?.pressure || 'normal');
        const policy = memorySnapshot?.policy || {};
        const heap = memorySnapshot?.heap || null;
        const env = getEnvironment(options);
        const heapRatio = heap?.jsHeapSizeLimit ? toNumber(heap.usedJSHeapSize, 0) / Math.max(1, toNumber(heap.jsHeapSizeLimit, 1)) : 0;
        const retainedPcmBytes = toNumber(memorySnapshot?.masteredBufferBytes, 0);
        if (pressure === 'high' || retainedPcmBytes > 0 || heapRatio >= 0.82 || (env.mobile && completedCount >= 12) || (env.deviceMemoryGb > 0 && env.deviceMemoryGb <= 3 && completedCount >= 8)) return 'high';
        if (pressure === 'medium' || heapRatio >= 0.68 || policy.lowMemory || outputBytes >= 700 * MB || completedCount >= 24) return 'medium';
        return 'normal';
    }

    function estimateZipWorkingSet(outputBytes, memorySnapshot, fileCount) {
        const retainedPcmBytes = toNumber(memorySnapshot?.masteredBufferBytes, 0);
        const previewBlobBytes = toNumber(memorySnapshot?.previewBlobBytes, 0);
        const jsZipOverhead = Math.max(32 * MB, fileCount * 512 * 1024);
        return Math.round(outputBytes * 2.05 + retainedPcmBytes + previewBlobBytes + jsZipOverhead);
    }

    function getZipWorkingSetLimit(options = {}) {
        const env = getEnvironment(options);
        if (env.mobile && env.deviceMemoryGb > 0 && env.deviceMemoryGb <= 3) return 512 * MB;
        if (env.mobile) return 768 * MB;
        if (env.deviceMemoryGb > 0 && env.deviceMemoryGb <= 4) return 1024 * MB;
        return 2 * GB;
    }

    function getLowMemoryAdvice(memorySnapshot, completedCount, outputBytes, options = {}) {
        const level = classifyMemoryPressure(memorySnapshot, completedCount, outputBytes, options);
        const outputMb = outputBytes / MB;
        const advice = [];
        if (level === 'high') {
            advice.push('저메모리 경고: ZIP 생성 전 완료 PCM을 자동 정리하며, 안전 한도를 넘으면 곡별 다운로드로 전환합니다.');
            advice.push('모바일/인앱 브라우저에서는 대량 ZIP보다 PC Chrome/Edge 또는 곡별 저장이 더 안전합니다.');
        } else if (level === 'medium') {
            advice.push('메모리 주의: 대량 ZIP 생성 중 브라우저가 잠시 느려질 수 있습니다.');
        }
        if (outputMb >= 500) advice.push(`완성 파일 합계가 약 ${Math.round(outputMb)} MB입니다. ZIP 생성 시간이 길어질 수 있습니다.`);
        return Object.freeze({ level, advice });
    }

    function decideZipStrategy({ outputBytes, estimatedWorkingSetBytes, completedCount, memoryPressure, options = {} }) {
        const env = getEnvironment(options);
        const workingSetLimitBytes = getZipWorkingSetLimit(options);
        const absoluteOutputLimit = 1500 * MB;
        let blockReason = '';
        if (outputBytes > absoluteOutputLimit) {
            blockReason = '완성 파일 합계가 브라우저 ZIP 안전 상한을 넘었습니다. 곡별 다운로드를 사용하세요.';
        } else if (estimatedWorkingSetBytes > workingSetLimitBytes) {
            blockReason = `예상 ZIP 작업 메모리가 안전 한도(${Math.round(workingSetLimitBytes / MB)} MB)를 넘습니다. 곡별 다운로드를 사용하세요.`;
        } else if (memoryPressure === 'high' && env.mobile && completedCount >= 16) {
            blockReason = '모바일 저메모리 환경에서 대량 ZIP은 중단 위험이 높습니다. 곡별 다운로드를 사용하세요.';
        }
        return Object.freeze({
            strategy: blockReason ? 'individual' : 'zip-store',
            canCreateZip: !blockReason,
            requiresIndividualDownload: Boolean(blockReason),
            blockReason,
            workingSetLimitBytes,
            mobile: env.mobile,
            deviceMemoryGb: env.deviceMemoryGb
        });
    }

    function prepareZipExportPlan(tracks, options = {}) {
        const list = Array.isArray(tracks) ? tracks : [];
        const completed = list.filter(track => track && track.outBlob);
        const missingBlobCount = list.filter(track => track && track.status === 'done' && !track.outBlob).length;
        const usedNames = new Set();
        const files = completed.map(track => {
            const fallback = `${String(track.name || 'track').replace(/\.[^.]+$/, '')}_mastered.wav`;
            const proposed = typeof options.fileNameForTrack === 'function' ? options.fileNameForTrack(track) : (track.outName || fallback);
            const fileName = typeof options.makeUniqueName === 'function' ? options.makeUniqueName(proposed, usedNames) : makeUniqueName(proposed, usedNames);
            return Object.freeze({ id: track.id || '', name: track.name || '', fileName, size: getBlobBytes(track.outBlob), blob: track.outBlob, compression: 'STORE' });
        });
        const zeroByteFiles = files.filter(file => file.size <= 44);
        const outputBytes = files.reduce((sum, file) => sum + file.size, 0);
        const memory = getLowMemoryAdvice(options.memorySnapshot, files.length, outputBytes, options);
        const estimatedWorkingSetBytes = estimateZipWorkingSet(outputBytes, options.memorySnapshot, files.length);
        const strategy = decideZipStrategy({ outputBytes, estimatedWorkingSetBytes, completedCount: files.length, memoryPressure: memory.level, options });
        const warnings = [];
        if (missingBlobCount) warnings.push(`${missingBlobCount}개 완료 트랙은 내보낼 Blob이 없습니다.`);
        if (zeroByteFiles.length) warnings.push(`${zeroByteFiles.length}개 파일 크기가 비정상적으로 작습니다.`);
        if (strategy.blockReason) warnings.push(strategy.blockReason);
        warnings.push(...memory.advice);
        const ok = files.length > 0 && zeroByteFiles.length === 0;
        const plan = Object.freeze({
            version: VERSION,
            legacyVersion: LEGACY_VERSION,
            ok,
            completedCount: files.length,
            missingBlobCount,
            outputBytes,
            estimatedZipBytes: Math.max(0, Math.round(outputBytes + 2048 + files.length * 256)),
            estimatedWorkingSetBytes,
            workingSetLimitBytes: strategy.workingSetLimitBytes,
            memoryPressure: memory.level,
            compression: 'STORE',
            streamFiles: true,
            strategy: strategy.strategy,
            canCreateZip: strategy.canCreateZip,
            requiresIndividualDownload: strategy.requiresIndividualDownload,
            blockReason: strategy.blockReason,
            mobile: strategy.mobile,
            deviceMemoryGb: strategy.deviceMemoryGb,
            warnings,
            warningMessage: warnings[0] || '',
            files,
            createdAt: new Date().toISOString()
        });
        pushDiagnostic('zip-plan', {
            ok: plan.ok,
            canCreateZip: plan.canCreateZip,
            completedCount: plan.completedCount,
            outputBytes: plan.outputBytes,
            estimatedWorkingSetBytes: plan.estimatedWorkingSetBytes,
            workingSetLimitBytes: plan.workingSetLimitBytes,
            memoryPressure: plan.memoryPressure,
            strategy: plan.strategy,
            warnings: plan.warnings
        });
        return plan;
    }

    function validateZipBlob(blob, plan = {}) {
        const size = getBlobBytes(blob);
        const expectedMin = Math.max(128, Math.floor(toNumber(plan.outputBytes, 0) * 0.95));
        const expectedMax = Math.max(expectedMin, Math.ceil(toNumber(plan.outputBytes, 0) * 1.08 + 1024 * 1024));
        const ok = Boolean(blob && size >= expectedMin && size <= expectedMax && (!plan.completedCount || size > 128));
        const result = Object.freeze({
            version: VERSION,
            ok,
            size,
            expectedMin,
            expectedMax,
            completedCount: toNumber(plan.completedCount, 0),
            memoryPressure: plan.memoryPressure || 'normal',
            compression: plan.compression || 'STORE',
            message: ok ? 'ZIP blob validation passed' : 'ZIP blob size is outside the STORE packaging range'
        });
        pushDiagnostic('zip-blob-validation', result);
        return result;
    }

    function getExportReadiness(tracks, options = {}) {
        const plan = prepareZipExportPlan(tracks, options);
        return Object.freeze({
            version: VERSION,
            ready: plan.ok && plan.canCreateZip,
            completedCount: plan.completedCount,
            outputBytes: plan.outputBytes,
            estimatedZipBytes: plan.estimatedZipBytes,
            estimatedWorkingSetBytes: plan.estimatedWorkingSetBytes,
            workingSetLimitBytes: plan.workingSetLimitBytes,
            memoryPressure: plan.memoryPressure,
            strategy: plan.strategy,
            requiresIndividualDownload: plan.requiresIndividualDownload,
            warnings: plan.warnings
        });
    }

    global.FoxBearExportGuardService = Object.freeze({
        version: VERSION,
        legacyVersion: LEGACY_VERSION,
        classifyMemoryPressure,
        estimateZipWorkingSet,
        getZipWorkingSetLimit,
        getLowMemoryAdvice,
        decideZipStrategy,
        prepareZipExportPlan,
        validateZipBlob,
        getExportReadiness,
        getDiagnostics
    });
})(window);
