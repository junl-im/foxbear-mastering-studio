// FoxBear AI Mastering Studio Pro v1.5.30 - runtime constants
'use strict';

(function attachFoxBearRuntimeConfig(global) {
    const BUILD_INFO = global.FoxBearBuildInfo || {};
    const ASSET_VERSION = '1.5.30-inapp-playback-recovery';
    if (BUILD_INFO.assetVersion && BUILD_INFO.assetVersion !== ASSET_VERSION) console.warn('[FoxBear] asset metadata mismatch', { runtime: ASSET_VERSION, build: BUILD_INFO.assetVersion });
    const assetUrl = path => `${path}?v=${ASSET_VERSION}`;
    const WAV_ENCODER_WORKER_URL = assetUrl('src/workers/wav-encoder.worker.js');
    const MP3_ENCODER_WORKER_URL = assetUrl('src/workers/mp3-encoder.worker.js');
    const ANALYSIS_WORKER_URL = assetUrl('src/workers/analysis.worker.js');
    const MASTER_FINALIZER_WORKER_URL = assetUrl('src/workers/master-finalizer.worker.js');
    const PITCH_WSOLA_WORKER_URL = assetUrl('src/workers/pitch-wsola.worker.js');
    const OPTIONAL_WASM_PITCH_ADAPTER_URL = './engines/pitch-engine-adapter.js';
    const CORE_AUDIO_EXTENSIONS = ['.wav', '.wave', '.mp3', '.mpeg', '.mpga', '.flac', '.ogg', '.oga', '.opus', '.m4a', '.aac', '.webm', '.weba', '.aif', '.aiff', '.aifc', '.caf'];
    const CONTAINER_AUDIO_EXTENSIONS = ['.mp4', '.m4v', '.mov', '.3gp', '.3gpp', '.3g2'];
    const EXPERIMENTAL_AUDIO_EXTENSIONS = ['.amr', '.wma'];
    const AUDIO_EXTENSIONS = [...CORE_AUDIO_EXTENSIONS, ...CONTAINER_AUDIO_EXTENSIONS, ...EXPERIMENTAL_AUDIO_EXTENSIONS];

    global.FoxBearRuntimeConfig = Object.freeze({
        APP_VERSION: BUILD_INFO.appVersion || 'Pro v1.5.30',
        ASSET_VERSION,
        WAV_ENCODER_WORKER_URL,
        MP3_ENCODER_WORKER_URL,
        ANALYSIS_WORKER_URL,
        MASTER_FINALIZER_WORKER_URL,
        PITCH_WSOLA_WORKER_URL,
        OPTIONAL_WASM_PITCH_ADAPTER_URL,
        TRUSTED_SCRIPT_PATHS: Object.freeze([
            WAV_ENCODER_WORKER_URL,
            MP3_ENCODER_WORKER_URL,
            ANALYSIS_WORKER_URL,
            MASTER_FINALIZER_WORKER_URL,
            PITCH_WSOLA_WORKER_URL
        ]),
        MAX_FILES: 35,
        MAX_FILE_SIZE: 220 * 1024 * 1024,
        IMPORT_ANALYSIS_CONCURRENCY: 1,
        LARGE_IMPORT_BATCH_THRESHOLD: 12,
        IMPORT_QUEUE_YIELD_MS: 90,
        MASTERING_PROGRESS_RENDER_DELAY_MS: 110,
        CORE_AUDIO_EXTENSIONS: Object.freeze(CORE_AUDIO_EXTENSIONS),
        CONTAINER_AUDIO_EXTENSIONS: Object.freeze(CONTAINER_AUDIO_EXTENSIONS),
        EXPERIMENTAL_AUDIO_EXTENSIONS: Object.freeze(EXPERIMENTAL_AUDIO_EXTENSIONS),
        AUDIO_EXTENSIONS: Object.freeze(AUDIO_EXTENSIONS),
        VIDEO_AUDIO_EXTENSIONS: Object.freeze(CONTAINER_AUDIO_EXTENSIONS),
        AUDIO_IMPORT_ACCEPT: Object.freeze([...AUDIO_EXTENSIONS, 'audio/*', 'video/mp4', 'video/quicktime', 'video/3gpp', 'application/ogg']).join(','),
        DEFAULT_TRANSFORM: Object.freeze({ pitchSemitones: 0, speedRatio: 1, snapSemitone: true, beatPreset: 'original' }),
        DEFAULT_INSTRUMENT_LAYER: Object.freeze({ mode: 'off', amount: 'light' }),
        ACTION_SELECT_IDS: Object.freeze(['genreSelect', 'masterGoalSelect', 'masterStyleSelect', 'masterStrengthSelect', 'platformPresetSelect', 'performanceModeSelect', 'outputFormatSelect', 'targetLufsSelect', 'ceilingSelect', 'qualityModeSelect', 'pitchEngineSelect', 'beatChangeSelect', 'instrumentLayerSelect', 'instrumentAmountSelect']),
        MASTER_FLOW_STEPS: Object.freeze([
            Object.freeze({ at: 5, label: '준비', hint: '디코딩' }),
            Object.freeze({ at: 15, label: '분석', hint: '추천/검사' }),
            Object.freeze({ at: 25, label: '정리', hint: '무음/DC' }),
            Object.freeze({ at: 40, label: '변환', hint: '피치/BPM' }),
            Object.freeze({ at: 55, label: '리듬', hint: '박자/악기' }),
            Object.freeze({ at: 65, label: '마스터', hint: '톤/공간' }),
            Object.freeze({ at: 85, label: '피크', hint: 'LUFS/TP' }),
            Object.freeze({ at: 95, label: '인코딩', hint: '파일 준비' }),
            Object.freeze({ at: 100, label: '완료', hint: '다운로드' })
        ]),
        QUALITY_GATE_RULES: Object.freeze({
            lufsToleranceDb: 1.6,
            peakMarginDb: 0.15,
            warnGainDb: 8,
            maxDcOffset: 0.006,
            minUsefulDurationSec: 1.0
        }),
        WAVEFORM_OVERVIEW_BINS: 96,
        DOCK_WAVEFORM_BINS: 72,
        MASTER_PREVIEW_DURATION_SEC: 15,
        MOBILE_NATIVE_IDB: 'foxbear-mobile-native-share-v1',
        MOBILE_NATIVE_SHARE_STORE: 'sharedFiles',
        MOBILE_NATIVE_SHARE_QUERY: 'foxbearSharedAudio',
        MOBILE_NATIVE_HAPTIC_PATTERNS: Object.freeze({
            tap: 8,
            switch: 14,
            success: Object.freeze([30, 40, 30]),
            error: Object.freeze([80, 40, 80]),
            download: Object.freeze([20, 20, 40]),
            complete: Object.freeze([35, 45, 35])
        }),
        MAX_SNAPSHOTS_PER_TRACK: 12,
        MAX_REDO_SNAPSHOTS_PER_TRACK: 8,
        AUTO_SNAPSHOT_COOLDOWN_MS: 1200,
        REALTIME_PREVIEW_RENDER_DELAY: 160,
        ADMIN_STATS_VISITOR_KEY: 'foxbear-admin-visitor-id-v1',
        ADMIN_STATS_STORAGE_KEY: 'foxbear-admin-local-stats-v1',
        ADMIN_STATS_MAX_EVENTS: 120
    });
})(window);
