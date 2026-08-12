// FoxBear filename policy service v1.6.91 - configurable human-readable mastered filenames
'use strict';

(function attachFoxBearFileNamePolicyService(global) {
    const VERSION = 'v1.6.91-runtime-health-hidden-geometry-contract-recovery';
    const DEFAULT_MAX_FILENAME_BYTES = 240;
    const FILE_NAME_PREFERENCES_KEY = 'foxbear:download-filename-preferences:v1';
    const DEFAULT_FILE_NAME_PREFERENCES = Object.freeze({
        includeMastered: true,
        includeLoudness: true,
        includeStyle: true,
        includeFormat: true,
        includePlatform: true
    });
    const FILE_NAME_PREFERENCE_KEYS = Object.freeze(Object.keys(DEFAULT_FILE_NAME_PREFERENCES));
    let runtimeFileNamePreferences = null;
    const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
    const KNOWN_AUDIO_EXTENSIONS = new Set([
        'aac', 'aif', 'aiff', 'alac', 'caf', 'flac', 'm4a', 'm4b', 'mp3', 'mp4',
        'oga', 'ogg', 'opus', 'wav', 'wave', 'webm', 'wma'
    ]);
    const GENERATED_SUFFIX = /\s+mastered\s+(?:\d{1,3}(?:\.\d+)?lufs|target)\s+.+\s+(?:wav(?:16|24|32float)?|mp3(?:128|192|256|320)?)(?:\s+[a-z0-9][a-z0-9-]*)?$/i;
    const GENERATED_PARTIAL_SUFFIX = /\s+(?:mastered(?:\s+(?:\d{1,3}(?:\.\d+)?lufs|target))?(?:\s+(?:streaming|club|vocal|podcast|warm analog|clean loud|master))?(?:\s+(?:wav(?:16|24|32float)?|mp3(?:128|192|256|320)?))?(?:\s+(?:youtube|apple|social|loud demo|archive))?|(?:\d{1,3}(?:\.\d+)?lufs|target)(?:\s+(?:streaming|club|vocal|podcast|warm analog|clean loud|master))?(?:\s+(?:wav(?:16|24|32float)?|mp3(?:128|192|256|320)?))?(?:\s+(?:youtube|apple|social|loud demo|archive))?|(?:streaming|club|vocal|podcast|warm analog|clean loud|master)\s+(?:wav(?:16|24|32float)?|mp3(?:128|192|256|320)?)(?:\s+(?:youtube|apple|social|loud demo|archive))?|(?:wav(?:16|24|32float)?|mp3(?:128|192|256|320)?)(?:\s+(?:youtube|apple|social|loud demo|archive))?)$/i;

    function normalizeUnicode(value) {
        let text = String(value == null ? '' : value);
        try { text = text.normalize('NFC'); } catch (error) {}
        return text;
    }

    function normalizeFileNamePreferences(value) {
        const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        const normalized = {};
        FILE_NAME_PREFERENCE_KEYS.forEach(key => {
            const candidate = source[key];
            normalized[key] = candidate === true || candidate === false
                ? candidate
                : DEFAULT_FILE_NAME_PREFERENCES[key];
        });
        return normalized;
    }

    function loadFileNamePreferences(storage = global.localStorage) {
        try {
            const raw = storage?.getItem?.(FILE_NAME_PREFERENCES_KEY);
            if (raw) {
                runtimeFileNamePreferences = normalizeFileNamePreferences(JSON.parse(raw));
                return { ...runtimeFileNamePreferences };
            }
        } catch (error) {}
        return normalizeFileNamePreferences(runtimeFileNamePreferences);
    }

    function saveFileNamePreferences(value, storage = global.localStorage) {
        const normalized = normalizeFileNamePreferences(value);
        runtimeFileNamePreferences = { ...normalized };
        try { storage?.setItem?.(FILE_NAME_PREFERENCES_KEY, JSON.stringify(normalized)); } catch (error) {}
        return { ...normalized };
    }

    function resetFileNamePreferences(storage = global.localStorage) {
        runtimeFileNamePreferences = null;
        try { storage?.removeItem?.(FILE_NAME_PREFERENCES_KEY); } catch (error) {}
        return normalizeFileNamePreferences(null);
    }

    function utf8CodePointBytes(character) {
        const codePoint = character.codePointAt(0);
        if (codePoint <= 0x7f) return 1;
        if (codePoint <= 0x7ff) return 2;
        if (codePoint <= 0xffff) return 3;
        return 4;
    }

    function utf8Length(value) {
        let bytes = 0;
        for (const character of Array.from(String(value || ''))) bytes += utf8CodePointBytes(character);
        return bytes;
    }

    function getGraphemeSegments(value) {
        const text = String(value || '');
        try {
            if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
                const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
                return Array.from(segmenter.segment(text), item => item.segment);
            }
        } catch (error) {}
        return Array.from(text);
    }

    function truncateUtf8(value, maxBytes) {
        const limit = Math.max(1, Number(maxBytes) || 1);
        let bytes = 0;
        let output = '';
        const segments = getGraphemeSegments(value);
        for (const segment of segments) {
            const nextBytes = utf8Length(segment);
            if (bytes + nextBytes > limit) {
                if (!output) {
                    for (const character of Array.from(segment)) {
                        const characterBytes = utf8CodePointBytes(character);
                        if (bytes + characterBytes > limit) break;
                        output += character;
                        bytes += characterBytes;
                    }
                }
                break;
            }
            output += segment;
            bytes += nextBytes;
        }
        return output
            .replace(/[\u200d\u0300-\u036f\ufe00-\ufe0f]+$/g, '')
            .replace(/[. ]+$/g, '')
            .trim();
    }

    function cleanUnsafeCharacters(value, replacement = ' ') {
        const safeReplacement = replacement == null ? ' ' : String(replacement);
        return normalizeUnicode(value)
            .replace(/[\u0000-\u001f\u007f-\u009f]/g, safeReplacement)
            .replace(/[\u200b\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '')
            .replace(/[\\/:*?"<>|]+/g, safeReplacement)
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/^[. ]+|[. ]+$/g, '');
    }

    function splitExtension(fileName) {
        const value = normalizeUnicode(fileName).trim();
        const dot = value.lastIndexOf('.');
        if (dot <= 0 || dot >= value.length - 1) return { stem: value, extension: '' };
        const extension = value.slice(dot + 1);
        if (!/^[a-z0-9]{1,16}$/i.test(extension)) return { stem: value, extension: '' };
        return { stem: value.slice(0, dot), extension };
    }

    function stripAudioExtension(fileName) {
        const parts = splitExtension(fileName);
        if (!parts.extension || !KNOWN_AUDIO_EXTENSIONS.has(parts.extension.toLowerCase())) return normalizeUnicode(fileName);
        return parts.stem;
    }

    function stripGeneratedMasteringSuffix(value, options = {}) {
        const normalized = normalizeUnicode(value).replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
        const withoutFullSuffix = normalized.replace(GENERATED_SUFFIX, '').trim();
        if (withoutFullSuffix !== normalized) return withoutFullSuffix || normalized;
        if (options.allowLegacyPartialSuffix !== false) {
            return normalized.replace(GENERATED_PARTIAL_SUFFIX, '').trim() || normalized;
        }
        return normalized;
    }

    function sanitizeTitle(fileName, options = {}) {
        const fallback = cleanUnsafeCharacters(options.fallback || 'track') || 'track';
        let title = stripAudioExtension(fileName);
        if (options.humanizeUnderscores !== false) title = title.replace(/_+/g, ' ');
        if (options.stripGeneratedSuffix !== false) title = stripGeneratedMasteringSuffix(title, { allowLegacyPartialSuffix: options.allowLegacyPartialSuffix !== false });
        title = cleanUnsafeCharacters(title, ' ');
        if (!title) title = fallback;
        return truncateUtf8(title, Math.max(24, Number(options.maxBytes || 180))) || fallback;
    }

    function sanitizeExtension(extension, fallback = '') {
        const value = String(extension || '').replace(/^\.+/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return value.slice(0, 16) || String(fallback || '').replace(/^\.+/, '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16);
    }

    function sanitizeFileName(fileName, options = {}) {
        const fallback = cleanUnsafeCharacters(options.fallback || 'download') || 'download';
        const maxBytes = Math.max(64, Number(options.maxBytes || DEFAULT_MAX_FILENAME_BYTES));
        let value = cleanUnsafeCharacters(fileName, ' ');
        if (!value) value = fallback;

        let { stem, extension } = splitExtension(value);
        stem = cleanUnsafeCharacters(stem, ' ') || fallback;
        extension = sanitizeExtension(extension);
        if (WINDOWS_RESERVED_NAME.test(stem)) stem = `_${stem}`;

        const extensionPart = extension ? `.${extension}` : '';
        const stemBudget = Math.max(1, maxBytes - utf8Length(extensionPart));
        stem = truncateUtf8(stem, stemBudget) || fallback;
        value = `${stem}${extensionPart}`;
        return value || fallback;
    }

    function sanitizeMetadataToken(value, options = {}) {
        let token = cleanUnsafeCharacters(String(value || '').replace(/_+/g, ' '), ' ');
        if (options.compact) token = token.replace(/[^a-z0-9]+/gi, '');
        if (options.lowercase !== false) token = token.toLowerCase();
        return token.trim();
    }

    function buildMasteredFileName(options = {}) {
        const preferences = normalizeFileNamePreferences(
            options.preferences && typeof options.preferences === 'object'
                ? options.preferences
                : loadFileNamePreferences(options.storage)
        );
        const extension = sanitizeExtension(options.extension, /mp3/i.test(options.format || '') ? 'mp3' : 'wav') || 'wav';
        const title = sanitizeTitle(options.sourceName || options.title || 'track', {
            fallback: options.fallbackTitle || 'track',
            humanizeUnderscores: true,
            stripGeneratedSuffix: options.preserveExactTitle === true ? false : options.stripGeneratedSuffix !== false,
            allowLegacyPartialSuffix: options.allowLegacyPartialSuffix !== false,
            maxBytes: DEFAULT_MAX_FILENAME_BYTES
        });
        const rawLufs = options.lufsLabel || (Number.isFinite(Number(options.targetLufs))
            ? `${Math.abs(Math.round(Number(options.targetLufs)))}LUFS`
            : 'target');
        const lufs = cleanUnsafeCharacters(rawLufs, ' ').replace(/\s+/g, '') || 'target';
        const style = sanitizeMetadataToken(options.style || 'master') || 'master';
        const format = sanitizeMetadataToken(options.format || `wav${extension === 'wav' ? '24' : ''}`, { compact: true }) || extension;
        const platform = sanitizeMetadataToken(options.platform || '');
        const suffixTokens = [];
        if (preferences.includeMastered) suffixTokens.push('mastered');
        if (preferences.includeLoudness) suffixTokens.push(lufs);
        if (preferences.includeStyle) suffixTokens.push(style);
        if (preferences.includeFormat) suffixTokens.push(format);
        if (preferences.includePlatform && platform && platform !== 'custom') suffixTokens.push(platform);
        const suffix = suffixTokens.join(' ');
        const extensionPart = `.${extension}`;
        const separator = suffix ? ' ' : '';
        const titleBudget = Math.max(24, DEFAULT_MAX_FILENAME_BYTES - utf8Length(suffix) - utf8Length(extensionPart) - utf8Length(separator));
        const safeTitle = truncateUtf8(title, titleBudget) || 'track';
        return sanitizeFileName(`${safeTitle}${separator}${suffix}${extensionPart}`, {
            fallback: `track${separator}${suffix}${extensionPart}`,
            maxBytes: DEFAULT_MAX_FILENAME_BYTES
        });
    }

    function makeUniqueName(fileName, usedNames, options = {}) {
        const names = usedNames && typeof usedNames.has === 'function' && typeof usedNames.add === 'function'
            ? usedNames
            : new Set();
        const safeName = sanitizeFileName(fileName, options);
        const { stem, extension } = splitExtension(safeName);
        const extensionPart = extension ? `.${extension}` : '';
        const maxBytes = Math.max(64, Number(options.maxBytes || DEFAULT_MAX_FILENAME_BYTES));
        let candidate = safeName;
        let index = 2;
        let key = candidate.toLocaleLowerCase('en-US');
        while (names.has(key)) {
            const duplicateSuffix = ` (${index})`;
            const stemBudget = Math.max(1, maxBytes - utf8Length(extensionPart) - utf8Length(duplicateSuffix));
            const nextStem = truncateUtf8(stem, stemBudget) || 'track';
            candidate = `${nextStem}${duplicateSuffix}${extensionPart}`;
            key = candidate.toLocaleLowerCase('en-US');
            index += 1;
        }
        names.add(key);
        return candidate;
    }

    global.FoxBearFileNamePolicyService = Object.freeze({
        version: VERSION,
        maxFileNameBytes: DEFAULT_MAX_FILENAME_BYTES,
        preferencesKey: FILE_NAME_PREFERENCES_KEY,
        defaultPreferences: DEFAULT_FILE_NAME_PREFERENCES,
        normalizeFileNamePreferences,
        loadFileNamePreferences,
        saveFileNamePreferences,
        resetFileNamePreferences,
        normalizeUnicode,
        utf8Length,
        getGraphemeSegments,
        truncateUtf8,
        splitExtension,
        stripAudioExtension,
        stripGeneratedMasteringSuffix,
        sanitizeTitle,
        sanitizeExtension,
        sanitizeFileName,
        buildMasteredFileName,
        makeUniqueName
    });
})(typeof window !== 'undefined' ? window : globalThis);
