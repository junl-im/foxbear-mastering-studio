(function initFoxBearDownloadService(global) {
    'use strict';

    const DEFAULT_FORMAT_OPTIONS = Object.freeze([
        { format: 'mp3_128', label: 'MP3', detail: '128 kbps' },
        { format: 'mp3_192', label: 'MP3', detail: '192 kbps' },
        { format: 'mp3_256', label: 'MP3', detail: '256 kbps' },
        { format: 'mp3_320', label: 'MP3', detail: '320 kbps' },
        { format: 'wav16', label: 'WAV', detail: '16-bit PCM' },
        { format: 'wav24', label: 'WAV', detail: '24-bit PCM' },
        { format: 'wav32float', label: 'WAV', detail: '32-bit Float' }
    ]);

    const noop = () => {};
    const MAX_DOWNLOAD_DIAGNOSTIC_EVENTS = 16;
    const MAX_CACHED_VARIANTS_PER_SOURCE = 1;
    const MAX_CACHED_VARIANT_BYTES = 64 * 1024 * 1024;
    const LOW_MEMORY_VARIANT_CACHE_BUDGET_BYTES = 64 * 1024 * 1024;
    const STANDARD_VARIANT_CACHE_BUDGET_BYTES = 192 * 1024 * 1024;
    const LOW_MEMORY_VARIANT_CACHE_MAX_ENTRIES = 2;
    const STANDARD_VARIANT_CACHE_MAX_ENTRIES = 5;
    const downloadDiagnosticEvents = [];
    const verifiedBlobInspections = typeof WeakMap === 'function' ? new WeakMap() : null;
    const downloadVariantCache = typeof WeakMap === 'function' ? new WeakMap() : null;
    const downloadVariantJobs = typeof WeakMap === 'function' ? new WeakMap() : null;
    const downloadVariantCacheRegistry = new Map();
    let downloadVariantCacheSequence = 0;
    const downloadUrlTimers = new Map();
    const downloadUrlContexts = new Map();
    const getFileNamePolicy = () => global.FoxBearFileNamePolicyService || null;
    const isLowMemoryDownloadEnvironment = () => {
        const deviceMemoryGb = Math.max(0, Number(global.navigator?.deviceMemory || 0));
        const coarsePointer = Boolean(global.matchMedia?.('(pointer: coarse)')?.matches);
        const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(String(global.navigator?.userAgent || ''));
        return (deviceMemoryGb > 0 && deviceMemoryGb <= 4) || coarsePointer || mobileUa;
    };
    const getDownloadVariantCachePolicy = () => {
        const lowMemory = isLowMemoryDownloadEnvironment();
        return Object.freeze({
            lowMemory,
            maxBytes: lowMemory ? LOW_MEMORY_VARIANT_CACHE_BUDGET_BYTES : STANDARD_VARIANT_CACHE_BUDGET_BYTES,
            maxEntries: lowMemory ? LOW_MEMORY_VARIANT_CACHE_MAX_ENTRIES : STANDARD_VARIANT_CACHE_MAX_ENTRIES,
            supported: typeof global.WeakRef === 'function'
        });
    };
    const unregisterDownloadVariantCacheEntry = entry => {
        const token = String(entry?.cacheToken || '');
        if (token) downloadVariantCacheRegistry.delete(token);
    };
    const pruneDownloadVariantCacheRegistry = () => {
        for (const [token, entry] of downloadVariantCacheRegistry.entries()) {
            let sourceBlob = null;
            try { sourceBlob = entry?.sourceRef?.deref?.() || null; } catch (error) {}
            if (!sourceBlob) downloadVariantCacheRegistry.delete(token);
        }
    };
    const getDownloadVariantCacheDiagnostics = () => {
        pruneDownloadVariantCacheRegistry();
        const policy = getDownloadVariantCachePolicy();
        const entries = [...downloadVariantCacheRegistry.values()];
        return Object.freeze({
            supported: policy.supported,
            lowMemory: policy.lowMemory,
            entryCount: entries.length,
            bytes: entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.sizeBytes || 0)), 0),
            maxEntries: policy.maxEntries,
            maxBytes: policy.maxBytes
        });
    };
    const enforceDownloadVariantCacheBudget = () => {
        pruneDownloadVariantCacheRegistry();
        const policy = getDownloadVariantCachePolicy();
        if (!policy.supported) return getDownloadVariantCacheDiagnostics();
        const totalBytes = () => [...downloadVariantCacheRegistry.values()].reduce((sum, entry) => sum + Math.max(0, Number(entry?.sizeBytes || 0)), 0);
        let bytes = totalBytes();
        while (downloadVariantCacheRegistry.size > policy.maxEntries || bytes > policy.maxBytes) {
            const oldestPair = [...downloadVariantCacheRegistry.entries()].sort((left, right) => Number(left[1]?.lastUsedAt || 0) - Number(right[1]?.lastUsedAt || 0))[0];
            if (!oldestPair) break;
            const [token, entry] = oldestPair;
            let sourceBlob = null;
            try { sourceBlob = entry?.sourceRef?.deref?.() || null; } catch (error) {}
            if (sourceBlob) {
                try {
                    const variants = downloadVariantCache?.get?.(sourceBlob) || null;
                    const cached = variants?.get?.(entry.format) || null;
                    if (cached?.cacheToken === token) variants.delete(entry.format);
                    if (variants && !variants.size) downloadVariantCache?.delete?.(sourceBlob);
                } catch (error) {}
            }
            downloadVariantCacheRegistry.delete(token);
            recordDownloadEvent('variant-cache-evict-budget', { format: entry?.format || '', sizeBytes: Number(entry?.sizeBytes || 0), maxBytes: policy.maxBytes, maxEntries: policy.maxEntries });
            bytes = totalBytes();
        }
        return getDownloadVariantCacheDiagnostics();
    };

    const clonePlain = value => {
        try { return JSON.parse(JSON.stringify(value)); }
        catch (error) { return value; }
    };

    const recordDownloadEvent = (type, detail = {}) => {
        const event = {
            at: new Date().toISOString(),
            type: String(type || 'event'),
            detail: clonePlain(detail || {})
        };
        downloadDiagnosticEvents.push(event);
        while (downloadDiagnosticEvents.length > MAX_DOWNLOAD_DIAGNOSTIC_EVENTS) downloadDiagnosticEvents.shift();
        return event;
    };

    const getDownloadDiagnosticEvents = () => downloadDiagnosticEvents.map(event => ({ ...event, detail: clonePlain(event.detail) }));

    const getToast = deps => (typeof deps?.showToast === 'function' ? deps.showToast : noop);
    const getTimestamp = deps => (typeof deps?.timestampForFile === 'function' ? deps.timestampForFile() : new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14));
    const makeDownloadAbortError = reason => {
        const error = new Error(String(reason || 'download-cancelled'));
        error.name = 'AbortError';
        error.code = 'FOXBEAR_WORKER_JOB_CANCELLED';
        return error;
    };
    const throwIfDownloadAborted = signal => { if (signal?.aborted) throw makeDownloadAbortError(signal.reason); };
    const emitDownloadProgress = (options, progress) => { try { options?.onProgress?.(progress); } catch (error) { console.warn('Download progress callback failed:', error); } };

    const readAscii = (bytes, offset, length) => {
        let text = '';
        for (let index = 0; index < length && offset + index < bytes.length; index += 1) text += String.fromCharCode(bytes[offset + index]);
        return text;
    };

    const getVerifiedBlobInspection = blob => {
        if (!blob || !verifiedBlobInspections) return null;
        try { return verifiedBlobInspections.get(blob) || null; }
        catch (error) { return null; }
    };

    const markDownloadBlobVerified = (blob, inspection = null) => {
        if (!blob || !verifiedBlobInspections) return inspection;
        const safeInspection = inspection && inspection.ok
            ? inspection
            : { ok: true, kind: 'binary', size: Number(blob.size || 0), mime: blob.type || '' };
        try { verifiedBlobInspections.set(blob, safeInspection); } catch (error) {}
        return safeInspection;
    };

    const getCachedDownloadVariant = (track, format, options = {}) => {
        if (!downloadVariantCache || !track?.outBlob) return null;
        const requestedFormat = String(format || '').trim();
        if (!requestedFormat || requestedFormat === track.outFormat) return null;
        let variants = null;
        try { variants = downloadVariantCache.get(track.outBlob) || null; }
        catch (error) { return null; }
        const entry = variants?.get?.(requestedFormat) || null;
        if (!entry?.blob || entry.blob.size <= 44 || entry.sourceFormat !== String(track.outFormat || '')) {
            try { variants?.delete?.(requestedFormat); } catch (error) {}
            unregisterDownloadVariantCacheEntry(entry);
            return null;
        }
        if (options.touch !== false) {
            entry.lastUsedAt = Date.now();
            const registryEntry = downloadVariantCacheRegistry.get(String(entry.cacheToken || ''));
            if (registryEntry) registryEntry.lastUsedAt = entry.lastUsedAt;
        }
        return entry;
    };

    const cacheDownloadVariant = (track, requestedFormat, result) => {
        if (!downloadVariantCache || !track?.outBlob || !result?.blob) return false;
        const normalizedFormat = String(requestedFormat || '').trim();
        const actualFormat = String(result.format || '').trim();
        const sizeBytes = Number(result.blob.size || 0);
        if (!normalizedFormat || actualFormat !== normalizedFormat || sizeBytes <= 44) return false;
        const cachePolicy = getDownloadVariantCachePolicy();
        if (!cachePolicy.supported) {
            recordDownloadEvent('variant-cache-skipped-weakref-unavailable', { format: normalizedFormat, sizeBytes });
            return false;
        }
        const entryLimitBytes = Math.min(MAX_CACHED_VARIANT_BYTES, cachePolicy.maxBytes);
        if (sizeBytes > entryLimitBytes) {
            recordDownloadEvent('variant-cache-skipped-large', { format: normalizedFormat, sizeBytes, limitBytes: entryLimitBytes });
            return false;
        }
        let variants = null;
        try {
            variants = downloadVariantCache.get(track.outBlob);
            if (!variants) {
                variants = new Map();
                downloadVariantCache.set(track.outBlob, variants);
            }
        } catch (error) {
            return false;
        }
        const previousEntry = variants.get(normalizedFormat) || null;
        unregisterDownloadVariantCacheEntry(previousEntry);
        const now = Date.now();
        const cacheToken = `variant-${(++downloadVariantCacheSequence).toString(36)}-${now.toString(36)}`;
        const cacheEntry = {
            blob: result.blob,
            format: actualFormat,
            sourceFormat: String(track.outFormat || ''),
            conversionSource: result.conversionSource || 'mastered-file',
            qualityWarning: result.qualityWarning || '',
            sizeBytes,
            createdAt: now,
            lastUsedAt: now,
            cacheToken
        };
        variants.set(normalizedFormat, cacheEntry);
        downloadVariantCacheRegistry.set(cacheToken, {
            sourceRef: new global.WeakRef(track.outBlob),
            format: normalizedFormat,
            sizeBytes,
            createdAt: now,
            lastUsedAt: now
        });
        while (variants.size > MAX_CACHED_VARIANTS_PER_SOURCE) {
            const oldest = [...variants.entries()].sort((left, right) => Number(left[1]?.lastUsedAt || 0) - Number(right[1]?.lastUsedAt || 0))[0];
            if (!oldest) break;
            unregisterDownloadVariantCacheEntry(oldest[1]);
            variants.delete(oldest[0]);
        }
        const cacheDiagnostics = enforceDownloadVariantCacheBudget();
        const retained = variants.get(normalizedFormat) === cacheEntry;
        recordDownloadEvent('variant-cache-store', { format: normalizedFormat, sizeBytes, cachedCount: variants.size, retained, globalCachedBytes: cacheDiagnostics.bytes, globalCachedCount: cacheDiagnostics.entryCount });
        return retained;
    };

    const clearDownloadVariantCache = sourceBlob => {
        if (!downloadVariantCache || !sourceBlob) return false;
        try {
            const variants = downloadVariantCache.get(sourceBlob) || null;
            variants?.forEach?.(entry => unregisterDownloadVariantCacheEntry(entry));
            const cleared = downloadVariantCache.delete(sourceBlob);
            pruneDownloadVariantCacheRegistry();
            return cleared;
        } catch (error) { return false; }
    };

    const inspectDownloadBlob = blob => {
        const cached = getVerifiedBlobInspection(blob);
        if (cached) return Promise.resolve(cached);
        if (!blob || typeof blob.size !== 'number') return Promise.resolve({ ok: false, kind: 'unknown', reason: '파일 데이터가 없습니다.' });
        if (blob.size <= 0) return Promise.resolve({ ok: false, kind: 'unknown', reason: '생성된 파일이 비어 있습니다.' });
        return blob.slice(0, Math.min(64, blob.size)).arrayBuffer().then(buffer => {
            const bytes = new Uint8Array(buffer);
            const mime = String(blob.type || '').toLowerCase();
            let kind = 'binary';
            let signatureOk = true;
            if (mime.includes('wav') || mime.includes('wave')) {
                kind = 'wav';
                signatureOk = bytes.length >= 12 && readAscii(bytes, 0, 4) === 'RIFF' && readAscii(bytes, 8, 4) === 'WAVE';
            } else if (mime.includes('mpeg') || mime.includes('mp3')) {
                kind = 'mp3';
                signatureOk = bytes.length >= 3 && (readAscii(bytes, 0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
            } else if (mime.includes('zip')) {
                kind = 'zip';
                signatureOk = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
            } else if (mime.includes('json')) {
                kind = 'json';
                signatureOk = blob.size >= 2;
            }
            const minimum = kind === 'wav' ? 44 : kind === 'mp3' ? 128 : 1;
            if (blob.size < minimum) return { ok: false, kind, reason: `${kind.toUpperCase()} 파일 크기가 비정상적으로 작습니다.` };
            if (!signatureOk) return { ok: false, kind, reason: `${kind.toUpperCase()} 파일 헤더가 올바르지 않습니다.` };
            return markDownloadBlobVerified(blob, { ok: true, kind, size: blob.size, mime: blob.type || '' });
        });
    };

    const assertDownloadBlob = async blob => {
        const inspection = await inspectDownloadBlob(blob);
        if (!inspection.ok) {
            const error = new Error(inspection.reason || '생성된 파일을 검증하지 못했습니다.');
            error.code = 'INVALID_DOWNLOAD_BLOB';
            error.inspection = inspection;
            throw error;
        }
        return inspection;
    };
    const addActiveUrl = (url, deps) => {
        const urls = deps?.state?.activeDownloadUrls;
        if (url) downloadUrlContexts.set(url, deps || {});
        if (url && urls && typeof urls.add === 'function') urls.add(url);
    };
    const resolveDownloadUrlDeps = (url, deps = {}) => deps?.state ? deps : (downloadUrlContexts.get(url) || deps || {});
    const hasActiveUrl = (url, deps) => {
        const urls = resolveDownloadUrlDeps(url, deps)?.state?.activeDownloadUrls;
        return Boolean(urls && typeof urls.has === 'function' && urls.has(url));
    };
    const deleteActiveUrl = (url, deps) => {
        const urls = resolveDownloadUrlDeps(url, deps)?.state?.activeDownloadUrls;
        if (urls && typeof urls.delete === 'function') urls.delete(url);
        downloadUrlContexts.delete(url);
    };

    const canDecodeCompletedOutput = track => Boolean(
        track?.outBlob &&
        global.FoxBearAudioDecodeService &&
        typeof global.FoxBearAudioDecodeService.decodeAudioFile === 'function'
    );

    const getDownloadDecodeMemoryPolicy = () => {
        const config = global.FoxBearRuntimeConfig || {};
        const lowMemory = isLowMemoryDownloadEnvironment();
        return Object.freeze({
            lowMemory,
            maxDecodedPcmBytes: Number(lowMemory ? config.LOW_MEMORY_MAX_DECODED_PCM_BYTES : config.STANDARD_MAX_DECODED_PCM_BYTES) || 0,
            maxDecodePeakBytes: Number(lowMemory ? config.LOW_MEMORY_MAX_DECODE_PEAK_BYTES : config.STANDARD_MAX_DECODE_PEAK_BYTES) || 0
        });
    };

    const decodeMasteredOutputForDownload = async (track, options = {}) => {
        const sourceBlob = options.sourceBlob || track?.outBlob || null;
        if (!sourceBlob) throw new Error('다시 읽을 완성 마스터 파일이 없습니다.');
        const service = global.FoxBearAudioDecodeService;
        if (!service || typeof service.decodeAudioFile !== 'function') throw new Error('완성 파일 디코더를 불러오지 못했습니다.');
        const format = options.sourceFormat || track?.outFormat || 'wav24';
        const extension = /^mp3_/.test(format) ? 'mp3' : 'wav';
        const fileName = options.sourceName || track?.outName || `foxbear-mastered.${extension}`;
        const mime = sourceBlob.type || (extension === 'mp3' ? 'audio/mpeg' : 'audio/wav');
        const sourceFile = typeof global.File === 'function'
            ? new global.File([sourceBlob], fileName, { type: mime, lastModified: Date.now() })
            : sourceBlob;
        emitDownloadProgress(options, { percent: 6, stage: '완성 파일 읽기', detail: '마스터링 결과의 오디오 데이터를 확인합니다.' });
        const memoryPolicy = getDownloadDecodeMemoryPolicy();
        const decoded = await service.decodeAudioFile(sourceFile, {
            signal: options.signal || null,
            latencyHint: 'playback',
            maxDecodedPcmBytes: memoryPolicy.maxDecodedPcmBytes,
            maxDecodePeakBytes: memoryPolicy.maxDecodePeakBytes
        });
        emitDownloadProgress(options, { percent: 18, stage: '완성 파일 읽기', detail: '오디오 데이터를 포맷 변환용으로 준비했습니다.' });
        return decoded;
    };

    const getDownloadFormatOptions = (track = null) => DEFAULT_FORMAT_OPTIONS.map(option => {
        const current = Boolean(track && option.format === track.outFormat);
        const cachedVariant = track ? getCachedDownloadVariant(track, option.format, { touch: false }) : null;
        const canReencode = Boolean(track?.masteredBuffer);
        const canTranscodeOutput = canDecodeCompletedOutput(track);
        const available = !track || current || Boolean(cachedVariant) || canReencode || canTranscodeOutput;
        const conversionMode = current
            ? 'reuse-current'
            : cachedVariant
                ? 'cached-download-variant'
            : canReencode
                ? 'mastered-pcm-reencode'
                : canTranscodeOutput
                    ? 'mastered-file-transcode'
                    : 'remaster-required';
        const lossySource = Boolean(track && /^mp3_/.test(String(track.outFormat || '')));
        const targetLossless = /^wav/.test(option.format);
        const qualityWarning = conversionMode === 'mastered-file-transcode' && lossySource && targetLossless
            ? '현재 MP3 마스터 파일을 기준으로 변환합니다. WAV를 선택해도 손실된 음질이 복원되지는 않습니다.'
            : conversionMode === 'mastered-file-transcode' && lossySource
                ? '현재 MP3 마스터 파일을 다시 인코딩합니다. 더 높은 비트레이트를 선택해도 손실된 음질이 복원되지는 않습니다.'
            : conversionMode === 'cached-download-variant'
                ? (cachedVariant.qualityWarning || '이전에 만든 동일 포맷 파일을 즉시 재사용합니다.')
            : conversionMode === 'mastered-file-transcode'
                ? '완성된 마스터 파일을 다시 읽어 선택 형식으로 변환합니다.'
                : '';
        return {
            ...option,
            current,
            available,
            conversionMode,
            qualityWarning,
            unavailableReason: available ? '' : '완료 파일을 다시 읽을 수 없는 환경입니다. 출력 포맷을 변경한 뒤 다시 마스터링해 주세요.'
        };
    });

    const getTrackDurationSeconds = track => {
        const direct = [track?.masteredDurationSec, track?.analysis?.duration, track?.masteredBuffer?.duration]
            .map(Number)
            .find(value => Number.isFinite(value) && value > 0);
        if (direct) return direct;
        const sampleRate = Number(track?.analysis?.sampleRate || track?.masteredBuffer?.sampleRate || 0);
        const length = Number(track?.analysis?.length || track?.masteredBuffer?.length || 0);
        return sampleRate > 0 && length > 0 ? length / sampleRate : 0;
    };

    const formatEstimatedFileSize = bytes => {
        const size = Math.max(0, Number(bytes || 0));
        if (!size) return '';
        if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
        if (size >= 1024) return `${Math.round(size / 1024)} KB`;
        return `${Math.round(size)} B`;
    };

    const getDownloadSizeEstimate = (track, format) => {
        const requestedFormat = String(format || track?.outFormat || '').trim();
        if (!requestedFormat) return null;
        const cachedVariant = getCachedDownloadVariant(track, requestedFormat, { touch: false });
        if (cachedVariant?.blob?.size > 0) {
            const bytes = Number(cachedVariant.blob.size);
            return Object.freeze({ bytes, label: formatEstimatedFileSize(bytes), exact: true, source: 'cached-download-variant', format: requestedFormat });
        }
        if (requestedFormat === track?.outFormat && Number(track?.outBlob?.size || 0) > 0) {
            const bytes = Number(track.outBlob.size);
            return Object.freeze({ bytes, label: formatEstimatedFileSize(bytes), exact: true, source: 'current-blob', format: requestedFormat });
        }
        const duration = getTrackDurationSeconds(track);
        if (!(duration > 0)) return null;
        if (/^mp3_(128|192|256|320)$/.test(requestedFormat)) {
            const bitrateKbps = Number(requestedFormat.split('_')[1]);
            const payloadBytes = duration * bitrateKbps * 1000 / 8;
            const bytes = Math.ceil(payloadBytes * 1.008 + 1024);
            return Object.freeze({ bytes, label: formatEstimatedFileSize(bytes), exact: false, source: 'mp3-cbr-estimate', format: requestedFormat, duration, bitrateKbps });
        }
        const wavBits = requestedFormat === 'wav16' ? 16 : requestedFormat === 'wav24' ? 24 : requestedFormat === 'wav32float' ? 32 : 0;
        if (!wavBits) return null;
        const sampleRate = Number(track?.analysis?.sampleRate || track?.masteredBuffer?.sampleRate || 0);
        const channels = Number(track?.analysis?.channels || track?.analysis?.numberOfChannels || track?.masteredBuffer?.numberOfChannels || 0);
        if (!(sampleRate > 0) || !(channels > 0)) return null;
        const bytes = Math.ceil(duration * sampleRate * channels * (wavBits / 8)) + 44;
        return Object.freeze({ bytes, label: formatEstimatedFileSize(bytes), exact: false, source: 'wav-pcm-estimate', format: requestedFormat, duration, sampleRate, channels, bitsPerSample: wavBits });
    };

    const getFallbackMasteredFileName = (track, deps, options = {}) => {
        if (typeof deps?.buildMasteredFileName === 'function') return deps.buildMasteredFileName(track, options);
        const policy = getFileNamePolicy();
        const extension = options.extension || (/mp3/.test(options.format || '') ? 'mp3' : 'wav');
        if (policy?.buildMasteredFileName) {
            return policy.buildMasteredFileName({
                sourceName: track?.name || 'track',
                targetLufs: track?.finalizeInfo?.targetLufs,
                style: options.style || 'master',
                format: options.format || track?.outFormat || extension,
                extension
            });
        }
        const base = String(track?.name || 'track').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'track';
        return `${base} mastered.${extension}`;
    };

    const getImmediateTrackDownloadBlob = (track, format, deps = {}) => {
        if (!track || !track.outBlob) return null;
        const requestedFormat = format || track.outFormat || 'wav24';
        if (requestedFormat !== track.outFormat) return null;
        const inspection = getVerifiedBlobInspection(track.outBlob);
        if (!inspection?.ok) return null;
        const outputFormat = track.outFormat || 'wav24';
        const fileName = getFallbackMasteredFileName(track, deps, {
            format: outputFormat,
            extension: /mp3/.test(outputFormat) ? 'mp3' : 'wav'
        }) || track.outName;
        return { blob: track.outBlob, fileName, format: outputFormat, reused: true, inspection };
    };

    const getDownloadVariantJobKey = (track, requestedFormat) => `${String(track?.outFormat || '')}::${String(requestedFormat || '')}`;

    const getDownloadVariantJobMap = (sourceBlob, create = false) => {
        if (!downloadVariantJobs || !sourceBlob) return null;
        try {
            let jobs = downloadVariantJobs.get(sourceBlob) || null;
            if (!jobs && create) {
                jobs = new Map();
                downloadVariantJobs.set(sourceBlob, jobs);
            }
            return jobs;
        } catch (error) {
            return null;
        }
    };

    const getDownloadVariantJob = (track, requestedFormat) => {
        const jobs = getDownloadVariantJobMap(track?.outBlob, false);
        return jobs?.get?.(getDownloadVariantJobKey(track, requestedFormat)) || null;
    };

    const deleteDownloadVariantJob = job => {
        if (!job?.sourceBlob) return false;
        const jobs = getDownloadVariantJobMap(job.sourceBlob, false);
        if (!jobs || jobs.get(job.key) !== job) return false;
        jobs.delete(job.key);
        if (!jobs.size) {
            try { downloadVariantJobs?.delete?.(job.sourceBlob); } catch (error) {}
        }
        return true;
    };

    const broadcastDownloadVariantProgress = (job, progress) => {
        if (!job) return;
        job.lastProgress = progress ? { ...progress } : null;
        for (const subscriber of [...job.subscribers]) {
            if (!subscriber?.active || subscriber.signal?.aborted) continue;
            emitDownloadProgress({ onProgress: subscriber.onProgress }, job.lastProgress);
        }
    };

    const abortDownloadVariantJobIfUnused = job => {
        if (!job || job.settled || job.subscribers.size > 0) return false;
        const signal = job.controller?.signal || null;
        if (signal?.aborted) return false;
        try {
            job.controller?.abort?.('download-variant-no-subscribers');
            recordDownloadEvent('variant-job-abort-unused', { format: job.requestedFormat });
            return true;
        } catch (error) {
            return false;
        }
    };

    const subscribeToDownloadVariantJob = (job, options = {}) => {
        throwIfDownloadAborted(options.signal);
        return new Promise((resolve, reject) => {
            const subscriber = {
                active: true,
                signal: options.signal || null,
                onProgress: typeof options.onProgress === 'function' ? options.onProgress : null,
                abortHandler: null
            };
            const cleanup = () => {
                if (!subscriber.active) return;
                subscriber.active = false;
                job.subscribers.delete(subscriber);
                try { subscriber.signal?.removeEventListener?.('abort', subscriber.abortHandler); } catch (error) {}
            };
            const rejectForAbort = () => {
                if (!subscriber.active) return;
                const reason = subscriber.signal?.reason || 'download-subscriber-cancelled';
                cleanup();
                recordDownloadEvent('variant-job-subscriber-abort', {
                    format: job.requestedFormat,
                    remainingSubscribers: job.subscribers.size,
                    reason: String(reason || '')
                });
                reject(makeDownloadAbortError(reason));
                abortDownloadVariantJobIfUnused(job);
            };

            subscriber.abortHandler = rejectForAbort;
            job.subscribers.add(subscriber);
            if (job.subscribers.size > 1) {
                recordDownloadEvent('variant-job-join', {
                    format: job.requestedFormat,
                    subscribers: job.subscribers.size
                });
            }
            if (job.lastProgress) emitDownloadProgress(options, job.lastProgress);
            if (subscriber.signal?.addEventListener) subscriber.signal.addEventListener('abort', rejectForAbort, { once: true });

            job.promise.then(result => {
                if (!subscriber.active) return;
                cleanup();
                resolve(result);
            }, error => {
                if (!subscriber.active) return;
                cleanup();
                reject(error);
            });
        });
    };

    const runDownloadVariantConversion = async (track, requestedFormat, deps, job) => {
        const sourceTrack = job.sourceTrack || track;
        const signal = job.controller?.signal || null;
        const jobId = job.jobId || '';
        const publishProgress = progress => broadcastDownloadVariantProgress(job, progress);
        throwIfDownloadAborted(signal);

        let sourceBuffer = sourceTrack.masteredBuffer || null;
        let conversionSource = sourceBuffer ? 'mastered-pcm' : 'mastered-file';
        if (!sourceBuffer) {
            const decodeOutput = typeof deps.decodeMasteredOutputAsync === 'function'
                ? deps.decodeMasteredOutputAsync
                : (canDecodeCompletedOutput(sourceTrack) ? decodeMasteredOutputForDownload : null);
            if (!decodeOutput) {
                const error = new Error('완료 PCM이 해제되었고 완성 파일을 다시 읽을 수 없습니다. 출력 포맷을 변경한 뒤 다시 마스터링해 주세요.');
                error.code = 'FORMAT_REQUIRES_REMASTER';
                error.currentFormat = sourceTrack.outFormat || '';
                error.requestedFormat = requestedFormat;
                throw error;
            }
            publishProgress({ percent: 3, stage: '완성 파일 읽기', detail: '마스터링 결과를 다시 읽어 포맷 변환을 준비합니다.' });
            sourceBuffer = await decodeOutput(track, {
                signal,
                jobId,
                onProgress: publishProgress,
                sourceBlob: sourceTrack.outBlob,
                sourceFormat: sourceTrack.outFormat,
                sourceName: sourceTrack.outName || ''
            });
            throwIfDownloadAborted(signal);
            if (!sourceBuffer || !Number(sourceBuffer.length || 0)) throw new Error('완성된 마스터 파일을 다시 읽지 못했습니다.');
            publishProgress({ percent: 20, stage: '완성 파일 읽기 완료', detail: '선택한 확장자와 음질로 변환합니다.' });
        }
        if (typeof deps.encodeMasterOutputAsync !== 'function') throw new Error('선택한 포맷을 인코딩할 수 없습니다.');
        const forwardEncodeProgress = progress => {
            if (conversionSource !== 'mastered-file') {
                publishProgress(progress);
                return;
            }
            const rawPercent = Math.max(0, Math.min(100, Number(progress?.percent) || 0));
            publishProgress({
                ...progress,
                percent: Math.min(98, 20 + rawPercent * 0.78),
                stage: progress?.stage || '포맷 변환'
            });
        };
        let encoded = null;
        try {
            encoded = await deps.encodeMasterOutputAsync(sourceBuffer, requestedFormat, {
                signal,
                jobId,
                onProgress: forwardEncodeProgress
            });
        } finally {
            if (conversionSource === 'mastered-file') sourceBuffer = null;
        }
        throwIfDownloadAborted(signal);
        if (!encoded?.blob || encoded.blob.size <= 44) throw new Error('선택한 포맷 파일을 만들지 못했습니다.');
        publishProgress({ percent: 99, stage: '파일 검증', detail: '생성된 오디오 헤더와 파일 크기를 확인합니다.' });
        await assertDownloadBlob(encoded.blob);
        throwIfDownloadAborted(signal);
        publishProgress({ percent: 100, stage: '파일 준비 완료', detail: '선택한 확장자와 음질의 파일 생성이 완료됐습니다.' });
        const fileName = getFallbackMasteredFileName(sourceTrack, deps, encoded);
        const result = {
            blob: encoded.blob,
            fileName,
            format: encoded.format || requestedFormat,
            reused: false,
            conversionSource,
            fallbackFrom: encoded.fallbackFrom || '',
            fallbackReason: encoded.fallbackReason || '',
            qualityWarning: conversionSource === 'mastered-file' && /^mp3_/.test(String(sourceTrack.outFormat || '')) && /^wav/.test(requestedFormat)
                ? 'MP3 마스터 파일 기반 변환이므로 WAV로 바꿔도 손실 음질은 복원되지 않습니다.'
                : conversionSource === 'mastered-file' && /^mp3_/.test(String(sourceTrack.outFormat || ''))
                    ? 'MP3 마스터 파일을 다시 인코딩하므로 더 높은 비트레이트를 선택해도 손실 음질은 복원되지 않습니다.'
                    : ''
        };
        cacheDownloadVariant(sourceTrack, requestedFormat, result);
        return result;
    };

    const createDownloadVariantJob = (track, requestedFormat, deps = {}, options = {}) => {
        const jobs = getDownloadVariantJobMap(track?.outBlob, true);
        const key = getDownloadVariantJobKey(track, requestedFormat);
        const controller = typeof global.AbortController === 'function' ? new global.AbortController() : null;
        const sourceTrack = {
            ...track,
            outBlob: track.outBlob,
            outFormat: track.outFormat,
            masteredBuffer: track.masteredBuffer || null
        };
        const job = {
            key,
            sourceBlob: sourceTrack.outBlob,
            sourceFormat: String(sourceTrack.outFormat || ''),
            sourceTrack,
            requestedFormat,
            controller,
            jobId: options.jobId || `download-variant:${requestedFormat}:${Date.now().toString(36)}`,
            subscribers: new Set(),
            lastProgress: null,
            settled: false,
            promise: null
        };
        if (jobs) jobs.set(key, job);
        recordDownloadEvent('variant-job-start', { format: requestedFormat, sourceFormat: job.sourceFormat });
        job.promise = runDownloadVariantConversion(track, requestedFormat, deps, job)
            .then(result => {
                job.settled = true;
                recordDownloadEvent('variant-job-complete', {
                    format: requestedFormat,
                    actualFormat: result?.format || '',
                    sizeBytes: Number(result?.blob?.size || 0),
                    subscribers: job.subscribers.size
                });
                return result;
            }, error => {
                job.settled = true;
                recordDownloadEvent('variant-job-failed', {
                    format: requestedFormat,
                    name: error?.name || '',
                    code: error?.code || '',
                    message: error?.message || String(error)
                });
                throw error;
            })
            .finally(() => deleteDownloadVariantJob(job));
        return job;
    };

    const prepareTrackDownloadBlob = async (track, format, deps = {}, options = {}) => {
        throwIfDownloadAborted(options.signal);
        if (!track || !track.outBlob) throw new Error('완성된 마스터링 파일이 없습니다.');
        const requestedFormat = format || track.outFormat || 'wav24';
        if (requestedFormat === track.outFormat) {
            const outputFormat = track.outFormat || 'wav24';
            const fileName = getFallbackMasteredFileName(track, deps, {
                format: outputFormat,
                extension: /mp3/.test(outputFormat) ? 'mp3' : 'wav'
            }) || track.outName;
            emitDownloadProgress(options, { percent: 20, stage: '파일 검증', detail: '완성 파일의 헤더와 크기를 확인합니다.' });
            await assertDownloadBlob(track.outBlob);
            throwIfDownloadAborted(options.signal);
            emitDownloadProgress(options, { percent: 100, stage: '파일 준비 완료', detail: '저장 또는 공유를 시작할 수 있습니다.' });
            return { blob: track.outBlob, fileName, format: outputFormat, reused: true };
        }
        const cachedVariant = getCachedDownloadVariant(track, requestedFormat);
        if (cachedVariant) {
            emitDownloadProgress(options, { percent: 100, stage: '변환 파일 재사용', detail: '이전에 만든 동일 확장자와 음질의 파일을 즉시 준비했습니다.' });
            recordDownloadEvent('variant-cache-hit', { format: requestedFormat, sizeBytes: Number(cachedVariant.blob.size || 0) });
            return {
                blob: cachedVariant.blob,
                fileName: getFallbackMasteredFileName(track, deps, {
                    format: cachedVariant.format,
                    extension: /^mp3_/.test(cachedVariant.format) ? 'mp3' : 'wav'
                }),
                format: cachedVariant.format,
                reused: true,
                cached: true,
                conversionSource: 'download-variant-cache',
                qualityWarning: cachedVariant.qualityWarning || ''
            };
        }
        const activeJob = getDownloadVariantJob(track, requestedFormat) || createDownloadVariantJob(track, requestedFormat, deps, options);
        return subscribeToDownloadVariantJob(activeJob, options);
    };

    const canShareTinyAudioProbe = () => {
        if (!navigator.share || typeof File === 'undefined') return false;
        if (!navigator.canShare) return true;
        try {
            const header = new Uint8Array(44);
            header.set([82, 73, 70, 70], 0);
            header.set([87, 65, 86, 69], 8);
            header.set([102, 109, 116, 32], 12);
            header.set([100, 97, 116, 97], 36);
            const file = new File([header], 'foxbear-preview.wav', { type: 'audio/wav' });
            return navigator.canShare({ files: [file] });
        } catch (error) {
            return false;
        }
    };

    const supportsWebShareDownloadFiles = () => Boolean(navigator.share && typeof File !== 'undefined' && (!navigator.canShare || canShareTinyAudioProbe()));

    const makeShareFile = (blob, fileName) => new File([blob], fileName, { type: blob?.type || 'application/octet-stream' });

    const supportsWebShareFiles = (blob, fileName) => {
        if (!navigator.share || typeof File === 'undefined' || !blob) return false;
        try {
            const file = makeShareFile(blob, fileName || 'foxbear-mastered.wav');
            return !navigator.canShare || navigator.canShare({ files: [file] });
        } catch (error) {
            return false;
        }
    };

    const supportsFileSystemSave = () => Boolean(global.isSecureContext && typeof global.showSaveFilePicker === 'function');

    const supportsAnchorDownload = () => {
        const a = document.createElement('a');
        return 'download' in a;
    };

    const isRestrictedDownloadBrowser = () => {
        const ua = navigator.userAgent || '';
        return /KAKAOTALK|KakaoTalk|NAVER\(inapp|FBAN|FBAV|Instagram|Line\//i.test(ua);
    };

    const isKakaoInAppBrowser = () => /KAKAOTALK|KakaoTalk/i.test(navigator.userAgent || '');

    const getDownloadEnvironmentInfo = () => {
        const ua = navigator.userAgent || '';
        const restricted = isRestrictedDownloadBrowser();
        const ios = /iPhone|iPad|iPod/i.test(ua);
        const android = /Android/i.test(ua);
        const kakao = /KAKAOTALK|KakaoTalk/i.test(ua);
        const naver = /NAVER\(inapp/i.test(ua);
        const instagram = /Instagram/i.test(ua);
        const line = /Line\//i.test(ua);
        const standalone = Boolean(global.matchMedia?.('(display-mode: standalone)')?.matches || global.navigator?.standalone);
        const secureContext = Boolean(global.isSecureContext);
        const shareApi = Boolean(navigator.share && typeof File !== 'undefined');
        const shareFiles = shareApi && (!navigator.canShare || canShareTinyAudioProbe());
        const anchorDownload = supportsAnchorDownload();
        const filePicker = supportsFileSystemSave();
        let label = '일반 브라우저';
        if (kakao) label = '카카오톡 인앱 브라우저';
        else if (naver) label = '네이버 인앱 브라우저';
        else if (instagram) label = '인스타그램 인앱 브라우저';
        else if (line) label = 'LINE 인앱 브라우저';
        else if (ios) label = 'iOS 브라우저';
        else if (android) label = 'Android 브라우저';
        const detail = restricted
            ? '인앱 브라우저는 Blob 자동 다운로드가 막히거나 저장 위치가 보이지 않을 수 있어 공유/저장, 파일 열기, 외부 브라우저 안내를 함께 제공합니다.'
            : shareFiles
                ? '다운로드와 파일 공유가 모두 가능한 환경으로 보입니다.'
                : '다운로드는 가능하지만 파일 공유는 제한될 수 있습니다.';
        const recommendedAction = restricted
            ? (shareFiles ? '공유/저장 먼저' : '저장 도움 먼저')
            : '다운로드';
        return { ua, restricted, ios, android, kakao, naver, instagram, line, standalone, secureContext, label, detail, shareApi, shareFiles, anchorDownload, filePicker, recommendedAction };
    };

    const getFileSizeLabel = blob => {
        const size = Number(blob?.size || 0);
        if (!size) return '크기 확인 전';
        if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
        if (size >= 1024) return `${Math.round(size / 1024)} KB`;
        return `${size} B`;
    };

    const getDownloadTroubleshootingText = (fileName = 'FoxBear mastered file') => {
        const env = getDownloadEnvironmentInfo();
        const lines = [
            `FoxBear 다운로드/공유 안내`,
            `파일: ${fileName}`,
            `브라우저: ${env.label}`,
            '',
            env.restricted
                ? '카카오톡/인앱 브라우저에서는 Blob 자동 다운로드가 저장되지 않거나 다운로드 목록에 보이지 않을 수 있습니다.'
                : '일반 브라우저에서는 다운로드 버튼이 가장 안정적입니다.',
            '',
            '권장 순서:',
            '1. 공유/저장 버튼으로 기기 기본 공유창을 엽니다.',
            '2. 공유창에서 파일 저장, 카카오톡, 문자, 메일, 드라이브 중 가능한 대상을 선택합니다.',
            '3. 공유창이 뜨지 않으면 저장 도움창의 파일 열기를 눌러 새 화면에서 저장을 시도합니다.',
            '4. 카카오톡 안에서 계속 실패하면 주소 복사 후 Chrome/Safari에서 다시 열어 마스터링/다운로드를 진행합니다.'
        ];
        return lines.join('\n');
    };


    const getRecommendedDownloadFlow = (blob = null, fileName = '') => {
        const env = getDownloadEnvironmentInfo();
        const safeName = fileName ? sanitizeDownloadFileName(normalizeDownloadFileNameForBlob(fileName, blob)) : '';
        const shareReady = blob ? supportsWebShareFiles(blob, safeName || fileName || 'foxbear-mastered.wav') : env.shareFiles;
        const directSaveReady = supportsFileSystemSave();
        const defaultSteps = [
            { key: 'download', label: '다운로드', detail: '브라우저 기본 저장을 시도합니다.' },
            { key: 'share', label: '파일 공유', detail: '지원 기기에서는 공유창으로 보냅니다.' },
            { key: 'assist', label: '저장 도움', detail: '저장이 안 보이면 대체 방법을 보여줍니다.' }
        ];
        if (env.restricted) {
            return {
                version: '1.6.78',
                restricted: true,
                primaryAction: shareReady ? 'share' : 'assist',
                primaryLabel: shareReady ? '공유/저장' : '저장 도움',
                secondaryLabel: shareReady ? '저장 도움' : '파일 열기',
                headline: shareReady ? '카카오에서는 공유/저장이 가장 안정적입니다.' : '이 인앱 브라우저는 파일 공유가 제한될 수 있습니다.',
                detail: '자동 다운로드에만 기대지 않고 공유/저장, 파일 열기, 외부 브라우저 순서로 안내합니다.',
                steps: [
                    { key: 'share', label: '1. 공유/저장', detail: shareReady ? '기기 공유창에서 파일 앱, 카카오톡, 드라이브를 선택합니다.' : '지원되지 않으면 바로 저장 도움으로 넘어갑니다.' },
                    { key: 'assist', label: '2. 저장 도움', detail: '파일 열기와 안내 복사, 진단 복사를 제공합니다.' },
                    { key: 'external', label: '3. 외부 브라우저', detail: '계속 실패하면 Chrome/Safari에서 다시 진행합니다.' }
                ],
                badges: [
                    shareReady ? '파일 공유 가능' : '파일 공유 제한',
                    env.kakao ? '카카오 인앱' : '인앱 브라우저',
                    directSaveReady ? '직접 저장 가능' : '직접 저장 제한'
                ]
            };
        }
        return {
            version: '1.6.78',
            restricted: false,
            primaryAction: 'download',
            primaryLabel: '다운로드',
            secondaryLabel: shareReady ? '파일 공유' : '저장 도움',
            headline: '일반 브라우저에서는 다운로드가 우선입니다.',
            detail: shareReady ? '공유가 필요하면 파일 공유를 함께 사용할 수 있습니다.' : '공유가 제한되면 저장 도움을 사용하세요.',
            steps: defaultSteps,
            badges: [
                env.anchorDownload ? '다운로드 가능' : '다운로드 제한 가능',
                shareReady ? '파일 공유 가능' : '파일 공유 제한',
                env.standalone ? 'PWA 모드' : env.label
            ]
        };
    };


    const getDownloadActionReceipt = (action = 'download', blob = null, fileName = '') => {
        const env = getDownloadEnvironmentInfo();
        const normalizedAction = ['download', 'share', 'assist', 'diagnostics', 'copy', 'external'].includes(action) ? action : 'download';
        const safeName = fileName ? sanitizeDownloadFileName(normalizeDownloadFileNameForBlob(fileName, blob)) : 'FoxBear mastered file';
        const fileSize = getFileSizeLabel(blob);
        const commonFile = `${safeName} · ${fileSize}`;
        const restricted = env.restricted;
        const receiptMap = {
            download: restricted
                ? {
                    title: '인앱 브라우저라 저장 도움으로 전환될 수 있습니다.',
                    detail: `${commonFile} 준비 후 공유/저장 또는 파일 열기 순서로 안내합니다.`,
                    nextSteps: ['공유창이 뜨면 파일 저장/드라이브/메신저를 선택하세요.', '공유창이 안 뜨면 저장 도움의 파일 열기를 누르세요.', '계속 실패하면 주소 복사 후 Chrome/Safari에서 다시 여세요.']
                }
                : {
                    title: '다운로드를 시작합니다.',
                    detail: `${commonFile} 파일을 브라우저 기본 저장 방식으로 내려받습니다.`,
                    nextSteps: ['다운로드 표시줄 또는 다운로드 폴더를 확인하세요.', '저장이 안 보이면 저장 도움을 사용하세요.']
                },
            share: {
                title: restricted ? '공유/저장창을 먼저 여는 흐름입니다.' : '기기 공유창으로 파일을 보냅니다.',
                detail: `${commonFile} 파일을 공유 가능한 오디오 파일로 준비합니다.`,
                nextSteps: ['공유창에서 파일 앱, 드라이브, 메신저, 메일 중 가능한 대상을 고르세요.', '공유가 취소되거나 막히면 저장 도움으로 이어집니다.']
            },
            assist: {
                title: '저장 도움창을 엽니다.',
                detail: `${commonFile} 파일을 열기/공유/복사 안내와 함께 보여줍니다.`,
                nextSteps: ['파일 열기를 눌러 새 화면에서 저장을 시도하세요.', '인앱 브라우저에서는 외부 브라우저 안내를 참고하세요.', '문제가 계속되면 진단 복사를 눌러 상태를 확인하세요.']
            },
            diagnostics: {
                title: '진단 정보를 복사합니다.',
                detail: '파일 저장 실패 원인을 확인할 수 있도록 브라우저/공유/다운로드 상태를 복사합니다.',
                nextSteps: ['복사된 JSON을 메모장이나 대화창에 붙여 확인하세요.', '파일 자체는 공유되지 않고 상태 정보만 복사됩니다.']
            },
            copy: {
                title: '현재 페이지 주소를 복사합니다.',
                detail: '외부 브라우저에서 다시 열 수 있도록 현재 앱 주소를 복사합니다.',
                nextSteps: ['Chrome/Safari 주소창에 붙여넣어 여세요.', '메모리의 완성 파일은 넘어가지 않을 수 있어 다시 마스터링이 필요할 수 있습니다.']
            },
            external: {
                title: '외부 브라우저로 열기를 시도합니다.',
                detail: '인앱 브라우저 제한을 피하기 위해 Chrome/Safari 이동을 안내합니다.',
                nextSteps: ['새 브라우저에서 앱이 열리면 파일을 다시 불러와 마스터링하세요.', '현재 Blob 파일은 브라우저 간 직접 전달되지 않을 수 있습니다.']
            }
        };
        const receipt = receiptMap[normalizedAction] || receiptMap.download;
        return {
            version: '1.6.78',
            action: normalizedAction,
            title: receipt.title,
            detail: receipt.detail,
            nextSteps: receipt.nextSteps.slice(),
            badges: [env.label, restricted ? '인앱 fallback' : '일반 저장', env.shareFiles ? '공유 가능' : '공유 제한'],
            file: { name: safeName, sizeLabel: fileSize, sizeBytes: Number(blob?.size || 0), type: blob?.type || '' },
            environment: { label: env.label, restricted, kakao: env.kakao, ios: env.ios, android: env.android, standalone: env.standalone }
        };
    };


    const getDownloadRecoveryChecklist = (blob = null, fileName = '', lastAction = '') => {
        const env = getDownloadEnvironmentInfo();
        const safeName = fileName ? sanitizeDownloadFileName(normalizeDownloadFileNameForBlob(fileName, blob)) : 'FoxBear mastered file';
        const fileSize = getFileSizeLabel(blob);
        const shareReady = blob ? supportsWebShareFiles(blob, safeName) : env.shareFiles;
        const restricted = env.restricted;
        const normalizedLastAction = String(lastAction || '').replace(/[^a-z-]+/gi, '') || 'ready';
        const headline = restricted
            ? '카카오/인앱 저장 체크리스트'
            : '다운로드 확인 체크리스트';
        const summary = restricted
            ? '자동 다운로드가 안 보이면 고장이라기보다 브라우저 제한일 가능성이 큽니다. 아래 순서대로만 확인하세요.'
            : '다운로드가 바로 보이지 않으면 브라우저 저장 위치와 도움창을 차례로 확인하세요.';
        const steps = restricted
            ? [
                { key: 'share', label: '1. 공유/저장', detail: shareReady ? '공유창에서 파일 앱, 드라이브, 카카오톡, 메일 중 가능한 곳을 선택합니다.' : '공유창이 제한되면 바로 저장 도움으로 넘어갑니다.' },
                { key: 'open', label: '2. 파일 열기', detail: '저장 도움창에서 파일 열기를 누른 뒤 브라우저 메뉴의 저장/공유를 확인합니다.' },
                { key: 'diagnostics', label: '3. 진단 복사', detail: '계속 실패하면 진단 복사를 눌러 브라우저/파일 상태를 확인합니다.' },
                { key: 'external', label: '4. 외부 브라우저', detail: '마지막으로 주소 복사 후 Chrome/Safari에서 다시 마스터링하고 저장합니다.' }
            ]
            : [
                { key: 'download', label: '1. 다운로드 폴더 확인', detail: '브라우저 다운로드 표시줄 또는 다운로드 폴더를 먼저 확인합니다.' },
                { key: 'share', label: '2. 파일 공유', detail: shareReady ? '필요하면 기기 공유창으로 파일을 보냅니다.' : '공유가 제한되면 저장 도움을 사용합니다.' },
                { key: 'assist', label: '3. 저장 도움', detail: '자동 저장이 안 보이면 파일 열기 또는 직접 저장을 사용합니다.' }
            ];
        return {
            version: '1.6.78',
            lastAction: normalizedLastAction,
            headline,
            summary,
            primaryAction: restricted ? (shareReady ? 'share' : 'assist') : 'download',
            fallbackAction: restricted ? 'diagnostics' : 'assist',
            file: { name: safeName, sizeLabel: fileSize, sizeBytes: Number(blob?.size || 0), type: blob?.type || '' },
            environment: { label: env.label, restricted, kakao: env.kakao, ios: env.ios, android: env.android, standalone: env.standalone, shareFiles: env.shareFiles, anchorDownload: env.anchorDownload, filePicker: env.filePicker },
            steps
        };
    };



    const getDownloadCompactRecoveryPlan = (blob = null, fileName = '', lastAction = '') => {
        const checklist = getDownloadRecoveryChecklist(blob, fileName, lastAction);
        const env = checklist.environment || getDownloadEnvironmentInfo();
        const restricted = Boolean(env.restricted);
        const maxVisibleSteps = restricted ? 3 : 2;
        const compactSteps = (checklist.steps || []).slice(0, maxVisibleSteps).map((step, index) => ({
            key: step.key || `step-${index + 1}`,
            label: String(step.label || `단계 ${index + 1}`).replace(/^\d+\.\s*/, ''),
            detail: step.detail || ''
        }));
        const optionalStep = restricted
            ? (checklist.steps || []).find(step => step.key === 'diagnostics') || null
            : (checklist.steps || []).find(step => step.key === 'assist') || null;
        return {
            version: '1.6.78',
            mode: restricted ? 'restricted-compact' : 'standard-compact',
            lastAction: checklist.lastAction,
            headline: restricted ? '저장은 이 순서로만 해보세요' : '저장이 안 보이면 이것만 확인하세요',
            summary: restricted
                ? '카카오 안에서는 자동 다운로드보다 공유/파일 열기가 더 안정적입니다.'
                : '대부분은 다운로드 폴더 확인 또는 저장 도움으로 해결됩니다.',
            primaryAction: checklist.primaryAction,
            fallbackAction: checklist.fallbackAction,
            firstActionLabel: restricted ? '공유/저장' : '다운로드',
            fallbackLabel: restricted ? '파일 열기' : '저장 도움',
            copyLabel: '체크리스트 복사',
            optionalAction: optionalStep ? {
                key: optionalStep.key,
                label: String(optionalStep.label || '').replace(/^\d+\.\s*/, '') || '추가 확인',
                detail: optionalStep.detail || ''
            } : null,
            file: checklist.file,
            environment: checklist.environment,
            steps: compactSteps
        };
    };


    const getDownloadDialogCompactHint = (blob = null, fileName = '', lastAction = '') => {
        const plan = getDownloadCompactRecoveryPlan(blob, fileName, lastAction);
        const env = plan.environment || getDownloadEnvironmentInfo();
        const restricted = Boolean(env.restricted);
        const primaryLabel = restricted ? (plan.primaryAction === 'assist' ? '저장 도움' : '공유/저장') : '다운로드';
        const fallbackLabel = restricted ? '파일 열기' : '저장 도움';
        return {
            version: '1.6.78',
            mode: restricted ? 'restricted-micro' : 'standard-micro',
            lastAction: plan.lastAction,
            headline: restricted ? '카카오에서는 이 두 가지만 먼저' : '먼저 다운로드만 확인',
            detail: restricted
                ? `${primaryLabel}을 먼저 누르고, 안 보이면 저장 도움의 ${fallbackLabel}를 누르세요.`
                : '저장이 안 보이면 다운로드 폴더를 확인하고, 필요할 때만 저장 도움을 여세요.',
            primaryAction: plan.primaryAction,
            fallbackAction: plan.fallbackAction,
            primaryLabel,
            fallbackLabel,
            advancedLabel: restricted ? '진단/주소 복사는 추가 옵션에 있습니다.' : '공유/진단은 추가 옵션에 있습니다.',
            visibleStepLimit: restricted ? 2 : 1,
            steps: (plan.steps || []).slice(0, restricted ? 2 : 1),
            file: plan.file,
            environment: plan.environment
        };
    };


    const getDownloadDialogDisplayProfile = (blob = null, fileName = '', lastAction = 'dialog-open') => {
        const hint = getDownloadDialogCompactHint(blob, fileName, lastAction);
        const env = hint.environment || getDownloadEnvironmentInfo();
        const restricted = Boolean(env.restricted);
        return {
            version: '1.6.78',
            mode: restricted ? 'restricted-declutter' : 'standard-declutter',
            headline: restricted ? '첫 화면은 공유/저장만 먼저' : '첫 화면은 다운로드만 먼저',
            detail: restricted
                ? '카카오에서 안 보이면 저장 도움의 파일 열기만 확인하고, 진단/주소 복사는 추가 옵션에서 사용하세요.'
                : '저장 위치가 안 보일 때만 저장 도움을 열고, 공유/진단은 추가 옵션에 둡니다.',
            initialWarning: restricted ? '공유/저장을 먼저 누르세요. 안 되면 저장 도움의 파일 열기만 확인하세요.' : '다운로드를 먼저 누르세요. 안 보이면 다운로드 폴더를 확인하세요.',
            receiptIdle: true,
            maxInitialReceiptSteps: restricted ? 1 : 0,
            maxActionReceiptSteps: restricted ? 2 : 2,
            showChecklistOnOpen: false,
            showChecklistAfterAction: true,
            advancedCollapsed: true,
            hint
        };
    };

    const serializeDownloadRecoveryChecklist = (blob = null, fileName = '', lastAction = '') => {
        const checklist = getDownloadRecoveryChecklist(blob, fileName, lastAction);
        const lines = [
            'FoxBear 저장 체크리스트',
            `파일: ${checklist.file.name} (${checklist.file.sizeLabel})`,
            `브라우저: ${checklist.environment.label}`,
            `최근 동작: ${checklist.lastAction}`,
            '',
            checklist.summary,
            '',
            ...checklist.steps.map(step => `${step.label}: ${step.detail}`)
        ];
        return lines.join('\n');
    };

    const copyDownloadRecoveryChecklist = (blob = null, fileName = '', lastAction = '', deps = {}) => {
        const text = serializeDownloadRecoveryChecklist(blob, fileName, lastAction);
        recordDownloadEvent('recovery-checklist-copy', { fileName, lastAction });
        return copyTextToClipboard(text, deps, '저장 체크리스트를 복사했습니다.');
    };

    const copyTextToClipboard = async (text, deps = {}, successMessage = '복사했습니다.') => {
        const showToast = getToast(deps);
        if (navigator.clipboard && global.isSecureContext) {
            await navigator.clipboard.writeText(text);
            showToast(successMessage);
            return true;
        }
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        document.body.appendChild(area);
        area.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (error) { ok = false; }
        area.remove();
        showToast(ok ? successMessage : text);
        return ok;
    };

    const copyDownloadTroubleshootingGuide = (fileName, deps = {}) => {
        const text = getDownloadTroubleshootingText(fileName);
        recordDownloadEvent('troubleshooting-copy', { fileName });
        return copyTextToClipboard(text, deps, '다운로드 문제 해결 안내를 복사했습니다.');
    };

    const getDownloadDiagnostics = (blob = null, fileName = '') => {
        const env = getDownloadEnvironmentInfo();
        const safeName = fileName ? sanitizeDownloadFileName(normalizeDownloadFileNameForBlob(fileName, blob)) : '';
        return {
            version: '1.6.78',
            generatedAt: new Date().toISOString(),
            file: {
                name: safeName || fileName || '',
                sizeBytes: Number(blob?.size || 0),
                sizeLabel: getFileSizeLabel(blob),
                type: String(blob?.type || '')
            },
            capability: getDownloadCapabilitySummary(blob, safeName || fileName),
            environment: {
                label: env.label,
                restricted: env.restricted,
                kakao: env.kakao,
                ios: env.ios,
                android: env.android,
                standalone: env.standalone,
                secureContext: env.secureContext,
                shareApi: env.shareApi,
                shareFiles: env.shareFiles,
                anchorDownload: env.anchorDownload,
                filePicker: env.filePicker,
                recommendedAction: env.recommendedAction,
                userAgent: env.ua
            },
            recentEvents: getDownloadDiagnosticEvents(),
            variantCache: getDownloadVariantCacheDiagnostics(),
            recoverableFaults: global.FoxBearRuntimeFaultCounters?.getSnapshot?.() || null
        };
    };

    const serializeDownloadDiagnostics = (blob = null, fileName = '') => JSON.stringify(getDownloadDiagnostics(blob, fileName), null, 2);

    const copyDownloadDiagnostics = (blob = null, fileName = '', deps = {}) => {
        recordDownloadEvent('diagnostics-copy', { fileName, sizeBytes: Number(blob?.size || 0), type: blob?.type || '' });
        return copyTextToClipboard(serializeDownloadDiagnostics(blob, fileName), deps, '다운로드 진단 정보를 복사했습니다.');
    };

    const shareDownloadFile = async (blob, fileName, deps = {}) => {
        if (!navigator.share || typeof File === 'undefined') {
            recordDownloadEvent('share-unsupported', { fileName, hasNavigatorShare: Boolean(navigator.share), hasFile: typeof File !== 'undefined' });
            throw new Error('파일 공유를 지원하지 않는 브라우저입니다.');
        }
        if (!blob) throw new Error('공유할 파일이 없습니다.');
        const safeName = sanitizeDownloadFileName(normalizeDownloadFileNameForBlob(fileName, blob));
        const file = makeShareFile(blob, safeName);
        const payload = { files: [file], title: safeName, text: 'FoxBear Music 마스터링 파일' };
        if (navigator.canShare && !navigator.canShare({ files: payload.files })) {
            recordDownloadEvent('share-cannot-share-file', { fileName: safeName, sizeBytes: blob.size, type: blob.type || '' });
            throw new Error('이 파일 형식은 현재 브라우저 공유창에서 보낼 수 없습니다.');
        }
        recordDownloadEvent('share-start', { fileName: safeName, sizeBytes: blob.size, type: blob.type || '' });
        try {
            await navigator.share(payload);
            recordDownloadEvent('share-success', { fileName: safeName, sizeBytes: blob.size, type: blob.type || '' });
            getToast(deps)('공유/저장 요청을 보냈습니다.');
        } catch (error) {
            recordDownloadEvent('share-failed', { fileName: safeName, message: error?.message || String(error), name: error?.name || '' });
            throw error;
        }
    };

    const saveBlobWithPicker = async (blob, fileName, deps = {}) => {
        if (!supportsFileSystemSave()) throw new Error('직접 저장 기능을 지원하지 않는 브라우저입니다.');
        if (!blob) throw new Error('저장할 파일이 없습니다.');
        const safeName = sanitizeDownloadFileName(normalizeDownloadFileNameForBlob(fileName, blob));
        recordDownloadEvent('file-picker-start', { fileName: safeName, sizeBytes: Number(blob?.size || 0), type: blob?.type || '' });
        const ext = safeName.includes('.') ? safeName.split('.').pop().toLowerCase() : '';
        const safeMime = /^(audio\/(wav|x-wav|mpeg)|application\/(zip|json))$/i.test(String(blob.type || '')) ? blob.type : 'application/octet-stream';
        // showSaveFilePicker must be invoked directly inside the user's click. Do
        // not await Blob I/O before this call or Safari/Chromium may consume the
        // transient user activation and reject with SecurityError.
        const pickerPromise = global.showSaveFilePicker({
            suggestedName: safeName,
            types: [{
                description: 'FoxBear mastered file',
                accept: { [safeMime]: ext ? [`.${ext}`] : ['.wav'] }
            }]
        });
        let writable = null;
        try {
            const picker = await pickerPromise;
            await assertDownloadBlob(blob);
            writable = await picker.createWritable();
            await writable.write(blob);
            await writable.close();
            writable = null;
        } catch (error) {
            try { await writable?.abort?.(); } catch (abortError) {}
            recordDownloadEvent('file-picker-failed', { fileName: safeName, message: error?.message || String(error), name: error?.name || '' });
            throw error;
        }
        recordDownloadEvent('file-picker-success', { fileName: safeName, sizeBytes: Number(blob?.size || 0), type: blob?.type || '' });
        getToast(deps)(`${safeName} 직접 저장을 완료했습니다.`);
    };

    const copyCurrentPageUrl = (deps = {}, explicitUrl = '') => {
        const text = String(explicitUrl || location.href.split('#')[0]);
        recordDownloadEvent('page-url-copy', { url: text });
        copyTextToClipboard(text, deps, '페이지 주소를 복사했습니다. 카카오톡 메뉴에서 외부 브라우저로 열어주세요.')
            .catch(() => getToast(deps)(text));
    };

    const buildKakaoExternalBrowserUrl = pageUrl => `kakaotalk://web/openExternal?url=${encodeURIComponent(pageUrl)}`;

    const buildExternalBrowserIntentUrl = pageUrl => {
        const parsed = new URL(pageUrl);
        const scheme = parsed.protocol.replace(':', '') || 'https';
        const path = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
        const fallback = encodeURIComponent(parsed.href);
        return `intent://${path}#Intent;scheme=${scheme};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${fallback};end`;
    };

    const openCurrentPageInExternalBrowser = (deps = {}) => {
        let pageUrl = new URL(location.href.split('#')[0]);
        pageUrl.searchParams.delete('foxbearInApp');
        pageUrl.searchParams.set('foxbearExternal', '1');
        const handoffUrl = global.FoxBearSessionHandoff?.attachToUrl?.(pageUrl.href, { reason: 'kakao-runtime-recovery' });
        if (handoffUrl) pageUrl = new URL(handoffUrl);
        recordDownloadEvent('external-browser-open', { path: pageUrl.pathname, hasHandoff: pageUrl.searchParams.has('foxbearHandoff'), kakao: isKakaoInAppBrowser() });
        const ua = navigator.userAgent || '';
        const showToast = getToast(deps);
        try {
            if (isKakaoInAppBrowser() && !/Android/i.test(ua)) {
                // Never replace the current Kakao page with a custom scheme. If
                // the scheme is blocked, top-level navigation can become blank.
                global.open(buildKakaoExternalBrowserUrl(pageUrl.href), '_blank');
                setTimeout(() => {
                    if (document.visibilityState === 'visible') copyCurrentPageUrl(deps, pageUrl.href);
                }, 1000);
                return;
            }
            if (/Android/i.test(ua)) {
                global.location.href = buildExternalBrowserIntentUrl(pageUrl.href);
                setTimeout(() => copyCurrentPageUrl(deps, pageUrl.href), 900);
                return;
            }
        } catch (error) {
            console.warn('external browser launch failed:', error);
        }
        copyCurrentPageUrl(deps);
        showToast('오른쪽 위 메뉴에서 Safari/기본 브라우저로 열어주세요.');
    };

    const normalizeDownloadFileNameForBlob = (fileName, blob) => {
        const rawName = String(fileName || 'download').trim() || 'download';
        const mime = String(blob?.type || '').toLowerCase();
        let expectedExt = '';
        if (mime.includes('mpeg') || mime.includes('mp3')) expectedExt = 'mp3';
        else if (mime.includes('wav') || mime.includes('wave')) expectedExt = 'wav';
        else if (mime.includes('zip')) expectedExt = 'zip';
        else if (mime.includes('json')) expectedExt = 'json';
        if (!expectedExt) return rawName;

        const lower = rawName.toLowerCase();
        if (lower.endsWith(`.${expectedExt}`)) return rawName;

        const dot = rawName.lastIndexOf('.');
        if (dot > 0 && rawName.length - dot <= 7) {
            return `${rawName.slice(0, dot)}.${expectedExt}`;
        }
        return `${rawName}.${expectedExt}`;
    };

    const sanitizeDownloadFileName = fileName => {
        const policy = getFileNamePolicy();
        if (policy?.sanitizeFileName) return policy.sanitizeFileName(fileName, { fallback: 'download' });
        const cleaned = String(fileName || 'download').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/g, '');
        return cleaned || 'download';
    };

    const revokeDownloadUrl = (url, deps = {}) => {
        if (!url) return false;
        const resolvedDeps = resolveDownloadUrlDeps(url, deps);
        const timer = downloadUrlTimers.get(url);
        if (timer) {
            clearTimeout(timer);
            downloadUrlTimers.delete(url);
        }
        try { URL.revokeObjectURL(url); }
        catch (error) { global.FoxBearRuntimeFaultCounters?.record?.('download-object-url', 'revoke-failed'); }
        deleteActiveUrl(url, resolvedDeps);
        return true;
    };

    const revokeAllDownloadUrls = (reason = 'dispose') => {
        const urls = new Set([...downloadUrlContexts.keys(), ...downloadUrlTimers.keys()]);
        urls.forEach(url => revokeDownloadUrl(url, downloadUrlContexts.get(url) || {}));
        if (urls.size) recordDownloadEvent('object-url-revoke-all', { reason: String(reason || 'dispose'), count: urls.size });
        return urls.size;
    };

    const getActiveDownloadUrlCount = () => new Set([...downloadUrlContexts.keys(), ...downloadUrlTimers.keys()]).size;

    const isDownloadAssistUrlInUse = url => {
        if (!url || !global.document?.getElementById) return false;
        const panel = global.document.getElementById('downloadAssist');
        return Boolean(panel?.isConnected && panel.dataset?.downloadUrl === url && !panel.dataset?.closing);
    };

    const scheduleDownloadUrlRevoke = (url, deps = {}, delayMs = 10 * 60 * 1000) => {
        if (!url) return 0;
        const previous = downloadUrlTimers.get(url);
        if (previous) clearTimeout(previous);
        const delay = Math.max(1000, Number(delayMs) || 10 * 60 * 1000);
        const timer = setTimeout(() => {
            downloadUrlTimers.delete(url);
            if (isDownloadAssistUrlInUse(url)) {
                recordDownloadEvent('object-url-revoke-deferred-assist', { delayMs: delay });
                scheduleDownloadUrlRevoke(url, deps, Math.min(delay, 2 * 60 * 1000));
                return;
            }
            revokeDownloadUrl(url, deps);
        }, delay);
        downloadUrlTimers.set(url, timer);
        return timer;
    };

    global.addEventListener?.('pagehide', event => {
        if (!event?.persisted) revokeAllDownloadUrls('pagehide');
    });
    global.addEventListener?.('pageshow', event => {
        if (!event?.persisted) return;
        const panel = global.document?.getElementById?.('downloadAssist');
        const url = String(panel?.dataset?.downloadUrl || '');
        if (url && downloadUrlContexts.has(url)) scheduleDownloadUrlRevoke(url, downloadUrlContexts.get(url) || {}, 10 * 60 * 1000);
    });

    const appendGuideSteps = (container, env) => {
        const list = document.createElement('ol');
        list.className = 'download-assist-steps';
        const steps = env.restricted
            ? [
                '공유/저장을 눌러 기기 기본 공유창을 먼저 엽니다.',
                '공유창에서 파일 저장, 카카오톡, 문자, 메일, 드라이브 중 가능한 곳을 선택합니다.',
                '공유창이 안 뜨면 파일 열기를 누른 뒤 브라우저 메뉴의 저장/공유를 사용합니다.',
                '계속 실패하면 주소 복사 후 Chrome/Safari에서 다시 열어 다운로드합니다.'
            ]
            : [
                '다운로드가 자동 시작되지 않으면 파일 열기를 눌러 저장합니다.',
                '지원 브라우저라면 공유/저장으로 기기 공유창을 사용할 수 있습니다.'
            ];
        steps.forEach(step => {
            const item = document.createElement('li');
            item.textContent = step;
            list.appendChild(item);
        });
        container.appendChild(list);
    };

    // Legacy QA wording anchor only; the visible v1.6.78 assist copy is intentionally shorter.
    // 카카오톡 안에서는 자동 다운로드가 조용히 실패할 수 있습니다
    const showDownloadAssist = (url, fileName, mimeType, blob = null, deps = {}) => {
        recordDownloadEvent('assist-open', { fileName, mimeType, sizeBytes: Number(blob?.size || 0), hasUrl: Boolean(url) });
        const previous = document.getElementById('downloadAssist');
        if (previous) {
            const previousUrl = previous.dataset.downloadUrl || '';
            try { previous.__foxbearCleanup?.(); } catch (error) {}
            if (previousUrl && previousUrl !== url) revokeDownloadUrl(previousUrl, deps);
            previous.remove();
        }
        if (url) addActiveUrl(url, deps);

        const env = getDownloadEnvironmentInfo();
        const panel = document.createElement('div');
        panel.id = 'downloadAssist';
        panel.className = `download-assist download-assist-v2 ${env.restricted ? 'restricted' : 'normal'}`;
        panel.dataset.downloadUrl = url || '';
        if (url) scheduleDownloadUrlRevoke(url, deps, 10 * 60 * 1000);
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'false');
        panel.setAttribute('aria-label', '다운로드 저장 도움');

        const closeTop = document.createElement('button');
        closeTop.type = 'button';
        closeTop.className = 'download-assist-close foxbear-modal-close';
        closeTop.setAttribute('aria-label', '저장 도움 닫기');
        closeTop.textContent = '×';

        const title = document.createElement('strong');
        title.textContent = env.restricted ? '카카오 파일 저장' : '파일 저장';

        const message = document.createElement('p');
        message.textContent = env.restricted
            ? '저장/공유가 안 되면 파일 열기 또는 외부 브라우저를 사용하세요.'
            : '자동 저장이 안 되면 파일 열기를 사용하세요.';

        const file = document.createElement('span');
        file.className = 'download-assist-file';
        file.textContent = `${fileName} · ${mimeType || 'audio'} · ${getFileSizeLabel(blob)}`;

        const support = document.createElement('div');
        support.className = 'download-assist-support';
        const supportItems = [
            env.shareFiles ? '공유 가능' : '공유 제한',
            env.anchorDownload ? '기본 다운로드 가능' : '기본 다운로드 제한',
            env.filePicker ? '직접 저장 가능' : '직접 저장 제한',
            env.standalone ? 'PWA 모드' : env.label
        ];
        supportItems.forEach(text => {
            const badge = document.createElement('b');
            badge.textContent = text;
            support.appendChild(badge);
        });

        const recoveryChecklist = getDownloadRecoveryChecklist(blob, fileName, 'assist');
        const checklist = document.createElement('div');
        checklist.className = 'download-assist-checklist';
        const checklistTitle = document.createElement('strong');
        checklistTitle.textContent = recoveryChecklist.headline;
        const checklistSummary = document.createElement('span');
        checklistSummary.textContent = recoveryChecklist.summary;
        const checklistSteps = document.createElement('ol');
        recoveryChecklist.steps.slice(0, env.restricted ? 4 : 3).forEach(step => {
            const item = document.createElement('li');
            const label = document.createElement('b');
            label.textContent = step.label;
            const detail = document.createElement('span');
            detail.textContent = step.detail;
            item.append(label, detail);
            checklistSteps.appendChild(item);
        });
        checklist.append(checklistTitle, checklistSummary, checklistSteps);

        const actions = document.createElement('div');
        actions.className = 'download-assist-actions';

        const returnFocus = document.activeElement && document.activeElement.nodeType === 1 ? document.activeElement : null;
        let panelClosed = false;
        let panelRemoveTimer = 0;
        let panelRevokeTimer = 0;
        let panelShowFrame = 0;
        let activeActionButton = null;
        let panelActionGeneration = 0;
        const setAssistControlsBusy = active => Array.from(actions.querySelectorAll('button, a')).forEach(control => {
            if ('disabled' in control) control.disabled = Boolean(active);
            control.setAttribute('aria-disabled', String(Boolean(active)));
            control.classList.toggle('is-disabled', Boolean(active));
        });
        const handlePanelKeydown = event => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopImmediatePropagation();
            closePanel();
        };
        const handleOutsidePointer = event => {
            if (panelClosed || activeActionButton || panel.contains(event.target)) return;
            closePanel();
        };
        const releasePanelListeners = () => {
            document.removeEventListener('keydown', handlePanelKeydown, true);
            document.removeEventListener('pointerdown', handleOutsidePointer, true);
            if (panelShowFrame && typeof global.cancelAnimationFrame === 'function') global.cancelAnimationFrame(panelShowFrame);
            panelShowFrame = 0;
        };
        const closePanel = () => {
            if (panelClosed) return false;
            panelClosed = true;
            panel.dataset.closing = 'true';
            panelActionGeneration += 1;
            releasePanelListeners();
            panel.classList.remove('show');
            global.FoxBearModalStateMachine?.setExternalLayerOpen?.(panel, false);
            panelRemoveTimer = setTimeout(() => panel.remove(), 140);
            if (url) panelRevokeTimer = setTimeout(() => revokeDownloadUrl(url, deps), 250);
            if (returnFocus && document.body.contains(returnFocus)) {
                try { returnFocus.focus({ preventScroll: true }); } catch (error) {}
            }
            return true;
        };
        panel.__foxbearCleanup = () => {
            panelClosed = true;
            panel.dataset.closing = 'true';
            global.FoxBearModalStateMachine?.setExternalLayerOpen?.(panel, false);
            panelActionGeneration += 1;
            releasePanelListeners();
            if (panelRemoveTimer) clearTimeout(panelRemoveTimer);
            if (panelRevokeTimer) clearTimeout(panelRevokeTimer);
            panelRemoveTimer = 0;
            panelRevokeTimer = 0;
        };
        document.addEventListener('keydown', handlePanelKeydown, true);
        global.setTimeout(() => {
            if (!panelClosed) document.addEventListener('pointerdown', handleOutsidePointer, true);
        }, 0);
        closeTop.addEventListener('click', closePanel);

        const bindAssistAsyncAction = (button, busyText, action, onError) => {
            const idleText = button.textContent;
            button.addEventListener('click', event => {
                if (panelClosed || activeActionButton) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                activeActionButton = button;
                const actionGeneration = ++panelActionGeneration;
                panel.setAttribute('aria-busy', 'true');
                setAssistControlsBusy(true);
                button.setAttribute('aria-busy', 'true');
                button.textContent = busyText;
                let pending;
                try { pending = action(); }
                catch (error) { pending = Promise.reject(error); }
                Promise.resolve(pending)
                    .catch(error => { if (!panelClosed && actionGeneration === panelActionGeneration) onError?.(error); })
                    .finally(() => {
                        if (actionGeneration !== panelActionGeneration) { activeActionButton = null; return; }
                        button.removeAttribute('aria-busy');
                        button.textContent = idleText;
                        if (!panelClosed) {
                            panel.removeAttribute('aria-busy');
                            setAssistControlsBusy(false);
                            setTimeout(() => { if (!panelClosed && document.body.contains(button)) try { button.focus({ preventScroll: true }); } catch (error) {} }, 0);
                        }
                        activeActionButton = null;
                    });
            });
        };

        if (blob && supportsWebShareFiles(blob, fileName)) {
            const share = document.createElement('button');
            share.type = 'button';
            share.className = 'btn-primary';
            share.textContent = '공유/저장';
            bindAssistAsyncAction(share, '공유창 여는 중…', () => shareDownloadFile(blob, fileName, deps), error => {
                console.warn('share download failed:', error);
                getToast(deps)('공유/저장이 취소되었거나 이 브라우저에서 막혔습니다.');
            });
            actions.appendChild(share);
        }

        if (blob && supportsFileSystemSave()) {
            const save = document.createElement('button');
            save.type = 'button';
            save.className = 'btn-primary';
            save.textContent = '직접 저장';
            bindAssistAsyncAction(save, '저장 위치 여는 중…', () => saveBlobWithPicker(blob, fileName, deps), error => {
                console.warn('file picker save failed:', error);
                getToast(deps)('직접 저장이 취소되었거나 이 브라우저에서 막혔습니다.');
            });
            actions.appendChild(save);
        }

        const open = document.createElement('a');
        open.className = 'btn-secondary';
        open.href = url;
        open.download = fileName;
        open.target = '_blank';
        open.rel = 'noopener noreferrer';
        open.textContent = '파일 열기';
        open.addEventListener('click', event => { if (activeActionButton) { event.preventDefault(); event.stopPropagation(); } });
        actions.appendChild(open);

        if (env.restricted) {
            const external = document.createElement('button');
            external.type = 'button';
            external.className = 'btn-secondary';
            external.textContent = '외부 브라우저';
            external.addEventListener('click', () => openCurrentPageInExternalBrowser(deps));
            actions.appendChild(external);
        }

        const copy = document.createElement('button');
        copy.type = 'button';
        copy.className = 'btn-secondary';
        copy.textContent = '주소 복사';
        copy.addEventListener('click', () => copyCurrentPageUrl(deps));
        actions.appendChild(copy);

        const guideCopy = document.createElement('button');
        guideCopy.type = 'button';
        guideCopy.className = 'btn-secondary';
        guideCopy.textContent = '안내 복사';
        guideCopy.addEventListener('click', () => copyDownloadTroubleshootingGuide(fileName, deps));
        actions.appendChild(guideCopy);

        const diagnostics = document.createElement('button');
        diagnostics.type = 'button';
        diagnostics.className = 'btn-secondary';
        diagnostics.textContent = '진단 복사';
        diagnostics.addEventListener('click', () => copyDownloadDiagnostics(blob, fileName, deps));
        actions.appendChild(diagnostics);

        const checklistCopy = document.createElement('button');
        checklistCopy.type = 'button';
        checklistCopy.className = 'btn-secondary';
        checklistCopy.textContent = '체크리스트 복사';
        checklistCopy.addEventListener('click', () => copyDownloadRecoveryChecklist(blob, fileName, 'assist', deps));
        actions.appendChild(checklistCopy);

        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'btn-secondary';
        close.textContent = '닫기';
        close.addEventListener('click', closePanel);
        actions.appendChild(close);

        panel.classList.add('download-assist-simple');
        panel.append(closeTop, title, message, file, actions);
        document.body.appendChild(panel);
        global.FoxBearModalStateMachine?.setExternalLayerOpen?.(panel, true, {
            mode: 'floating',
            panel,
            opener: returnFocus,
            lockScroll: false,
            history: false,
            onRequestClose: () => closePanel()
        });
        panelShowFrame = requestAnimationFrame(() => { panelShowFrame = 0; if (!panelClosed) panel.classList.add('show'); });
    };

    const downloadBlob = async (blob, fileName, deps = {}) => {
        if (!blob) throw new Error('다운로드할 파일이 없습니다.');
        const inspection = getVerifiedBlobInspection(blob) || await assertDownloadBlob(blob);
        const normalizedName = normalizeDownloadFileNameForBlob(fileName || `FoxBear mastered ${getTimestamp(deps)}.wav`, blob);
        const safeName = sanitizeDownloadFileName(normalizedName);
        const url = URL.createObjectURL(blob);
        addActiveUrl(url, deps);
        recordDownloadEvent('object-url-created', { fileName: safeName, sizeBytes: blob.size, type: blob.type || '', kind: inspection.kind, restricted: isRestrictedDownloadBrowser() });

        const restricted = isRestrictedDownloadBrowser();
        const a = document.createElement('a');
        a.href = url;
        a.download = safeName;
        a.rel = 'noopener noreferrer';
        a.className = 'hidden-download-link';
        document.body.appendChild(a);

        if (restricted) {
            recordDownloadEvent('anchor-download-skipped-restricted', { fileName: safeName });
            showDownloadAssist(url, safeName, blob.type || 'audio/*', blob, deps);
            getToast(deps)('카카오/인앱 브라우저는 자동 저장이 막힐 수 있습니다. 공유/저장 또는 파일 열기를 사용해주세요.');
            a.remove();
            scheduleDownloadUrlRevoke(url, deps, 10 * 60 * 1000);
            return { mode: 'assist', fileName: safeName, inspection };
        }

        try {
            recordDownloadEvent('anchor-download-click', { fileName: safeName });
            a.click();
            getToast(deps)(`${safeName} 다운로드를 시작했습니다.`);
        } catch (error) {
            recordDownloadEvent('anchor-download-click-failed', { fileName: safeName, message: error?.message || String(error) });
            console.warn('download click fallback:', error);
            showDownloadAssist(url, safeName, blob.type || 'audio/*', blob, deps);
            getToast(deps)('자동 저장을 시작하지 못했습니다. 저장 도움의 직접 저장 또는 파일 열기를 사용하세요.');
            a.remove();
            scheduleDownloadUrlRevoke(url, deps, 10 * 60 * 1000);
            return { mode: 'assist', fileName: safeName, inspection };
        }

        setTimeout(() => a.remove(), 120 * 1000);
        scheduleDownloadUrlRevoke(url, deps, 120 * 1000);
        return { mode: 'download', fileName: safeName, inspection };
    };

    const getDownloadCapabilitySummary = (blob = null, fileName = '') => {
        const env = getDownloadEnvironmentInfo();
        return {
            ...env,
            actualFileShare: blob ? supportsWebShareFiles(blob, fileName || 'foxbear-mastered.wav') : env.shareFiles,
            fileSize: getFileSizeLabel(blob),
            diagnosticEventCount: downloadDiagnosticEvents.length
        };
    };

    global.FoxBearDownloadService = Object.freeze({
        getDownloadFormatOptions,
        getDownloadDecodeMemoryPolicy,
        getDownloadSizeEstimate,
        inspectDownloadBlob,
        assertDownloadBlob,
        markDownloadBlobVerified,
        getCachedDownloadVariant,
        clearDownloadVariantCache,
        getDownloadVariantCacheDiagnostics,
        getImmediateTrackDownloadBlob,
        prepareTrackDownloadBlob,
        downloadBlob,
        getDownloadEnvironmentInfo,
        getDownloadCapabilitySummary,
        getRecommendedDownloadFlow,
        getDownloadActionReceipt,
        getDownloadRecoveryChecklist,
        getDownloadCompactRecoveryPlan,
        getDownloadDialogCompactHint,
        getDownloadDialogDisplayProfile,
        serializeDownloadRecoveryChecklist,
        copyDownloadRecoveryChecklist,
        getDownloadDiagnostics,
        serializeDownloadDiagnostics,
        copyDownloadDiagnostics,
        getDownloadDiagnosticEvents,
        canShareTinyAudioProbe,
        supportsWebShareDownloadFiles,
        supportsWebShareFiles,
        shareDownloadFile,
        supportsFileSystemSave,
        saveBlobWithPicker,
        copyCurrentPageUrl,
        openCurrentPageInExternalBrowser,
        supportsAnchorDownload,
        isRestrictedDownloadBrowser,
        isKakaoInAppBrowser,
        buildKakaoExternalBrowserUrl,
        buildExternalBrowserIntentUrl,
        getDownloadTroubleshootingText,
        copyDownloadTroubleshootingGuide,
        normalizeDownloadFileNameForBlob,
        sanitizeDownloadFileName,
        revokeDownloadUrl,
        revokeAllDownloadUrls,
        getActiveDownloadUrlCount,
        showDownloadAssist
    });
})(window);
