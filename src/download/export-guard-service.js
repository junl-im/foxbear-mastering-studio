// FoxBear export guard service v1.5.2 - ZIP/export validation and low-memory UX advisories
'use strict';

(function attachFoxBearExportGuardService(global) {
    const VERSION = 'v1.5.2-export-guard-low-memory-ux';
    const MB = 1024 * 1024;
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

    function pushDiagnostic(type, detail = {}) {
        const event = Object.freeze({ at: new Date().toISOString(), type: String(type || 'event'), detail: JSON.parse(JSON.stringify(detail || {})) });
        diagnostics.push(event);
        while (diagnostics.length > MAX_DIAGNOSTICS) diagnostics.shift();
        return event;
    }

    function getDiagnostics() {
        return diagnostics.map(event => ({ ...event, detail: JSON.parse(JSON.stringify(event.detail || {})) }));
    }

    function sanitizeName(name) {
        return String(name || 'mastered.wav').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/\s+/g, ' ').trim() || 'mastered.wav';
    }

    function makeUniqueName(fileName, usedNames) {
        const safeName = sanitizeName(fileName);
        if (!usedNames.has(safeName)) {
            usedNames.add(safeName);
            return safeName;
        }
        const dot = safeName.lastIndexOf('.');
        const base = dot > 0 ? safeName.slice(0, dot) : safeName;
        const ext = dot > 0 ? safeName.slice(dot) : '';
        let index = 2;
        let candidate = `${base}_${index}${ext}`;
        while (usedNames.has(candidate)) {
            index += 1;
            candidate = `${base}_${index}${ext}`;
        }
        usedNames.add(candidate);
        return candidate;
    }

    function classifyMemoryPressure(memorySnapshot, completedCount = 0, outputBytes = 0) {
        const pressure = String(memorySnapshot?.pressure || 'normal');
        const policy = memorySnapshot?.policy || {};
        const heap = memorySnapshot?.heap || null;
        const deviceMemoryGb = toNumber(global.navigator?.deviceMemory, 0);
        const mobile = isProbablyMobile();
        const heapRatio = heap?.jsHeapSizeLimit ? toNumber(heap.usedJSHeapSize, 0) / Math.max(1, toNumber(heap.jsHeapSizeLimit, 1)) : 0;
        if (pressure === 'high' || heapRatio >= 0.82 || (mobile && completedCount >= 12) || (deviceMemoryGb > 0 && deviceMemoryGb <= 3 && completedCount >= 8)) return 'high';
        if (pressure === 'medium' || heapRatio >= 0.68 || policy.lowMemory || outputBytes >= 700 * MB || completedCount >= 24) return 'medium';
        return 'normal';
    }

    function getLowMemoryAdvice(memorySnapshot, completedCount, outputBytes) {
        const level = classifyMemoryPressure(memorySnapshot, completedCount, outputBytes);
        const outputMb = outputBytes / MB;
        const advice = [];
        if (level === 'high') {
            advice.push('저메모리 경고: ZIP 생성 전 완료 버퍼를 자동 정리하고, 실패하면 곡별 다운로드를 권장합니다.');
            advice.push('모바일/인앱 브라우저에서는 35곡 ZIP보다 PC Chrome/Edge 또는 곡별 저장이 더 안전합니다.');
        } else if (level === 'medium') {
            advice.push('메모리 주의: 대량 ZIP 생성 중 브라우저가 잠시 느려질 수 있습니다.');
        }
        if (outputMb >= 500) advice.push(`완성 파일 합계가 약 ${Math.round(outputMb)} MB입니다. ZIP 생성 시간이 길어질 수 있습니다.`);
        return Object.freeze({ level, advice });
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
            return Object.freeze({ id: track.id || '', name: track.name || '', fileName, size: getBlobBytes(track.outBlob), blob: track.outBlob });
        });
        const zeroByteFiles = files.filter(file => file.size <= 44);
        const outputBytes = files.reduce((sum, file) => sum + file.size, 0);
        const memory = getLowMemoryAdvice(options.memorySnapshot, files.length, outputBytes);
        const warnings = [];
        if (missingBlobCount) warnings.push(`${missingBlobCount}개 완료 트랙은 내보낼 Blob이 없습니다.`);
        if (zeroByteFiles.length) warnings.push(`${zeroByteFiles.length}개 파일 크기가 비정상적으로 작습니다.`);
        warnings.push(...memory.advice);
        const ok = files.length > 0 && zeroByteFiles.length === 0;
        const plan = Object.freeze({
            version: VERSION,
            ok,
            completedCount: files.length,
            missingBlobCount,
            outputBytes,
            estimatedZipBytes: Math.max(0, Math.round(outputBytes * 1.01 + 2048 + files.length * 256)),
            memoryPressure: memory.level,
            warnings,
            warningMessage: warnings[0] || '',
            files,
            createdAt: new Date().toISOString()
        });
        pushDiagnostic('zip-plan', { ok: plan.ok, completedCount: plan.completedCount, outputBytes: plan.outputBytes, memoryPressure: plan.memoryPressure, warnings: plan.warnings });
        return plan;
    }

    function validateZipBlob(blob, plan = {}) {
        const size = getBlobBytes(blob);
        const expectedMin = Math.max(128, Math.floor(toNumber(plan.outputBytes, 0) * 0.04));
        const ok = Boolean(blob && size >= expectedMin && (!plan.completedCount || size > 128));
        const result = Object.freeze({
            version: VERSION,
            ok,
            size,
            expectedMin,
            completedCount: toNumber(plan.completedCount, 0),
            memoryPressure: plan.memoryPressure || 'normal',
            message: ok ? 'ZIP blob validation passed' : 'ZIP blob is unexpectedly small or missing'
        });
        pushDiagnostic('zip-blob-validation', result);
        return result;
    }

    function getExportReadiness(tracks, options = {}) {
        const plan = prepareZipExportPlan(tracks, options);
        return Object.freeze({
            version: VERSION,
            ready: plan.ok,
            completedCount: plan.completedCount,
            outputBytes: plan.outputBytes,
            estimatedZipBytes: plan.estimatedZipBytes,
            memoryPressure: plan.memoryPressure,
            warnings: plan.warnings
        });
    }

    global.FoxBearExportGuardService = Object.freeze({
        version: VERSION,
        classifyMemoryPressure,
        getLowMemoryAdvice,
        prepareZipExportPlan,
        validateZipBlob,
        getExportReadiness,
        getDiagnostics
    });
})(window);
