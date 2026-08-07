// FoxBear filename workflow service v1.6.74 - provenance-safe naming and export review UI
'use strict';

(function attachFoxBearFileNameWorkflowService(global) {
    const VERSION = 'v1.6.74-incident-admission-spark-retention-download-memory';
    const PREFERENCE_KEYS = Object.freeze(['includeMastered', 'includeLoudness', 'includeStyle', 'includeFormat', 'includePlatform']);
    const EXPORT_REVIEW_LIMIT = 12;

    function buildMasteredFileName(track, encoded = {}, deps = {}) {
        const captured = track?.outputNameMeta || {};
        const state = deps.state || {};
        const requestedFormat = encoded.format || track?.outFormat || captured.format || state.outputFormat || 'wav24';
        const requestedExtension = encoded.extension || captured.extension || (/mp3/i.test(requestedFormat) ? 'mp3' : 'wav');
        const sourceName = captured.sourceName || track?.sourceFileName || track?.name || 'track';
        const targetLufs = Number(captured.targetLufs ?? track?.finalizeInfo?.targetLufs ?? track?.masterReport?.target?.lufs ?? state.targetLufs);
        const platform = captured.platform != null
            ? captured.platform
            : (typeof deps.getPlatformFileSuffix === 'function' ? deps.getPlatformFileSuffix() : '');
        return deps.fileNamePolicy?.buildMasteredFileName?.({
            sourceName,
            targetLufs,
            style: captured.style || track?.masterReport?.target?.masterStyle || state.masterStyle || 'master',
            format: requestedFormat,
            platform,
            extension: requestedExtension,
            preferences: encoded.preferences
        }) || track?.outName || track?.name || `FoxBear mastered.${requestedExtension}`;
    }

    function refreshCompletedOutputNames(tracks, options = {}) {
        const list = Array.isArray(tracks) ? tracks : [];
        let updated = 0;
        list.forEach(track => {
            if (!track?.outBlob || typeof options.buildFileName !== 'function') return;
            const format = track.outFormat || track.outputNameMeta?.format || 'wav24';
            const extension = track.outputNameMeta?.extension || (/mp3/i.test(format) ? 'mp3' : 'wav');
            const nextName = options.buildFileName(track, { format, extension });
            if (nextName && track.outName !== nextName) {
                track.outName = nextName;
                updated += 1;
            }
        });
        if (updated) options.onUpdated?.(updated);
        return updated;
    }

    function hashText(value) {
        let hash = 0x811c9dc5;
        const text = String(value || '');
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 0x01000193);
        }
        return (hash >>> 0).toString(36);
    }

    function buildSummaryKey(completed, totalCount, preferences) {
        const preferenceKey = PREFERENCE_KEYS.map(key => preferences?.[key] === false ? '0' : '1').join('');
        let hash = 0x811c9dc5;
        const feed = value => {
            const text = `${String(value == null ? '' : value)}\u001f`;
            for (let index = 0; index < text.length; index += 1) {
                hash ^= text.charCodeAt(index);
                hash = Math.imul(hash, 0x01000193);
            }
        };
        feed(totalCount);
        feed(preferenceKey);
        completed.forEach(track => {
            feed(track?.id);
            feed(track?.sourceFileName || track?.name);
            feed(track?.outName);
            feed(track?.outFormat);
            feed(track?.outBlob?.size || 0);
            feed(track?.outputNameMeta?.sourceName);
            feed(track?.outputNameMeta?.targetLufs);
            feed(track?.outputNameMeta?.style);
            feed(track?.outputNameMeta?.platform);
            feed(track?.outputNameMeta?.format);
            feed(track?.outputNameMeta?.extension);
        });
        return `${completed.length}:${totalCount}:${preferenceKey}:${(hash >>> 0).toString(36)}`;
    }

    async function copyText(text, documentRef = global.document) {
        const value = String(text || '');
        if (!value) return false;
        try {
            if (global.navigator?.clipboard?.writeText) {
                await global.navigator.clipboard.writeText(value);
                return true;
            }
        } catch (error) {}
        if (!documentRef?.body || typeof documentRef.createElement !== 'function') return false;
        const field = documentRef.createElement('textarea');
        field.value = value;
        field.setAttribute('readonly', '');
        field.setAttribute('aria-hidden', 'true');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        field.style.pointerEvents = 'none';
        documentRef.body.appendChild(field);
        field.select();
        field.setSelectionRange(0, field.value.length);
        let copied = false;
        try { copied = documentRef.execCommand?.('copy') === true; } catch (error) {}
        field.remove();
        return copied;
    }

    function createReviewList(documentRef, files, limit = EXPORT_REVIEW_LIMIT) {
        const list = documentRef.createElement('ol');
        list.className = 'export-name-review-list';
        const visible = files.slice(0, Math.max(1, limit));
        visible.forEach(file => {
            const item = documentRef.createElement('li');
            const code = documentRef.createElement('code');
            code.textContent = file.fileName;
            code.title = file.fileName;
            code.setAttribute('dir', 'auto');
            item.appendChild(code);
            list.appendChild(item);
        });
        if (files.length > visible.length) {
            const remaining = documentRef.createElement('li');
            remaining.className = 'export-name-review-more';
            remaining.textContent = `외 ${files.length - visible.length}곡 · 전체 목록은 복사 버튼으로 확인할 수 있습니다.`;
            list.appendChild(remaining);
        }
        return list;
    }

    function renderExportFileNameSummary(options = {}) {
        const node = options.node;
        if (!node) return null;
        const tracks = Array.isArray(options.tracks) ? options.tracks : [];
        const completed = tracks.filter(track => track?.outBlob);
        if (!completed.length) {
            node.hidden = true;
            node.replaceChildren();
            node.dataset.summaryKey = '';
            return null;
        }
        let preferences = {};
        try { preferences = options.fileNamePolicy?.loadFileNamePreferences?.() || {}; } catch (error) {}
        const summaryKey = buildSummaryKey(completed, tracks.length, preferences);
        if (node.dataset.summaryKey === summaryKey) return null;
        const fileNameForTrack = track => options.buildFileName?.(track, {
            format: track.outFormat || 'wav24',
            extension: /mp3/i.test(track.outFormat || '') ? 'mp3' : 'wav'
        }) || track.outName;
        const plan = options.exportGuardService?.prepareZipExportPlan?.(completed, {
            memorySnapshot: null,
            fileNameForTrack
        }) || null;
        const files = Array.isArray(plan?.files) ? plan.files : completed.map(track => ({
            id: track.id || '',
            fileName: fileNameForTrack(track)
        }));
        const documentRef = node.ownerDocument || global.document;
        const heading = documentRef.createElement('strong');
        heading.textContent = '내보내기 파일명';
        const status = documentRef.createElement('span');
        const collisionCount = Number(plan?.collisionCount || 0);
        const adjustedCount = Number(plan?.adjustedNameCount || 0);
        const adjustmentText = adjustedCount > collisionCount ? ` · 문자/길이 정리 ${adjustedCount - collisionCount}개` : '';
        status.textContent = collisionCount
            ? `${completed.length}곡 · 중복 ${collisionCount}개는 (2), (3)으로 구분${adjustmentText}`
            : `${completed.length}곡 · 중복 없음${adjustmentText}`;
        const example = documentRef.createElement('code');
        example.className = 'export-name-example';
        example.textContent = files[0]?.fileName || fileNameForTrack(completed[0]);
        example.title = example.textContent;
        example.setAttribute('dir', 'auto');
        const hint = documentRef.createElement('small');
        hint.textContent = '단일 저장·곡별 저장·ZIP 내부 이름은 같은 정책을 사용합니다.';

        const actions = documentRef.createElement('div');
        actions.className = 'export-name-summary-actions';
        const details = documentRef.createElement('details');
        details.className = 'export-name-review';
        const detailsSummary = documentRef.createElement('summary');
        detailsSummary.textContent = files.length > EXPORT_REVIEW_LIMIT
            ? `파일명 ${EXPORT_REVIEW_LIMIT}개 미리보기`
            : `파일명 ${files.length}개 검토`;
        const issueSummary = documentRef.createElement('p');
        issueSummary.className = 'export-name-review-status';
        if (collisionCount || adjustedCount) {
            issueSummary.textContent = `자동 조정 ${adjustedCount}개 · 중복 구분 ${collisionCount}개. 원본 오디오 내용에는 영향이 없습니다.`;
        } else {
            issueSummary.textContent = '금지 문자, 길이 제한, 중복 이름 조정이 필요하지 않습니다.';
        }
        details.append(detailsSummary, issueSummary, createReviewList(documentRef, files));

        const copyButton = documentRef.createElement('button');
        copyButton.type = 'button';
        copyButton.className = 'export-name-copy';
        copyButton.textContent = '전체 파일명 복사';
        const copyStatus = documentRef.createElement('span');
        copyStatus.className = 'export-name-copy-status';
        copyStatus.setAttribute('role', 'status');
        copyStatus.setAttribute('aria-live', 'polite');
        copyButton.addEventListener('click', async () => {
            copyButton.disabled = true;
            const copied = await copyText(files.map(file => file.fileName).join('\n'), documentRef);
            copyStatus.textContent = copied ? `${files.length}개 파일명을 복사했습니다.` : '복사하지 못했습니다. 브라우저 권한을 확인하세요.';
            copyButton.textContent = copied ? '복사 완료' : '다시 복사';
            global.setTimeout?.(() => {
                if (!copyButton.isConnected) return;
                copyButton.disabled = false;
                copyButton.textContent = '전체 파일명 복사';
            }, 1600);
        });
        actions.append(details, copyButton, copyStatus);
        node.replaceChildren(heading, status, example, hint, actions);
        node.dataset.summaryKey = summaryKey;
        node.hidden = false;
        return {
            completedCount: completed.length,
            collisionCount,
            adjustedCount,
            example: example.textContent,
            summaryKey,
            fileNameHash: hashText(files.map(file => file.fileName).join('\n'))
        };
    }

    global.FoxBearFileNameWorkflowService = Object.freeze({
        VERSION,
        buildMasteredFileName,
        refreshCompletedOutputNames,
        buildSummaryKey,
        copyText,
        renderExportFileNameSummary
    });
})(typeof window !== 'undefined' ? window : globalThis);
