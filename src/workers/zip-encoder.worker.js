// FoxBear ZIP encoder worker v1.6.99 - low-copy cancellable STORE packaging off the main thread
'use strict';

importScripts('../download/file-name-policy-service.js?v=1.6.99-header-role-focus-integrity');
importScripts('../../vendor/jszip/jszip.min.js?v=1.6.99-header-role-focus-integrity&lib=3.10.1');

const MAX_FILES = 200;
const MAX_TOTAL_BYTES = 1500 * 1024 * 1024;

self.onmessage = async event => {
    const raw = event.data || {};
    const jobId = String(raw.__foxbearJobId || '');
    try {
        if (typeof self.JSZip !== 'function') throw new Error('ZIP 라이브러리를 불러오지 못했습니다.');
        const files = await normalizeFiles(raw.files, jobId);
        postProgress(jobId, 12, 'ZIP 준비', `${files.length}개 파일을 확인했습니다.`);
        const zip = new self.JSZip();
        files.forEach(file => zip.file(file.fileName, file.blob, { binary: true, compression: 'STORE' }));
        const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE', streamFiles: true, platform: 'DOS' }, meta => {
            const zipPercent = 12 + Math.max(0, Math.min(100, Number(meta?.percent) || 0)) * 0.87;
            postProgress(jobId, Math.max(12, Math.min(99, zipPercent)), 'ZIP 생성', String(meta?.currentFile || '파일 포장 중'));
        });
        if (!(blob instanceof Blob) || blob.size < 128) throw new Error('생성된 ZIP 파일이 비정상적으로 작습니다.');
        self.postMessage({ ok: true, blob, size: blob.size, fileCount: files.length, __foxbearJobId: jobId });
    } catch (error) {
        self.postMessage({ ok: false, error: error?.message || String(error), __foxbearJobId: jobId });
    }
};

async function normalizeFiles(input, jobId) {
    if (!Array.isArray(input) || input.length < 1) throw new Error('ZIP에 넣을 파일이 없습니다.');
    if (input.length > MAX_FILES) throw new Error(`ZIP 파일 수가 안전 한도(${MAX_FILES}개)를 넘었습니다.`);
    const usedNames = new Set();
    const files = [];
    let totalBytes = 0;
    for (let index = 0; index < input.length; index += 1) {
        const entry = input[index];
        const blob = entry?.blob;
        if (!(blob instanceof Blob) || !Number.isFinite(blob.size) || blob.size <= 0) throw new Error(`${index + 1}번째 ZIP 파일 데이터가 올바르지 않습니다.`);
        totalBytes += blob.size;
        if (!Number.isSafeInteger(totalBytes) || totalBytes > MAX_TOTAL_BYTES) throw new Error('ZIP 입력 파일 합계가 브라우저 안전 한도를 넘었습니다.');
        // Keep the Blob itself instead of eagerly copying every file into an
        // ArrayBuffer. JSZip can consume Blob inputs directly, so this avoids a
        // second full-size copy of every mastered file before generation starts.
        const probe = await blob.slice(0, Math.min(16, blob.size)).arrayBuffer();
        if (!probe || probe.byteLength <= 0) throw new Error(`${index + 1}번째 ZIP 파일을 읽지 못했습니다.`);
        const blobSupported = self.JSZip?.support?.blob !== false && typeof self.FileReaderSync === 'function';
        const payload = blobSupported ? blob : new Uint8Array(await blob.arrayBuffer());
        files.push(Object.freeze({ fileName: makeUniqueName(entry?.fileName || `mastered ${index + 1}.wav`, usedNames), blob: payload }));
        postProgress(jobId, 1 + ((index + 1) / input.length) * 10, blobSupported ? 'ZIP 입력 확인' : 'ZIP 호환 입력 변환', `${index + 1} / ${input.length}`);
    }
    return files;
}

function makeUniqueName(name, usedNames) {
    const policy = self.FoxBearFileNamePolicyService;
    if (!policy?.makeUniqueName) throw new Error('파일명 정책 모듈을 불러오지 못했습니다.');
    return policy.makeUniqueName(name, usedNames, { fallback: 'mastered.wav' });
}

function postProgress(jobId, percent, stage, detail = '') {
    try {
        self.postMessage({
            type: 'progress',
            __foxbearProgress: true,
            __foxbearJobId: String(jobId || ''),
            percent: Math.max(0, Math.min(100, Number(percent) || 0)),
            stage: String(stage || 'ZIP 생성'),
            detail: String(detail || '')
        });
    } catch (error) {}
}
