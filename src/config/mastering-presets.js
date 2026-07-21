// FoxBear AI Mastering Studio Pro v1.5.46 - extracted configuration module
'use strict';

const BEAT_CHANGE_PRESETS = {
    original: { ratio: 1, label: '원본 박자 유지' },
    slow5: { ratio: 0.95, label: '느리게 -5%' },
    slow10: { ratio: 0.90, label: '느리게 -10%' },
    fast5: { ratio: 1.05, label: '빠르게 +5%' },
    fast10: { ratio: 1.10, label: '빠르게 +10%' },
    half: { ratio: 0.50, label: '하프타임 0.50x' },
    double: { ratio: 1.50, label: '더블타임 1.50x' }
};

const INSTRUMENT_LAYER_PRESETS = {
    off: { label: 'OFF', hasKick: false, hasHat: false, hasClap: false },
    kick: { label: '킥', hasKick: true, hasHat: false, hasClap: false },
    hat: { label: '하이햇', hasKick: false, hasHat: true, hasClap: false },
    kick_hat: { label: '킥 + 하이햇', hasKick: true, hasHat: true, hasClap: false },
    clap: { label: '클랩', hasKick: false, hasHat: false, hasClap: true },
    kick_hat_clap: { label: '킥 + 하이햇 + 클랩', hasKick: true, hasHat: true, hasClap: true }
};

const INSTRUMENT_AMOUNT_LEVELS = {
    light: { label: '가볍게', gain: 0.62 },
    normal: { label: '보통', gain: 0.88 },
    bold: { label: '강하게', gain: 1.15 }
};

const PLATFORM_EXPORT_PRESETS = {
    custom: { label: '직접 설정', outputFormat: null, targetLufs: null, ceilingDb: null, qualityMode: null, note: '사용자가 고른 출력 설정을 유지합니다.' },
    streaming: { label: 'Streaming Safe', outputFormat: 'wav24', targetLufs: -14, ceilingDb: -1.0, qualityMode: 'balanced', note: '대부분의 스트리밍 업로드에 안정적인 기본값입니다.' },
    youtube: { label: 'YouTube/MV', outputFormat: 'wav24', targetLufs: -14, ceilingDb: -1.0, qualityMode: 'balanced', note: '영상 편집 재인코딩을 고려해 피크 여유를 둡니다.' },
    apple: { label: 'Apple/Hi-Fi', outputFormat: 'wav24', targetLufs: -16, ceilingDb: -1.5, qualityMode: 'max', note: '다이내믹과 피크 여유를 더 보존합니다.' },
    social: { label: 'SNS/Shorts', outputFormat: 'mp3_320', targetLufs: -14, ceilingDb: -1.0, qualityMode: 'balanced', note: '모바일 업로드/공유 호환성을 우선합니다.' },
    loud_demo: { label: 'Loud Demo', outputFormat: 'mp3_320', targetLufs: -12, ceilingDb: -0.8, qualityMode: 'balanced', note: '짧은 데모 확인용으로 체감 음압을 조금 더 올립니다.' },
    archive: { label: 'Archive Master', outputFormat: 'wav32float', targetLufs: -16, ceilingDb: -1.5, qualityMode: 'max', note: '후속 편집과 보관을 위한 최고 보존 프리셋입니다.' }
};


const MASTER_STRENGTH_PROFILES = {
    natural: {
        label: 'Natural',
        description: '원본 보존 · 가장 부드러운 보정',
        targetLufs: -16,
        ceilingDb: -1.5,
        qualityMode: 'max',
        clarityDelta: -4,
        warmthDelta: 3,
        widthDelta: -4,
        stereoGrooveDelta: -5,
        punchDelta: -7,
        metallicDelta: 5,
        analogDelta: 1,
        intensityScale: 0.90
    },
    balanced: {
        label: 'Balanced',
        description: '현재 기본값 · 장르/스타일 추천 균형',
        targetLufs: null,
        ceilingDb: null,
        qualityMode: null,
        clarityDelta: 0,
        warmthDelta: 0,
        widthDelta: 0,
        stereoGrooveDelta: 0,
        punchDelta: 0,
        metallicDelta: 0,
        analogDelta: 0,
        intensityScale: 1.00
    },
    modern: {
        label: 'Modern',
        description: '선명도와 체감 음압을 조금 더 앞으로',
        targetLufs: -13,
        ceilingDb: -1.0,
        qualityMode: 'balanced',
        clarityDelta: 3,
        warmthDelta: -1,
        widthDelta: 1,
        stereoGrooveDelta: 1,
        punchDelta: 4,
        metallicDelta: 3,
        analogDelta: -1,
        intensityScale: 1.06
    },
    loud: {
        label: 'Loud',
        description: '데모/댄스용 큰 체감 · 안전 가드 유지',
        targetLufs: -10,
        ceilingDb: -0.8,
        qualityMode: 'max',
        clarityDelta: 3,
        warmthDelta: -3,
        widthDelta: 0,
        stereoGrooveDelta: -1,
        punchDelta: 8,
        metallicDelta: 5,
        analogDelta: -2,
        intensityScale: 1.14
    },
    vocal_safe: {
        label: 'Vocal Safe',
        description: '보컬 쇳소리/치찰음 최소화',
        targetLufs: -15,
        ceilingDb: -1.5,
        qualityMode: 'max',
        clarityDelta: -6,
        warmthDelta: 4,
        widthDelta: -7,
        stereoGrooveDelta: -8,
        punchDelta: -8,
        metallicDelta: 10,
        analogDelta: 2,
        intensityScale: 0.88
    },
    mobile_safe: {
        label: 'Mobile Safe',
        description: '폰 스피커 울림/박스톤/공진 최소화',
        targetLufs: -14,
        ceilingDb: -1.2,
        qualityMode: 'balanced',
        clarityDelta: -2,
        warmthDelta: -7,
        widthDelta: -5,
        stereoGrooveDelta: -7,
        punchDelta: -7,
        metallicDelta: 5,
        analogDelta: -1,
        intensityScale: 0.94
    }
};

const MASTER_STYLE_PRESETS = {
    transparent: { label: 'Transparent Clean', description: '원본 질감을 보존하며 깨끗하게 정리', targetLufs: -14, ceilingDb: -1.0, qualityMode: 'balanced', clarityDelta: 1, warmthDelta: 0, widthDelta: 0, punchDelta: -2, metallicDelta: 3, analogDelta: -2, intensityScale: 0.96 },
    streaming: { label: 'Streaming Polish', description: '플랫폼 업로드용 안전 라우드니스와 밸런스', targetLufs: -14, ceilingDb: -1.0, qualityMode: 'balanced', clarityDelta: 2, warmthDelta: 1, widthDelta: 1, punchDelta: 1, metallicDelta: 3, analogDelta: 0, intensityScale: 1.00 },
    club: { label: 'Club / Loud', description: '댄스/클럽 데모용 강한 체감 음압', targetLufs: -9, ceilingDb: -0.5, qualityMode: 'max', clarityDelta: 3, warmthDelta: -2, widthDelta: 3, punchDelta: 10, metallicDelta: 5, analogDelta: 0, intensityScale: 1.16 },
    vocal: { label: 'Vocal Focus', description: '보컬·리드 멜로디 보호와 치찰음 완화', targetLufs: -14, ceilingDb: -1.0, qualityMode: 'max', clarityDelta: -2, warmthDelta: 4, widthDelta: -4, punchDelta: -6, metallicDelta: 8, analogDelta: 1, intensityScale: 0.94 },
    podcast: { label: 'Podcast / Voice', description: '말소리 명료도와 모노 호환성 우선', targetLufs: -16, ceilingDb: -1.5, qualityMode: 'balanced', clarityDelta: 6, warmthDelta: -2, widthDelta: -18, punchDelta: -10, metallicDelta: 6, analogDelta: -5, intensityScale: 0.88 },
    warm_analog: { label: 'Warm Analog', description: '따뜻한 질감과 부드러운 고역', targetLufs: -14, ceilingDb: -1.0, qualityMode: 'balanced', clarityDelta: -4, warmthDelta: 10, widthDelta: -1, punchDelta: -2, metallicDelta: 6, analogDelta: 18, intensityScale: 0.98 },
    clean_loud: { label: 'Clean Loud', description: '과한 왜곡 없이 큰 체감 음압', targetLufs: -10, ceilingDb: -0.8, qualityMode: 'max', clarityDelta: 2, warmthDelta: -1, widthDelta: 1, punchDelta: 7, metallicDelta: 7, analogDelta: -1, intensityScale: 1.10 }
};
