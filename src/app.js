// FoxBear AI Mastering Studio Pro v1.2 - advanced modular GitHub DSP build
'use strict';

const APP_VERSION = 'Pro v1.3.6';
const WAV_ENCODER_WORKER_URL = 'src/workers/wav-encoder.worker.js';
const MP3_ENCODER_WORKER_URL = 'src/workers/mp3-encoder.worker.js';
const ANALYSIS_WORKER_URL = 'src/workers/analysis.worker.js';
const MASTER_FINALIZER_WORKER_URL = 'src/workers/master-finalizer.worker.js';
const PITCH_WSOLA_WORKER_URL = 'src/workers/pitch-wsola.worker.js';
const OPTIONAL_WASM_PITCH_ADAPTER_URL = './engines/pitch-engine-adapter.js';
const ANALYSIS_CACHE_DB = 'foxbear-analysis-cache-v135';
const ANALYSIS_CACHE_STORE = 'analysis';

const MAX_FILES = 35;
const MAX_FILE_SIZE = 220 * 1024 * 1024;
const AUDIO_EXTENSIONS = ['.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac', '.aif', '.aiff', '.webm', '.mp4', '.m4v', '.mov'];
const VIDEO_AUDIO_EXTENSIONS = ['.mp4', '.m4v', '.mov'];
const DEFAULT_TRANSFORM = { pitchSemitones: 0, speedRatio: 1, snapSemitone: true, beatPreset: 'original' };
const DEFAULT_INSTRUMENT_LAYER = { mode: 'off', amount: 'light' };
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
const CURVE_CACHE = new Map();
const ACTION_SELECT_IDS = ['genreSelect', 'masterGoalSelect', 'outputFormatSelect', 'targetLufsSelect', 'ceilingSelect', 'qualityModeSelect', 'pitchEngineSelect', 'beatChangeSelect', 'instrumentLayerSelect', 'instrumentAmountSelect'];
const MASTER_FLOW_STEPS = [
    { at: 6, label: '준비', hint: '디코딩' },
    { at: 22, label: '정리', hint: '무음/변환' },
    { at: 50, label: '리듬', hint: '박자/악기' },
    { at: 60, label: '마스터', hint: '톤/공간' },
    { at: 88, label: '피크', hint: 'True Peak' },
    { at: 98, label: '완료', hint: '인코딩' }
];


const FEATURE_DEFINITIONS = {
    trimSilence: {
        label: '앞뒤 무음 자동 정리',
        short: '앞/뒤 무음을 감지해 자연스러운 여백만 남기고 정리합니다.'
    },
    albumMatch: {
        label: '앨범 단위 볼륨/톤 통일',
        short: '여러 곡의 RMS·밝기를 중간값 기준으로 부드럽게 맞춥니다.'
    },
    truePeakGuard: {
        label: 'True Peak 가드 적용',
        short: '인터샘플 피크를 확인해 -1 dBTP 근처에서 안전하게 보호합니다.'
    },
    aiHumanize: {
        label: 'AI 티 완화 엔진',
        short: '치찰음·쇳소리·초고역 피로감을 줄이고 250~500Hz 질감을 보강합니다.'
    },
    vocalProtect: {
        label: '보컬 보호 모드',
        short: '보컬 중심 곡에서 De-esser와 Exciter를 섬세하게 조절해 감정선과 멜로디를 보존합니다.'
    },
    smartGuard: {
        label: '스마트 과처리 방지',
        short: '고강도 설정에서도 밝기·저역·피크를 감시해 멜로디 손상을 줄입니다.'
    },
    lowEndAnchor: {
        label: '저역 중심 고정',
        short: '저역을 중앙에 단단히 묶어 킥·베이스 흔들림과 모바일 번짐을 줄입니다.'
    },
    melodyPreserve: {
        label: '멜로디 보호 엔진',
        short: '보컬·리드·악기 멜로디 대역을 과한 Exciter와 압축으로부터 보호합니다.'
    },
    transientRefine: {
        label: '트랜지언트 정리',
        short: '하이햇·클랩·타격음의 날카로운 순간 피크를 다듬어 자연스럽게 만듭니다.'
    },
    vocalFocusPlus: {
        label: '보컬 포커스 플러스',
        short: '피치/BPM 극단값이나 강한 마스터링에서도 보컬·리드 중심 대역을 더 안정적으로 붙잡습니다.'
    },
    adaptiveAir: {
        label: '실키 에어 밸런서',
        short: '어두운 곡은 아주 살짝 열고, 밝은 곡은 초고역 피로감을 부드럽게 정리합니다.'
    },
    translationGuard: {
        label: '모바일 번역 보정',
        short: '폰 스피커와 이어폰에서 저역 번짐·중역 묻힘을 줄이도록 아주 얇게 보정합니다.'
    },
    openMixGuard: {
        label: '개방감 리커버리',
        short: '추가 마스터링이나 강한 세팅에서 답답하게 막히는 저중역을 살짝 열고 보컬 존재감을 회복합니다.'
    },
    referenceMatch: {
        label: '프리셋 레퍼런스 매처',
        short: '선택한 프리셋의 목표 저역·중역·고역 밸런스에 맞춰 아주 얇게 톤을 보정합니다.'
    },
    phaseSafe: {
        label: '스테레오 위상 세이프',
        short: '넓은 공간감에서도 중앙 보컬과 저역이 흐려지지 않도록 좌우 위상 위험을 줄입니다.'
    },
    earFatigueGuard: {
        label: '청감 피로 가드',
        short: '강한 피치/BPM·고음압 설정에서 오래 들으면 피곤한 3~10kHz 거친 대역을 미세 정리합니다.'
    }
};

const UTILITY_FEATURE_DEFINITIONS = {
    abLevelMatch: {
        label: 'A/B 레벨 매칭',
        short: '원본과 마스터링 프리뷰의 체감 볼륨을 맞춰 더 공정하게 비교합니다.'
    },
    abLoopMode: {
        label: '5초 A/B 루프',
        short: '같은 구간을 짧게 반복해 피치/BPM과 마스터링 차이를 빠르게 확인합니다.'
    },
    autoCacheClean: {
        label: '분석 캐시 자동정리',
        short: '켜두면 오래된 분석 캐시를 주기적으로 정리합니다. 끄면 캐시를 그대로 보존합니다.'
    },
    autoHighlightAB: {
        label: '자동 하이라이트 A/B',
        short: '곡에서 차이가 잘 들리는 5초 구간을 찾아 A/B 루프 시작점으로 사용합니다.'
    },
    smartPerformanceGuard: {
        label: '스마트 성능 가드',
        short: '모바일·긴 파일·저메모리 환경에서 품질 손상 없이 가장 무거운 검사만 자동으로 가볍게 조절합니다.'
    },
    engineSafetyMeter: {
        label: '엔진 안전 점수',
        short: '현재 설정이 과한지, 보컬/피크/공간감 보호가 충분한지 점수로 보여줍니다.'
    }
};

const PRESET_LABELS = {
    custom: '커스텀',
    pop: 'Pop / Vocal Pop',
    kpop: 'K-POP / Idol Pop',
    kballad: 'K-Pop Ballad',
    rnb: 'R&B / Soul',
    ballad: 'BALLAD',
    acoustic: 'Acoustic / Singer-Songwriter',
    citypop: 'City Pop / Retro Pop',
    dance: 'Dance / Electronic Pop',
    synthpop: 'Synth Pop',
    house: 'House / Club',
    futurebass: 'Future Bass',
    edm: 'EDM',
    trap: 'Trap / 808',
    drill: 'Drill',
    hiphop: 'HIPHOP',
    boombap: 'Boom Bap',
    globalpop: 'Global / Ethnic Pop',
    lofi: 'LO-FI',
    rock: 'ROCK',
    cinematic: 'Cinematic / OST',
    spatial: 'Spatial / Wide Mix',
    tape: 'Tape Warmth',
    punch: 'Punch / Live Energy'
};

const GENRE_PRESETS = {
    custom: { clarity: 50, warmth: 55, width: 28, stereoGroove: 12, analogGroove: 6, dynamicPunch: 35, metallicRemoval: 42, intensity: 100 },
    pop: { clarity: 57, warmth: 55, width: 42, stereoGroove: 10, analogGroove: 4, dynamicPunch: 38, metallicRemoval: 46, intensity: 105 },
    kpop: { clarity: 60, warmth: 52, width: 48, stereoGroove: 14, analogGroove: 4, dynamicPunch: 42, metallicRemoval: 48, intensity: 110 },
    kballad: { clarity: 50, warmth: 68, width: 52, stereoGroove: 10, analogGroove: 8, dynamicPunch: 26, metallicRemoval: 52, intensity: 100 },
    rnb: { clarity: 46, warmth: 70, width: 42, stereoGroove: 8, analogGroove: 10, dynamicPunch: 32, metallicRemoval: 48, intensity: 100 },
    ballad: { clarity: 50, warmth: 64, width: 34, stereoGroove: 8, analogGroove: 5, dynamicPunch: 28, metallicRemoval: 45, intensity: 95 },
    acoustic: { clarity: 48, warmth: 60, width: 30, stereoGroove: 4, analogGroove: 5, dynamicPunch: 24, metallicRemoval: 42, intensity: 90 },
    citypop: { clarity: 50, warmth: 66, width: 44, stereoGroove: 10, analogGroove: 14, dynamicPunch: 34, metallicRemoval: 50, intensity: 100 },
    dance: { clarity: 61, warmth: 53, width: 52, stereoGroove: 14, analogGroove: 5, dynamicPunch: 52, metallicRemoval: 48, intensity: 110 },
    synthpop: { clarity: 58, warmth: 54, width: 56, stereoGroove: 12, analogGroove: 7, dynamicPunch: 38, metallicRemoval: 54, intensity: 108 },
    house: { clarity: 58, warmth: 56, width: 50, stereoGroove: 16, analogGroove: 5, dynamicPunch: 50, metallicRemoval: 46, intensity: 112 },
    futurebass: { clarity: 62, warmth: 58, width: 60, stereoGroove: 16, analogGroove: 4, dynamicPunch: 44, metallicRemoval: 56, intensity: 115 },
    edm: { clarity: 62, warmth: 56, width: 56, stereoGroove: 16, analogGroove: 4, dynamicPunch: 52, metallicRemoval: 48, intensity: 115 },
    trap: { clarity: 48, warmth: 70, width: 28, stereoGroove: 5, analogGroove: 10, dynamicPunch: 62, metallicRemoval: 42, intensity: 110 },
    drill: { clarity: 44, warmth: 68, width: 26, stereoGroove: 4, analogGroove: 8, dynamicPunch: 66, metallicRemoval: 44, intensity: 112 },
    hiphop: { clarity: 42, warmth: 66, width: 36, stereoGroove: 8, analogGroove: 8, dynamicPunch: 52, metallicRemoval: 45, intensity: 108 },
    boombap: { clarity: 40, warmth: 70, width: 30, stereoGroove: 5, analogGroove: 12, dynamicPunch: 48, metallicRemoval: 42, intensity: 102 },
    globalpop: { clarity: 56, warmth: 58, width: 50, stereoGroove: 12, analogGroove: 5, dynamicPunch: 44, metallicRemoval: 56, intensity: 105 },
    lofi: { clarity: 28, warmth: 72, width: 26, stereoGroove: 5, analogGroove: 18, dynamicPunch: 20, metallicRemoval: 52, intensity: 95 },
    rock: { clarity: 50, warmth: 54, width: 30, stereoGroove: 8, analogGroove: 5, dynamicPunch: 48, metallicRemoval: 45, intensity: 108 },
    cinematic: { clarity: 48, warmth: 62, width: 58, stereoGroove: 9, analogGroove: 7, dynamicPunch: 34, metallicRemoval: 48, intensity: 102 },
    spatial: { clarity: 54, warmth: 56, width: 64, stereoGroove: 18, analogGroove: 4, dynamicPunch: 36, metallicRemoval: 50, intensity: 104 },
    tape: { clarity: 42, warmth: 72, width: 34, stereoGroove: 6, analogGroove: 24, dynamicPunch: 30, metallicRemoval: 54, intensity: 96 },
    punch: { clarity: 52, warmth: 56, width: 38, stereoGroove: 8, analogGroove: 6, dynamicPunch: 70, metallicRemoval: 46, intensity: 116 }
};

const PROFILE_EQ_FILTERS = {
    kballad: [
        { type: 'peaking', frequency: 350, q: 1.5, gain: -1.2 },
        { type: 'peaking', frequency: 6500, q: 2.0, gain: -1.8 },
        { type: 'highshelf', frequency: 12000, q: 0.7, gain: 0.8 }
    ],
    dance: [
        { type: 'peaking', frequency: 90, q: 1.0, gain: 0.8 },
        { type: 'peaking', frequency: 4200, q: 2.0, gain: -1.0 },
        { type: 'highshelf', frequency: 10500, q: 0.7, gain: 0.8 }
    ],
    trap: [
        { type: 'peaking', frequency: 60, q: 1.0, gain: 1.0 },
        { type: 'peaking', frequency: 2500, q: 1.2, gain: 0.7 },
        { type: 'peaking', frequency: 5200, q: 2.2, gain: -0.8 }
    ],
    globalpop: [
        { type: 'peaking', frequency: 4000, q: 2.5, gain: -1.8 },
        { type: 'peaking', frequency: 10000, q: 1.0, gain: -1.0 },
        { type: 'highshelf', frequency: 16000, q: 0.7, gain: 0.8 }
    ],
    cinematic: [
        { type: 'peaking', frequency: 280, q: 0.75, gain: 0.5 },
        { type: 'peaking', frequency: 3200, q: 1.1, gain: -0.4 },
        { type: 'highshelf', frequency: 12500, q: 0.7, gain: 0.45 }
    ],
    spatial: [
        { type: 'peaking', frequency: 240, q: 0.8, gain: -0.35 },
        { type: 'peaking', frequency: 2200, q: 1.0, gain: 0.25 },
        { type: 'highshelf', frequency: 14000, q: 0.7, gain: 0.35 }
    ],
    tape: [
        { type: 'peaking', frequency: 350, q: 0.85, gain: 0.6 },
        { type: 'peaking', frequency: 5200, q: 1.7, gain: -0.55 },
        { type: 'highshelf', frequency: 12000, q: 0.7, gain: -0.35 }
    ],
    punch: [
        { type: 'peaking', frequency: 95, q: 1.0, gain: 0.45 },
        { type: 'peaking', frequency: 1800, q: 0.9, gain: 0.35 },
        { type: 'peaking', frequency: 7200, q: 1.6, gain: -0.25 }
    ]
};

const SLIDERS = [
    { id: 'clarity', label: '선명도 (Clarity)', min: 0, max: 100, step: 1, unit: '%', low: '보컬과 악기가 부드러워지고 전체 톤이 안정됩니다.', neutral: '보컬 존재감과 고역 개방감을 조절합니다.', high: '고역과 존재감이 살아나지만 과하면 치찰음/피로감이 생길 수 있습니다.' },
    { id: 'warmth', label: '따뜻함 (Warmth)', min: 0, max: 100, step: 1, unit: '%', low: '차갑고 현대적인 인상이 강해집니다.', neutral: '저역과 저중역의 온도감, 두께감을 조절합니다.', high: '저역과 저중역이 부드럽고 아날로그적인 질감으로 이동합니다.' },
    { id: 'width', label: '공간감 (Width)', min: 0, max: 100, step: 1, unit: '%', low: '중앙 집중형 이미지가 되어 단단하게 들립니다.', neutral: '좌우 폭과 중앙 이미지를 함께 조절합니다.', high: '좌우가 넓어지지만 과하면 모노 호환성과 중심 이미지가 약해질 수 있습니다.' },
    { id: 'stereoGroove', label: '스테레오 그루브 (Stereo Groove)', min: 0, max: 100, step: 1, unit: '%', low: '좌우 움직임이 줄고 타이트한 느낌이 됩니다.', neutral: '미세한 스테레오 움직임으로 리듬감을 더합니다.', high: '미세한 딜레이 움직임으로 더 넓고 리드미컬한 인상을 줍니다.' },
    { id: 'analogGroove', label: '아날로그 와우 (Analog Wow)', min: 0, max: 100, step: 1, unit: '%', low: '깨끗하고 디지털에 가까운 질감입니다.', neutral: '테이프 느낌의 흔들림과 새츄레이션을 조절합니다.', high: '테이프 계열의 흔들림과 새츄레이션이 강해집니다.' },
    { id: 'dynamicPunch', label: '다이나믹 펀치 (Dynamic Punch)', min: 0, max: 100, step: 1, unit: '%', low: '트랜지언트가 부드럽고 압축된 느낌이 강합니다.', neutral: '드럼과 타악기의 어택, 밀도를 조절합니다.', high: '드럼과 타악기의 어택이 살아나지만 과하면 거칠 수 있습니다.' },
    { id: 'metallicRemoval', label: '금속성 제거 (Metallic Removal)', min: 0, max: 100, step: 1, unit: '%', low: '값을 낮추면 제거가 약해지고 원본의 밝은 질감을 더 보존합니다.', neutral: '값을 올릴수록 금속성·쇳소리 공진 제거가 더 강해집니다.', high: '값을 높이면 더 많이 사라지지만, 과하면 고역과 공기감이 답답해질 수 있습니다.' },
    { id: 'intensity', label: '마스터링 강도 (Intensity)', min: 50, max: 200, step: 5, unit: '%', low: '원본 질감을 최대한 보존하고 보정만 살짝 적용합니다.', neutral: '일반적인 마스터링 강도입니다. 100%를 기준으로 톤/펀치/피크 보정이 동작합니다.', high: '140% 이상부터 비선형으로 더 강하게 동작하며 Exciter, Clarity, Metallic Removal이 공격적으로 적용됩니다.' }
];

const state = {
    tracks: [],
    selectedId: null,
    selectedIds: new Set(),
    busy: false,
    programmatic: false,
    lastToastTimer: null,
    featureFlags: {
        trimSilence: false,
        albumMatch: false,
        truePeakGuard: true,
        aiHumanize: true,
        vocalProtect: true,
        smartGuard: true,
        lowEndAnchor: true,
        melodyPreserve: true,
        transientRefine: true,
        vocalFocusPlus: true,
        adaptiveAir: true,
        translationGuard: true,
        openMixGuard: true,
        referenceMatch: true,
        phaseSafe: true,
        earFatigueGuard: true
    },
    albumProfile: null,
    outputFormat: 'wav24',
    masterGoal: 'natural',
    targetLufs: -14,
    ceilingDb: -1.0,
    qualityMode: 'balanced',
    pitchEngine: 'auto',
    abLevelMatch: true,
    abLoopMode: false,
    autoCacheClean: true,
    autoHighlightAB: true,
    smartPerformanceGuard: true,
    engineSafetyMeter: true,
    cacheReady: false,
    autoRemasterTimers: new Map(),
    selectPopup: null,
    expandedDetailIds: new Set(),
    popupScrollY: 0,
    popupScrollbarCompensation: 0,
    activeDownloadUrls: new Set()
};

const el = {};

document.addEventListener('DOMContentLoaded', init);

function runSiteAccessGuard() {
    const allowedHosts = new Set(['junl-im.github.io', 'localhost', '127.0.0.1', '0.0.0.0']);
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const isLocalFile = protocol === 'file:';
    const isAllowed = isLocalFile || allowedHosts.has(host);
    if (isAllowed) return false;
    document.documentElement.innerHTML = `
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>FoxBear Music</title>
            <style>
                body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070711;color:#f3f0e8;font-family:system-ui,-apple-system,Segoe UI,sans-serif;text-align:center;padding:24px;}
                section{max-width:520px;border:1px solid rgba(255,255,255,.14);border-radius:28px;background:rgba(20,18,33,.78);padding:28px;box-shadow:0 26px 80px rgba(0,0,0,.34)}
                h1{margin:0 0 10px;font-size:1.4rem}p{color:#a49fae;line-height:1.6}
            </style>
        </head>
        <body><section><h1>FoxBear Music</h1><p>정식 배포 주소에서만 실행되는 보호 모드입니다.<br>공식 페이지에서 다시 접속해주세요.</p></section></body>`;
    return true;
}


function init() {
    if (runSiteAccessGuard()) return;
    cacheElements();
    renderSliders();
    renderFeatureButtons();
    enhanceActionSelects();
    bindEvents();
    initActionHelpTooltips();
    maybeAutoCleanAnalysisCache();
    requestAnimationFrame(() => { enhanceActionSelects(); syncEnhancedSelectButtons(); initActionHelpTooltips(); });
    setTimeout(() => { enhanceActionSelects(); syncEnhancedSelectButtons(); initActionHelpTooltips(); }, 350);
    applyPresetToControlsOnly('custom');
    setTransformControls(DEFAULT_TRANSFORM);
    setInstrumentControls(DEFAULT_INSTRUMENT_LAYER);
    renderAll();
    initUiGuards();
    maybeShowSubscribePrompt();
}

function cacheElements() {
    const ids = [
        'fileDrop', 'folderDrop', 'fileInput', 'folderInput', 'featureDock', 'featureCount', 'featureOpenBtn', 'featureDialog', 'featureDialogClose', 'featureDialogList',
        'genreSelect', 'confidenceText', 'intensityField', 'sliderFields', 'pitchSlider', 'speedSlider', 'pitchValue', 'speedValue',
        'pitchHint', 'speedHint', 'beatChangeSelect', 'beatValue', 'beatHint', 'keyReadout', 'tempoReadout', 'tempoPercent', 'snapSemitone', 'pitchSpeedBadge',
        'instrumentLayerSelect', 'instrumentAmountSelect', 'instrumentBadge', 'instrumentHint',
        'smartSuggestPanel', 'smartSuggestStatus', 'smartSuggestSummary', 'smartSuggestList', 'smartSuggestApplyBtn',
        'previewOpenBtn', 'previewDialog', 'previewDialogClose', 'previewDialogBody', 'previewDialogCaption',
        'processingHud', 'processingHudTitle', 'processingHudText', 'processingHudPercent', 'processingHudBar',
        'aiApplyBtn', 'masterSelectedBtn', 'masterAllBtn', 'zipBtn', 'clearBtn', 'trackList', 'queuePreview', 'trackDetail',
        'detailStatus', 'queueCount', 'statTracks', 'statDone', 'statSize', 'statState', 'selectedBadge',
        'albumStatus', 'toast', 'featureTooltip', 'programInfoBtn', 'programInfoDialog', 'programInfoClose', 'masterGoalSelect', 'outputFormatSelect', 'targetLufsSelect', 'ceilingSelect', 'qualityModeSelect', 'pitchEngineSelect', 'abMatchBtn', 'abLoopBtn', 'genreLockBtn', 'clearCacheBtn', 'globalDiffMeter', 'subscribeNudge', 'subscribeNudgeAction', 'subscribeNudgeClose'
    ];
    ids.forEach(id => { el[id] = document.getElementById(id); });
}


function decorateSliderLabel(label, text) {
    const value = String(text || '');
    const match = value.match(/^(.+?)\s*\((.+)\)$/);
    label.textContent = '';
    const ko = document.createElement('span');
    ko.className = 'slider-label-ko';
    ko.textContent = match ? match[1].trim() : value;
    label.appendChild(ko);
    if (match) {
        const en = document.createElement('small');
        en.className = 'slider-label-en';
        en.textContent = match[2].trim();
        label.appendChild(en);
    }
}

function renderSliders() {
    el.sliderFields.textContent = '';
    if (el.intensityField) el.intensityField.textContent = '';
    SLIDERS.forEach((slider, index) => {
        const field = document.createElement('div');
        field.className = 'field';

        const head = document.createElement('div');
        head.className = 'range-head';

        const label = document.createElement('label');
        label.htmlFor = slider.id;
        decorateSliderLabel(label, slider.label);

        const rec = document.createElement('span');
        rec.className = 'rec-value';
        rec.id = `rec-${slider.id}`;

        const value = document.createElement('b');
        value.id = `value-${slider.id}`;
        value.textContent = formatSliderValue(slider, GENRE_PRESETS.custom[slider.id]);

        const input = document.createElement('input');
        input.type = 'range';
        input.id = slider.id;
        input.min = String(slider.min ?? 0);
        input.max = String(slider.max ?? 100);
        input.step = String(slider.step ?? 1);
        input.value = String(GENRE_PRESETS.custom[slider.id]);
        input.dataset.sliderIndex = String(index);

        const hint = document.createElement('div');
        hint.className = 'slider-hint';
        hint.id = `hint-${slider.id}`;

        head.append(label, rec, value);
        field.append(head, input, hint);
        const target = slider.id === 'intensity' && el.intensityField ? el.intensityField : el.sliderFields;
        target.appendChild(field);
    });
}

function renderFeatureButtons() {
    const featureContainer = el.featureDialogList || el.featureDock;
    if (!featureContainer) return;
    if (el.featureDock) el.featureDock.textContent = '';
    featureContainer.textContent = '';
    const groups = [
        ['engine', FEATURE_DEFINITIONS],
        ['utility', UTILITY_FEATURE_DEFINITIONS]
    ];
    const cards = [];
    let order = 0;
    groups.forEach(([kind, definitions]) => {
        Object.entries(definitions).forEach(([key, info]) => {
            const active = getFeatureToggleState(kind, key);
            cards.push({ kind, key, info, active, order: order++ });
        });
    });
    cards.sort((a, b) => {
        if (a.active !== b.active) return a.active ? 1 : -1;
        return a.order - b.order;
    });
    cards.forEach(({ kind, key, info, active }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `feature-card feature-dialog-card ${active ? 'active' : ''}`;
        button.dataset.feature = key;
        button.dataset.kind = kind;
        button.dataset.state = active ? 'on' : 'off';
        button.dataset.tooltip = info.short;
        button.dataset.help = info.short;
        button.title = info.short;
        button.setAttribute('aria-pressed', String(Boolean(active)));
        button.setAttribute('aria-label', `${info.label}: ${info.short}`);

        const title = document.createElement('b');
        title.textContent = info.label;
        const status = document.createElement('span');
        status.className = 'feature-status';
        status.textContent = active ? 'ON' : 'OFF';

        button.append(title, status);
        button.addEventListener('mouseenter', () => showFeatureTooltip(button, info.short));
        button.addEventListener('focus', () => showFeatureTooltip(button, info.short));
        button.addEventListener('mouseleave', hideFeatureTooltip);
        button.addEventListener('blur', hideFeatureTooltip);
        button.addEventListener('click', () => {
            showFeatureTooltip(button, info.short, 1800);
            if (kind === 'utility') toggleUtilityFeature(key);
            else toggleFeature(key);
        });
        featureContainer.appendChild(button);
    });
    updateFeatureSummary();
}

function getFeatureToggleState(kind, key) {
    if (kind === 'utility') return Boolean(state[key]);
    return Boolean(state.featureFlags[key]);
}

function toggleUtilityFeature(key) {
    if (!Object.prototype.hasOwnProperty.call(UTILITY_FEATURE_DEFINITIONS, key)) return;
    if (key === 'autoCacheClean') {
        state.autoCacheClean = !state.autoCacheClean;
        if (state.autoCacheClean) maybeAutoCleanAnalysisCache(true);
    } else if (key === 'abLevelMatch') {
        state.abLevelMatch = !state.abLevelMatch;
    } else if (key === 'abLoopMode') {
        state.abLoopMode = !state.abLoopMode;
    } else if (key === 'autoHighlightAB') {
        state.autoHighlightAB = !state.autoHighlightAB;
    } else if (key === 'smartPerformanceGuard') {
        state.smartPerformanceGuard = !state.smartPerformanceGuard;
    } else if (key === 'engineSafetyMeter') {
        state.engineSafetyMeter = !state.engineSafetyMeter;
    }
    renderFeatureButtons();
    renderAll({ keepDetailAudio: true });
    const info = UTILITY_FEATURE_DEFINITIONS[key];
    showToast(`${info.label}: ${state[key] ? '켜짐' : '꺼짐'} · ${info.short}`);
}

function updateFeatureSummary() {
    const engineActive = Object.values(state.featureFlags).filter(Boolean).length;
    const utilityActive = ['abLevelMatch', 'abLoopMode', 'autoCacheClean', 'autoHighlightAB', 'smartPerformanceGuard', 'engineSafetyMeter'].filter(key => Boolean(state[key])).length;
    if (el.featureCount) el.featureCount.textContent = `${engineActive + utilityActive}개 활성`;
}


function showFeatureTooltip(target, text, autoHideMs = 0) {
    if (!el.featureTooltip || !target || !text) return;
    el.featureTooltip.textContent = text;
    el.featureTooltip.classList.add('show');
    el.featureTooltip.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const tip = el.featureTooltip.getBoundingClientRect();
        const margin = 8;
        let left = rect.left + rect.width / 2 - tip.width / 2;
        left = clamp(left, margin, Math.max(margin, window.innerWidth - tip.width - margin));
        let top = rect.top - tip.height - 9;
        if (top < margin) top = rect.bottom + 9;
        if (top + tip.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - tip.height - margin);
        el.featureTooltip.style.left = `${left}px`;
        el.featureTooltip.style.top = `${top}px`;
    });
    clearTimeout(state.featureTooltipTimer);
    if (autoHideMs) state.featureTooltipTimer = setTimeout(hideFeatureTooltip, autoHideMs);
}

function hideFeatureTooltip() {
    if (!el.featureTooltip) return;
    el.featureTooltip.classList.remove('show');
    el.featureTooltip.setAttribute('aria-hidden', 'true');
}



function openProgramInfoDialog() {
    if (!el.programInfoDialog) return;
    el.programInfoDialog.classList.add('show');
    el.programInfoDialog.setAttribute('aria-hidden', 'false');
    document.body.classList.add('program-info-open');
    const panel = el.programInfoDialog.querySelector('.program-info-panel');
    if (panel) panel.focus({ preventScroll: true });
}

function closeProgramInfoDialog() {
    if (!el.programInfoDialog) return;
    el.programInfoDialog.classList.remove('show');
    el.programInfoDialog.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('program-info-open');
    if (el.programInfoBtn) el.programInfoBtn.focus({ preventScroll: true });
}

function openFeatureDialog() {
    if (!el.featureDialog) return;
    renderFeatureButtons();
    el.featureDialog.classList.add('show');
    el.featureDialog.setAttribute('aria-hidden', 'false');
    document.body.classList.add('feature-dialog-open');
    const panel = el.featureDialog.querySelector('.feature-dialog-panel');
    if (panel) panel.focus({ preventScroll: true });
}

function closeFeatureDialog() {
    if (!el.featureDialog) return;
    el.featureDialog.classList.remove('show');
    el.featureDialog.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('feature-dialog-open');
    if (el.featureOpenBtn) el.featureOpenBtn.focus({ preventScroll: true });
}

function openPreviewDialog() {
    const track = getSelectedTrack();
    if (!track || !el.previewDialog) return;
    renderPreviewDialog(track);
    el.previewDialog.classList.add('show');
    el.previewDialog.setAttribute('aria-hidden', 'false');
    document.body.classList.add('preview-dialog-open');
    const panel = el.previewDialog.querySelector('.preview-dialog-panel');
    if (panel) panel.focus({ preventScroll: true });
}

function closePreviewDialog() {
    if (!el.previewDialog) return;
    pauseAllPreviewAudio();
    el.previewDialog.classList.remove('show');
    el.previewDialog.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('preview-dialog-open');
    if (el.previewDialogBody) el.previewDialogBody.textContent = '';
    if (el.previewOpenBtn) el.previewOpenBtn.focus({ preventScroll: true });
}

function renderPreviewDialog(track) {
    if (!el.previewDialogBody || !track) return;
    el.previewDialogBody.textContent = '';
    if (el.previewDialogCaption) {
        const preset = PRESET_LABELS[track.preset] || track.preset || '프리셋 대기';
        const done = track.masteredUrl ? '마스터본까지 비교할 수 있습니다.' : '마스터링 전이라 원본 미리듣기만 활성화됩니다.';
        el.previewDialogCaption.textContent = `${track.name} · ${preset} · ${done}`;
    }
    const note = document.createElement('div');
    note.className = 'preview-dialog-note';
    note.textContent = '현재 버전은 로컬 파일 원본/마스터본 비교형 미리듣기입니다. WebAudio + WASM 실시간 컨트롤 미리듣기는 같은 팝업 구조에 AudioWorklet 체인을 연결하면 확장할 수 있습니다.';
    el.previewDialogBody.appendChild(note);
    renderPreviewPlayers(track, el.previewDialogBody, { vertical: true });
}

function updatePreviewButton() {
    if (!el.previewOpenBtn) return;
    const track = getSelectedTrack();
    el.previewOpenBtn.disabled = !track;
}

function updateSmartRecommendationPanel() {
    if (!el.smartSuggestPanel) return;
    const track = getSelectedTrack();
    const hasAnalysis = Boolean(track && track.analysis);
    if (el.smartSuggestApplyBtn) el.smartSuggestApplyBtn.disabled = !hasAnalysis || state.busy;
    if (!track) {
        if (el.smartSuggestStatus) el.smartSuggestStatus.textContent = '파일 대기';
        if (el.smartSuggestSummary) el.smartSuggestSummary.textContent = '곡을 불러오면 분석값 기준으로 장르, 강도, 안전 옵션을 추천합니다.';
        if (el.smartSuggestList) el.smartSuggestList.textContent = '';
        return;
    }
    if (el.smartSuggestStatus) el.smartSuggestStatus.textContent = hasAnalysis ? `${track.confidence || 0}% 추천` : statusLabel(track.status);
    if (el.smartSuggestSummary) {
        if (hasAnalysis) {
            const preset = PRESET_LABELS[track.recommendedPreset || track.preset] || track.recommendedPreset || track.preset || '커스텀';
            const reason = track.genreReason ? ` · ${track.genreReason}` : '';
            el.smartSuggestSummary.textContent = `${preset} 기준 추천값을 사용할 수 있습니다${reason}`;
        } else {
            el.smartSuggestSummary.textContent = '분석이 끝나면 장르와 안전 옵션 추천이 표시됩니다.';
        }
    }
    if (!el.smartSuggestList) return;
    el.smartSuggestList.textContent = '';
    buildSmartSuggestionItems(track).forEach(item => el.smartSuggestList.appendChild(makeSmartSuggestionPill(item.label, item.value, item.tone)));
}

function buildSmartSuggestionItems(track) {
    const items = [];
    const analysis = track.analysis || {};
    const preset = PRESET_LABELS[track.recommendedPreset || track.preset] || track.recommendedPreset || track.preset || '커스텀';
    items.push({ label: '장르', value: preset, tone: 'cyan' });
    if (Number.isFinite(Number(track.confidence))) items.push({ label: '신뢰도', value: `${Math.round(Number(track.confidence))}%`, tone: track.confidence >= 70 ? 'ok' : 'warn' });
    if (Number.isFinite(Number(analysis.loudnessHint))) items.push({ label: '원본 RMS', value: `${Number(analysis.loudnessHint).toFixed(1)} dB`, tone: 'neutral' });
    if (Number.isFinite(Number(analysis.brightness))) items.push({ label: '밝기', value: `${Math.round(Number(analysis.brightness) * 100)}%`, tone: analysis.brightness > .68 ? 'warn' : 'neutral' });
    if (Number.isFinite(Number(analysis.stereoWidth))) items.push({ label: '공간', value: `${Math.round(Number(analysis.stereoWidth) * 100)}%`, tone: analysis.stereoWidth > .74 ? 'warn' : 'neutral' });
    const safety = track.safetyInfo || (track.analysis ? computeEngineSafetyInfo(track, null, track.finalizeInfo || null) : null);
    if (safety) items.push({ label: '안전', value: `${safety.score}점`, tone: safety.tone || 'ok' });
    const activeGuards = [
        state.featureFlags.truePeakGuard ? '피크' : '',
        state.featureFlags.vocalProtect ? '보컬' : '',
        state.featureFlags.earFatigueGuard ? '피로' : ''
    ].filter(Boolean).join(' · ') || '수동';
    items.push({ label: '가드', value: activeGuards, tone: 'ok' });
    return items;
}

function makeSmartSuggestionPill(label, value, tone = 'neutral') {
    const item = document.createElement('div');
    item.className = `smart-suggest-pill smart-suggest-${tone}`;
    const name = document.createElement('span');
    name.textContent = label;
    const val = document.createElement('b');
    val.textContent = value;
    item.append(name, val);
    return item;
}

function updateProcessingHud() {
    if (!el.processingHud) return;
    const running = state.tracks.find(track => track.status === 'processing') || null;
    if (!running) {
        el.processingHud.classList.remove('show');
        el.processingHud.setAttribute('aria-hidden', 'true');
        if (el.processingHudBar) el.processingHudBar.style.width = '0%';
        return;
    }
    const progress = clamp(Number(running.progress || 0), 0, 100);
    el.processingHud.classList.add('show');
    el.processingHud.setAttribute('aria-hidden', 'false');
    if (el.processingHudTitle) el.processingHudTitle.textContent = '마스터링 진행 중';
    if (el.processingHudText) el.processingHudText.textContent = `${running.name} · ${running.report || '처리 중'}`;
    if (el.processingHudPercent) el.processingHudPercent.textContent = `${Math.round(progress)}%`;
    if (el.processingHudBar) el.processingHudBar.style.width = `${progress}%`;
}

const ACTION_HELP_TEXTS = {
    programInfoBtn: '프로그램의 핵심 기능, 안전 처리 방식, 개발 방향을 확인합니다.',
    featureOpenBtn: '버튼형 적용 기능을 팝업으로 열어 필요한 기능만 켜고 끕니다.',
    previewOpenBtn: '불러온 트랙의 원본과 마스터링 결과를 위아래 미리듣기 팝업으로 비교합니다.',
    smartSuggestApplyBtn: '분석 결과 기준 추천 프리셋과 추천값을 선택 트랙에 다시 적용합니다.',
    fileDrop: '파일 하나 또는 여러 개를 불러옵니다. MP3/WAV/MP4 오디오를 지원합니다.',
    folderDrop: '폴더 안의 여러 음악 파일을 한 번에 불러옵니다.',
    aiApplyBtn: '분석 결과 기준으로 장르와 추천값을 다시 적용합니다.',
    masterSelectedBtn: '선택한 트랙만 현재 설정으로 마스터링합니다.',
    masterAllBtn: '대기열의 모든 트랙을 순서대로 마스터링합니다.',
    zipBtn: '완료된 결과물을 ZIP 파일로 묶어 다운로드합니다.',
    clearBtn: '작업 대기열과 미리듣기 결과를 초기화합니다.',
    clearCacheBtn: '저장된 분석 캐시를 즉시 비웁니다.',
    abMatchBtn: '원본/마스터링 프리뷰 볼륨을 맞춰 비교합니다.',
    abLoopBtn: '같은 구간을 5초씩 반복해 차이를 빠르게 비교합니다.'
};

function initActionHelpTooltips() {
    Object.entries(ACTION_HELP_TEXTS).forEach(([id, text]) => {
        const target = el[id] || document.getElementById(id);
        if (target) attachHelpTooltip(target, text);
    });
    document.querySelectorAll('.select-popup-trigger').forEach(trigger => {
        const id = trigger.dataset.selectFor;
        const select = id ? document.getElementById(id) : null;
        const label = select ? getSelectLabel(select) : '선택';
        attachHelpTooltip(trigger, `${label} 옵션을 버튼형 팝업으로 선택합니다.`);
    });
    document.querySelectorAll('.player-toggle').forEach(button => attachHelpTooltip(button, '프리뷰를 재생하거나 일시정지합니다.'));
    document.querySelectorAll('[data-help]').forEach(node => attachHelpTooltip(node, node.dataset.help));
}

function attachHelpTooltip(target, text) {
    if (!target || !text || target.dataset.helpBound === 'true') return;
    target.dataset.helpBound = 'true';
    target.dataset.help = text;
    target.addEventListener('mouseenter', () => showFeatureTooltip(target, text));
    target.addEventListener('focus', () => showFeatureTooltip(target, text));
    target.addEventListener('mouseleave', hideFeatureTooltip);
    target.addEventListener('blur', hideFeatureTooltip);
    target.addEventListener('click', () => showFeatureTooltip(target, text, 1200));
    target.addEventListener('touchstart', () => showFeatureTooltip(target, text, 1300), { passive: true });
}

async function maybeAutoCleanAnalysisCache(force = false) {
    if (!state.autoCacheClean) return;
    try {
        const key = 'foxbearAutoCacheCleanLastRun';
        const now = Date.now();
        const last = Number(localStorage.getItem(key) || '0');
        const interval = 48 * 60 * 60 * 1000;
        if (!force && last && now - last < interval) return;
        await clearAnalysisCache({ silent: true, skipRender: true });
        localStorage.setItem(key, String(now));
        if (force) showToast('분석 캐시 자동정리를 실행했습니다.');
    } catch (error) {
        console.warn('Auto cache clean skipped:', error);
    }
}

function pauseAllPreviewAudio() {
    document.querySelectorAll('.custom-player audio').forEach(audio => {
        try { audio.pause(); } catch (error) {}
    });
}

function bindEvents() {
    window.addEventListener('scroll', hideFeatureTooltip, { passive: true });
    window.addEventListener('resize', hideFeatureTooltip);
    if (el.programInfoBtn) el.programInfoBtn.addEventListener('click', openProgramInfoDialog);
    if (el.programInfoClose) el.programInfoClose.addEventListener('click', closeProgramInfoDialog);
    if (el.programInfoDialog) {
        el.programInfoDialog.addEventListener('click', event => {
            if (event.target === el.programInfoDialog) closeProgramInfoDialog();
        });
    }
    if (el.featureOpenBtn) el.featureOpenBtn.addEventListener('click', openFeatureDialog);
    if (el.featureDialogClose) el.featureDialogClose.addEventListener('click', closeFeatureDialog);
    if (el.featureDialog) {
        el.featureDialog.addEventListener('click', event => {
            if (event.target === el.featureDialog) closeFeatureDialog();
        });
    }
    if (el.previewOpenBtn) el.previewOpenBtn.addEventListener('click', openPreviewDialog);
    if (el.previewDialogClose) el.previewDialogClose.addEventListener('click', closePreviewDialog);
    if (el.previewDialog) {
        el.previewDialog.addEventListener('click', event => {
            if (event.target === el.previewDialog) closePreviewDialog();
        });
    }
    if (el.smartSuggestApplyBtn) el.smartSuggestApplyBtn.addEventListener('click', applyAIRecommendationToSelected);
    window.addEventListener('keydown', event => {
        if (event.key === 'Escape' && el.programInfoDialog?.classList.contains('show')) closeProgramInfoDialog();
        if (event.key === 'Escape' && el.featureDialog?.classList.contains('show')) closeFeatureDialog();
        if (event.key === 'Escape' && el.previewDialog?.classList.contains('show')) closePreviewDialog();
    });
    el.fileDrop.addEventListener('click', () => el.fileInput.click());
    el.folderDrop.addEventListener('click', () => el.folderInput.click());
    el.fileDrop.addEventListener('keydown', e => activateByKeyboard(e, () => el.fileInput.click()));
    el.folderDrop.addEventListener('keydown', e => activateByKeyboard(e, () => el.folderInput.click()));
    setupDropZone(el.fileDrop);
    setupDropZone(el.folderDrop);

    el.fileInput.addEventListener('change', e => handleFiles(e.target.files));
    el.folderInput.addEventListener('change', e => handleFiles(e.target.files));

    el.genreSelect.addEventListener('change', () => {
        if (state.programmatic) return;
        applyPresetToSelected(el.genreSelect.value, true);
    });

    SLIDERS.forEach(slider => {
        const input = document.getElementById(slider.id);
        input.addEventListener('input', () => {
            const track = getSelectedTrack();
            const value = Number(input.value);
            document.getElementById(`value-${slider.id}`).textContent = formatSliderValue(slider, value);
            if (state.programmatic || !track) {
                updateSliderHint(slider.id);
                return;
            }
            track.settings[slider.id] = value;
            track.preset = 'custom';
            track.genreLocked = true;
            invalidateMasteredOutput(track, '사용자 커스텀 값이 적용되었습니다. 다시 마스터링하세요.', true);
            state.programmatic = true;
            setControlsFromSettings(track.settings, 'custom', track.recommendedSettings);
            state.programmatic = false;
            renderAll({ keepDetailAudio: true });
        });
    });

    el.pitchSlider.addEventListener('input', handlePitchSpeedChange);
    el.speedSlider.addEventListener('input', handlePitchSpeedChange);
    if (el.beatChangeSelect) el.beatChangeSelect.addEventListener('change', handleBeatChangeSelect);
    if (el.instrumentLayerSelect) el.instrumentLayerSelect.addEventListener('change', handleInstrumentLayerChange);
    if (el.instrumentAmountSelect) el.instrumentAmountSelect.addEventListener('change', handleInstrumentLayerChange);
    el.snapSemitone.addEventListener('change', () => {
        const track = getSelectedTrack();
        const transform = track ? cloneTransform(track.transform) : cloneTransform(DEFAULT_TRANSFORM);
        transform.snapSemitone = el.snapSemitone.checked;
        if (transform.snapSemitone) transform.pitchSemitones = Math.round(Number(el.pitchSlider.value));
        if (track) {
            track.transform = transform;
            invalidateMasteredOutput(track, '피치/속도 조정값이 적용되었습니다. 다시 마스터링하세요.', true);
        }
        setTransformControls(transform);
        renderAll({ keepDetailAudio: true });
    });
    el.aiApplyBtn.addEventListener('click', applyAIRecommendationToSelected);
    el.masterSelectedBtn.addEventListener('click', masterSelectedTracks);
    el.masterAllBtn.addEventListener('click', masterAllTracks);
    el.zipBtn.addEventListener('click', downloadZip);
    el.clearBtn.addEventListener('click', clearQueue);
    if (el.masterGoalSelect) {
        state.masterGoal = el.masterGoalSelect.value || state.masterGoal;
        applyMasterGoalDefaults(state.masterGoal, false);
        el.masterGoalSelect.addEventListener('change', () => {
            state.masterGoal = el.masterGoalSelect.value || 'natural';
            applyMasterGoalDefaults(state.masterGoal, true);
            invalidateAllMasteredOutput(`${getMasterGoalLabel(state.masterGoal)} 목표 모드로 변경되었습니다. 다시 마스터링하세요.`);
            renderAll({ keepDetailAudio: true });
            showToast(`${getMasterGoalLabel(state.masterGoal)} 목표 모드로 변경했습니다.`);
        });
    }
    if (el.outputFormatSelect) {
        state.outputFormat = el.outputFormatSelect.value || state.outputFormat;
        el.outputFormatSelect.addEventListener('change', () => {
            state.outputFormat = el.outputFormatSelect.value || 'wav24';
            invalidateAllMasteredOutput('출력 포맷이 변경되었습니다. 다시 마스터링하세요.');
            renderAll({ keepDetailAudio: true });
            showToast(getOutputFormatLabel(state.outputFormat) + ' 출력으로 변경했습니다.');
        });
    }
    if (el.targetLufsSelect) {
        state.targetLufs = Number(el.targetLufsSelect.value || state.targetLufs);
        el.targetLufsSelect.addEventListener('change', () => {
            state.targetLufs = Number(el.targetLufsSelect.value || -14);
            invalidateAllMasteredOutput(`${state.targetLufs} LUFS 타깃으로 변경되었습니다. 다시 마스터링하세요.`);
            renderAll({ keepDetailAudio: true });
            showToast(`${state.targetLufs} LUFS 타깃으로 변경했습니다.`);
        });
    }
    if (el.ceilingSelect) {
        state.ceilingDb = Number(el.ceilingSelect.value || state.ceilingDb);
        el.ceilingSelect.addEventListener('change', () => {
            state.ceilingDb = Number(el.ceilingSelect.value || -1.0);
            invalidateAllMasteredOutput(`${state.ceilingDb} dBTP 피크 천장으로 변경되었습니다. 다시 마스터링하세요.`);
            renderAll({ keepDetailAudio: true });
            showToast(`${state.ceilingDb} dBTP 피크 천장으로 변경했습니다.`);
        });
    }
    if (el.qualityModeSelect) {
        state.qualityMode = el.qualityModeSelect.value || state.qualityMode;
        el.qualityModeSelect.addEventListener('change', () => {
            state.qualityMode = el.qualityModeSelect.value || 'balanced';
            invalidateAllMasteredOutput(`${getQualityModeLabel(state.qualityMode)} 엔진 모드로 변경되었습니다. 다시 마스터링하세요.`);
            renderAll({ keepDetailAudio: true });
            showToast(`${getQualityModeLabel(state.qualityMode)} 엔진 모드로 변경했습니다.`);
        });
    }
    if (el.pitchEngineSelect) {
        state.pitchEngine = el.pitchEngineSelect.value || state.pitchEngine;
        el.pitchEngineSelect.addEventListener('change', () => {
            state.pitchEngine = el.pitchEngineSelect.value || 'auto';
            invalidateAllMasteredOutput(`${getPitchEngineLabel(state.pitchEngine)} 피치/속도 엔진으로 변경되었습니다. 다시 마스터링하세요.`);
            renderAll({ keepDetailAudio: true });
            showToast(`${getPitchEngineLabel(state.pitchEngine)} 피치/속도 엔진으로 변경했습니다.`);
        });
    }
    if (el.abMatchBtn) {
        el.abMatchBtn.addEventListener('click', () => {
            state.abLevelMatch = !state.abLevelMatch;
            renderAll({ keepDetailAudio: true });
            showToast(state.abLevelMatch ? 'A/B 레벨 매칭을 켰습니다.' : 'A/B 레벨 매칭을 껐습니다.');
        });
    }
    if (el.abLoopBtn) {
        el.abLoopBtn.addEventListener('click', () => {
            state.abLoopMode = !state.abLoopMode;
            renderAll({ keepDetailAudio: true });
            showToast(state.abLoopMode ? '5초 A/B 루프 비교를 켰습니다.' : '5초 A/B 루프 비교를 껐습니다.');
        });
    }
    if (el.genreLockBtn) {
        el.genreLockBtn.addEventListener('click', toggleGenreLockForSelected);
    }
    if (el.clearCacheBtn) {
        el.clearCacheBtn.addEventListener('click', async () => {
            await clearAnalysisCache();
        });
    }
    if (el.subscribeNudgeAction) {
        el.subscribeNudgeAction.addEventListener('click', () => {
            markSubscribePromptSeen();
            window.open('https://www.youtube.com/@FoxBearMusic?sub_confirmation=1', '_blank', 'noopener,noreferrer');
            hideSubscribePrompt();
        });
    }
    if (el.subscribeNudgeClose) {
        el.subscribeNudgeClose.addEventListener('click', () => {
            markSubscribePromptSeen();
            hideSubscribePrompt();
        });
    }
}



function enhanceActionSelects() {
    const selects = ACTION_SELECT_IDS.map(id => el[id] || document.getElementById(id)).filter(Boolean);
    if (!selects.length) return;
    ensureSelectPopupScaffold();

    selects.forEach(select => {
        const existing = document.querySelector(`.select-popup-trigger[data-select-for="${select.id}"]`);
        select.classList.add('native-select-hidden');
        select.dataset.fbEnhanced = 'true';
        select.setAttribute('tabindex', '-1');
        if (existing) {
            updateSelectTrigger(select);
            attachHelpTooltip(existing, `${getSelectLabel(select)} 옵션을 버튼형 팝업으로 선택합니다.`);
            return;
        }

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'select-popup-trigger';
        trigger.dataset.selectFor = select.id;
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.addEventListener('click', event => {
            event.preventDefault();
            openSelectPopup(select, trigger);
        });
        select.insertAdjacentElement('afterend', trigger);
        select.addEventListener('change', () => updateSelectTrigger(select));
        updateSelectTrigger(select);
        attachHelpTooltip(trigger, `${getSelectLabel(select)} 옵션을 버튼형 팝업으로 선택합니다.`);
    });
}

function ensureSelectPopupScaffold() {
    if (state.selectPopup && document.body.contains(state.selectPopup.backdrop)) return state.selectPopup;

    const stale = document.querySelector('.select-popup-backdrop');
    if (stale && stale.parentNode) stale.parentNode.removeChild(stale);

    const backdrop = document.createElement('div');
    backdrop.className = 'select-popup-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', event => {
        if (event.target === backdrop) closeSelectPopup();
    });

    const panel = document.createElement('div');
    panel.className = 'select-popup-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('tabindex', '-1');
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);

    state.selectPopup = { backdrop, panel, activeSelect: null, lastTrigger: null, keyBound: false };
    if (!state.selectPopupKeyBound) {
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && state.selectPopup?.activeSelect) closeSelectPopup();
        });
        window.addEventListener('resize', () => {
            if (state.selectPopup?.activeSelect) positionPopupPanel();
        }, { passive: true });
        state.selectPopupKeyBound = true;
    }
    return state.selectPopup;
}

function openSelectPopup(select, trigger) {
    const popup = state.selectPopup;
    if (!popup || !select) return;
    popup.activeSelect = select;
    popup.lastTrigger = trigger || null;
    ensureSelectPopupScaffold();
    popup.panel.textContent = '';
    popup.panel.dataset.select = select.id;
    popup.panel.className = 'select-popup-panel';
    popup.panel.classList.toggle('select-popup-dense', select.options.length >= 6);
    popup.panel.classList.toggle('select-popup-compact', select.options.length <= 4);
    popup.panel.classList.toggle('select-popup-genre', select.id === 'genreSelect');

    const label = getSelectLabel(select);
    const title = document.createElement('div');
    title.className = 'select-popup-title';
    title.textContent = label;
    popup.panel.appendChild(title);

    const list = document.createElement('div');
    list.className = 'select-popup-list';
    list.setAttribute('role', 'listbox');
    Array.from(select.options).forEach(option => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = `select-popup-option${option.value === select.value ? ' active' : ''}`;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', option.value === select.value ? 'true' : 'false');
        item.textContent = option.textContent.trim();
        item.addEventListener('click', () => {
            if (select.value !== option.value) {
                select.value = option.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
            closeSelectPopup();
            syncEnhancedSelectButtons();
        });
        list.appendChild(item);
    });
    popup.panel.appendChild(list);

    lockPageForPopup();
    popup.backdrop.classList.add('show');
    popup.backdrop.setAttribute('aria-hidden', 'false');
    positionPopupPanel();
    popup.panel.focus({ preventScroll: true });
}

function closeSelectPopup() {
    const popup = state.selectPopup;
    if (!popup) return;
    popup.backdrop.classList.remove('show');
    popup.backdrop.setAttribute('aria-hidden', 'true');
    const lastTrigger = popup.lastTrigger;
    popup.activeSelect = null;
    popup.lastTrigger = null;
    popup.panel.dataset.select = '';
    popup.panel.classList.remove('select-popup-dense', 'select-popup-compact', 'select-popup-genre');
    unlockPageForPopup();
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
}

function lockPageForPopup() {
    if (document.body.classList.contains('select-popup-open')) return;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    state.popupScrollY = scrollY;
    state.popupScrollbarCompensation = scrollbarWidth;
    if (scrollbarWidth > 0 && window.matchMedia('(min-width: 641px)').matches) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.documentElement.classList.add('select-popup-open');
    document.body.classList.add('select-popup-open');
}

function unlockPageForPopup() {
    if (!document.body.classList.contains('select-popup-open')) return;
    const scrollY = state.popupScrollY || 0;
    document.documentElement.classList.remove('select-popup-open');
    document.body.classList.remove('select-popup-open');
    document.body.style.paddingRight = '';
    state.popupScrollY = 0;
    state.popupScrollbarCompensation = 0;
    window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' });
}

function positionPopupPanel() {
    const popup = state.selectPopup;
    if (!popup || !popup.panel) return;
    popup.panel.style.transform = 'translate3d(0,0,0)';
}

function getSelectLabel(select) {
    if (!select) return '선택';
    const label = document.querySelector(`label[for="${select.id}"]`);
    return label ? label.textContent.trim() : '선택';
}

function updateSelectTrigger(select) {
    if (!select) return;
    const trigger = document.querySelector(`.select-popup-trigger[data-select-for="${select.id}"]`);
    if (!trigger) return;
    const selected = select.options[select.selectedIndex];
    const label = getSelectLabel(select);
    const value = selected ? selected.textContent.trim() : '선택';
    let valueEl = trigger.querySelector('.select-trigger-value');
    if (!valueEl) {
        trigger.textContent = '';
        valueEl = document.createElement('span');
        valueEl.className = 'select-trigger-value';
        const icon = document.createElement('span');
        icon.className = 'select-trigger-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '⌄';
        trigger.append(valueEl, icon);
    }
    valueEl.textContent = value;
    trigger.setAttribute('aria-label', `${label}: ${value}`);
}

function syncEnhancedSelectButtons() {
    ACTION_SELECT_IDS.forEach(id => updateSelectTrigger(el[id]));
}


function initUiGuards() {
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener('dragstart', event => event.preventDefault());
    document.addEventListener('selectstart', event => {
        const tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : '';
        if (!['input', 'textarea', 'select'].includes(tag)) event.preventDefault();
    });
    document.addEventListener('keydown', event => {
        const key = String(event.key || '').toLowerCase();
        const blocked =
            event.key === 'F12' ||
            (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
            (event.metaKey && event.altKey && ['i', 'j', 'c'].includes(key)) ||
            (event.ctrlKey && ['u', 's'].includes(key)) ||
            (event.metaKey && ['u', 's'].includes(key));
        if (blocked) {
            event.preventDefault();
            event.stopPropagation();
            showDecoyPage();
        }
    }, true);
}

function showDecoyPage() {
    try {
        document.body.innerHTML = `
            <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 20% 15%, rgba(127,255,212,.14), transparent 32%),linear-gradient(135deg,#070711,#11101b);color:#f3f0e8;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
                <section style="width:min(520px,100%);padding:28px;border-radius:28px;border:1px solid rgba(255,255,255,.14);background:rgba(20,18,33,.86);box-shadow:0 26px 80px rgba(0,0,0,.38);text-align:center;">
                    <div style="font-size:3rem;margin-bottom:10px;">🦊</div>
                    <h1 style="margin:0 0 10px;font-size:1.55rem;letter-spacing:-.04em;">FoxBear Studio Preview</h1>
                    <p style="margin:0;color:#a49fae;line-height:1.55;">이 화면은 보호 모드 미리보기입니다.<br>작업 화면으로 돌아가려면 페이지를 새로고침하세요.</p>
                </section>
            </main>`;
    } catch (error) {
        document.documentElement.innerHTML = '<body style="background:#070711;color:#f3f0e8;font-family:sans-serif;display:grid;place-items:center;min-height:100vh;">FoxBear Studio Preview</body>';
    }
}

function maybeShowSubscribePrompt() {
    if (!el.subscribeNudge) return;
    const now = Date.now();
    const coolDownMs = 60 * 60 * 1000;
    let lastShown = 0;
    try {
        lastShown = Number(localStorage.getItem('foxbearSubscribeNudgeLastShown') || '0');
    } catch (error) {
        lastShown = 0;
    }
    if (now - lastShown < coolDownMs) return;
    setTimeout(() => {
        el.subscribeNudge.classList.add('show');
        try { localStorage.setItem('foxbearSubscribeNudgeLastShown', String(now)); } catch (error) {}
        setTimeout(hideSubscribePrompt, 15000);
    }, 900);
}

function markSubscribePromptSeen() {
    try {
        localStorage.setItem('foxbearSubscribeNudgeLastShown', String(Date.now()));
    } catch (error) {
        // 저장 불가 환경에서는 현재 세션에서만 닫힙니다.
    }
}

function hideSubscribePrompt() {
    if (el.subscribeNudge) el.subscribeNudge.classList.remove('show');
}

function toggleFeature(key) {
    if (!Object.prototype.hasOwnProperty.call(state.featureFlags, key)) return;
    state.featureFlags[key] = !state.featureFlags[key];
    if (key === 'albumMatch') state.albumProfile = computeAlbumProfile();
    invalidateAllMasteredOutput(`${FEATURE_DEFINITIONS[key].label} 설정이 변경되었습니다. 다시 마스터링하세요.`);
    renderFeatureButtons();
    renderAll({ keepDetailAudio: true });
    showToast(`${FEATURE_DEFINITIONS[key].label}: ${state.featureFlags[key] ? '켜짐' : '꺼짐'} · ${FEATURE_DEFINITIONS[key].short}`);
}

function activateByKeyboard(event, callback) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        callback();
    }
}

function setupDropZone(zone) {
    zone.addEventListener('dragover', event => {
        event.preventDefault();
        zone.style.borderColor = 'rgba(127,255,212,0.78)';
    });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', event => {
        event.preventDefault();
        zone.style.borderColor = '';
        if (event.dataTransfer && event.dataTransfer.files) handleFiles(event.dataTransfer.files);
    });
}

async function handleFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    if (state.tracks.length + incoming.length > MAX_FILES) {
        showToast(`최대 ${MAX_FILES}개까지만 추가할 수 있습니다.`);
    }

    const room = Math.max(0, MAX_FILES - state.tracks.length);
    const limited = incoming.slice(0, room);
    let added = 0;

    for (const file of limited) {
        const validation = validateAudioFile(file);
        if (!validation.ok) {
            showToast(`${file.name}: ${validation.reason}`);
            continue;
        }
        const track = createTrack(file);
        state.tracks.push(track);
        if (!state.selectedId) {
            state.selectedId = track.id;
            state.selectedIds.add(track.id);
        }
        added += 1;
        renderAll();
        analyzeTrack(track).catch(error => {
            track.status = 'error';
            track.error = error.message || '분석 실패';
            track.report = track.error;
            renderAll();
        });
    }

    clearFileInputs();
    if (added) showToast(`${added}개 트랙 등록 완료. 지연 디코딩 분석을 시작합니다.`);
}

function validateAudioFile(file) {
    const lower = file.name.toLowerCase();
    const hasAudioType = file.type ? file.type.startsWith('audio/') : false;
    const hasVideoAudioType = file.type ? file.type === 'video/mp4' || file.type === 'video/quicktime' || file.type.startsWith('video/') : false;
    const hasAudioExt = AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext));
    const hasVideoAudioExt = VIDEO_AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext));
    if (!hasAudioType && !hasAudioExt && !(hasVideoAudioType && hasVideoAudioExt)) return { ok: false, reason: '지원 입력 형식이 아닙니다. WAV/MP3/FLAC/OGG/M4A/AAC/WEBM/MP4 계열을 권장합니다.' };
    if (file.size <= 0) return { ok: false, reason: '빈 파일입니다.' };
    if (file.size > MAX_FILE_SIZE) return { ok: false, reason: `파일이 너무 큽니다. 최대 ${formatBytes(MAX_FILE_SIZE)}까지 권장합니다.` };
    return { ok: true };
}

function createTrack(file) {
    const path = file.webkitRelativePath || file.name;
    const id = crypto.randomUUID ? crypto.randomUUID() : `track-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const url = URL.createObjectURL(file);
    return {
        id,
        file,
        name: file.name,
        path,
        size: file.size,
        type: file.type || 'unknown',
        status: 'queued',
        progress: 0,
        preset: 'custom',
        recommendedPreset: 'custom',
        confidence: 0,
        genreReason: '',
        genreAlternatives: [],
        genreLocked: false,
        analysisCacheHit: false,
        comparison: null,
        settings: cloneSettings(GENRE_PRESETS.custom),
        recommendedSettings: cloneSettings(GENRE_PRESETS.custom),
        transform: cloneTransform(DEFAULT_TRANSFORM),
        analysis: null,
        instrument: cloneInstrumentLayer(DEFAULT_INSTRUMENT_LAYER),
        instrumentInfo: null,
        abHighlightStartSec: null,
        trimInfo: null,
        albumApplied: null,
        truePeakInfo: null,
        finalizeInfo: null,
        performanceInfo: null,
        report: '대기 중',
        outBlob: null,
        outName: '',
        originalUrl: url,
        masteredUrl: null,
        error: null
    };
}

async function analyzeTrack(track) {
    track.status = 'analyzing';
    track.progress = 10;
    track.report = '임시 오디오 메모리 매핑 중';
    renderAll();

    let analysis = await readAnalysisCache(track);
    if (analysis) {
        track.analysisCacheHit = true;
        track.progress = 72;
        track.report = '분석 캐시 적중 · 장르/마스터링 추천값 계산 중';
        renderAll();
    } else {
        const buffer = await decodeAudio(track.file);
        track.progress = 50;
        track.report = '밝기, 스테레오 폭, 공진 힌트 분석 중';
        renderAll();
        analysis = await analyzeBufferAsync(buffer);
        analysis.abHighlightStartSec = estimateABHighlightStart(buffer);
        track.abHighlightStartSec = analysis.abHighlightStartSec;
        track.analysisCacheHit = false;
        await writeAnalysisCache(track, analysis);
    }
    if (analysis && Number.isFinite(Number(analysis.abHighlightStartSec))) track.abHighlightStartSec = Number(analysis.abHighlightStartSec);
    const recommendation = recommendPreset(track.name, analysis);
    const settings = makeRecommendedSettings(recommendation.preset, analysis);

    track.analysis = analysis;
    track.recommendedPreset = recommendation.preset;
    track.preset = recommendation.preset;
    track.confidence = recommendation.confidence;
    track.genreReason = recommendation.reason || '';
    track.genreAlternatives = recommendation.alternatives || [];
    track.settings = cloneSettings(settings);
    track.recommendedSettings = cloneSettings(settings);
    track.status = 'ready';
    track.progress = 100;
    track.report = buildReport(track);

    if (state.selectedId === track.id) applyTrackToControls(track);
    if (state.featureFlags.albumMatch) state.albumProfile = computeAlbumProfile();
    renderAll();
}

async function decodeAudio(file) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('이 브라우저는 Web Audio API를 지원하지 않습니다.');
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new AudioContextClass();
    try {
        return await audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
        const lower = String(file?.name || '').toLowerCase();
        const mp4Hint = VIDEO_AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext)) ? ' MP4는 브라우저가 지원하는 AAC/오디오 트랙일 때만 불러올 수 있습니다.' : '';
        throw new Error('오디오 파일 복원에 실패했습니다. 손상되었거나 브라우저 미지원 코덱일 수 있습니다.' + mp4Hint);
    } finally {
        if (audioContext.close) await audioContext.close().catch(() => {});
    }
}



function getAnalysisCacheKey(track) {
    const f = track && track.file ? track.file : {};
    return [f.name || track.name || 'audio', f.size || track.size || 0, f.lastModified || 0, APP_VERSION].join('|');
}

function openAnalysisCacheDb() {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) return resolve(null);
        const req = indexedDB.open(ANALYSIS_CACHE_DB, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(ANALYSIS_CACHE_STORE)) db.createObjectStore(ANALYSIS_CACHE_STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
    });
}

async function readAnalysisCache(track) {
    try {
        const db = await openAnalysisCacheDb();
        if (!db) return null;
        const key = getAnalysisCacheKey(track);
        return await new Promise(resolve => {
            const tx = db.transaction(ANALYSIS_CACHE_STORE, 'readonly');
            const req = tx.objectStore(ANALYSIS_CACHE_STORE).get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
            tx.oncomplete = () => db.close();
        });
    } catch (error) {
        console.warn('Analysis cache read failed:', error);
        return null;
    }
}

async function writeAnalysisCache(track, analysis) {
    try {
        const db = await openAnalysisCacheDb();
        if (!db || !analysis) return;
        const key = getAnalysisCacheKey(track);
        await new Promise(resolve => {
            const tx = db.transaction(ANALYSIS_CACHE_STORE, 'readwrite');
            tx.objectStore(ANALYSIS_CACHE_STORE).put(analysis, key);
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); resolve(); };
        });
    } catch (error) {
        console.warn('Analysis cache write failed:', error);
    }
}

async function clearAnalysisCache(options = {}) {
    try {
        const db = await openAnalysisCacheDb();
        if (!db) return;
        await new Promise(resolve => {
            const tx = db.transaction(ANALYSIS_CACHE_STORE, 'readwrite');
            tx.objectStore(ANALYSIS_CACHE_STORE).clear();
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); resolve(); };
        });
        state.tracks.forEach(track => { track.analysisCacheHit = false; });
        if (!options.skipRender) renderAll({ keepDetailAudio: true });
        if (!options.silent) showToast('분석 캐시를 정리했습니다.');
    } catch (error) {
        console.warn('Analysis cache clear failed:', error);
    }
}

async function analyzeBufferAsync(buffer) {
    if (!window.Worker) return analyzeBuffer(buffer);
    try {
        const worker = new Worker(ANALYSIS_WORKER_URL);
        const channels = buffer.numberOfChannels;
        const channelBuffers = [];
        for (let ch = 0; ch < channels; ch += 1) channelBuffers.push(buffer.getChannelData(ch).slice().buffer);
        const payload = {
            sampleRate: buffer.sampleRate,
            duration: buffer.duration,
            channels,
            length: buffer.length,
            channelBuffers
        };
        const result = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                worker.terminate();
                reject(new Error('분석 워커 시간이 초과되어 메인 분석으로 전환합니다.'));
            }, 30000);
            worker.onmessage = event => {
                clearTimeout(timer);
                worker.terminate();
                if (event.data && event.data.ok) resolve(event.data.analysis);
                else reject(new Error(event.data?.error || '분석 워커 실패'));
            };
            worker.onerror = error => {
                clearTimeout(timer);
                worker.terminate();
                reject(error);
            };
            worker.postMessage(payload, channelBuffers);
        });
        return result;
    } catch (error) {
        console.warn('Analysis worker fallback:', error);
        return analyzeBuffer(buffer);
    }
}

function analyzeBuffer(buffer) {
    const channels = buffer.numberOfChannels;
    const totalSamples = buffer.length;
    const step = Math.max(1, Math.floor(totalSamples / 240000));
    const channelData = [];
    for (let ch = 0; ch < channels; ch += 1) channelData.push(buffer.getChannelData(ch));

    let peak = 0;
    let sumSq = 0;
    let count = 0;
    let diffSum = 0;
    let zeroCrossings = 0;
    let prevMono = 0;
    let midSq = 0;
    let sideSq = 0;
    let stereoCount = 0;
    let highFreqEnergy = 0;
    let midHighEnergy = 0;
    const effectiveRate = Math.max(1000, buffer.sampleRate / step);
    const lpCoeff = freq => clamp(1 - Math.exp(-2 * Math.PI * freq / effectiveRate), 0.001, 0.98);
    const c120 = lpCoeff(120);
    const c700 = lpCoeff(700);
    const c3500 = lpCoeff(3500);
    let lp120 = 0;
    let lp700 = 0;
    let lp3500 = 0;
    let bassSq = 0;
    let lowMidSq = 0;
    let midBandSq = 0;
    let highBandSq = 0;
    let transientHits = 0;
    let bandCount = 0;

    for (let i = 0; i < totalSamples; i += step) {
        let mono = 0;
        for (let ch = 0; ch < channels; ch += 1) {
            const sample = channelData[ch][i] || 0;
            const abs = Math.abs(sample);
            if (abs > peak) peak = abs;
            sumSq += sample * sample;
            mono += sample / channels;
            count += 1;
        }

        const delta = mono - prevMono;
        diffSum += Math.abs(delta);
        const absDelta = Math.abs(delta);
        if (absDelta > 0.15) highFreqEnergy += 1;
        if (absDelta > 0.05 && absDelta <= 0.15) midHighEnergy += 1;
        if (absDelta > 0.11) transientHits += 1;
        if ((mono >= 0 && prevMono < 0) || (mono < 0 && prevMono >= 0)) zeroCrossings += 1;

        lp120 += c120 * (mono - lp120);
        lp700 += c700 * (mono - lp700);
        lp3500 += c3500 * (mono - lp3500);
        const bassBand = lp120;
        const lowMidBand = lp700 - lp120;
        const midBand = lp3500 - lp700;
        const highBand = mono - lp3500;
        bassSq += bassBand * bassBand;
        lowMidSq += lowMidBand * lowMidBand;
        midBandSq += midBand * midBand;
        highBandSq += highBand * highBand;
        bandCount += 1;

        prevMono = mono;

        if (channels >= 2) {
            const left = channelData[0][i] || 0;
            const right = channelData[1][i] || 0;
            const mid = (left + right) * 0.5;
            const side = (left - right) * 0.5;
            midSq += mid * mid;
            sideSq += side * side;
            stereoCount += 1;
        }
    }

    const rms = Math.sqrt(sumSq / Math.max(1, count));
    const crest = peak / Math.max(0.000001, rms);
    const zcr = zeroCrossings / Math.max(1, totalSamples / step);
    const avgDiff = diffSum / Math.max(1, totalSamples / step);
    const brightness = clamp01((avgDiff / Math.max(0.0001, rms)) * 2.15 + zcr * 2.7);
    const stereoWidth = channels >= 2 ? clamp01(Math.sqrt(sideSq / Math.max(1, stereoCount)) / Math.max(0.0001, Math.sqrt(midSq / Math.max(1, stereoCount)))) : 0;
    const loudnessHint = 20 * Math.log10(Math.max(0.000001, rms));
    const peakDb = 20 * Math.log10(Math.max(0.000001, peak));
    const metallicHint = clamp01(brightness * 0.65 + (highFreqEnergy / Math.max(1, midHighEnergy)) * 0.3 + zcr * 1.5);
    const silence = rms < 0.00008 || peak < 0.0005;
    const loudnessIntegrated = loudnessHint - 0.691;
    const headroomDb = -1.0 - peakDb;
    const spectralTotal = Math.max(0.000000001, bassSq + lowMidSq + midBandSq + highBandSq);
    const bassRatio = clamp01(bassSq / spectralTotal);
    const lowMidRatio = clamp01(lowMidSq / spectralTotal);
    const midRatio = clamp01(midBandSq / spectralTotal);
    const highRatio = clamp01(highBandSq / spectralTotal);
    const transientDensity = clamp01(transientHits / Math.max(1, bandCount) * 4.0);

    let estimatedTargetFreq = 5200;
    if (zcr > 0.42) estimatedTargetFreq = 7400;
    else if (zcr < 0.18) estimatedTargetFreq = 3100;

    return {
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        channels,
        totalSamples,
        peak,
        peakDb,
        rms,
        loudnessHint,
        crest,
        brightness,
        stereoWidth,
        metallicHint,
        zeroCrossRate: zcr,
        loudnessIntegrated,
        headroomDb,
        bassRatio,
        lowMidRatio,
        midRatio,
        highRatio,
        transientDensity,
        silence,
        targetDynamicFreq: estimatedTargetFreq
    };
}


function estimateABHighlightStart(buffer) {
    if (!buffer || !Number.isFinite(buffer.duration) || buffer.duration <= 8) return 0;
    const sampleRate = buffer.sampleRate || 44100;
    const channels = Math.min(2, buffer.numberOfChannels || 1);
    const windowSec = 5;
    const startMin = Math.max(0, buffer.duration * 0.12);
    const startMax = Math.max(0, buffer.duration - windowSec - Math.min(2, buffer.duration * 0.05));
    const hopSec = buffer.duration > 240 ? 1.5 : 1;
    const sampleStep = Math.max(256, Math.floor(sampleRate * 0.018));
    let bestStart = clamp(buffer.duration * 0.33, 0, startMax);
    let bestScore = -Infinity;
    let prevAvg = 0;

    for (let startSec = startMin; startSec <= startMax; startSec += hopSec) {
        const start = Math.floor(startSec * sampleRate);
        const end = Math.min(buffer.length, start + Math.floor(windowSec * sampleRate));
        if (end <= start + sampleStep) continue;
        let sumSq = 0;
        let sumAbs = 0;
        let transient = 0;
        let count = 0;
        let last = 0;
        for (let i = start; i < end; i += sampleStep) {
            let mono = 0;
            for (let ch = 0; ch < channels; ch += 1) mono += buffer.getChannelData(ch)[i] || 0;
            mono /= channels;
            const abs = Math.abs(mono);
            sumSq += mono * mono;
            sumAbs += abs;
            transient += Math.abs(abs - last);
            last = abs;
            count += 1;
        }
        const rms = Math.sqrt(sumSq / Math.max(1, count));
        const avgAbs = sumAbs / Math.max(1, count);
        const contrast = Math.abs(avgAbs - prevAvg);
        prevAvg = avgAbs;
        const centerWeight = 1 - Math.abs((startSec + windowSec * 0.5) / buffer.duration - 0.52) * 0.34;
        const introPenalty = startSec < buffer.duration * 0.18 ? 0.88 : 1;
        const score = (rms * 0.72 + transient * 0.22 + contrast * 0.12) * centerWeight * introPenalty;
        if (score > bestScore) {
            bestScore = score;
            bestStart = startSec;
        }
    }
    return Number(clamp(bestStart, 0, startMax).toFixed(2));
}


function estimateABHighlightStartFromPair(beforeBuffer, afterBuffer, analysis) {
    const beforeDuration = Number(beforeBuffer?.duration || 0);
    const afterDuration = Number(afterBuffer?.duration || 0);
    const duration = Math.min(beforeDuration, afterDuration);
    if (!beforeBuffer || !afterBuffer || !Number.isFinite(duration) || duration <= 8) {
        return estimateABHighlightStart(beforeBuffer || afterBuffer);
    }
    const sampleRate = Math.min(beforeBuffer.sampleRate || 44100, afterBuffer.sampleRate || 44100);
    const windowSec = 5;
    const startMin = Math.max(0, duration * 0.10);
    const startMax = Math.max(0, duration - windowSec - Math.min(2, duration * 0.04));
    const hopSec = duration > 240 ? 1.5 : 1;
    const step = Math.max(512, Math.floor(sampleRate * 0.022));
    const beforeChannels = Math.min(2, beforeBuffer.numberOfChannels || 1);
    const afterChannels = Math.min(2, afterBuffer.numberOfChannels || 1);
    const beforeRate = beforeBuffer.sampleRate || sampleRate;
    const afterRate = afterBuffer.sampleRate || sampleRate;
    const beforeData = Array.from({ length: beforeChannels }, (_, ch) => beforeBuffer.getChannelData(ch));
    const afterData = Array.from({ length: afterChannels }, (_, ch) => afterBuffer.getChannelData(ch));
    let bestStart = Number.isFinite(Number(analysis?.abHighlightStartSec)) ? Number(analysis.abHighlightStartSec) : clamp(duration * 0.33, 0, startMax);
    let bestScore = -Infinity;

    for (let startSec = startMin; startSec <= startMax; startSec += hopSec) {
        const endSec = Math.min(duration, startSec + windowSec);
        let energy = 0;
        let diff = 0;
        let transient = 0;
        let count = 0;
        let lastDiff = 0;
        for (let sec = startSec; sec < endSec; sec += step / sampleRate) {
            const beforeIndex = Math.min(beforeBuffer.length - 1, Math.max(0, Math.floor(sec * beforeRate)));
            const afterIndex = Math.min(afterBuffer.length - 1, Math.max(0, Math.floor(sec * afterRate)));
            let beforeMono = 0;
            let afterMono = 0;
            for (let ch = 0; ch < beforeChannels; ch += 1) beforeMono += beforeData[ch][beforeIndex] || 0;
            for (let ch = 0; ch < afterChannels; ch += 1) afterMono += afterData[ch][afterIndex] || 0;
            beforeMono /= Math.max(1, beforeChannels);
            afterMono /= Math.max(1, afterChannels);
            const d = Math.abs(afterMono - beforeMono);
            energy += Math.abs(beforeMono) + Math.abs(afterMono);
            diff += d;
            transient += Math.abs(d - lastDiff);
            lastDiff = d;
            count += 1;
        }
        if (!count) continue;
        const avgEnergy = energy / count;
        const avgDiff = diff / count;
        const avgTransient = transient / count;
        const centerWeight = 1 - Math.abs((startSec + windowSec * 0.5) / duration - 0.52) * 0.30;
        const introPenalty = startSec < duration * 0.15 ? 0.90 : 1;
        const score = (avgDiff * 0.56 + avgEnergy * 0.32 + avgTransient * 0.26) * centerWeight * introPenalty;
        if (score > bestScore) {
            bestScore = score;
            bestStart = startSec;
        }
    }
    return Number(clamp(bestStart, 0, startMax).toFixed(2));
}

function getDevicePerformanceTier() {
    const memory = Number(navigator.deviceMemory || 0);
    const cores = Number(navigator.hardwareConcurrency || 0);
    const ua = navigator.userAgent || '';
    const mobile = /Android|iPhone|iPad|iPod|Mobile|KAKAOTALK|NAVER|Instagram|Line/i.test(ua) || (window.matchMedia && window.matchMedia('(max-width: 640px)').matches);
    let tier = 'desktop';
    if (mobile) tier = 'mobile';
    if ((memory && memory <= 3) || (cores && cores <= 4)) tier = mobile ? 'mobile-lite' : 'desktop-lite';
    return { tier, mobile, memory, cores };
}

function getSmartPerformanceGuardDecision(track, buffer, requestedOutputFormat) {
    const device = getDevicePerformanceTier();
    const duration = Number(buffer?.duration || track?.analysis?.duration || 0);
    const sourceMode = state.qualityMode || 'balanced';
    const mp3 = String(requestedOutputFormat || '').startsWith('mp3');
    const longFile = duration >= 8 * 60;
    const veryLongFile = duration >= 15 * 60;
    let qualityMode = sourceMode;
    const reasons = [];
    if (state.smartPerformanceGuard) {
        if (device.tier === 'mobile-lite' && sourceMode === 'max') {
            qualityMode = 'balanced';
            reasons.push('구형/저메모리 모바일 Max 검사 완화');
        }
        if (device.mobile && veryLongFile && sourceMode !== 'fast') {
            qualityMode = 'fast';
            reasons.push('긴 파일 모바일 처리 보호');
        } else if (device.mobile && longFile && sourceMode === 'max') {
            qualityMode = 'balanced';
            reasons.push('긴 파일 모바일 Max 검사 균형화');
        }
        if (mp3 && device.mobile && duration >= 10 * 60 && qualityMode === 'max') {
            qualityMode = 'balanced';
            reasons.push('MP3 인코딩 여유 확보');
        }
    }
    const truePeak = state.featureFlags.truePeakGuard !== false;
    if (!reasons.length) reasons.push(state.smartPerformanceGuard ? '원래 품질 유지' : '성능 가드 OFF');
    return {
        enabled: Boolean(state.smartPerformanceGuard),
        sourceQualityMode: sourceMode,
        qualityMode,
        truePeak,
        duration,
        deviceTier: device.tier,
        mobile: device.mobile,
        memory: device.memory,
        cores: device.cores,
        changed: qualityMode !== sourceMode,
        reasons
    };
}

function computeEngineSafetyInfo(track, buffer, finalizeInfo) {
    const analysis = track?.analysis || {};
    const settings = track?.settings || GENRE_PRESETS.custom;
    let score = 100;
    const notes = [];
    const intensity = Number(settings.intensity || 100);
    const width = Number(settings.width || 50);
    const clarity = Number(settings.clarity || 50);
    const punch = Number(settings.dynamicPunch || 35);
    const removal = Number(settings.metallicRemoval || 42);
    const pitch = Math.abs(Number(track?.transform?.pitchSemitones || 0));
    const speedDelta = Math.abs(Number(track?.transform?.speedRatio || 1) - 1);
    const peakAfterDb = Number.isFinite(finalizeInfo?.peakAfter) ? ampToDb(finalizeInfo.peakAfter) : NaN;
    const metallic = Number(analysis.metallicHint || 0);
    const high = Number(analysis.highRatio || 0);
    const bass = Number(analysis.bassRatio || 0);

    if (intensity > 140) { score -= Math.min(20, (intensity - 140) * 0.25); notes.push('강도 높음'); }
    if (width > 72 && !state.featureFlags.phaseSafe) { score -= 12; notes.push('공간감 보호 OFF'); }
    if (clarity > 70 && (high > 0.38 || metallic > 0.55)) { score -= 10; notes.push('고역 피로 가능'); }
    if (punch > 68 && Number(analysis.transientDensity || 0) > 0.55) { score -= 8; notes.push('트랜지언트 과다 가능'); }
    if (bass > 0.48 && !state.featureFlags.lowEndAnchor) { score -= 10; notes.push('저역 고정 OFF'); }
    if (metallic > 0.62 && removal < 48) { score -= 8; notes.push('금속성 제거 약함'); }
    if (pitch >= 7 || speedDelta >= 0.25) {
        const protectedBy = state.featureFlags.vocalProtect && state.featureFlags.melodyPreserve && state.featureFlags.vocalFocusPlus;
        score -= protectedBy ? 3 : 12;
        notes.push(protectedBy ? '극단 피치/BPM 보호 ON' : '극단 피치/BPM 보호 약함');
    }
    if (!state.featureFlags.truePeakGuard) { score -= 12; notes.push('True Peak OFF'); }
    if (Number.isFinite(peakAfterDb) && peakAfterDb > -0.6) { score -= 8; notes.push('피크 여유 적음'); }
    if (state.smartPerformanceGuard && track?.performanceGuardInfo?.changed) { score += 2; notes.push('성능 가드 품질 균형'); }

    score = Math.round(clamp(score, 0, 100));
    const label = score >= 86 ? '안전' : score >= 72 ? '주의 낮음' : score >= 58 ? '주의' : '과처리 위험';
    const tone = score >= 86 ? 'safe' : score >= 72 ? 'good' : score >= 58 ? 'warn' : 'danger';
    if (!notes.length) notes.push('현재 설정 안정적');
    return { score, label, tone, notes: notes.slice(0, 4), peakAfterDb };
}

function formatPerformanceGuardInfo(info) {
    if (!info) return state.smartPerformanceGuard ? '대기 · 렌더 시 자동 판단' : 'OFF';
    const mode = `${getQualityModeLabel(info.sourceQualityMode)} → ${getQualityModeLabel(info.qualityMode)}`;
    const changed = info.changed ? '조정됨' : '유지';
    return `${changed} · ${mode} · ${info.reasons.join(', ')}`;
}

function recommendPreset(fileName, analysis) {
    const name = fileName.toLowerCase();
    const scores = {};
    Object.keys(GENRE_PRESETS).forEach(key => { if (key !== 'custom') scores[key] = 0; });

    if (analysis.silence) return { preset: 'custom', confidence: 0, reason: '무음 또는 매우 작은 신호로 분석 보류', alternatives: [] };

    const features = extractGenreFeatures(analysis);
    const { bright, wide, punch, soft, dark, metallic, loud, crest, bass, lowMid, high, transient } = features;

    // 자동 장르 판별은 파일명 키워드 + 오디오 특징을 같이 봅니다.
    // 파일명 힌트가 없을 때는 Future Bass/House/Drill 같은 세부 장르가 과하게 선택되지 않도록 보수적으로 처리합니다.
    const profiles = {
        pop:        { b: 0.54, w: 0.40, p: 0.40, d: 0.46, m: 0.42, l: 0.52, prior: 0.56 },
        kpop:       { b: 0.60, w: 0.47, p: 0.46, d: 0.40, m: 0.46, l: 0.58, prior: 0.46 },
        kballad:    { b: 0.45, w: 0.34, p: 0.22, d: 0.56, m: 0.36, l: 0.40, prior: 0.52 },
        rnb:        { b: 0.40, w: 0.34, p: 0.34, d: 0.60, m: 0.36, l: 0.46, prior: 0.44 },
        ballad:     { b: 0.46, w: 0.30, p: 0.22, d: 0.56, m: 0.35, l: 0.38, prior: 0.50 },
        acoustic:   { b: 0.42, w: 0.24, p: 0.20, d: 0.60, m: 0.28, l: 0.34, prior: 0.30 },
        citypop:    { b: 0.50, w: 0.42, p: 0.34, d: 0.50, m: 0.42, l: 0.48, prior: 0.18 },
        dance:      { b: 0.60, w: 0.50, p: 0.56, d: 0.40, m: 0.46, l: 0.66, prior: 0.18 },
        synthpop:   { b: 0.58, w: 0.52, p: 0.38, d: 0.42, m: 0.55, l: 0.52, prior: 0.02 },
        house:      { b: 0.56, w: 0.48, p: 0.58, d: 0.44, m: 0.42, l: 0.68, prior: -0.02 },
        futurebass: { b: 0.68, w: 0.66, p: 0.42, d: 0.32, m: 0.62, l: 0.62, prior: -0.72 },
        edm:        { b: 0.66, w: 0.58, p: 0.66, d: 0.34, m: 0.50, l: 0.72, prior: -0.10 },
        trap:       { b: 0.42, w: 0.28, p: 0.70, d: 0.58, m: 0.34, l: 0.64, prior: 0.24 },
        drill:      { b: 0.38, w: 0.24, p: 0.74, d: 0.62, m: 0.34, l: 0.64, prior: -0.06 },
        hiphop:     { b: 0.42, w: 0.32, p: 0.58, d: 0.58, m: 0.34, l: 0.56, prior: 0.42 },
        boombap:    { b: 0.34, w: 0.26, p: 0.52, d: 0.66, m: 0.28, l: 0.48, prior: 0.08 },
        globalpop:  { b: 0.56, w: 0.46, p: 0.44, d: 0.44, m: 0.52, l: 0.52, prior: 0.06 },
        lofi:       { b: 0.26, w: 0.24, p: 0.20, d: 0.74, m: 0.30, l: 0.32, prior: 0.06 },
        rock:       { b: 0.56, w: 0.28, p: 0.60, d: 0.44, m: 0.42, l: 0.58, prior: 0.30 },
        cinematic:  { b: 0.48, w: 0.58, p: 0.34, d: 0.54, m: 0.38, l: 0.48, prior: -0.10 },
        spatial:    { b: 0.54, w: 0.66, p: 0.36, d: 0.44, m: 0.44, l: 0.50, prior: -0.18 },
        tape:       { b: 0.36, w: 0.30, p: 0.30, d: 0.68, m: 0.32, l: 0.38, prior: -0.08 },
        punch:      { b: 0.54, w: 0.34, p: 0.72, d: 0.42, m: 0.42, l: 0.64, prior: -0.04 }
    };

    Object.entries(profiles).forEach(([key, p]) => {
        const distance =
            Math.abs(bright - p.b) * 1.30 +
            Math.abs(wide - p.w) * 1.05 +
            Math.abs(punch - p.p) * 1.28 +
            Math.abs(dark - p.d) * 0.72 +
            Math.abs(metallic - p.m) * 0.54 +
            Math.abs(loud - p.l) * 0.48;
        scores[key] = 5.0 - distance * 3.15 + p.prior;
    });

    // 세부 장르 쏠림 방지용 보조 지문입니다. 저역/고역/트랜지언트가 맞지 않으면 과감히 보수적으로 돌립니다.
    scores.trap += bass * 0.44 + punch * 0.22 - high * 0.18;
    scores.drill += bass * 0.36 + punch * 0.26 - wide * 0.18;
    scores.hiphop += bass * 0.28 + lowMid * 0.24 + punch * 0.14;
    scores.boombap += lowMid * 0.26 + dark * 0.20 - high * 0.16;
    scores.ballad += soft * 0.26 + lowMid * 0.18 - transient * 0.14;
    scores.kballad += soft * 0.30 + lowMid * 0.16 - transient * 0.12;
    scores.rnb += lowMid * 0.24 + bass * 0.16 + soft * 0.12;
    scores.acoustic += (1 - bass) * 0.14 + (1 - high) * 0.12 + soft * 0.14;
    scores.rock += transient * 0.22 + punch * 0.18 + lowMid * 0.12;
    scores.edm += high * 0.18 + transient * 0.22 + bass * 0.16;
    scores.futurebass += (bass > 0.24 && high > 0.18 && wide > 0.58 && punch < 0.62) ? 0.18 : -0.82;
    scores.house += (transient > 0.32 && punch > 0.48 && bass > 0.18) ? 0.16 : -0.26;
    scores.synthpop += (high > 0.20 && metallic > 0.44 && punch < 0.58) ? 0.10 : -0.22;

    const keywordMap = {
        kpop: ['kpop', 'k-pop', 'idol', '아이돌'],
        pop: ['pop', 'vocal pop', 'mainstream'],
        rnb: ['rnb', 'r&b', 'soul', 'slow jam'],
        kballad: ['k-ballad', 'kballad', '어떤 안녕', '기록'],
        ballad: ['ballad', 'piano ballad', 'vocal'],
        acoustic: ['acoustic', 'guitar', 'singer', 'songwriter', 'unplugged'],
        citypop: ['city pop', 'citypop', 'retro', '80s', 'new jack'],
        synthpop: ['synth pop', 'synthpop', 'electro pop'],
        house: ['house', 'deep house', 'club'],
        futurebass: ['future bass', 'futurebass'],
        edm: ['edm', 'dubstep', 'big room', 'festival'],
        dance: ['dance', 'electronic'],
        trap: ['trap', '808'],
        drill: ['drill'],
        hiphop: ['hiphop', 'hip-hop', 'rap'],
        boombap: ['boom bap', 'boombap'],
        globalpop: ['ethnic', 'latin', 'afro', 'percussion', 'world', 'hindi', 'india'],
        lofi: ['lofi', 'lo-fi', 'chill', 'study', 'vinyl'],
        rock: ['rock', 'metal', 'punk', 'band'],
        cinematic: ['cinematic', 'ost', 'score', 'orchestra', 'film'],
        spatial: ['spatial', 'wide', 'ambient', 'atmospheric'],
        tape: ['tape', 'analog', 'cassette', 'warm'],
        punch: ['punch', 'live', 'festival', 'power']
    };
    const explicit = {};
    Object.entries(keywordMap).forEach(([preset, words]) => {
        explicit[preset] = keywordHit(name, words);
        if (explicit[preset]) scores[preset] += ['pop', 'dance', 'ballad'].includes(preset) ? 2.6 : 4.4;
    });

    const broadPresets = ['pop', 'kpop', 'kballad', 'rnb', 'ballad', 'dance', 'trap', 'hiphop', 'rock', 'edm', 'punch'];
    const guardedPresets = ['futurebass', 'house', 'synthpop', 'citypop', 'drill', 'boombap', 'globalpop', 'lofi', 'acoustic', 'cinematic', 'spatial', 'tape'];
    const gatePass = {
        futurebass: bright > 0.68 && wide > 0.62 && punch > 0.32 && punch < 0.58 && metallic > 0.50 && loud > 0.52 && bass > 0.22 && high > 0.16,
        house: punch > 0.54 && loud > 0.58 && wide > 0.40 && bright > 0.48,
        synthpop: bright > 0.52 && wide > 0.46 && metallic > 0.46 && punch < 0.56,
        citypop: bright > 0.42 && bright < 0.62 && punch < 0.48 && soft > 0.45 && wide > 0.34,
        drill: punch > 0.68 && wide < 0.36 && dark > 0.48,
        boombap: punch > 0.44 && punch < 0.64 && dark > 0.55 && wide < 0.38,
        globalpop: wide > 0.38 && metallic > 0.46 && bright > 0.48,
        lofi: bright < 0.36 && punch < 0.36 && dark > 0.60,
        acoustic: wide < 0.34 && punch < 0.34 && loud < 0.48 && metallic < 0.44,
        cinematic: wide > 0.48 && soft > 0.42 && lowMid > 0.20,
        spatial: wide > 0.58 && high > 0.20 && punch < 0.58,
        tape: dark > 0.56 && lowMid > 0.22 && metallic < 0.48,
        punch: punch > 0.62 && transient > 0.36
    };

    guardedPresets.forEach(preset => {
        if (!explicit[preset] && !gatePass[preset]) scores[preset] -= 1.45;
    });

    // 특징이 애매한 곡은 세부 일렉트로닉 장르보다 넓은 장르로 우선 배치합니다.
    const explicitElectronic = ['edm', 'futurebass', 'house', 'synthpop', 'dance'].some(preset => explicit[preset]);
    if (!explicitElectronic) {
        scores.futurebass -= 0.90;
        scores.house -= 0.45;
        scores.synthpop -= 0.32;
        if (!(bright > 0.64 && punch > 0.60 && loud > 0.64)) scores.edm -= 0.35;
    }
    if (soft > 0.58) {
        scores.kballad += 0.42;
        scores.ballad += 0.40;
        scores.rnb += 0.24;
        scores.futurebass -= 0.44;
        scores.edm -= 0.28;
    }
    if (wide < 0.33) {
        scores.acoustic += 0.20;
        scores.hiphop += 0.24;
        scores.trap += 0.18;
        scores.futurebass -= 0.58;
        scores.house -= 0.26;
    }
    if (punch > 0.66 && dark > 0.48 && wide < 0.40) {
        scores.hiphop += 0.35;
        scores.trap += 0.30;
        scores.edm -= 0.24;
    }
    if (crest > 7.5 && soft < 0.38) {
        scores.rock += 0.22;
        scores.edm += 0.10;
    }

    let sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    let best = sorted[0];
    let second = sorted[1];
    let margin = best[1] - second[1];

    if (guardedPresets.includes(best[0]) && !explicit[best[0]] && margin < 0.85) {
        const safer = sorted.find(([preset]) => broadPresets.includes(preset));
        if (safer) best = safer;
        sorted = [best, ...sorted.filter(item => item[0] !== best[0])];
        second = sorted[1];
        margin = best[1] - second[1];
    }

    const confidence = clamp(Math.round(32 + margin * 26 + best[1] * 5), 28, 95);
    const alternatives = sorted.slice(0, 4).map(([preset, score]) => ({ preset, label: PRESET_LABELS[preset] || preset, score: Number(score.toFixed(2)) }));
    const reason = makeGenreReason(best[0], features, alternatives, explicit[best[0]] ? '파일명 힌트 반영' : '오디오 특징 기준');
    return { preset: best[0], confidence, reason, alternatives };
}

function extractGenreFeatures(analysis) {
    const bright = clamp01(analysis.brightness || 0);
    const wide = clamp01(analysis.stereoWidth || 0);
    const crest = Number.isFinite(analysis.crest) ? analysis.crest : 3;
    const punch = clamp01((crest - 2.4) / 7.5);
    const soft = 1 - punch;
    const dark = 1 - bright;
    const metallic = clamp01(analysis.metallicHint || 0);
    const loud = clamp01((analysis.loudnessHint + 32) / 22);
    const bass = clamp01(analysis.bassRatio ?? 0.25);
    const lowMid = clamp01(analysis.lowMidRatio ?? 0.25);
    const mid = clamp01(analysis.midRatio ?? 0.25);
    const high = clamp01(analysis.highRatio ?? 0.25);
    const transient = clamp01(analysis.transientDensity ?? 0);
    return { bright, wide, punch, soft, dark, metallic, loud, crest, bass, lowMid, mid, high, transient };
}

function keywordHit(haystack, keywords) {
    return keywords.some(keyword => haystack.includes(keyword));
}

function makeGenreReason(preset, features, alternatives, mode) {
    const parts = [];
    parts.push(`밝기 ${Math.round(features.bright * 100)}%`);
    parts.push(`폭 ${Math.round(features.wide * 100)}%`);
    parts.push(`펀치 ${Math.round(features.punch * 100)}%`);
    parts.push(`저역 ${Math.round(features.bass * 100)}%`);
    parts.push(`고역 ${Math.round(features.high * 100)}%`);
    parts.push(`금속성 ${Math.round(features.metallic * 100)}%`);
    const top = alternatives.map(item => `${item.label} ${item.score}`).join(' / ');
    return `${PRESET_LABELS[preset] || preset} 판단 · ${mode} · ${parts.join(' · ')} · 후보 ${top}`;
}

function addKeywordScore(scores, haystack, keywords, preset, value) {
    if (keywords.some(keyword => haystack.includes(keyword))) scores[preset] += value;
}

function makeRecommendedSettings(preset, analysis) {
    const base = cloneSettings(GENRE_PRESETS[preset] || GENRE_PRESETS.custom);
    if (!analysis || analysis.silence) return base;

    const bright = analysis.brightness;
    const wide = analysis.stereoWidth;
    const crestNorm = clamp01((analysis.crest - 2.2) / 8.5);

    base.clarity = clamp(Math.round(base.clarity + (0.48 - bright) * 10), 8, 82);
    base.warmth = clamp(Math.round(base.warmth + (bright - 0.52) * 7), 10, 86);
    base.width = clamp(Math.round(base.width + (0.38 - wide) * 10), 10, 72);
    base.dynamicPunch = clamp(Math.round(base.dynamicPunch + (0.48 - crestNorm) * 8), 10, 74);
    base.metallicRemoval = clamp(Math.round(base.metallicRemoval + (analysis.metallicHint - 0.42) * 24), 18, 78);

    if (preset === 'lofi') base.analogGroove = clamp(Math.round(base.analogGroove + (1 - bright) * 6), 10, 42);
    if (preset === 'kballad' || preset === 'rnb') base.width = clamp(base.width + 4, 30, 74);
    if (preset === 'dance' || preset === 'house' || preset === 'edm') base.dynamicPunch = clamp(base.dynamicPunch + 4, 35, 78);
    if (preset === 'acoustic') base.dynamicPunch = clamp(base.dynamicPunch - 5, 10, 50);
    if (preset === 'futurebass' || preset === 'synthpop') base.metallicRemoval = clamp(base.metallicRemoval + 4, 20, 82);
    if (preset === 'cinematic') base.width = clamp(base.width + 5, 36, 78);
    if (preset === 'spatial') base.stereoGroove = clamp(base.stereoGroove + 3, 8, 24);
    if (preset === 'tape') base.analogGroove = clamp(base.analogGroove + 4, 18, 36);
    if (preset === 'punch') base.dynamicPunch = clamp(base.dynamicPunch + 5, 45, 82);
    if (analysis.metallicHint > 0.72) base.clarity = clamp(base.clarity - 4, 8, 78);
    if (analysis.crest > 5.8) base.intensity = clamp(base.intensity + 5, 50, 200);
    if (analysis.metallicHint > 0.7) base.intensity = clamp(base.intensity + 5, 50, 200);
    return base;
}

function applyPresetToSelected(preset, userInitiated) {
    const track = getSelectedTrack();
    const settings = cloneSettings(GENRE_PRESETS[preset] || GENRE_PRESETS.custom);
    if (track) {
        track.preset = preset;
        track.settings = settings;
        if (userInitiated) track.genreLocked = true;
        if (userInitiated) invalidateMasteredOutput(track, `${PRESET_LABELS[preset]} 프리셋을 수동 적용했습니다. 다시 마스터링하세요.`, true);
    }
    state.programmatic = true;
    setControlsFromSettings(settings, preset, track ? track.recommendedSettings : settings);
    state.programmatic = false;
    renderAll({ keepDetailAudio: true });
}

function applyAIRecommendationToSelected() {
    const targets = getSelectedTracks().length ? getSelectedTracks() : [getSelectedTrack()].filter(Boolean);
    const ready = targets.filter(track => track.analysis);
    if (!ready.length) {
        showToast('분석이 완료된 트랙을 선택하세요.');
        return;
    }
    ready.forEach(track => {
        if (track.genreLocked) {
            track.settings = cloneSettings(makeRecommendedSettings(track.preset || 'custom', track.analysis));
            invalidateMasteredOutput(track, `${PRESET_LABELS[track.preset] || track.preset} 잠금 장르 기준 추천값을 적용했습니다.`, true);
            return;
        }
        track.preset = track.recommendedPreset || 'custom';
        track.settings = cloneSettings(track.recommendedSettings || GENRE_PRESETS.custom);
        invalidateMasteredOutput(track, `${PRESET_LABELS[track.preset] || track.preset} AI 추천값을 다시 적용했습니다.`, true);
    });
    const active = getSelectedTrack();
    if (active) applyTrackToControls(active);
    renderAll({ keepDetailAudio: true });
    showToast(`${ready.length}개 트랙에 AI 추천 프리셋을 적용했습니다.`);
}

function applyTrackToControls(track) {
    state.programmatic = true;
    el.genreSelect.value = track.preset || 'custom';
    setControlsFromSettings(track.settings, track.preset, track.recommendedSettings);
    setTransformControls(track.transform || DEFAULT_TRANSFORM);
    setInstrumentControls(track.instrument || DEFAULT_INSTRUMENT_LAYER);
    state.programmatic = false;
}

function setControlsFromSettings(settings, preset, recommended) {
    el.genreSelect.value = preset || 'custom';
    SLIDERS.forEach(slider => {
        const input = document.getElementById(slider.id);
        const valueEl = document.getElementById(`value-${slider.id}`);
        const recEl = document.getElementById(`rec-${slider.id}`);
        const min = slider.min ?? 0;
        const max = slider.max ?? 100;
        const step = slider.step ?? 1;
        const raw = Number(settings[slider.id] ?? GENRE_PRESETS.custom[slider.id]);
        const value = clampToStep(raw, min, max, step);
        input.value = String(value);
        valueEl.textContent = formatSliderValue(slider, value);
        if (recommended && recommended[slider.id] !== undefined && preset !== 'custom') recEl.textContent = `추천: ${formatSliderValue(slider, recommended[slider.id])}`;
        else recEl.textContent = '';
        updateSliderHint(slider.id);
    });
    syncEnhancedSelectButtons();
}

function handlePitchSpeedChange() {
    const track = getSelectedTrack();
    const transform = track ? cloneTransform(track.transform) : cloneTransform(DEFAULT_TRANSFORM);
    transform.snapSemitone = el.snapSemitone.checked;
    transform.pitchSemitones = Number(el.pitchSlider.value);
    transform.speedRatio = Number(el.speedSlider.value);
    if (transform.snapSemitone) transform.pitchSemitones = Math.round(transform.pitchSemitones);
    transform.pitchSemitones = clamp(transform.pitchSemitones, -12, 12);
    transform.speedRatio = clamp(transform.speedRatio, 0.5, 1.5);
    transform.beatPreset = getBeatPresetForRatio(transform.speedRatio);
    if (track) {
        track.transform = transform;
        invalidateMasteredOutput(track, '피치/속도 조정값이 적용되었습니다. 다시 마스터링하세요.', true);
    }
    setTransformControls(transform);
    renderAll({ keepDetailAudio: true });
}

function setTransformControls(transform) {
    const value = cloneTransform(transform || DEFAULT_TRANSFORM);
    state.programmatic = true;
    el.snapSemitone.checked = Boolean(value.snapSemitone);
    el.pitchSlider.step = value.snapSemitone ? '1' : '0.01';
    el.pitchSlider.value = String(value.pitchSemitones);
    el.speedSlider.value = String(value.speedRatio);
    el.pitchValue.textContent = `${formatSigned(value.pitchSemitones, value.snapSemitone ? 0 : 2)} st`;
    el.speedValue.textContent = `${value.speedRatio.toFixed(2)}x`;
    if (el.beatChangeSelect) el.beatChangeSelect.value = value.beatPreset || getBeatPresetForRatio(value.speedRatio);
    if (el.beatValue) el.beatValue.textContent = getBeatPresetLabel(value.beatPreset || getBeatPresetForRatio(value.speedRatio));
    el.keyReadout.textContent = formatSigned(value.pitchSemitones, value.snapSemitone ? 0 : 2);
    el.tempoReadout.textContent = `${value.speedRatio.toFixed(2)}x`;
    el.tempoPercent.textContent = `${Math.round(value.speedRatio * 100)}%`;
    if (el.pitchHint) el.pitchHint.textContent = `${value.snapSemitone ? 'st 단위 고정 ON' : 'cent 미세 조정 ON'} · ${Math.abs(value.pitchSemitones) < 0.001 ? '원본 키 유지' : 'Pitch 변경 적용'}`;
    if (el.speedHint) el.speedHint.textContent = `BPM ${value.speedRatio.toFixed(2)}x · ${Math.abs(value.speedRatio - 1) < 0.001 ? '기본 속도' : '길이/템포 변경'}`;
    if (el.beatHint) el.beatHint.textContent = value.beatPreset === 'custom' ? '슬라이더로 직접 만든 커스텀 박자 비율입니다.' : `${getBeatPresetLabel(value.beatPreset)} · 속도 슬라이더와 연동됩니다.`;
    el.pitchSpeedBadge.textContent = isDefaultTransform(value) ? '기본값' : '변경 적용';
    state.programmatic = false;
    syncEnhancedSelectButtons();
}

function handleBeatChangeSelect() {
    if (state.programmatic || !el.beatChangeSelect) return;
    const presetKey = el.beatChangeSelect.value || 'original';
    const preset = BEAT_CHANGE_PRESETS[presetKey] || null;
    const track = getSelectedTrack();
    const transform = track ? cloneTransform(track.transform) : cloneTransform(DEFAULT_TRANSFORM);
    if (preset) transform.speedRatio = clamp(preset.ratio, 0.5, 1.5);
    transform.beatPreset = presetKey === 'custom' ? 'custom' : (presetKey in BEAT_CHANGE_PRESETS ? presetKey : 'original');
    if (track) {
        track.transform = transform;
        invalidateMasteredOutput(track, `${getBeatPresetLabel(transform.beatPreset)} 박자 변경값이 적용되었습니다. 다시 마스터링하세요.`, true);
    }
    setTransformControls(transform);
    renderAll({ keepDetailAudio: true });
    showToast(`${getBeatPresetLabel(transform.beatPreset)} 적용`);
}

function handleInstrumentLayerChange() {
    if (state.programmatic) return;
    const track = getSelectedTrack();
    const layer = cloneInstrumentLayer({
        mode: el.instrumentLayerSelect ? el.instrumentLayerSelect.value : 'off',
        amount: el.instrumentAmountSelect ? el.instrumentAmountSelect.value : 'light'
    });
    if (track) {
        track.instrument = layer;
        track.instrumentInfo = null;
        invalidateMasteredOutput(track, `${getInstrumentLayerLabel(layer.mode)} 악기 추가 설정이 변경되었습니다. 다시 마스터링하세요.`, true);
    }
    setInstrumentControls(layer);
    renderAll({ keepDetailAudio: true });
}

function setInstrumentControls(layer) {
    const value = cloneInstrumentLayer(layer || DEFAULT_INSTRUMENT_LAYER);
    state.programmatic = true;
    if (el.instrumentLayerSelect) el.instrumentLayerSelect.value = value.mode;
    if (el.instrumentAmountSelect) el.instrumentAmountSelect.value = value.amount;
    if (el.instrumentBadge) el.instrumentBadge.textContent = value.mode === 'off' ? 'OFF' : `${getInstrumentLayerLabel(value.mode)} · ${getInstrumentAmountLabel(value.amount)}`;
    if (el.instrumentHint) el.instrumentHint.textContent = value.mode === 'off' ? '악기 추가를 끄면 원본 오디오만 마스터링합니다.' : '자동 추정 BPM에 맞춰 합성 킥/하이햇/클랩을 아주 작게 섞습니다.';
    state.programmatic = false;
    syncEnhancedSelectButtons();
}

function updateSliderHint(id) {
    const track = getSelectedTrack();
    const slider = SLIDERS.find(item => item.id === id);
    const input = document.getElementById(id);
    const hint = document.getElementById(`hint-${id}`);
    if (!slider || !input || !hint) return;

    const preset = track ? track.preset : el.genreSelect.value;
    const recommendation = track ? track.recommendedSettings : GENRE_PRESETS[preset];
    const currentValue = Number(input.value);

    if (!track || preset === 'custom' || !recommendation) {
        hint.textContent = customHintText(slider, currentValue);
        return;
    }

    const recommendedValue = Number(recommendation[id]);
    hint.textContent = '';
    const marker = document.createElement('span');
    if (currentValue < recommendedValue) {
        marker.className = 'hint-down';
        marker.textContent = '↓ 낮춤: ';
        hint.append(marker, document.createTextNode(slider.low));
    } else if (currentValue > recommendedValue) {
        marker.className = 'hint-up';
        marker.textContent = '↑ 높임: ';
        hint.append(marker, document.createTextNode(slider.high));
    } else {
        marker.className = 'hint-ok';
        marker.textContent = '✓ 추천값과 동일';
        hint.append(marker);
    }
}

function customHintText(slider, value) {
    if (slider.id === 'intensity') {
        if (value < 90) return slider.low;
        if (value >= 140) return slider.high;
        return slider.neutral;
    }
    if (value < 35) return slider.low;
    if (value > 65) return slider.high;
    return slider.neutral;
}

async function masterSelectedTracks() {
    if (state.busy) return;
    const selectedTracks = getSelectedTracks().filter(track => !['analyzing', 'processing'].includes(track.status) && !track.error);
    const fallback = getSelectedTrack();
    const candidates = selectedTracks.length ? selectedTracks : (fallback && !fallback.error ? [fallback] : []);
    if (!candidates.length) return;

    state.busy = true;
    if (state.featureFlags.albumMatch) state.albumProfile = computeAlbumProfile();
    renderAll();
    try {
        for (const track of candidates) await masterTrack(track, true);
        showToast(`${candidates.length}개 선택 트랙 마스터링 완료`);
    } finally {
        state.busy = false;
        renderAll();
    }
}

async function masterAllTracks() {
    if (state.busy) return;
    const candidates = state.tracks.filter(track => !['processing', 'analyzing'].includes(track.status) && !track.error);
    if (!candidates.length) return;

    state.busy = true;
    if (state.featureFlags.albumMatch) state.albumProfile = computeAlbumProfile();
    renderAll();
    try {
        for (const track of candidates) await masterTrack(track, true);
        showToast('전체 마스터링이 성공적으로 완료되었습니다.');
    } finally {
        state.busy = false;
        renderAll();
    }
}

async function masterTrack(track, calledFromBatch = false) {
    if (!track || track.status === 'processing' || track.status === 'analyzing') return;
    if (!calledFromBatch && state.busy) return;

    pauseAllPreviewAudio();

    if (!calledFromBatch) {
        state.busy = true;
        if (state.featureFlags.albumMatch) state.albumProfile = computeAlbumProfile();
    }

    track.status = 'processing';
    track.progress = 6;
    track.error = null;
    track.trimInfo = null;
    track.instrumentInfo = null;
    track.albumApplied = null;
    track.truePeakInfo = null;
    track.finalizeInfo = null;
    track.performanceGuardInfo = null;
    track.safetyInfo = null;
    track.remasterCount = Number(track.remasterCount || 0) + 1;
    track.performanceInfo = beginPerformanceProfile();
    track.report = '온디맨드 디코더 구동 중...';
    renderAll();

    try {
        let currentSourceBuffer = await decodeAudio(track.file);
        markPerformanceStage(track, '디코딩');
        await yieldToBrowser();

        if (!track.analysis) {
            track.progress = 14;
            track.report = '분석 정보가 없어 마스터링 직전 긴급 분석을 실행 중';
            renderAll();
            const analysis = await analyzeBufferAsync(currentSourceBuffer);
            analysis.abHighlightStartSec = estimateABHighlightStart(currentSourceBuffer);
            track.abHighlightStartSec = analysis.abHighlightStartSec;
            const recommendation = recommendPreset(track.name, analysis);
            track.analysis = analysis;
            track.recommendedPreset = recommendation.preset;
            track.confidence = recommendation.confidence;
            track.genreReason = recommendation.reason || '';
            track.genreAlternatives = recommendation.alternatives || [];
            if (track.preset === 'custom') {
                track.preset = recommendation.preset;
                track.settings = makeRecommendedSettings(recommendation.preset, analysis);
                track.recommendedSettings = cloneSettings(track.settings);
            }
            markPerformanceStage(track, '긴급 분석');
        }

        if (state.featureFlags.trimSilence) {
            track.progress = 22;
            track.report = '앞뒤 무음 구간 감지 및 여유 구간 보존 중';
            renderAll();
            const trimResult = autoTrimSilenceBuffer(currentSourceBuffer);
            currentSourceBuffer = trimResult.buffer;
            track.trimInfo = trimResult.info;
            markPerformanceStage(track, '무음 정리');
        }

        track.progress = 38;
        track.report = '피치/BPM 워커 변환 및 오버랩 위상 정렬 중';
        renderAll();
        let preparedBuffer = await preparePitchSpeedBuffer(currentSourceBuffer, track.transform);
        markPerformanceStage(track, '피치/BPM');
        await yieldToBrowser();

        if (shouldUseInstrumentLayer(track.instrument)) {
            track.progress = 50;
            track.report = '박자 감지 및 리듬 악기 레이어 자연 믹싱 중';
            renderAll();
            const layered = mixInstrumentLayerBuffer(preparedBuffer, track.instrument, track.analysis);
            preparedBuffer = layered.buffer;
            track.instrumentInfo = layered.info;
            markPerformanceStage(track, '리듬 레이어');
            await yieldToBrowser();
        }

        track.progress = 60;
        track.report = '공진 감쇄, 톤 체인, 다이나믹 체인 렌더링 중';
        renderAll();
        const albumProfile = getActiveAlbumProfile();
        const masteredBuffer = await renderMasterBuffer(preparedBuffer, track.settings, track.preset, track.analysis, albumProfile);
        markPerformanceStage(track, '마스터 체인');
        await yieldToBrowser();

        track.progress = 88;
        const requestedOutputFormat = state.outputFormat || 'wav24';
        track.report = state.featureFlags.truePeakGuard ? `True Peak 가드 및 ${getOutputFormatLabel(requestedOutputFormat)} 인코딩 중` : `샘플 피크 가드 및 ${getOutputFormatLabel(requestedOutputFormat)} 인코딩 중`;
        renderAll();

        const guardDecision = getSmartPerformanceGuardDecision(track, masteredBuffer, requestedOutputFormat);
        track.performanceGuardInfo = guardDecision;
        track.report = guardDecision.changed ? `스마트 성능 가드 적용 · ${getQualityModeLabel(guardDecision.sourceQualityMode)} → ${getQualityModeLabel(guardDecision.qualityMode)} · ${getOutputFormatLabel(requestedOutputFormat)} 인코딩 중` : track.report;
        renderAll();
        const finalization = await finalizeMasterBufferAsync(masteredBuffer, {
            targetLufs: state.targetLufs,
            ceilingDb: state.ceilingDb,
            qualityMode: guardDecision.qualityMode,
            masterGoal: state.masterGoal,
            truePeak: guardDecision.truePeak
        });
        const finalBuffer = finalization.buffer;
        if (state.autoHighlightAB) {
            track.abHighlightStartSec = estimateABHighlightStartFromPair(preparedBuffer, finalBuffer, track.analysis);
        }
        track.safetyInfo = computeEngineSafetyInfo(track, finalBuffer, finalization.info);
        markPerformanceStage(track, '파이널라이저');
        track.finalizeInfo = finalization.info;
        track.comparison = createComparisonInfo(track, finalization.info);
        track.truePeakInfo = {
            mode: guardDecision.truePeak ? 'truePeak' : 'samplePeak',
            targetDbTP: state.ceilingDb,
            peakBefore: finalization.info.peakBefore,
            peakAfter: finalization.info.peakAfter,
            gain: Math.pow(10, (finalization.info.gainDb || 0) / 20)
        };

        if (albumProfile && track.analysis) track.albumApplied = createAlbumAppliedInfo(track.analysis, albumProfile);

        const encoded = await encodeMasterOutputAsync(finalBuffer, requestedOutputFormat);
        markPerformanceStage(track, '인코딩');
        if (!encoded.blob || encoded.blob.size <= 44) throw new Error('렌더 결과가 비어 있습니다. 브라우저 오디오 렌더러가 출력을 만들지 못했습니다.');

        if (track.masteredUrl) URL.revokeObjectURL(track.masteredUrl);
        track.outBlob = encoded.blob;
        track.outFormat = encoded.format;
        track.outName = `${safeBaseName(track.name)}_mastered.${encoded.extension}`;
        track.masteredUrl = URL.createObjectURL(encoded.blob);
        track.masteredDurationSec = finalBuffer.duration || 0;
        finishPerformanceProfile(track, finalBuffer, encoded.blob);
        track.status = 'done';
        track.progress = 100;
        track.report = createDoneReport(track);
        showToast(`${track.name} 마스터링 성공`);
    } catch (error) {
        console.error('Mastering error:', error);
        track.status = 'error';
        track.error = error.message || '마스터링 실패';
        track.report = `마스터링 실패: ${track.error}`;
        showToast(`${track.name}: ${track.error}`);
    } finally {
        if (!calledFromBatch) state.busy = false;
        renderAll();
    }
}

function autoTrimSilenceBuffer(buffer) {
    const sampleRate = buffer.sampleRate;
    const channels = buffer.numberOfChannels;
    const frameSize = Math.max(256, Math.round(sampleRate * 0.025));
    const threshold = Math.pow(10, -55 / 20);
    const holdFrames = 2;
    const marginSamples = Math.round(sampleRate * 0.12);
    const totalFrames = Math.ceil(buffer.length / frameSize);

    let firstActiveFrame = 0;
    let lastActiveFrame = totalFrames - 1;

    for (let frame = 0; frame < totalFrames; frame += 1) {
        if (isFrameActive(buffer, frame * frameSize, frameSize, threshold)) {
            let confirmed = true;
            for (let h = 1; h < holdFrames; h += 1) {
                if (!isFrameActive(buffer, (frame + h) * frameSize, frameSize, threshold)) confirmed = false;
            }
            if (confirmed) {
                firstActiveFrame = frame;
                break;
            }
        }
    }

    for (let frame = totalFrames - 1; frame >= 0; frame -= 1) {
        if (isFrameActive(buffer, frame * frameSize, frameSize, threshold)) {
            let confirmed = true;
            for (let h = 1; h < holdFrames; h += 1) {
                if (!isFrameActive(buffer, Math.max(0, frame - h) * frameSize, frameSize, threshold)) confirmed = false;
            }
            if (confirmed) {
                lastActiveFrame = frame;
                break;
            }
        }
    }

    const startSample = clamp(firstActiveFrame * frameSize - marginSamples, 0, buffer.length - 1);
    const endSample = clamp((lastActiveFrame + 1) * frameSize + marginSamples, startSample + 1, buffer.length);
    const trimStart = startSample;
    const trimEnd = buffer.length - endSample;
    const shouldTrim = trimStart > sampleRate * 0.08 || trimEnd > sampleRate * 0.08;

    if (!shouldTrim || endSample - startSample < sampleRate * 0.8) {
        return {
            buffer,
            info: {
                applied: false,
                startTrimSec: 0,
                endTrimSec: 0,
                sourceDuration: buffer.duration,
                outputDuration: buffer.duration
            }
        };
    }

    const outputLength = endSample - startSample;
    const output = makeAudioBuffer(channels, outputLength, sampleRate);
    for (let ch = 0; ch < channels; ch += 1) {
        const src = buffer.getChannelData(ch);
        const dst = output.getChannelData(ch);
        dst.set(src.subarray(startSample, endSample));
    }
    applyEdgeFade(output, 0.012);

    return {
        buffer: output,
        info: {
            applied: true,
            startTrimSec: trimStart / sampleRate,
            endTrimSec: trimEnd / sampleRate,
            sourceDuration: buffer.duration,
            outputDuration: output.duration
        }
    };
}

function isFrameActive(buffer, start, frameSize, threshold) {
    const end = Math.min(buffer.length, start + frameSize);
    if (start >= buffer.length) return false;
    let sumSq = 0;
    let count = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        for (let i = start; i < end; i += 1) {
            const sample = data[i] || 0;
            sumSq += sample * sample;
            count += 1;
        }
    }
    return Math.sqrt(sumSq / Math.max(1, count)) > threshold;
}

function applyEdgeFade(buffer, fadeSeconds) {
    const fadeSamples = Math.min(Math.round(buffer.sampleRate * fadeSeconds), Math.floor(buffer.length / 3));
    if (fadeSamples <= 4) return;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < fadeSamples; i += 1) {
            const fadeIn = i / fadeSamples;
            const fadeOut = (fadeSamples - i) / fadeSamples;
            data[i] *= fadeIn;
            data[data.length - 1 - i] *= fadeOut;
        }
    }
}


async function tryExternalPitchEngine(sourceBuffer, transform) {
    if (!['auto', 'external'].includes(state.pitchEngine || 'auto')) return null;
    try {
        const adapter = await import(OPTIONAL_WASM_PITCH_ADAPTER_URL);
        if (!adapter || typeof adapter.processPitchSpeed !== 'function') return null;
        const output = await adapter.processPitchSpeed({
            sourceBuffer,
            transform,
            makeAudioBuffer,
            qualityMode: state.qualityMode || 'balanced'
        });
        if (output && output.numberOfChannels && output.length) return output;
        if (state.pitchEngine === 'external') showToast('External WASM 피치 엔진이 설치되지 않아 WSOLA로 전환합니다.');
    } catch (error) {
        if (state.pitchEngine === 'external') showToast('External WASM 피치 엔진을 불러오지 못해 WSOLA로 전환합니다.');
        console.warn('External pitch adapter fallback:', error);
    }
    return null;
}

async function preparePitchSpeedBuffer(sourceBuffer, transform) {
    const value = cloneTransform(transform || DEFAULT_TRANSFORM);
    if (isDefaultTransform(value)) return sourceBuffer;

    const externalResult = await tryExternalPitchEngine(sourceBuffer, value);
    if (externalResult) return applyTransformSafetyPolish(externalResult, value);

    if (window.Worker) {
        try {
            const worker = new Worker(PITCH_WSOLA_WORKER_URL);
            const channels = Math.min(2, sourceBuffer.numberOfChannels);
            const channelBuffers = [];
            for (let ch = 0; ch < channels; ch += 1) channelBuffers.push(sourceBuffer.getChannelData(ch).slice().buffer);
            const payload = {
                sampleRate: sourceBuffer.sampleRate,
                channels,
                length: sourceBuffer.length,
                transform: value,
                qualityMode: state.qualityMode || 'balanced',
                channelBuffers
            };
            const result = await new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    worker.terminate();
                    reject(new Error('피치/BPM 워커 시간이 초과되어 기본 엔진으로 전환합니다.'));
                }, 120000);
                worker.onmessage = event => {
                    clearTimeout(timer);
                    worker.terminate();
                    if (event.data && event.data.ok) resolve(event.data);
                    else reject(new Error(event.data?.error || '피치/BPM 워커 처리 실패'));
                };
                worker.onerror = error => {
                    clearTimeout(timer);
                    worker.terminate();
                    reject(error);
                };
                worker.postMessage(payload, channelBuffers);
            });
            const output = makeAudioBuffer(result.channels, result.length, result.sampleRate);
            (result.channelBuffers || []).forEach((buf, ch) => output.copyToChannel(new Float32Array(buf), ch));
            return applyTransformSafetyPolish(output, value);
        } catch (error) {
            console.warn('Pitch worker fallback:', error);
            showToast('피치/BPM 워커가 실패해 기본 엔진으로 전환합니다.');
        }
    }

    const pitchFactor = Math.pow(2, value.pitchSemitones / 12);
    const speedRatio = clamp(value.speedRatio, 0.5, 1.5);
    let workingBuffer = sourceBuffer;

    if (Math.abs(value.pitchSemitones) > 0.01) {
        const pitchLength = Math.max(1, Math.round(sourceBuffer.length / pitchFactor));
        workingBuffer = resampleAudioBuffer(sourceBuffer, pitchLength);
    }

    const targetLength = Math.max(1, Math.round(sourceBuffer.length / speedRatio));
    if (Math.abs(workingBuffer.length - targetLength) > 4) {
        workingBuffer = timeStretchAudioBuffer(workingBuffer, targetLength);
    }
    return applyTransformSafetyPolish(workingBuffer, value);
}

function applyTransformSafetyPolish(buffer, transform) {
    if (!buffer || !transform || isDefaultTransform(transform)) return buffer;
    const extreme = Math.abs(Number(transform.pitchSemitones || 0)) >= 7 || Math.abs(Number(transform.speedRatio || 1) - 1) >= 0.28;
    const fadeSeconds = extreme ? 0.010 : 0.005;
    applyEdgeFade(buffer, fadeSeconds);
    removeDcOffset(buffer, extreme ? 3 : 5);
    if (extreme) smoothBoundaryClicks(buffer, 0.0035);
    return buffer;
}

function removeDcOffset(buffer, stride = 4) {
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        let sum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += stride) {
            sum += data[i] || 0;
            count += 1;
        }
        const offset = sum / Math.max(1, count);
        if (Math.abs(offset) < 0.00003) continue;
        const correction = clamp(offset, -0.006, 0.006);
        for (let i = 0; i < data.length; i += 1) data[i] = clamp(data[i] - correction, -1, 1);
    }
}

function smoothBoundaryClicks(buffer, seconds) {
    const samples = Math.min(Math.round(buffer.sampleRate * seconds), Math.floor(buffer.length / 4));
    if (samples < 8) return;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        for (let i = 1; i < samples; i += 1) {
            const inWeight = i / samples;
            const outWeight = (samples - i) / samples;
            data[i] = data[i] * inWeight + data[i - 1] * (1 - inWeight) * 0.35;
            const j = data.length - 1 - i;
            if (j > 0) data[j] = data[j] * outWeight + data[j + 1] * (1 - outWeight) * 0.35;
        }
    }
}

function resampleAudioBuffer(buffer, targetLength) {
    const output = makeAudioBuffer(buffer.numberOfChannels, targetLength, buffer.sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) resampleChannel(buffer.getChannelData(ch), output.getChannelData(ch));
    return output;
}

function resampleChannel(input, output) {
    if (output.length === 1) {
        output[0] = input[0] || 0;
        return;
    }
    if (input.length < 4) {
        const ratio = (input.length - 1) / Math.max(1, output.length - 1);
        for (let i = 0; i < output.length; i += 1) {
            const position = i * ratio;
            const index = Math.floor(position);
            const fraction = position - index;
            output[i] = (input[index] || 0) * (1 - fraction) + (input[Math.min(input.length - 1, index + 1)] || 0) * fraction;
        }
        return;
    }
    const ratio = (input.length - 1) / Math.max(1, output.length - 1);
    for (let i = 0; i < output.length; i += 1) {
        const position = i * ratio;
        const index = Math.floor(position);
        const t = position - index;
        output[i] = cubicInterpolate(
            input[Math.max(0, index - 1)] || 0,
            input[index] || 0,
            input[Math.min(input.length - 1, index + 1)] || 0,
            input[Math.min(input.length - 1, index + 2)] || 0,
            t
        );
    }
}

function cubicInterpolate(y0, y1, y2, y3, t) {
    const a0 = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
    const a1 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
    const a2 = -0.5 * y0 + 0.5 * y2;
    const a3 = y1;
    return clamp(a0 * t * t * t + a1 * t * t + a2 * t + a3, -1.2, 1.2);
}

function timeStretchAudioBuffer(buffer, targetLength) {
    const output = makeAudioBuffer(buffer.numberOfChannels, targetLength, buffer.sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const stretched = granularStretchChannel(buffer.getChannelData(ch), targetLength, buffer.sampleRate);
        output.copyToChannel(stretched, ch);
    }
    applyEdgeFade(output, 0.006);
    return output;
}

function granularStretchChannel(input, targetLength, sampleRate) {
    if (!input.length || targetLength <= 0) return new Float32Array(Math.max(1, targetLength));
    if (Math.abs(targetLength - input.length) < 8) return new Float32Array(input.slice(0, targetLength));

    const stretch = targetLength / Math.max(1, input.length);
    const windowSize = makeEven(clamp(Math.round(sampleRate * 0.075), 2048, 8192));
    const overlap = Math.round(windowSize * 0.5);
    const hopOut = Math.max(256, windowSize - overlap);
    const hopIn = hopOut / Math.max(0.01, stretch);
    const searchRadius = Math.round(sampleRate * 0.014);
    const output = new Float32Array(targetLength + windowSize + searchRadius + 4);
    const weights = new Float32Array(output.length);
    const window = makeHannWindow(windowSize);

    let frame = 0;
    for (let outPos = 0; outPos < targetLength; outPos += hopOut) {
        const expectedIn = Math.round(frame * hopIn);
        const inPos = findBestSolaOffset(input, output, expectedIn, outPos, overlap, searchRadius);
        for (let i = 0; i < windowSize; i += 1) {
            const sourceIndex = inPos + i;
            const outIndex = outPos + i;
            if (sourceIndex >= input.length || outIndex >= output.length) break;
            const weight = window[i];
            output[outIndex] += (input[sourceIndex] || 0) * weight;
            weights[outIndex] += weight;
        }
        frame += 1;
    }

    const result = new Float32Array(targetLength);
    for (let i = 0; i < targetLength; i += 1) result[i] = weights[i] > 0.00001 ? output[i] / weights[i] : 0;
    return result;
}

function findBestSolaOffset(input, output, expectedIn, outPos, overlap, searchRadius) {
    if (outPos <= 0) return clamp(expectedIn, 0, Math.max(0, input.length - 1));
    const minPos = clamp(expectedIn - searchRadius, 0, Math.max(0, input.length - overlap - 2));
    const maxPos = clamp(expectedIn + searchRadius, minPos, Math.max(minPos, input.length - overlap - 2));
    let bestPos = clamp(expectedIn, minPos, maxPos);
    let bestScore = -Infinity;
    const step = 4;
    const corrStep = 2;

    for (let candidate = minPos; candidate <= maxPos; candidate += step) {
        let cross = 0;
        let a2 = 0;
        let b2 = 0;
        for (let i = 0; i < overlap; i += corrStep) {
            const a = output[outPos + i] || 0;
            const b = input[candidate + i] || 0;
            cross += a * b;
            a2 += a * a;
            b2 += b * b;
        }
        const score = cross / Math.sqrt(Math.max(1e-12, a2 * b2));
        if (score > bestScore) {
            bestScore = score;
            bestPos = candidate;
        }
    }
    return bestPos;
}

function makeHannWindow(length) {
    const window = new Float32Array(length);
    for (let i = 0; i < length; i += 1) window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (length - 1)));
    return window;
}

function makeEven(value) { return value % 2 === 0 ? value : value + 1; }

function makeAudioBuffer(numberOfChannels, length, sampleRate) {
    const channels = Math.max(1, Math.min(32, Math.floor(numberOfChannels || 1)));
    const safeLength = Math.max(1, Math.floor(length || 1));
    const safeRate = Math.max(3000, Math.floor(sampleRate || 44100));

    if (typeof AudioBuffer !== 'undefined') {
        try {
            return new AudioBuffer({ numberOfChannels: channels, length: safeLength, sampleRate: safeRate });
        } catch (error) {
            // 일부 모바일/구형 브라우저는 AudioBuffer 생성자를 노출하지만 실제 생성에서 실패할 수 있습니다.
        }
    }

    const context = createOfflineAudioContext(channels, safeLength, safeRate);
    return context.createBuffer(channels, safeLength, safeRate);
}

function createOfflineAudioContext(numberOfChannels, length, sampleRate) {
    const OfflineContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineContextClass) throw new Error('이 브라우저는 OfflineAudioContext를 지원하지 않아 마스터링 렌더링을 실행할 수 없습니다.');
    return new OfflineContextClass(
        Math.max(1, Math.min(32, Math.floor(numberOfChannels || 1))),
        Math.max(1, Math.floor(length || 1)),
        Math.max(3000, Math.floor(sampleRate || 44100))
    );
}

async function renderMasterBuffer(sourceBuffer, settings, preset, analysis, albumProfile) {
    const sampleRate = sourceBuffer.sampleRate;
    const length = Math.max(1, sourceBuffer.length);
    const renderChannels = Math.max(1, Math.min(2, sourceBuffer.numberOfChannels || 1));
    const context = createOfflineAudioContext(renderChannels, length, sampleRate);
    const effectiveSettings = makeEffectiveMasterSettings(settings, analysis, preset);
    const intensity = getMasteringIntensity(effectiveSettings);

    const source = context.createBufferSource();
    source.buffer = sourceBuffer;

    const preGain = context.createGain();
    preGain.gain.value = intensity.raw >= 160 ? 0.84 : 0.9;
    source.connect(preGain);
    let node = preGain;

    const highPass = context.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.value = 22 + Math.max(0, intensity.raw - 120) * 0.08;
    highPass.Q.value = 0.707;
    node.connect(highPass);
    node = highPass;

    node = createSubCleanNode(context, node, effectiveSettings, analysis, intensity);
    node = createLowEndAnchorNode(context, node, renderChannels === 2 && sourceBuffer.numberOfChannels >= 2, effectiveSettings, analysis, intensity);
    node = createMetallicRemovalNode(context, node, effectiveSettings.metallicRemoval, analysis, intensity);
    node = createAdaptiveResonanceSmootherNode(context, node, effectiveSettings, analysis, intensity);
    node = createDeMaskingPolishNode(context, node, effectiveSettings, analysis, intensity);
    node = createPresetReferenceMatchNode(context, node, preset, effectiveSettings, analysis, intensity);
    node = createAiHumanizeNode(context, node, preset, effectiveSettings, intensity);
    node = createVocalProtectionNode(context, node, preset, effectiveSettings, analysis, intensity);
    node = createVocalFocusPlusNode(context, node, preset, effectiveSettings, analysis, intensity);
    node = createMelodyPreserveNode(context, node, preset, effectiveSettings, analysis, intensity);
    node = createProfileEqChain(context, node, preset, intensity);
    const widthBase = map(effectiveSettings.width, 0, 100, 0.82, 1.25);
    const widthScaled = 1 + (widthBase - 1) * clamp(intensity.amount, 0.65, 1.85);
    node = createStereoWidthNode(context, node, renderChannels === 2 && sourceBuffer.numberOfChannels >= 2, widthScaled);
    node = createStereoGrooveNode(context, node, effectiveSettings.stereoGroove, intensity);
    node = createPhaseSafeNode(context, node, renderChannels === 2 && sourceBuffer.numberOfChannels >= 2, effectiveSettings, analysis, intensity);
    node = createSaturationNode(context, node, effectiveSettings.analogGroove, effectiveSettings.warmth, intensity);
    node = createSpectralBalancerNode(context, node, effectiveSettings, analysis, intensity);
    node = createAdaptiveAirBalanceNode(context, node, effectiveSettings, analysis, intensity);
    node = createOpenMixRecoveryNode(context, node, effectiveSettings, analysis, intensity);
    node = createPerceptualPolishNode(context, node, effectiveSettings, analysis, intensity);
    node = createToneChain(context, node, effectiveSettings, intensity);
    node = createHighFrequencyExciterNode(context, node, effectiveSettings, intensity);
    node = createEarFatigueGuardNode(context, node, effectiveSettings, analysis, intensity);
    node = createTransientRefineNode(context, node, effectiveSettings, analysis, intensity);
    node = createMicroDynamicsGlueNode(context, node, effectiveSettings, analysis, intensity);
    node = createTranslationGuardNode(context, node, effectiveSettings, analysis, intensity);
    node = createCompressionNode(context, node, effectiveSettings.dynamicPunch, intensity);
    node = createAlbumMatchNode(context, node, analysis, albumProfile);
    node = createLoudnessLiftNode(context, node, effectiveSettings, analysis, intensity);
    node = createLimiterNode(context, node, intensity);

    node.connect(context.destination);
    source.start(0);
    return context.startRendering();
}


function makeEffectiveMasterSettings(settings, analysis, preset) {
    const out = cloneSettings(settings || GENRE_PRESETS.custom);
    if (settings && Number.isFinite(Number(settings.intensity))) out.intensity = Number(settings.intensity);
    applyMasterGoalToSettings(out, analysis, preset);
    if (!state.featureFlags.smartGuard || !analysis) return out;

    const brightness = Number(analysis.brightness || 0);
    const metallic = Number(analysis.metallicHint || 0);
    const bass = Number(analysis.bassRatio || 0);
    const high = Number(analysis.highRatio || 0);
    const transient = Number(analysis.transientDensity || 0);
    const isCustom = preset === 'custom';
    const guardStrength = isCustom ? 0.55 : 1;

    if (brightness > 0.68 || high > 0.42) {
        out.clarity = clamp(Math.round(out.clarity - (brightness > 0.78 ? 7 : 4) * guardStrength), 5, 92);
        out.metallicRemoval = clamp(Math.round(out.metallicRemoval + (high > 0.48 ? 8 : 5) * guardStrength), 18, 88);
    }
    if (metallic > 0.66) {
        out.metallicRemoval = clamp(Math.round(out.metallicRemoval + (metallic - 0.6) * 28 * guardStrength), 20, 90);
        out.clarity = clamp(Math.round(out.clarity - (metallic - 0.6) * 12 * guardStrength), 5, 88);
    }
    if (bass > 0.55) {
        out.warmth = clamp(Math.round(out.warmth - (bass - 0.52) * 18 * guardStrength), 10, 86);
        out.dynamicPunch = clamp(Math.round(out.dynamicPunch - (bass - 0.52) * 10 * guardStrength), 8, 82);
    }
    if (transient > 0.62 && out.dynamicPunch > 58) {
        out.dynamicPunch = clamp(Math.round(out.dynamicPunch - (transient - 0.58) * 18 * guardStrength), 10, 78);
    }
    if (Number(out.intensity) >= 170 && (metallic > 0.7 || high > 0.48)) {
        out.intensity = clamp(Math.round(Number(out.intensity) - 10), 50, 200);
    }
    return out;
}


function createSubCleanNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    const bass = clamp01(Number(analysis?.bassRatio ?? 0.28));
    const warmth = clamp(Number(settings.warmth || 55), 0, 100);
    const punch = clamp(Number(settings.dynamicPunch || 35), 0, 100);
    const need = bass > 0.36 || warmth > 64 || punch > 56 || intensity.raw > 135;
    if (!need) return input;

    const subGuard = context.createBiquadFilter();
    subGuard.type = 'highpass';
    subGuard.frequency.value = clamp(24 + bass * 14 + Math.max(0, intensity.raw - 120) * 0.05, 24, 42);
    subGuard.Q.value = 0.72;

    const mudGuard = context.createBiquadFilter();
    mudGuard.type = 'peaking';
    mudGuard.frequency.value = bass > 0.46 ? 235 : 285;
    mudGuard.Q.value = 0.95;
    mudGuard.gain.value = clamp(-0.18 - bass * 0.62 - Math.max(0, warmth - 62) * 0.012, -1.6, -0.08);

    input.connect(subGuard).connect(mudGuard);
    return mudGuard;
}

function createAdaptiveResonanceSmootherNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    const metallic = clamp01(Number(analysis?.metallicHint ?? 0.35));
    const brightness = clamp01(Number(analysis?.brightness ?? 0.45));
    const high = clamp01(Number(analysis?.highRatio ?? 0.24));
    const removal = clamp(Number(settings.metallicRemoval || 42), 0, 100);
    const need = metallic > 0.42 || brightness > 0.62 || high > 0.34 || removal > 58 || intensity.raw > 145;
    if (!need) return input;

    const target = clamp(Number(analysis?.targetDynamicFreq || 5200), 2600, 8800);
    const amount = clamp((metallic * 0.75 + brightness * 0.35 + high * 0.35 + removal / 180) * clamp(intensity.amount, 0.65, 1.65), 0.18, 1.65);

    const dynamicNotch = context.createBiquadFilter();
    dynamicNotch.type = 'peaking';
    dynamicNotch.frequency.value = target;
    dynamicNotch.Q.value = clamp(3.2 + amount * 1.7, 3.0, 6.8);
    dynamicNotch.gain.value = clamp(-0.28 * amount, -1.25, -0.08);

    const glassGuard = context.createBiquadFilter();
    glassGuard.type = 'peaking';
    glassGuard.frequency.value = target < 5200 ? 6400 : 9200;
    glassGuard.Q.value = 2.2;
    glassGuard.gain.value = clamp(-0.16 * amount, -0.9, -0.04);

    const airRecover = context.createBiquadFilter();
    airRecover.type = 'highshelf';
    airRecover.frequency.value = 13200;
    airRecover.gain.value = clamp((brightness < 0.54 && removal > 44 ? 0.12 : -0.08) * amount, -0.35, 0.28);

    input.connect(dynamicNotch).connect(glassGuard).connect(airRecover);
    return airRecover;
}

function createDeMaskingPolishNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (!analysis) return input;
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const metallic = clamp01(Number(analysis.metallicHint ?? 0.35));
    const transient = clamp01(Number(analysis.transientDensity ?? 0.35));
    const clarity = clamp(Number(settings.clarity || 50), 0, 100);
    const removal = clamp(Number(settings.metallicRemoval || 42), 0, 100);
    const need = brightness > 0.56 || metallic > 0.42 || transient > 0.54 || clarity > 58 || removal > 54 || intensity.raw > 135;
    if (!need) return input;

    const scale = clamp(intensity.amount, 0.65, 1.75);
    const deMask = context.createBiquadFilter();
    deMask.type = 'peaking';
    deMask.frequency.value = 1850;
    deMask.Q.value = 0.82;
    deMask.gain.value = clamp((0.30 - Number(analysis.midRatio || 0.28)) * 0.42 * scale, -0.22, 0.28);

    const glare = context.createBiquadFilter();
    glare.type = 'peaking';
    glare.frequency.value = clamp(Number(analysis.targetDynamicFreq || 5200) * 0.62, 2800, 5200);
    glare.Q.value = 1.42;
    glare.gain.value = clamp(-(Math.max(0, brightness - 0.58) * 0.52 + Math.max(0, metallic - 0.40) * 0.38 + Math.max(0, transient - 0.55) * 0.26) * scale, -0.85, -0.02);

    const edge = context.createBiquadFilter();
    edge.type = 'peaking';
    edge.frequency.value = clamp(Number(analysis.targetDynamicFreq || 6200), 5200, 9200);
    edge.Q.value = 2.05;
    edge.gain.value = clamp(-(Math.max(0, metallic - 0.46) * 0.60 + Math.max(0, removal - 60) * 0.005) * scale, -0.80, -0.01);

    input.connect(deMask).connect(glare).connect(edge);
    return edge;
}

function createMicroDynamicsGlueNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    const loudMode = state.masterGoal === 'loud';
    const punch = clamp(Number(settings.dynamicPunch || 35), 0, 100);
    const transient = clamp01(Number(analysis?.transientDensity ?? 0.35));
    const need = loudMode || punch > 58 || transient > 0.56 || intensity.raw > 150;
    if (!need) return input;

    const compressor = context.createDynamicsCompressor();
    const drive = clamp((punch - 45) / 100 + transient * 0.22 + Math.max(0, intensity.raw - 130) / 260, 0.08, 0.62);
    compressor.threshold.value = clamp(-13 - drive * 8, -20, -10);
    compressor.knee.value = 18;
    compressor.ratio.value = clamp(1.28 + drive * 1.25, 1.25, 2.05);
    compressor.attack.value = 0.018;
    compressor.release.value = 0.18;
    input.connect(compressor);
    return compressor;
}


function createLowEndAnchorNode(context, input, isStereo, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (!state.featureFlags.lowEndAnchor || !isStereo) return input;
    const bassRatio = clamp01(Number(analysis?.bassRatio ?? 0.28));
    const anchorAmount = clamp(0.18 + bassRatio * 0.34 + Math.max(0, intensity.raw - 120) * 0.002, 0.16, 0.58);
    const splitFrequency = clamp(120 + bassRatio * 80, 115, 190);

    const output = context.createGain();
    const highPath = context.createBiquadFilter();
    highPath.type = 'highpass';
    highPath.frequency.value = splitFrequency;
    highPath.Q.value = 0.707;

    const splitter = context.createChannelSplitter(2);
    const left = context.createGain();
    const right = context.createGain();
    const lowPass = context.createBiquadFilter();
    const lowGain = context.createGain();

    left.gain.value = 0.5;
    right.gain.value = 0.5;
    lowPass.type = 'lowpass';
    lowPass.frequency.value = splitFrequency;
    lowPass.Q.value = 0.707;
    lowGain.gain.value = anchorAmount;

    input.connect(highPath).connect(output);
    input.connect(splitter);
    splitter.connect(left, 0);
    splitter.connect(right, 1);
    left.connect(lowPass);
    right.connect(lowPass);
    lowPass.connect(lowGain).connect(output);
    return output;
}

function shouldApplyMelodyPreserve(preset, analysis) {
    if (state.featureFlags.melodyPreserve === false) return false;
    if (!preset || preset === 'custom') return false;
    const melodicPresets = new Set(['pop','kpop','kballad','rnb','ballad','acoustic','citypop','globalpop','rock']);
    const mid = Number(analysis?.midRatio || 0);
    const lowMid = Number(analysis?.lowMidRatio || 0);
    return melodicPresets.has(preset) || mid > 0.30 || lowMid > 0.28;
}

function createMelodyPreserveNode(context, input, preset, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (!shouldApplyMelodyPreserve(preset, analysis)) return input;
    const clarity = clamp(Number(settings.clarity || 50), 0, 100);
    const scale = clamp(0.65 + (100 - Math.min(100, clarity)) / 180 + Math.max(0, intensity.raw - 120) / 260, 0.55, 1.28);
    const output = context.createGain();

    const bodyGuard = context.createBiquadFilter();
    bodyGuard.type = 'peaking';
    bodyGuard.frequency.value = 780;
    bodyGuard.Q.value = 0.75;
    bodyGuard.gain.value = clamp(0.12 * scale, 0.04, 0.32);

    const melodyForward = context.createBiquadFilter();
    melodyForward.type = 'peaking';
    melodyForward.frequency.value = 1450;
    melodyForward.Q.value = 0.82;
    melodyForward.gain.value = clamp(0.18 * scale, 0.05, 0.42);

    const harshGuard = context.createBiquadFilter();
    harshGuard.type = 'peaking';
    harshGuard.frequency.value = 3650;
    harshGuard.Q.value = 1.45;
    harshGuard.gain.value = clamp(-0.12 * scale - Math.max(0, clarity - 62) * 0.008, -0.85, -0.04);

    input.connect(bodyGuard).connect(melodyForward).connect(harshGuard).connect(output);
    return output;
}

function shouldApplyAiHumanizer(preset) {
    return Boolean(preset && preset !== 'custom' && state.featureFlags.aiHumanize !== false);
}

function createAiHumanizeNode(context, input, preset, settings, intensity = getMasteringIntensity(settings)) {
    if (!shouldApplyAiHumanizer(preset)) return input;
    const scale = clamp(intensity.amount, 0.65, 1.65);
    const clarity = clamp(Number(settings.clarity || 50), 0, 100);
    const removal = clamp(Number(settings.metallicRemoval || 45), 0, 100);

    const warm250 = context.createBiquadFilter();
    warm250.type = 'peaking';
    warm250.frequency.value = 250;
    warm250.Q.value = 0.95;
    warm250.gain.value = clamp(0.72 * scale, 0.35, 1.25);

    const warm400 = context.createBiquadFilter();
    warm400.type = 'peaking';
    warm400.frequency.value = 400;
    warm400.Q.value = 0.85;
    warm400.gain.value = clamp(0.58 * scale, 0.25, 1.1);

    const body500 = context.createBiquadFilter();
    body500.type = 'peaking';
    body500.frequency.value = 500;
    body500.Q.value = 0.9;
    body500.gain.value = clamp(0.42 * scale, 0.15, 0.9);

    const deEsser = context.createBiquadFilter();
    deEsser.type = 'peaking';
    deEsser.frequency.value = 6400;
    deEsser.Q.value = 3.4;
    deEsser.gain.value = clamp(-0.9 - removal * 0.018 * scale, -3.2, -0.7);

    const hatTamer = context.createBiquadFilter();
    hatTamer.type = 'peaking';
    hatTamer.frequency.value = 10000;
    hatTamer.Q.value = 1.2;
    hatTamer.gain.value = clamp(-0.7 - Math.max(0, clarity - 55) * 0.018 * scale, -2.6, -0.35);

    const air125 = context.createBiquadFilter();
    air125.type = 'peaking';
    air125.frequency.value = 12500;
    air125.Q.value = 1.1;
    air125.gain.value = clamp(-0.85 * scale, -2.4, -0.35);

    const antiFizz16 = context.createBiquadFilter();
    antiFizz16.type = 'peaking';
    antiFizz16.frequency.value = 16000;
    antiFizz16.Q.value = 0.95;
    antiFizz16.gain.value = clamp(-1.05 * scale, -2.8, -0.45);

    const lowPass = context.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = 16000;
    lowPass.Q.value = 0.707;

    input.connect(warm250).connect(warm400).connect(body500).connect(deEsser).connect(hatTamer).connect(air125).connect(antiFizz16).connect(lowPass);
    return lowPass;
}




const PRESET_REFERENCE_TARGETS = {
    pop: { bass: 0.24, lowMid: 0.22, mid: 0.32, high: 0.24, brightness: 0.55 },
    kpop: { bass: 0.24, lowMid: 0.20, mid: 0.31, high: 0.27, brightness: 0.60 },
    kballad: { bass: 0.22, lowMid: 0.29, mid: 0.34, high: 0.17, brightness: 0.45 },
    rnb: { bass: 0.29, lowMid: 0.30, mid: 0.27, high: 0.14, brightness: 0.40 },
    ballad: { bass: 0.22, lowMid: 0.28, mid: 0.34, high: 0.16, brightness: 0.46 },
    acoustic: { bass: 0.18, lowMid: 0.25, mid: 0.36, high: 0.18, brightness: 0.43 },
    citypop: { bass: 0.24, lowMid: 0.29, mid: 0.28, high: 0.19, brightness: 0.50 },
    dance: { bass: 0.30, lowMid: 0.18, mid: 0.25, high: 0.27, brightness: 0.60 },
    synthpop: { bass: 0.24, lowMid: 0.18, mid: 0.27, high: 0.31, brightness: 0.58 },
    house: { bass: 0.32, lowMid: 0.18, mid: 0.24, high: 0.26, brightness: 0.56 },
    futurebass: { bass: 0.29, lowMid: 0.17, mid: 0.25, high: 0.29, brightness: 0.62 },
    edm: { bass: 0.33, lowMid: 0.16, mid: 0.23, high: 0.28, brightness: 0.64 },
    trap: { bass: 0.36, lowMid: 0.23, mid: 0.25, high: 0.16, brightness: 0.42 },
    drill: { bass: 0.35, lowMid: 0.24, mid: 0.25, high: 0.16, brightness: 0.39 },
    hiphop: { bass: 0.31, lowMid: 0.27, mid: 0.27, high: 0.15, brightness: 0.42 },
    boombap: { bass: 0.28, lowMid: 0.31, mid: 0.27, high: 0.14, brightness: 0.36 },
    globalpop: { bass: 0.24, lowMid: 0.22, mid: 0.30, high: 0.24, brightness: 0.56 },
    lofi: { bass: 0.26, lowMid: 0.34, mid: 0.27, high: 0.10, brightness: 0.30 },
    rock: { bass: 0.27, lowMid: 0.26, mid: 0.30, high: 0.17, brightness: 0.52 },
    cinematic: { bass: 0.25, lowMid: 0.30, mid: 0.28, high: 0.17, brightness: 0.48 },
    spatial: { bass: 0.22, lowMid: 0.21, mid: 0.30, high: 0.27, brightness: 0.56 },
    tape: { bass: 0.27, lowMid: 0.34, mid: 0.27, high: 0.12, brightness: 0.36 },
    punch: { bass: 0.30, lowMid: 0.22, mid: 0.29, high: 0.19, brightness: 0.53 }
};

function createPresetReferenceMatchNode(context, input, preset, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (state.featureFlags.referenceMatch === false || !analysis || !preset || preset === 'custom') return input;
    const target = PRESET_REFERENCE_TARGETS[preset];
    if (!target) return input;
    const bass = clamp01(Number(analysis.bassRatio ?? target.bass));
    const lowMid = clamp01(Number(analysis.lowMidRatio ?? target.lowMid));
    const mid = clamp01(Number(analysis.midRatio ?? target.mid));
    const high = clamp01(Number(analysis.highRatio ?? target.high));
    const brightness = clamp01(Number(analysis.brightness ?? target.brightness));
    const metallic = clamp01(Number(analysis.metallicHint ?? 0.35));
    const scale = clamp(0.38 + intensity.amount * 0.23, 0.42, 0.92);

    const low = context.createBiquadFilter();
    low.type = 'lowshelf';
    low.frequency.value = preset === 'edm' || preset === 'trap' || preset === 'drill' ? 92 : 125;
    low.gain.value = clamp((target.bass - bass) * 3.2 * scale, -0.75, 0.78);

    const body = context.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.value = target.lowMid > 0.30 ? 360 : 420;
    body.Q.value = 0.82;
    body.gain.value = clamp((target.lowMid - lowMid) * 2.1 * scale, -0.62, 0.58);

    const presence = context.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = preset === 'punch' || preset === 'rock' ? 1800 : 2350;
    presence.Q.value = 0.92;
    presence.gain.value = clamp((target.mid - mid) * 1.65 * scale - Math.max(0, metallic - 0.58) * 0.18, -0.52, 0.48);

    const air = context.createBiquadFilter();
    air.type = 'highshelf';
    air.frequency.value = target.high > 0.25 ? 9600 : 11200;
    air.gain.value = clamp((target.high - high) * 1.85 * scale + (target.brightness - brightness) * 0.40 * scale, -0.68, 0.58);

    input.connect(low).connect(body).connect(presence).connect(air);
    return air;
}

function createVocalFocusPlusNode(context, input, preset, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (state.featureFlags.vocalFocusPlus === false || !analysis) return input;
    const vocalLikely = shouldApplyVocalProtection(preset, analysis) || Number(analysis.midRatio || 0) > 0.30 || Number(analysis.lowMidRatio || 0) > 0.28;
    if (!vocalLikely && intensity.raw < 135) return input;
    const scale = clamp(0.55 + intensity.amount * 0.32, 0.55, 1.18);
    const clarity = clamp(Number(settings.clarity || 50), 0, 100);
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const output = context.createGain();

    const focusBody = context.createBiquadFilter();
    focusBody.type = 'peaking';
    focusBody.frequency.value = 1180;
    focusBody.Q.value = 0.78;
    focusBody.gain.value = clamp(0.10 * scale, 0.03, 0.25);

    const lyricForward = context.createBiquadFilter();
    lyricForward.type = 'peaking';
    lyricForward.frequency.value = 2150;
    lyricForward.Q.value = 0.92;
    lyricForward.gain.value = clamp((clarity < 64 ? 0.11 : 0.04) * scale, 0.02, 0.24);

    const vowelGuard = context.createBiquadFilter();
    vowelGuard.type = 'peaking';
    vowelGuard.frequency.value = 3250;
    vowelGuard.Q.value = 1.55;
    vowelGuard.gain.value = clamp(-(Math.max(0, brightness - 0.56) * 0.40 + Math.max(0, clarity - 62) * 0.006) * scale, -0.55, -0.02);

    const sibilanceFuse = context.createBiquadFilter();
    sibilanceFuse.type = 'peaking';
    sibilanceFuse.frequency.value = 7600;
    sibilanceFuse.Q.value = 2.25;
    sibilanceFuse.gain.value = clamp(-0.08 * scale - Math.max(0, brightness - 0.62) * 0.32, -0.62, -0.02);

    input.connect(focusBody).connect(lyricForward).connect(vowelGuard).connect(sibilanceFuse).connect(output);
    return output;
}

function createAdaptiveAirBalanceNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (state.featureFlags.adaptiveAir === false || !analysis) return input;
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const high = clamp01(Number(analysis.highRatio ?? 0.24));
    const metallic = clamp01(Number(analysis.metallicHint ?? 0.35));
    const clarity = clamp(Number(settings.clarity || 50), 0, 100);
    const scale = clamp(intensity.amount, 0.65, 1.55);
    const output = context.createGain();

    const silkShelf = context.createBiquadFilter();
    silkShelf.type = 'highshelf';
    silkShelf.frequency.value = brightness > 0.66 || high > 0.38 ? 11800 : 13200;
    const openAmount = brightness < 0.42 && high < 0.28 ? 0.22 : 0.04;
    const trimAmount = Math.max(0, brightness - 0.64) * 0.55 + Math.max(0, high - 0.36) * 0.45 + Math.max(0, clarity - 68) * 0.006;
    silkShelf.gain.value = clamp((openAmount - trimAmount) * scale, -0.78, 0.34);

    const glassFuse = context.createBiquadFilter();
    glassFuse.type = 'peaking';
    glassFuse.frequency.value = 9800;
    glassFuse.Q.value = 1.45;
    glassFuse.gain.value = clamp(-(Math.max(0, metallic - 0.48) * 0.45 + Math.max(0, brightness - 0.70) * 0.28) * scale, -0.65, 0);

    input.connect(silkShelf).connect(glassFuse).connect(output);
    return output;
}

function createOpenMixRecoveryNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (state.featureFlags.openMixGuard === false || !analysis) return input;
    const warmth = clamp(Number(settings.warmth || 55), 0, 100);
    const clarity = clamp(Number(settings.clarity || 50), 0, 100);
    const lowMid = clamp01(Number(analysis.lowMidRatio ?? 0.24));
    const mid = clamp01(Number(analysis.midRatio ?? 0.28));
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const metallic = clamp01(Number(analysis.metallicHint ?? 0.35));
    const needsAir = brightness < 0.50 || clarity < 52 || warmth > 62 || lowMid > 0.28 || intensity.raw > 125;
    if (!needsAir) return input;

    const scale = clamp(0.55 + intensity.amount * 0.32, 0.58, 1.22);
    const output = context.createGain();

    const cloudCut = context.createBiquadFilter();
    cloudCut.type = 'peaking';
    cloudCut.frequency.value = lowMid > 0.30 ? 330 : 410;
    cloudCut.Q.value = 0.72;
    cloudCut.gain.value = clamp(-(Math.max(0, lowMid - 0.22) * 0.95 + Math.max(0, warmth - 62) * 0.008) * scale, -0.85, -0.04);

    const windowLift = context.createBiquadFilter();
    windowLift.type = 'peaking';
    windowLift.frequency.value = mid < 0.28 ? 1900 : 2450;
    windowLift.Q.value = 0.82;
    windowLift.gain.value = clamp((Math.max(0, 0.34 - mid) * 0.55 + Math.max(0, 56 - clarity) * 0.004) * scale, 0.02, 0.30);

    const airWindow = context.createBiquadFilter();
    airWindow.type = 'highshelf';
    airWindow.frequency.value = 10800;
    airWindow.gain.value = clamp((0.42 - brightness) * 0.48 * scale - Math.max(0, metallic - 0.54) * 0.28, -0.24, 0.32);

    input.connect(cloudCut).connect(windowLift).connect(airWindow).connect(output);
    return output;
}

function createTranslationGuardNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (state.featureFlags.translationGuard === false || !analysis) return input;
    const bass = clamp01(Number(analysis.bassRatio ?? 0.28));
    const lowMid = clamp01(Number(analysis.lowMidRatio ?? 0.24));
    const mid = clamp01(Number(analysis.midRatio ?? 0.28));
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const scale = clamp(intensity.amount, 0.65, 1.5);
    const output = context.createGain();

    const subPocket = context.createBiquadFilter();
    subPocket.type = 'lowshelf';
    subPocket.frequency.value = 88;
    subPocket.gain.value = clamp(-(Math.max(0, bass - 0.38) * 0.75) * scale, -0.65, 0.10);

    const mudPocket = context.createBiquadFilter();
    mudPocket.type = 'peaking';
    mudPocket.frequency.value = 245;
    mudPocket.Q.value = 0.88;
    mudPocket.gain.value = clamp(-(Math.max(0, lowMid - 0.27) * 0.80) * scale, -0.75, 0.02);

    const smallSpeakerFocus = context.createBiquadFilter();
    smallSpeakerFocus.type = 'peaking';
    smallSpeakerFocus.frequency.value = 1350;
    smallSpeakerFocus.Q.value = 0.82;
    smallSpeakerFocus.gain.value = clamp((0.31 - mid) * 0.35 * scale, -0.12, 0.26);

    const phoneHarshGuard = context.createBiquadFilter();
    phoneHarshGuard.type = 'peaking';
    phoneHarshGuard.frequency.value = 4100;
    phoneHarshGuard.Q.value = 1.35;
    phoneHarshGuard.gain.value = clamp(-Math.max(0, brightness - 0.62) * 0.32 * scale, -0.42, 0);

    input.connect(subPocket).connect(mudPocket).connect(smallSpeakerFocus).connect(phoneHarshGuard).connect(output);
    return output;
}

function shouldApplyVocalProtection(preset, analysis) {
    if (state.featureFlags.vocalProtect === false) return false;
    if (!preset || preset === 'custom') return false;
    const vocalPresets = new Set(['pop','kpop','kballad','rnb','ballad','acoustic','citypop','globalpop']);
    if (vocalPresets.has(preset)) return true;
    const mid = Number(analysis?.midRatio || 0);
    const high = Number(analysis?.highRatio || 0);
    return mid > 0.34 && high < 0.55;
}

function createVocalProtectionNode(context, input, preset, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (!shouldApplyVocalProtection(preset, analysis)) return input;
    const scale = clamp(intensity.amount, 0.7, 1.45);
    const clarity = clamp(Number(settings.clarity || 50), 0, 100);
    const output = context.createGain();
    const body = context.createBiquadFilter();
    const nasalGuard = context.createBiquadFilter();
    const deEsserSoft = context.createBiquadFilter();
    const airBalance = context.createBiquadFilter();

    body.type = 'peaking';
    body.frequency.value = 900;
    body.Q.value = 0.95;
    body.gain.value = clamp(0.22 * scale, 0.08, 0.55);

    nasalGuard.type = 'peaking';
    nasalGuard.frequency.value = 2400;
    nasalGuard.Q.value = 1.25;
    nasalGuard.gain.value = clamp(-0.18 * scale, -0.55, -0.05);

    deEsserSoft.type = 'peaking';
    deEsserSoft.frequency.value = 7200;
    deEsserSoft.Q.value = 2.8;
    deEsserSoft.gain.value = clamp(-0.28 - Math.max(0, clarity - 58) * 0.012 * scale, -1.25, -0.16);

    airBalance.type = 'highshelf';
    airBalance.frequency.value = 11800;
    airBalance.gain.value = clamp(-0.10 * scale, -0.45, 0);

    input.connect(body).connect(nasalGuard).connect(deEsserSoft).connect(airBalance).connect(output);
    return output;
}

function createProfileEqChain(context, input, preset, intensity = getMasteringIntensity({ intensity: 100 })) {
    const filters = PROFILE_EQ_FILTERS[preset] || [];
    let node = input;
    filters.forEach(config => {
        const filter = context.createBiquadFilter();
        filter.type = config.type;
        filter.frequency.value = config.frequency;
        filter.Q.value = config.q;
        filter.gain.value = clamp(config.gain * clamp(intensity.amount, 0.7, 1.8), -5.5, 4.0);
        node.connect(filter);
        node = filter;
    });
    return node;
}

function createStereoWidthNode(context, input, isStereo, widthFactor) {
    if (!isStereo) return input;
    const splitter = context.createChannelSplitter(2);
    const merger = context.createChannelMerger(2);
    const output = context.createGain();
    const side = widthFactor;
    const routes = [
        [0, 0, 0.5 + 0.5 * side],
        [1, 0, 0.5 - 0.5 * side],
        [0, 1, 0.5 - 0.5 * side],
        [1, 1, 0.5 + 0.5 * side]
    ];
    input.connect(splitter);
    routes.forEach(([from, to, gainValue]) => {
        const gain = context.createGain();
        gain.gain.value = gainValue;
        splitter.connect(gain, from);
        gain.connect(merger, 0, to);
    });
    merger.connect(output);
    return output;
}


function createPhaseSafeNode(context, input, isStereo, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (state.featureFlags.phaseSafe === false || !isStereo) return input;
    const width = clamp(Number(settings.width || 28), 0, 100);
    const groove = clamp(Number(settings.stereoGroove || 0), 0, 100);
    const measuredWidth = clamp01(Number(analysis?.stereoWidth ?? 0.38));
    const bass = clamp01(Number(analysis?.bassRatio ?? 0.26));
    const risk = Math.max(0, width - 58) / 42 * 0.42 + Math.max(0, groove - 14) / 86 * 0.22 + Math.max(0, measuredWidth - 0.60) * 0.45 + Math.max(0, bass - 0.36) * 0.18;
    if (risk < 0.035) return input;
    const side = clamp(1 - risk * clamp(intensity.amount, 0.65, 1.6) * 0.18, 0.86, 1);
    const splitter = context.createChannelSplitter(2);
    const merger = context.createChannelMerger(2);
    const output = context.createGain();
    const routes = [
        [0, 0, 0.5 + 0.5 * side],
        [1, 0, 0.5 - 0.5 * side],
        [0, 1, 0.5 - 0.5 * side],
        [1, 1, 0.5 + 0.5 * side]
    ];
    input.connect(splitter);
    routes.forEach(([from, to, gainValue]) => {
        const gain = context.createGain();
        gain.gain.value = gainValue;
        splitter.connect(gain, from);
        gain.connect(merger, 0, to);
    });
    merger.connect(output);
    return output;
}

function createStereoGrooveNode(context, input, amount, intensity = getMasteringIntensity({ intensity: 100 })) {
    const depth = clamp(amount / 100 * clamp(intensity.amount, 0.7, 1.7), 0, 1.25);
    if (depth < 0.08) return input;
    const output = context.createGain();
    const dry = context.createGain();
    const wet = context.createGain();
    const delay = context.createDelay(0.04);
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();

    dry.gain.value = 1 - depth * 0.08;
    wet.gain.value = depth * 0.08;
    delay.delayTime.value = 0.0018 + depth * 0.0025;
    lfo.frequency.value = 0.14 + depth * 0.32;
    lfoGain.gain.value = depth * 0.0012;

    input.connect(dry).connect(output);
    input.connect(delay).connect(wet).connect(output);
    lfo.connect(lfoGain).connect(delay.delayTime);
    lfo.start(0);
    return output;
}

function createSpectralBalancerNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (!analysis) return input;
    const bass = clamp01(Number(analysis.bassRatio ?? 0.28));
    const lowMid = clamp01(Number(analysis.lowMidRatio ?? 0.24));
    const mid = clamp01(Number(analysis.midRatio ?? 0.28));
    const high = clamp01(Number(analysis.highRatio ?? 0.22));
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const scale = clamp(intensity.amount, 0.65, 1.7);
    const output = context.createGain();

    const subShelf = context.createBiquadFilter();
    subShelf.type = 'lowshelf';
    subShelf.frequency.value = 95;
    subShelf.gain.value = clamp((0.30 - bass) * 1.35 * scale, -0.75, 0.65);

    const mudScoop = context.createBiquadFilter();
    mudScoop.type = 'peaking';
    mudScoop.frequency.value = 260;
    mudScoop.Q.value = 0.82;
    mudScoop.gain.value = clamp((0.22 - lowMid) * 1.55 * scale, -0.95, 0.45);

    const vocalKeep = context.createBiquadFilter();
    vocalKeep.type = 'peaking';
    vocalKeep.frequency.value = 1650;
    vocalKeep.Q.value = 0.72;
    vocalKeep.gain.value = clamp((0.30 - mid) * 0.62 * scale, -0.32, 0.45);

    const airTrim = context.createBiquadFilter();
    airTrim.type = 'highshelf';
    airTrim.frequency.value = brightness > 0.66 || high > 0.36 ? 9800 : 11800;
    airTrim.gain.value = clamp((0.27 - high) * 1.2 * scale - Math.max(0, brightness - 0.62) * 1.25, -0.95, 0.55);

    input.connect(subShelf).connect(mudScoop).connect(vocalKeep).connect(airTrim).connect(output);
    return output;
}


function createPerceptualPolishNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (!analysis) return input;
    const clarity = clamp(Number(settings.clarity || 50), 0, 100);
    const warmth = clamp(Number(settings.warmth || 55), 0, 100);
    const removal = clamp(Number(settings.metallicRemoval || 42), 0, 100);
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const high = clamp01(Number(analysis.highRatio ?? 0.22));
    const mid = clamp01(Number(analysis.midRatio ?? 0.28));
    const metallic = clamp01(Number(analysis.metallicHint ?? 0.35));
    const scale = clamp(intensity.amount, 0.65, 1.75);

    const bodyFocus = context.createBiquadFilter();
    bodyFocus.type = 'peaking';
    bodyFocus.frequency.value = 520;
    bodyFocus.Q.value = 0.88;
    bodyFocus.gain.value = clamp((warmth - 55) * 0.006 * scale + (0.27 - mid) * 0.30, -0.28, 0.42);

    const presenceFocus = context.createBiquadFilter();
    presenceFocus.type = 'peaking';
    presenceFocus.frequency.value = 2450;
    presenceFocus.Q.value = 1.05;
    presenceFocus.gain.value = clamp((clarity - 50) * 0.0045 * scale - metallic * 0.18, -0.48, 0.38);

    const biteGuard = context.createBiquadFilter();
    biteGuard.type = 'peaking';
    biteGuard.frequency.value = clamp(Number(analysis.targetDynamicFreq || 5200) * 0.82, 3600, 6800);
    biteGuard.Q.value = 2.35;
    biteGuard.gain.value = clamp(-Math.max(0, metallic - 0.42) * 0.72 * scale - Math.max(0, removal - 58) * 0.006, -1.10, -0.03);

    const silkShelf = context.createBiquadFilter();
    silkShelf.type = 'highshelf';
    silkShelf.frequency.value = 13500;
    silkShelf.gain.value = clamp((0.48 - brightness) * 0.62 * scale - Math.max(0, high - 0.38) * 0.55, -0.55, 0.42);

    input.connect(bodyFocus).connect(presenceFocus).connect(biteGuard).connect(silkShelf);
    return silkShelf;
}

function createToneChain(context, input, settings, intensity = getMasteringIntensity(settings)) {
    const toneScale = clamp(intensity.amount, 0.65, 2.25);
    const highAggression = intensity.raw >= 140 ? 1 + Math.pow((intensity.raw - 140) / 60, 1.55) * 0.9 : 1;

    const lowShelf = context.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 170;
    lowShelf.gain.value = clamp(map(settings.warmth, 0, 100, -2.0, 2.4) * toneScale, -4.0, 4.2);

    const lowMid = context.createBiquadFilter();
    lowMid.type = 'peaking';
    lowMid.frequency.value = 320;
    lowMid.Q.value = 0.75;
    lowMid.gain.value = clamp(map(settings.warmth, 0, 100, -1.0, 1.2) * toneScale, -3.0, 3.0);

    const presence = context.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 3100;
    presence.Q.value = intensity.raw >= 150 ? 1.15 : 0.92;
    presence.gain.value = clamp(map(settings.clarity, 0, 100, -1.5, 1.8) * toneScale * highAggression, -4.0, 5.2);

    const highShelf = context.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 7200;
    highShelf.gain.value = clamp(map(settings.clarity, 0, 100, -2.2, 2.5) * toneScale * highAggression, -5.0, 6.0);

    input.connect(lowShelf).connect(lowMid).connect(presence).connect(highShelf);
    return highShelf;
}

function createMetallicRemovalNode(context, input, amount, analysis, intensity = getMasteringIntensity({ intensity: 100 })) {
    const aggressive = intensity.raw >= 140 ? 1 + Math.pow((intensity.raw - 140) / 60, 1.45) * 0.9 : 1;
    const effectiveAmount = clamp(amount * clamp(intensity.amount, 0.65, 2.15) * aggressive, 0, 220);
    const depth = effectiveAmount / 100;
    if (depth < 0.03) return input;
    const targetDynamicF = (analysis && analysis.targetDynamicFreq) ? analysis.targetDynamicFreq : 5200;

    const ringCut = context.createBiquadFilter();
    ringCut.type = 'peaking';
    ringCut.frequency.value = 2700;
    ringCut.Q.value = intensity.raw >= 150 ? 4.3 : 3.5;
    ringCut.gain.value = clamp(map(effectiveAmount, 0, 200, 0, -5.2), -6.0, 0);

    const dynamicCut = context.createBiquadFilter();
    dynamicCut.type = 'peaking';
    dynamicCut.frequency.value = targetDynamicF;
    dynamicCut.Q.value = intensity.raw >= 150 ? 6.5 : 5.0;
    dynamicCut.gain.value = clamp(map(effectiveAmount, 0, 200, 0, -8.5), -9.5, 0);

    const fizzCut = context.createBiquadFilter();
    fizzCut.type = 'peaking';
    fizzCut.frequency.value = 8200;
    fizzCut.Q.value = intensity.raw >= 150 ? 6.2 : 5.2;
    fizzCut.gain.value = clamp(map(effectiveAmount, 0, 200, 0, -6.2), -7.0, 0);

    const airTamer = context.createBiquadFilter();
    airTamer.type = 'highshelf';
    airTamer.frequency.value = 11500;
    airTamer.gain.value = clamp(map(effectiveAmount, 0, 200, 0, -3.4), -4.0, 0);

    input.connect(ringCut).connect(dynamicCut).connect(fizzCut).connect(airTamer);
    return airTamer;
}

function createHighFrequencyExciterNode(context, input, settings, intensity = getMasteringIntensity(settings)) {
    const clarity = clamp(Number(settings.clarity || 0), 0, 100) / 100;
    const exciterDrive = Math.max(0, (intensity.raw - 85) / 115) * (0.35 + clarity * 0.9);
    if (exciterDrive < 0.035) return input;

    const output = context.createGain();
    const dry = context.createGain();
    const highPass = context.createBiquadFilter();
    const shaper = context.createWaveShaper();
    const airShelf = context.createBiquadFilter();
    const wet = context.createGain();

    highPass.type = 'highpass';
    highPass.frequency.value = clamp(5200 - clarity * 1100, 3600, 5600);
    highPass.Q.value = 0.75;

    shaper.curve = makeExciterCurve(1 + exciterDrive * 4.5);
    shaper.oversample = '4x';

    airShelf.type = 'highshelf';
    airShelf.frequency.value = 8200;
    airShelf.gain.value = clamp(exciterDrive * 5.2 * clamp(intensity.amount, 0.8, 1.8), 0, 7.0);

    wet.gain.value = clamp(0.035 + exciterDrive * 0.12, 0.025, 0.24);
    dry.gain.value = 1 - wet.gain.value * 0.18;

    input.connect(dry).connect(output);
    input.connect(highPass).connect(shaper).connect(airShelf).connect(wet).connect(output);
    return output;
}

function makeExciterCurve(amount) {
    const samples = 2048;
    const curve = new Float32Array(samples);
    const drive = Math.max(1, amount * 8);
    for (let i = 0; i < samples; i += 1) {
        const x = i * 2 / (samples - 1) - 1;
        const shaped = Math.tanh(x * drive);
        curve[i] = (shaped - x * 0.35) * 0.72;
    }
    return curve;
}


function createEarFatigueGuardNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (state.featureFlags.earFatigueGuard === false || !analysis) return input;
    const clarity = clamp(Number(settings.clarity || 50), 0, 100);
    const removal = clamp(Number(settings.metallicRemoval || 42), 0, 100);
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const high = clamp01(Number(analysis.highRatio ?? 0.22));
    const metallic = clamp01(Number(analysis.metallicHint ?? 0.35));
    const fatigue = Math.max(0, brightness - 0.58) * 0.50 + Math.max(0, high - 0.34) * 0.45 + Math.max(0, metallic - 0.48) * 0.60 + Math.max(0, clarity - 64) * 0.006 + Math.max(0, intensity.raw - 135) * 0.0025;
    if (fatigue < 0.035 && removal < 62) return input;
    const scale = clamp(0.65 + fatigue * 1.3, 0.65, 1.35);

    const glare = context.createBiquadFilter();
    glare.type = 'peaking';
    glare.frequency.value = 3600;
    glare.Q.value = 1.65;
    glare.gain.value = clamp(-fatigue * 0.70 * scale, -0.95, -0.02);

    const edge = context.createBiquadFilter();
    edge.type = 'peaking';
    edge.frequency.value = clamp(Number(analysis.targetDynamicFreq || 6200), 4800, 7800);
    edge.Q.value = 2.4;
    edge.gain.value = clamp(-(fatigue * 0.88 + Math.max(0, removal - 65) * 0.006) * scale, -1.25, -0.02);

    const airFuse = context.createBiquadFilter();
    airFuse.type = 'peaking';
    airFuse.frequency.value = 9800;
    airFuse.Q.value = 1.55;
    airFuse.gain.value = clamp(-fatigue * 0.62 * scale, -0.95, 0);

    input.connect(glare).connect(edge).connect(airFuse);
    return airFuse;
}

function createLoudnessLiftNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    const output = context.createGain();
    const loudnessHint = analysis && Number.isFinite(analysis.loudnessHint) ? analysis.loudnessHint : -18;
    const targetRms = map(intensity.raw, 50, 200, -20.5, -10.0);
    const baseLift = clamp((targetRms - loudnessHint) * 0.34, -1.5, 7.2);
    const extraDrive = intensity.raw > 120 ? Math.pow((intensity.raw - 120) / 80, 1.35) * 1.6 : 0;
    const gainDb = clamp(baseLift + extraDrive, -2.0, intensity.raw >= 160 ? 8.5 : 6.0);
    output.gain.value = dbToAmp(gainDb);
    input.connect(output);
    return output;
}


function createTransientRefineNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (state.featureFlags.transientRefine === false) return input;
    const transient = clamp01(Number(analysis?.transientDensity ?? 0.35));
    const punch = clamp(Number(settings.dynamicPunch || 50), 0, 100);
    const high = clamp01(Number(analysis?.highRatio ?? 0.28));
    const need = transient > 0.42 || punch > 54 || intensity.raw > 135;
    if (!need) return input;

    const snapScale = clamp((transient - 0.36) * 2.0 + Math.max(0, punch - 50) / 120 + Math.max(0, intensity.raw - 130) / 180, 0.1, 1.25);
    const output = context.createGain();
    const clickGuard = context.createBiquadFilter();
    const hatGuard = context.createBiquadFilter();
    const bodyKeep = context.createBiquadFilter();

    bodyKeep.type = 'peaking';
    bodyKeep.frequency.value = 1850;
    bodyKeep.Q.value = 0.9;
    bodyKeep.gain.value = clamp(0.06 * snapScale, 0, 0.20);

    clickGuard.type = 'peaking';
    clickGuard.frequency.value = 4700;
    clickGuard.Q.value = 2.2;
    clickGuard.gain.value = clamp(-0.18 * snapScale, -0.85, -0.03);

    hatGuard.type = 'peaking';
    hatGuard.frequency.value = high > 0.38 ? 9500 : 7800;
    hatGuard.Q.value = 1.8;
    hatGuard.gain.value = clamp(-0.12 * snapScale, -0.65, -0.02);

    input.connect(bodyKeep).connect(clickGuard).connect(hatGuard).connect(output);
    return output;
}

function createCompressionNode(context, input, punch, intensity = getMasteringIntensity({ intensity: 100 })) {
    const compressor = context.createDynamicsCompressor();
    const effectivePunch = clamp(punch * clamp(intensity.amount, 0.7, 1.9), 0, 160);
    const p = clamp01(effectivePunch / 100);
    compressor.threshold.value = clamp(map(effectivePunch, 0, 160, -18, -6), -26, -5);
    compressor.knee.value = clamp(map(effectivePunch, 0, 160, 28, 8), 6, 30);
    compressor.ratio.value = clamp(map(effectivePunch, 0, 160, 2.2, 1.18), 1.12, 5.0);
    compressor.attack.value = map(p, 0, 1, 0.008, 0.035);
    compressor.release.value = map(p, 0, 1, 0.34, 0.09);
    input.connect(compressor);
    return compressor;
}

function createLimiterNode(context, input, intensity = getMasteringIntensity({ intensity: 100 })) {
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = intensity.raw >= 150 ? -1.6 : -0.9;
    limiter.knee.value = 0;
    limiter.ratio.value = intensity.raw >= 150 ? 20 : 15;
    limiter.attack.value = 0.001;
    limiter.release.value = intensity.raw >= 150 ? 0.055 : 0.07;
    input.connect(limiter);
    return limiter;
}

function createSaturationNode(context, input, analogGroove, warmth, intensity = getMasteringIntensity({ intensity: 100 })) {
    if (analogGroove < 8 && warmth < 68 && intensity.raw < 125) return input;
    const output = context.createGain();
    const dry = context.createGain();
    const wet = context.createGain();
    const shaper = context.createWaveShaper();

    const drive = 1 + (analogGroove / 100 * 2.5 + warmth / 100 * 0.4) * clamp(intensity.amount, 0.65, 1.85);
    const mix = Math.min(0.2, (analogGroove / 100 * 0.09 + warmth / 100 * 0.015) * clamp(intensity.amount, 0.65, 2.0));
    const compensation = 1.0 / (1.0 + (analogGroove * 0.0035 * clamp(intensity.amount, 0.8, 1.6)));

    dry.gain.value = (1 - mix) * compensation;
    wet.gain.value = mix * compensation;
    shaper.curve = makeSaturationCurve(drive);
    shaper.oversample = '4x';

    input.connect(dry).connect(output);
    input.connect(shaper).connect(wet).connect(output);
    return output;
}

function makeSaturationCurve(amount) {
    const key = `sat:${Math.round(Number(amount || 1) * 100)}`;
    if (CURVE_CACHE.has(key)) return CURVE_CACHE.get(key);
    const samples = 4096;
    const curve = new Float32Array(samples);
    const k = amount * 18;
    for (let i = 0; i < samples; i += 1) {
        const x = i * 2 / (samples - 1) - 1;
        curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
    }
    if (CURVE_CACHE.size > 24) CURVE_CACHE.clear();
    CURVE_CACHE.set(key, curve);
    return curve;
}

function createAlbumMatchNode(context, input, analysis, albumProfile) {
    if (!state.featureFlags.albumMatch || !analysis || !albumProfile || albumProfile.count < 2) return input;

    const output = context.createGain();
    const toneDelta = clamp(albumProfile.brightness - analysis.brightness, -0.45, 0.45);
    const levelDeltaDb = clamp((albumProfile.loudnessHint - analysis.loudnessHint) * 0.35, -2.5, 2.5);

    const lowShelf = context.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 180;
    lowShelf.gain.value = clamp(-toneDelta * 1.1, -1.2, 1.2);

    const highShelf = context.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 7800;
    highShelf.gain.value = clamp(toneDelta * 2.0, -1.8, 1.8);

    output.gain.value = Math.pow(10, levelDeltaDb / 20);
    input.connect(lowShelf).connect(highShelf).connect(output);
    return output;
}

function computeAlbumProfile() {
    const analyses = state.tracks.map(track => track.analysis).filter(item => item && !item.silence);
    if (!analyses.length) return null;
    return {
        count: analyses.length,
        loudnessHint: median(analyses.map(item => item.loudnessHint)),
        brightness: median(analyses.map(item => item.brightness)),
        stereoWidth: median(analyses.map(item => item.stereoWidth)),
        metallicHint: median(analyses.map(item => item.metallicHint))
    };
}

function getActiveAlbumProfile() {
    if (!state.featureFlags.albumMatch) return null;
    state.albumProfile = computeAlbumProfile();
    if (!state.albumProfile || state.albumProfile.count < 2) return null;
    return state.albumProfile;
}

function createAlbumAppliedInfo(analysis, profile) {
    const levelDeltaDb = clamp((profile.loudnessHint - analysis.loudnessHint) * 0.35, -2.5, 2.5);
    const toneDelta = clamp(profile.brightness - analysis.brightness, -0.45, 0.45);
    return {
        referenceTracks: profile.count,
        levelDeltaDb,
        toneDelta,
        referenceLoudness: profile.loudnessHint,
        referenceBrightness: profile.brightness
    };
}

function mixInstrumentLayerBuffer(buffer, layer, analysis) {
    const value = cloneInstrumentLayer(layer || DEFAULT_INSTRUMENT_LAYER);
    const preset = INSTRUMENT_LAYER_PRESETS[value.mode] || INSTRUMENT_LAYER_PRESETS.off;
    if (value.mode === 'off') {
        return { buffer, info: { applied: false, label: 'OFF', bpm: 0, events: 0, gainDb: 0, confidence: 0 } };
    }

    const bpmInfo = estimateTempoFromBuffer(buffer, analysis);
    const bpm = clamp(Number(bpmInfo.bpm || 120), 60, 190);
    const amount = INSTRUMENT_AMOUNT_LEVELS[value.amount] || INSTRUMENT_AMOUNT_LEVELS.light;
    const sourcePeak = measureSamplePeak(buffer);
    const bassDucking = preset.hasKick ? clamp(1 - Number(analysis?.bassRatio || 0.28) * 0.20, 0.76, 1.0) : 1;
    const transientDucking = clamp(1.06 - Number(analysis?.transientDensity || 0.35) * 0.32, 0.72, 1.02);
    const confidenceScale = clamp(0.72 + Number(bpmInfo.confidence || 0.4) * 0.36, 0.70, 1.05);
    const peakRoomScale = clamp((0.965 - sourcePeak) / 0.34, 0.34, 1.0);
    const naturalScale = amount.gain * peakRoomScale * bassDucking * transientDucking * confidenceScale;
    const output = cloneAudioBuffer(buffer);
    const channels = getMutableChannelViews(output);
    const beatSamples = Math.max(1, Math.round(buffer.sampleRate * 60 / bpm));
    const firstBeat = detectFirstTransientSample(buffer, beatSamples);
    const durationBeats = Math.ceil((buffer.length + beatSamples) / beatSamples);
    const swing = value.amount === 'light' ? 0.018 : value.amount === 'normal' ? 0.026 : 0.034;
    const microHumanize = value.amount === 'bold' ? 0.008 : 0.005;
    let events = 0;
    let weightedGain = 0;

    for (let beat = 0; beat < durationBeats; beat += 1) {
        const barBeat = beat % 4;
        const baseStart = firstBeat + beat * beatSamples;
        const human = Math.round(beatSamples * microHumanize * pseudoNoise(beat * 19.17));
        if (baseStart >= -beatSamples && baseStart < output.length) {
            if (preset.hasKick) {
                const velocity = barBeat === 0 ? 1.0 : barBeat === 2 ? 0.72 : 0.36;
                const start = baseStart + human;
                if (start >= 0 && start < output.length) {
                    const amp = 0.050 * naturalScale * velocity;
                    addKickToChannels(channels, output.sampleRate, start, amp);
                    weightedGain += amp;
                    events += 1;
                }
            }
            if (preset.hasClap && (barBeat === 1 || barBeat === 3)) {
                const start = baseStart + Math.round(beatSamples * 0.018) + Math.round(human * 0.45);
                if (start >= 0 && start < output.length) {
                    const amp = 0.029 * naturalScale * (barBeat === 1 ? 0.92 : 1.0);
                    addClapToChannels(channels, output.sampleRate, start, amp);
                    weightedGain += amp;
                    events += 1;
                }
            }
        }
        if (preset.hasHat) {
            const offbeatSwing = Math.round(beatSamples * (0.50 + swing));
            const hat1 = baseStart + offbeatSwing + Math.round(human * 0.35);
            if (hat1 >= 0 && hat1 < output.length) {
                const amp = 0.016 * naturalScale * (barBeat === 0 ? 0.82 : 1.0);
                addHatToChannels(channels, output.sampleRate, hat1, amp, beat, beat % 2 ? 0.94 : 1.06);
                weightedGain += amp;
                events += 1;
            }
            if (value.amount !== 'light') {
                const hat2 = baseStart + Math.round(beatSamples * 0.25) - Math.round(beatSamples * swing * 0.33);
                if (hat2 >= 0 && hat2 < output.length) {
                    const amp = 0.0085 * naturalScale * (barBeat === 2 ? 0.9 : 0.7);
                    addHatToChannels(channels, output.sampleRate, hat2, amp, beat + 17, beat % 2 ? 1.05 : 0.96);
                    weightedGain += amp;
                    events += 1;
                }
            }
        }
    }

    applyEdgeFade(output, 0.004);
    const afterPeak = measureSamplePeakFast(channels);
    const safeGain = afterPeak > 0.94 ? 0.94 / Math.max(1e-9, afterPeak) : 1;
    if (safeGain < 1) applyBufferGainFast(channels, safeGain);

    return {
        buffer: output,
        info: {
            applied: true,
            label: getInstrumentLayerLabel(value.mode),
            amount: value.amount,
            bpm,
            confidence: bpmInfo.confidence,
            candidates: bpmInfo.candidates || [],
            gridQuality: bpmInfo.gridQuality,
            firstBeatSec: firstBeat / buffer.sampleRate,
            events,
            averageEventGain: events ? weightedGain / events : 0,
            gainDb: 20 * Math.log10(Math.max(1e-9, safeGain * naturalScale))
        }
    };
}

function estimateTempoFromBuffer(buffer, analysis) {
    const tempoData = buildOnsetEnvelope(buffer, 132);
    const envelope = tempoData.envelope;
    const sampleRate = buffer.sampleRate;
    const hopSeconds = tempoData.hop / sampleRate;
    if (!envelope.length) return { bpm: 120, confidence: 0, candidates: [], gridQuality: 0 };

    const candidates = [];
    for (let bpm = 60; bpm <= 190; bpm += 0.5) {
        const lag = Math.max(1, Math.round((60 / bpm) / hopSeconds));
        const score = scoreTempoLag(envelope, lag);
        candidates.push({ bpm, score });
    }
    candidates.sort((a, b) => b.score - a.score);
    let best = candidates[0] || { bpm: 120, score: 0 };

    const folded = foldTempoCandidate(best.bpm, analysis);
    let bestBpm = folded;
    const foldedHit = candidates.find(item => Math.abs(foldTempoCandidate(item.bpm, analysis) - folded) < 0.6);
    if (foldedHit && foldedHit.score > best.score * 0.82) best = foldedHit;

    bestBpm = refineTempoWithNeighborhood(envelope, hopSeconds, bestBpm);
    const runnerUp = candidates.find(item => Math.abs(foldTempoCandidate(item.bpm, analysis) - bestBpm) > 3) || candidates[1] || best;
    const transient = Number(analysis?.transientDensity ?? 0.35);
    const separation = best.score / Math.max(1e-9, runnerUp.score || 1e-9);
    const rawConfidence = (best.score * 120) + clamp((separation - 1) * 0.42, 0, 0.36) + transient * 0.22;
    const confidence = clamp01(rawConfidence);
    const gridQuality = clamp01(scoreTempoLag(envelope, Math.max(1, Math.round((60 / bestBpm) / hopSeconds))) * 150);
    return {
        bpm: clamp(bestBpm, 60, 190),
        confidence,
        gridQuality,
        candidates: candidates.slice(0, 4).map(item => ({ bpm: Math.round(foldTempoCandidate(item.bpm, analysis) * 10) / 10, score: Math.round(item.score * 100000) / 100000 }))
    };
}

function buildOnsetEnvelope(buffer, maxSeconds = 120) {
    const sampleRate = buffer.sampleRate;
    const frameSize = Math.max(768, Math.round(sampleRate * 0.026));
    const hop = Math.max(384, Math.round(sampleRate * 0.0125));
    const maxLength = Math.min(buffer.length, Math.round(sampleRate * maxSeconds));
    const frames = Math.max(0, Math.ceil(maxLength / hop));
    const envelope = new Float32Array(frames);
    const channels = getReadableChannelViews(buffer);
    let prevEnergy = 0;
    let prevPeak = 0;
    let running = 0;
    for (let frame = 0; frame < frames; frame += 1) {
        const start = frame * hop;
        const end = Math.min(maxLength, start + frameSize);
        let sum = 0;
        let peak = 0;
        let zc = 0;
        let prev = 0;
        let count = 0;
        for (let ch = 0; ch < channels.length; ch += 1) {
            const data = channels[ch];
            for (let i = start; i < end; i += 4) {
                const sample = data[i] || 0;
                const abs = Math.abs(sample);
                sum += abs;
                if (abs > peak) peak = abs;
                if (count > 0 && Math.sign(sample) !== Math.sign(prev)) zc += 1;
                prev = sample;
                count += 1;
            }
        }
        const energy = sum / Math.max(1, count);
        const rise = Math.max(0, energy - prevEnergy * 0.86);
        const peakRise = Math.max(0, peak - prevPeak * 0.82);
        const zcBoost = clamp01(zc / Math.max(1, count) * 7.5);
        const raw = rise * 0.88 + peakRise * 0.38 + energy * zcBoost * 0.08;
        running = running * 0.985 + raw * 0.015;
        envelope[frame] = Math.max(0, raw - running * 0.16);
        prevEnergy = energy;
        prevPeak = peak;
    }
    normalizeEnvelopeInPlace(envelope);
    return { envelope, hop, frameSize };
}

function normalizeEnvelopeInPlace(envelope) {
    let max = 0;
    let sum = 0;
    for (let i = 0; i < envelope.length; i += 1) {
        max = Math.max(max, envelope[i]);
        sum += envelope[i];
    }
    const mean = sum / Math.max(1, envelope.length);
    const scale = 1 / Math.max(1e-9, Math.max(max * 0.55, mean * 6));
    for (let i = 0; i < envelope.length; i += 1) {
        envelope[i] = Math.min(1, envelope[i] * scale);
    }
}

function scoreTempoLag(envelope, lag) {
    if (!envelope.length || lag <= 0 || lag >= envelope.length) return 0;
    let score = 0;
    let count = 0;
    const lag2 = lag * 2;
    const halfLag = Math.max(1, Math.round(lag / 2));
    for (let i = lag2; i < envelope.length; i += 1) {
        const current = envelope[i];
        score += current * envelope[i - lag];
        if (i - lag2 >= 0) score += current * envelope[i - lag2] * 0.42;
        if (i - halfLag >= 0) score += current * envelope[i - halfLag] * 0.18;
        count += 1.6;
    }
    return score / Math.max(1, count);
}

function refineTempoWithNeighborhood(envelope, hopSeconds, bpm) {
    let bestBpm = bpm;
    let bestScore = -Infinity;
    for (let candidate = bpm - 1.5; candidate <= bpm + 1.5; candidate += 0.25) {
        const lag = Math.max(1, Math.round((60 / candidate) / hopSeconds));
        const score = scoreTempoLag(envelope, lag);
        if (score > bestScore) {
            bestScore = score;
            bestBpm = candidate;
        }
    }
    return Math.round(bestBpm * 10) / 10;
}

function foldTempoCandidate(bpm, analysis) {
    let value = Number(bpm || 120);
    const transient = Number(analysis?.transientDensity ?? 0.35);
    const bass = Number(analysis?.bassRatio ?? 0.28);
    while (value < 78 && (transient > 0.22 || bass > 0.24)) value *= 2;
    while (value > 174 && transient < 0.58) value /= 2;
    if (value < 92 && transient > 0.46 && bass > 0.24) value *= 2;
    if (value > 156 && transient < 0.30) value /= 2;
    return clamp(value, 60, 190);
}

function detectFirstTransientSample(buffer, beatSamples) {
    const sampleRate = buffer.sampleRate;
    const activeStart = findActiveAudioStartSample(buffer);
    const searchStart = Math.max(0, activeStart - Math.round(sampleRate * 0.08));
    const maxBeats = Math.min(16, Math.ceil((buffer.length - searchStart) / Math.max(1, beatSamples)));
    const step = Math.max(128, Math.round(sampleRate * 0.006));
    let bestOffset = 0;
    let bestScore = -Infinity;
    for (let offset = 0; offset < beatSamples; offset += step) {
        let score = 0;
        let weight = 1;
        for (let beat = 0; beat < maxBeats; beat += 1) {
            const pos = searchStart + offset + beat * beatSamples;
            if (pos >= buffer.length) break;
            score += measureTransientAtSample(buffer, pos) * weight;
            weight *= 0.94;
        }
        if (score > bestScore) {
            bestScore = score;
            bestOffset = offset;
        }
    }
    return clamp(searchStart + bestOffset - Math.round(beatSamples * 0.015), 0, Math.max(0, buffer.length - 1));
}

function findActiveAudioStartSample(buffer) {
    const sampleRate = buffer.sampleRate;
    const channels = getReadableChannelViews(buffer);
    const frame = Math.max(512, Math.round(sampleRate * 0.02));
    const threshold = 0.006;
    const max = Math.min(buffer.length, Math.round(sampleRate * 12));
    for (let start = 0; start < max; start += frame) {
        let sum = 0;
        let count = 0;
        for (let ch = 0; ch < channels.length; ch += 1) {
            const data = channels[ch];
            const end = Math.min(buffer.length, start + frame);
            for (let i = start; i < end; i += 8) {
                sum += Math.abs(data[i] || 0);
                count += 1;
            }
        }
        if (sum / Math.max(1, count) > threshold) return start;
    }
    return 0;
}

function measureTransientAtSample(buffer, sample) {
    const channels = getReadableChannelViews(buffer);
    const frame = Math.max(128, Math.round(buffer.sampleRate * 0.006));
    const beforeStart = Math.max(0, sample - frame);
    const afterEnd = Math.min(buffer.length, sample + frame);
    let before = 0;
    let after = 0;
    let beforeCount = 0;
    let afterCount = 0;
    for (let ch = 0; ch < channels.length; ch += 1) {
        const data = channels[ch];
        for (let i = beforeStart; i < sample; i += 4) {
            before += Math.abs(data[i] || 0);
            beforeCount += 1;
        }
        for (let i = sample; i < afterEnd; i += 4) {
            after += Math.abs(data[i] || 0);
            afterCount += 1;
        }
    }
    return Math.max(0, after / Math.max(1, afterCount) - before / Math.max(1, beforeCount) * 0.72);
}

function getReadableChannelViews(buffer) {
    const channels = [];
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) channels.push(buffer.getChannelData(ch));
    return channels;
}

function getMutableChannelViews(buffer) {
    return getReadableChannelViews(buffer);
}

function addKickToChannels(channels, sampleRate, start, amp) {
    const length = Math.min((channels[0]?.length || 0) - start, Math.round(sampleRate * 0.18));
    if (length <= 0) return;
    let phase = 0;
    for (let i = 0; i < length; i += 1) {
        const t = i / sampleRate;
        const norm = i / Math.max(1, length);
        const freq = 76 - 39 * Math.pow(norm, 0.70);
        phase += 2 * Math.PI * freq / sampleRate;
        const body = Math.sin(phase) * Math.exp(-t * 18.5);
        const click = Math.exp(-t * 190) * 0.18;
        addToChannels(channels, start + i, (body + click) * amp, 1);
    }
}

function addHatToChannels(channels, sampleRate, start, amp, seed, panLean) {
    const length = Math.min((channels[0]?.length || 0) - start, Math.round(sampleRate * 0.052));
    if (length <= 0) return;
    let hp1 = 0;
    let hp2 = 0;
    for (let i = 0; i < length; i += 1) {
        const t = i / sampleRate;
        const raw = pseudoNoise(start + i * 2.3 + seed * 101.7);
        const high = raw - hp1 * 0.72 + (hp1 - hp2) * 0.24;
        hp2 = hp1;
        hp1 = raw;
        const env = Math.exp(-t * 78);
        addToChannels(channels, start + i, high * env * amp, panLean || 1);
    }
}

function addClapToChannels(channels, sampleRate, start, amp) {
    const length = Math.min((channels[0]?.length || 0) - start, Math.round(sampleRate * 0.108));
    if (length <= 0) return;
    let hp = 0;
    for (let i = 0; i < length; i += 1) {
        const t = i / sampleRate;
        const burst = Math.exp(-Math.max(0, t) * 34) + 0.62 * Math.exp(-Math.max(0, t - 0.014) * 42) + 0.50 * Math.exp(-Math.max(0, t - 0.031) * 52);
        const raw = pseudoNoise(start * 0.37 + i * 2.1);
        const high = raw - hp * 0.42;
        hp = raw;
        addToChannels(channels, start + i, high * burst * amp * 0.42, 0.96);
    }
}

function addToChannels(channels, index, value, panLean = 1) {
    if (index < 0 || !channels.length || index >= channels[0].length) return;
    if (channels.length < 2) {
        channels[0][index] += value;
        return;
    }
    channels[0][index] += value * panLean;
    channels[1][index] += value * (2 - panLean);
}

function measureSamplePeakFast(channels) {
    let peak = 0;
    for (let ch = 0; ch < channels.length; ch += 1) {
        const data = channels[ch];
        for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i]));
    }
    return peak;
}

function applyBufferGainFast(channels, gain) {
    for (let ch = 0; ch < channels.length; ch += 1) {
        const data = channels[ch];
        for (let i = 0; i < data.length; i += 1) data[i] *= gain;
    }
}

function addKickToBuffer(buffer, start, amp) {
    const sampleRate = buffer.sampleRate;
    const length = Math.min(buffer.length - start, Math.round(sampleRate * 0.18));
    if (length <= 0) return;
    let phase = 0;
    for (let i = 0; i < length; i += 1) {
        const t = i / sampleRate;
        const norm = i / Math.max(1, length);
        const freq = 72 - 34 * Math.pow(norm, 0.72);
        phase += 2 * Math.PI * freq / sampleRate;
        const body = Math.sin(phase) * Math.exp(-t * 19);
        const click = Math.exp(-t * 180) * 0.22;
        mixMonoSample(buffer, start + i, (body + click) * amp);
    }
}

function addHatToBuffer(buffer, start, amp, seed) {
    const sampleRate = buffer.sampleRate;
    const length = Math.min(buffer.length - start, Math.round(sampleRate * 0.055));
    if (length <= 0) return;
    let prev = 0;
    for (let i = 0; i < length; i += 1) {
        const t = i / sampleRate;
        const raw = pseudoNoise(start + i + seed * 101);
        const high = raw - prev * 0.58;
        prev = raw;
        const env = Math.exp(-t * 72);
        mixStereoAccent(buffer, start + i, high * env * amp, seed % 2 ? 0.92 : 1.08);
    }
}

function addClapToBuffer(buffer, start, amp) {
    const sampleRate = buffer.sampleRate;
    const length = Math.min(buffer.length - start, Math.round(sampleRate * 0.105));
    if (length <= 0) return;
    let prev = 0;
    for (let i = 0; i < length; i += 1) {
        const t = i / sampleRate;
        const burst = Math.exp(-Math.max(0, t - 0.000) * 36) + 0.65 * Math.exp(-Math.max(0, t - 0.014) * 44) + 0.52 * Math.exp(-Math.max(0, t - 0.030) * 50);
        const raw = pseudoNoise(start * 0.37 + i * 2.1);
        const high = raw - prev * 0.35;
        prev = raw;
        mixStereoAccent(buffer, start + i, high * burst * amp * 0.42, 0.96);
    }
}

function pseudoNoise(x) {
    const n = Math.sin(x * 12.9898 + 78.233) * 43758.5453123;
    return (n - Math.floor(n)) * 2 - 1;
}

function mixMonoSample(buffer, index, value) {
    if (index < 0 || index >= buffer.length) return;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        data[index] += value;
    }
}

function mixStereoAccent(buffer, index, value, panLean) {
    if (index < 0 || index >= buffer.length) return;
    if (buffer.numberOfChannels < 2) {
        buffer.getChannelData(0)[index] += value;
        return;
    }
    buffer.getChannelData(0)[index] += value * panLean;
    buffer.getChannelData(1)[index] += value * (2 - panLean);
}

function applyBufferGain(buffer, gain) {
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i += 1) data[i] *= gain;
    }
}

function applyPeakGuard(buffer, targetPeak) {
    let peak = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i]));
    }
    if (peak < 0.000001) return { mode: 'samplePeak', peakBefore: peak, peakAfter: peak, gain: 1 };
    const gain = Math.min(1.15, targetPeak / peak);
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i += 1) data[i] = softLimitSample(data[i] * gain);
    }
    return { mode: 'samplePeak', peakBefore: peak, peakAfter: measureSamplePeak(buffer), gain };
}

function applyTruePeakGuard(buffer, targetDbTP) {
    const target = Math.pow(10, targetDbTP / 20);
    const peakBefore = measureInterpolatedPeak(buffer, 4);
    if (peakBefore < 0.000001) return { mode: 'truePeak', targetDbTP, peakBefore, peakAfter: peakBefore, gain: 1 };
    const gain = Math.min(1, target / peakBefore);
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i += 1) data[i] = softCeilingSample(data[i] * gain, target);
    }
    const peakAfter = measureInterpolatedPeak(buffer, 4);
    return { mode: 'truePeak', targetDbTP, peakBefore, peakAfter, gain };
}

function measureSamplePeak(buffer) {
    let peak = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i]));
    }
    return peak;
}

function measureInterpolatedPeak(buffer, factor) {
    let peak = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length - 1; i += 1) {
            const a = data[i] || 0;
            const b = data[i + 1] || 0;
            peak = Math.max(peak, Math.abs(a));
            for (let k = 1; k < factor; k += 1) {
                const t = k / factor;
                peak = Math.max(peak, Math.abs(a * (1 - t) + b * t));
            }
        }
        peak = Math.max(peak, Math.abs(data[data.length - 1] || 0));
    }
    return peak;
}

function softLimitSample(value) {
    const sign = Math.sign(value);
    const abs = Math.abs(value);
    if (abs <= 0.982) return value;
    const limited = 0.982 + Math.tanh((abs - 0.982) * 8) * 0.016;
    return sign * Math.min(0.999, limited);
}

function softCeilingSample(value, ceiling) {
    const sign = Math.sign(value);
    const abs = Math.abs(value);
    const knee = ceiling * 0.985;
    if (abs <= knee) return value;
    const room = Math.max(0.000001, ceiling - knee);
    const limited = knee + Math.tanh((abs - knee) / room) * room * 0.98;
    return sign * Math.min(ceiling, limited);
}


async function finalizeMasterBufferAsync(buffer, options = {}) {
    const fallback = () => {
        const working = cloneAudioBuffer(buffer);
        const targetDb = Number(options.ceilingDb ?? -1.0);
        const info = options.truePeak === false ? applyPeakGuard(working, Math.pow(10, targetDb / 20)) : applyTruePeakGuard(working, targetDb);
        return {
            buffer: working,
            info: {
                mode: options.truePeak === false ? 'sample peak fallback' : 'true peak fallback',
                qualityMode: options.qualityMode || 'balanced',
                targetLufs: Number(options.targetLufs ?? -14),
                ceilingDb: targetDb,
                loudnessBefore: NaN,
                loudnessAfter: NaN,
                peakBefore: info.peakBefore,
                peakAfter: info.peakAfter,
                gainDb: 20 * Math.log10(Math.max(1e-9, info.gain || 1)),
                oversample: 4
            }
        };
    };

    if (!window.Worker) return fallback();
    const worker = new Worker(MASTER_FINALIZER_WORKER_URL);
    const channels = Math.min(2, buffer.numberOfChannels);
    const channelBuffers = [];
    for (let ch = 0; ch < channels; ch += 1) channelBuffers.push(buffer.getChannelData(ch).slice().buffer);
    const payload = {
        sampleRate: buffer.sampleRate,
        channels,
        length: buffer.length,
        targetLufs: Number(options.targetLufs ?? -14),
        ceilingDb: Number(options.ceilingDb ?? -1.0),
        qualityMode: options.qualityMode || 'balanced',
        truePeak: options.truePeak !== false,
        channelBuffers
    };
    try {
        const result = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                worker.terminate();
                reject(new Error('마스터 파이널라이저 시간이 초과되어 기본 피크 가드로 전환합니다.'));
            }, 90000);
            worker.onmessage = event => {
                clearTimeout(timer);
                worker.terminate();
                if (event.data && event.data.ok) resolve(event.data);
                else reject(new Error(event.data?.error || '마스터 파이널라이저 실패'));
            };
            worker.onerror = error => {
                clearTimeout(timer);
                worker.terminate();
                reject(error);
            };
            worker.postMessage(payload, channelBuffers);
        });
        const output = makeAudioBuffer(result.channels, result.length, result.sampleRate);
        (result.channelBuffers || []).forEach((buf, ch) => output.copyToChannel(new Float32Array(buf), ch));
        return { buffer: output, info: result.info || {} };
    } catch (error) {
        console.warn('Master finalizer fallback:', error);
        showToast('파이널라이저 워커가 실패해 기본 피크 가드로 전환합니다.');
        return fallback();
    }
}

function cloneAudioBuffer(buffer) {
    const output = makeAudioBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) output.copyToChannel(buffer.getChannelData(ch).slice(), ch);
    return output;
}

async function encodeMasterOutputAsync(buffer, requestedFormat = 'wav24') {
    const format = requestedFormat || 'wav24';
    if (format === 'mp3_192' || format === 'mp3_320') {
        const bitrate = format === 'mp3_320' ? 320000 : 192000;
        try {
            const blob = await encodeMp3Async(buffer, bitrate);
            return { blob, format, extension: 'mp3', mime: 'audio/mpeg' };
        } catch (error) {
            console.warn('MP3 encoder fallback:', error);
            showToast('MP3 인코더를 사용할 수 없어 24-bit WAV로 저장합니다.');
            const blob = await encodeWavAsync(buffer, 'wav24');
            return { blob, format: 'wav24', extension: 'wav', mime: 'audio/wav' };
        }
    }
    const blob = await encodeWavAsync(buffer, format);
    return { blob, format, extension: 'wav', mime: 'audio/wav' };
}

async function encodeMp3Async(buffer, bitrate) {
    if (!window.Worker) throw new Error('MP3 워커를 사용할 수 없습니다.');
    const worker = new Worker(MP3_ENCODER_WORKER_URL);
    const channels = Math.min(2, buffer.numberOfChannels);
    const channelBuffers = [];
    for (let ch = 0; ch < channels; ch += 1) channelBuffers.push(buffer.getChannelData(ch).slice().buffer);
    const payload = {
        sampleRate: buffer.sampleRate,
        channels,
        length: buffer.length,
        bitrate,
        channelBuffers
    };
    const arrayBuffer = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            worker.terminate();
            reject(new Error('MP3 인코딩 시간이 초과되었습니다.'));
        }, 180000);
        worker.onmessage = event => {
            clearTimeout(timer);
            worker.terminate();
            if (event.data && event.data.ok) resolve(event.data.arrayBuffer);
            else reject(new Error(event.data?.error || 'MP3 인코딩 실패'));
        };
        worker.onerror = error => {
            clearTimeout(timer);
            worker.terminate();
            reject(error);
        };
        worker.postMessage(payload, channelBuffers);
    });
    return new Blob([arrayBuffer], { type: 'audio/mpeg' });
}

async function encodeWavAsync(buffer, format = 'wav24') {
    if (window.Worker) {
        try {
            const worker = new Worker(WAV_ENCODER_WORKER_URL);
            const channels = Math.min(2, buffer.numberOfChannels);
            const channelBuffers = [];
            for (let ch = 0; ch < channels; ch += 1) channelBuffers.push(buffer.getChannelData(ch).slice().buffer);
            const payload = {
                sampleRate: buffer.sampleRate,
                channels,
                length: buffer.length,
                channelBuffers,
                format
            };
            const arrayBuffer = await new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    worker.terminate();
                    reject(new Error('WAV 인코딩 시간이 초과되어 메인 스레드 인코더로 전환합니다.'));
                }, 45000);
                worker.onmessage = event => {
                    clearTimeout(timer);
                    worker.terminate();
                    if (event.data && event.data.ok) resolve(event.data.arrayBuffer);
                    else reject(new Error(event.data?.error || 'WAV 워커 인코딩 실패'));
                };
                worker.onerror = error => {
                    clearTimeout(timer);
                    worker.terminate();
                    reject(error);
                };
                worker.postMessage(payload, channelBuffers);
            });
            return new Blob([arrayBuffer], { type: 'audio/wav' });
        } catch (error) {
            console.warn('Worker WAV encoder fallback:', error);
        }
    }
    return encodeWav(buffer, format);
}

function encodeWav(buffer, format = 'wav24') {
    const channels = Math.min(2, buffer.numberOfChannels);
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;
    const float32 = format === 'wav32float';
    const bytesPerSample = float32 ? 4 : 3;
    const bitDepth = float32 ? 32 : 24;
    const audioFormat = float32 ? 3 : 1;
    const blockAlign = channels * bytesPerSample;
    const dataSize = length * blockAlign;
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, audioFormat, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    const channelData = [];
    for (let ch = 0; ch < channels; ch += 1) channelData.push(buffer.getChannelData(ch));

    let offset = 44;
    for (let i = 0; i < length; i += 1) {
        for (let ch = 0; ch < channels; ch += 1) {
            if (float32) {
                view.setFloat32(offset, clamp(channelData[ch][i] || 0, -1, 1), true);
                offset += 4;
            } else {
                const dither = (Math.random() - Math.random()) / 8388608;
                const sample = clamp((channelData[ch][i] || 0) + dither, -1, 1);
                writeInt24(view, offset, sample);
                offset += 3;
            }
        }
    }
    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeInt24(view, offset, sample) {
    let value = sample < 0 ? Math.round(sample * 0x800000) : Math.round(sample * 0x7fffff);
    value = Math.max(-0x800000, Math.min(0x7fffff, value));
    if (value < 0) value += 0x1000000;
    view.setUint8(offset, value & 0xff);
    view.setUint8(offset + 1, (value >> 8) & 0xff);
    view.setUint8(offset + 2, (value >> 16) & 0xff);
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i += 1) view.setUint8(offset + i, string.charCodeAt(i));
}

async function downloadZip() {
    const completed = state.tracks.filter(track => track.outBlob);
    if (!completed.length) return;
    if (!window.JSZip) {
        showToast('ZIP 라이브러리를 불러오지 못했습니다.');
        return;
    }

    const zip = new JSZip();
    const usedNames = new Set();

    completed.forEach(track => {
        const fileName = makeUniqueZipName(track.outName || `${safeBaseName(track.name)}_mastered.wav`, usedNames);
        zip.file(fileName, track.outBlob);
    });

    showToast(`${completed.length}개 마스터 파일만 ZIP으로 압축 중...`);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 5 } });
    downloadBlob(blob, `foxbear_mastered_${timestampForFile()}.zip`);
    showToast('마스터 파일 ZIP 다운로드를 시작했습니다.');
    renderAll({ keepDetailAudio: true });
}

function makeUniqueZipName(fileName, usedNames) {
    const safeName = fileName || 'mastered.wav';
    if (!usedNames.has(safeName)) {
        usedNames.add(safeName);
        return safeName;
    }
    const dotIndex = safeName.lastIndexOf('.');
    const base = dotIndex > 0 ? safeName.slice(0, dotIndex) : safeName;
    const ext = dotIndex > 0 ? safeName.slice(dotIndex) : '';
    let index = 2;
    let candidate = `${base}_${index}${ext}`;
    while (usedNames.has(candidate)) {
        index += 1;
        candidate = `${base}_${index}${ext}`;
    }
    usedNames.add(candidate);
    return candidate;
}

function downloadTrack(track) {
    if (!track || !track.outBlob) return;
    downloadBlob(track.outBlob, track.outName);
    state.busy = false;
    renderAll({ keepDetailAudio: true });
}

function downloadBlob(blob, fileName) {
    if (!blob) return;
    const normalizedName = normalizeDownloadFileNameForBlob(fileName || `foxbear_mastered_${timestampForFile()}.wav`, blob);
    const safeName = sanitizeDownloadFileName(normalizedName);
    const url = URL.createObjectURL(blob);
    state.activeDownloadUrls.add(url);

    const restricted = isRestrictedDownloadBrowser();
    if (restricted && tryShareDownloadFile(blob, safeName, url)) {
        showDownloadAssist(url, safeName, blob.type || 'audio/*');
        showToast('인앱 브라우저용 공유/저장 창을 열었습니다. 안 되면 도움창의 파일 다시 열기를 눌러주세요.');
        return;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = safeName;
    a.rel = 'noopener noreferrer';
    a.target = '_blank';
    a.style.position = 'fixed';
    a.style.left = '-9999px';
    a.style.top = '0';
    document.body.appendChild(a);

    try {
        a.click();
    } catch (error) {
        console.warn('download click fallback:', error);
    }

    if (restricted || !supportsAnchorDownload()) {
        showDownloadAssist(url, safeName, blob.type || 'audio/*');
        showToast('인앱 브라우저는 저장이 막힐 수 있습니다. 다운로드 도움창에서 다시 열어주세요.');
    } else {
        showToast(`${safeName} 다운로드를 시작했습니다.`);
    }

    setTimeout(() => {
        a.remove();
        if (!restricted) revokeDownloadUrl(url);
    }, restricted ? 10 * 60 * 1000 : 90 * 1000);
}

function tryShareDownloadFile(blob, fileName, url) {
    if (!navigator.share || typeof File === 'undefined') return false;
    try {
        const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
        const payload = { files: [file], title: fileName, text: 'FoxBear Music 마스터링 파일' };
        if (navigator.canShare && !navigator.canShare({ files: payload.files })) return false;
        navigator.share(payload).then(() => {
            setTimeout(() => revokeDownloadUrl(url), 30000);
        }).catch(error => {
            console.warn('share download fallback:', error);
        });
        return true;
    } catch (error) {
        console.warn('share download unavailable:', error);
        return false;
    }
}

function supportsAnchorDownload() {
    const a = document.createElement('a');
    return 'download' in a;
}

function isRestrictedDownloadBrowser() {
    const ua = navigator.userAgent || '';
    return /KAKAOTALK|KakaoTalk|NAVER\(inapp|FBAN|FBAV|Instagram|Line\//i.test(ua);
}

function normalizeDownloadFileNameForBlob(fileName, blob) {
    const rawName = String(fileName || 'download').trim() || 'download';
    const mime = String(blob?.type || '').toLowerCase();
    let expectedExt = '';
    if (mime.includes('mpeg') || mime.includes('mp3')) expectedExt = 'mp3';
    else if (mime.includes('wav') || mime.includes('wave')) expectedExt = 'wav';
    else if (mime.includes('zip')) expectedExt = 'zip';
    if (!expectedExt) return rawName;

    const lower = rawName.toLowerCase();
    if (lower.endsWith(`.${expectedExt}`)) return rawName;

    const dot = rawName.lastIndexOf('.');
    if (dot > 0 && rawName.length - dot <= 7) {
        return `${rawName.slice(0, dot)}.${expectedExt}`;
    }
    return `${rawName}.${expectedExt}`;
}

function sanitizeDownloadFileName(fileName) {
    const cleaned = String(fileName || 'download').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim();
    return cleaned || 'download';
}

function revokeDownloadUrl(url) {
    if (!url || !state.activeDownloadUrls.has(url)) return;
    URL.revokeObjectURL(url);
    state.activeDownloadUrls.delete(url);
}

function showDownloadAssist(url, fileName, mimeType) {
    let panel = document.getElementById('downloadAssist');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'downloadAssist';
        panel.className = 'download-assist';
        document.body.appendChild(panel);
    }
    panel.textContent = '';

    const title = document.createElement('strong');
    title.textContent = '다운로드가 안 보이나요?';

    const message = document.createElement('p');
    const inApp = isRestrictedDownloadBrowser();
    message.textContent = inApp
        ? '카카오톡 같은 인앱 브라우저는 파일 저장을 막는 경우가 있습니다. 아래 버튼으로 새 탭을 열거나, 외부 브라우저에서 다시 열어주세요.'
        : '자동 저장이 시작되지 않으면 아래 버튼으로 파일을 직접 열어 저장해주세요.';

    const file = document.createElement('span');
    file.className = 'download-assist-file';
    file.textContent = `${fileName} · ${mimeType || 'audio'}`;

    const actions = document.createElement('div');
    actions.className = 'download-assist-actions';

    const open = document.createElement('a');
    open.className = 'btn-primary';
    open.href = url;
    open.download = fileName;
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    open.textContent = '파일 다시 열기';

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn-secondary';
    close.textContent = '닫기';
    close.addEventListener('click', () => {
        panel.classList.remove('show');
        panel.remove();
        revokeDownloadUrl(url);
    });

    actions.append(open, close);
    panel.append(title, message, file, actions);
    requestAnimationFrame(() => panel.classList.add('show'));
}

function invalidateMasteredOutput(track, report, autoRefresh = false) {
    if (!track) return;
    const wasDone = track.status === 'done' && Boolean(track.outBlob);
    if (track.masteredUrl) URL.revokeObjectURL(track.masteredUrl);
    track.outBlob = null;
    track.outName = '';
    track.outFormat = null;
    track.masteredUrl = null;
    track.masteredDurationSec = 0;
    track.truePeakInfo = null;
    track.finalizeInfo = null;
    track.albumApplied = null;
    if (track.status === 'done') {
        track.status = 'ready';
        track.progress = 100;
    }
    track.report = report;
    if (autoRefresh && wasDone) scheduleAutoRemaster(track);
}

function scheduleAutoRemaster(track) {
    if (!track || track.error) return;
    const existing = state.autoRemasterTimers && state.autoRemasterTimers.get(track.id);
    if (existing) clearTimeout(existing);
    track.report = '설정 변경 감지 · 자동 갱신 대기 중';
    const timer = setTimeout(() => {
        if (state.autoRemasterTimers) state.autoRemasterTimers.delete(track.id);
        if (!state.tracks.some(item => item.id === track.id) || track.error) return;
        if (state.busy || ['analyzing', 'processing'].includes(track.status)) {
            scheduleAutoRemaster(track);
            return;
        }
        masterTrack(track).catch(error => {
            track.status = 'error';
            track.error = error.message || '자동 갱신 실패';
            renderAll();
        });
    }, 900);
    if (state.autoRemasterTimers) state.autoRemasterTimers.set(track.id, timer);
}

function invalidateAllMasteredOutput(report) {
    state.tracks.forEach(track => invalidateMasteredOutput(track, report));
}

function clearQueue() {
    if (state.autoRemasterTimers) { state.autoRemasterTimers.forEach(timer => clearTimeout(timer)); state.autoRemasterTimers.clear(); }
    state.tracks.forEach(track => {
        if (track.originalUrl) URL.revokeObjectURL(track.originalUrl);
        if (track.masteredUrl) URL.revokeObjectURL(track.masteredUrl);
    });
    state.tracks = [];
    state.selectedId = null;
    state.selectedIds.clear();
    if (state.expandedDetailIds) state.expandedDetailIds.clear();
    state.busy = false;
    state.albumProfile = null;
    clearFileInputs();
    applyPresetToControlsOnly('custom');
    setTransformControls(DEFAULT_TRANSFORM);
    setInstrumentControls(DEFAULT_INSTRUMENT_LAYER);
    renderAll();
    showToast('작업 큐를 초기화했습니다.');
}

function clearFileInputs() {
    el.fileInput.value = '';
    el.folderInput.value = '';
}


function beginPerformanceProfile() {
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    return {
        running: true,
        startedAt: new Date().toISOString(),
        startMs: now,
        lastMs: now,
        stages: [],
        totalMs: 0,
        realtimeRatio: 0,
        outputSize: 0
    };
}

function markPerformanceStage(track, label) {
    if (!track || !track.performanceInfo) return;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const elapsed = Math.max(0, now - Number(track.performanceInfo.lastMs || now));
    const existing = track.performanceInfo.stages.find(stage => stage.label === label);
    if (existing) existing.ms += elapsed;
    else track.performanceInfo.stages.push({ label, ms: elapsed });
    track.performanceInfo.lastMs = now;
}

function finishPerformanceProfile(track, buffer, blob) {
    if (!track || !track.performanceInfo) return;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const totalMs = Math.max(0, now - Number(track.performanceInfo.startMs || now));
    const durationMs = buffer?.duration ? buffer.duration * 1000 : track.analysis?.duration ? track.analysis.duration * 1000 : 0;
    track.performanceInfo.running = false;
    track.performanceInfo.totalMs = totalMs;
    track.performanceInfo.realtimeRatio = durationMs > 0 ? totalMs / durationMs : 0;
    track.performanceInfo.outputSize = blob?.size || 0;
    track.performanceInfo.completedAt = new Date().toISOString();
}

function getHeaviestPerformanceStage(info) {
    if (!info || !Array.isArray(info.stages) || !info.stages.length) return null;
    return info.stages.slice().sort((a, b) => Number(b.ms || 0) - Number(a.ms || 0))[0];
}

function formatPerformanceInfo(info) {
    if (!info) return '-';
    if (info.running) return '처리 중 · 단계별 시간 측정 중';
    const ratio = Number(info.realtimeRatio || 0);
    const speedText = ratio > 0 ? `${ratio.toFixed(2)}x 실시간` : '실시간 배율 계산 전';
    const size = info.outputSize ? ` · 출력 ${formatBytes(info.outputSize)}` : '';
    return `${formatDurationMs(info.totalMs)} · ${speedText}${size}`;
}

function formatDurationMs(ms) {
    const value = Math.max(0, Number(ms || 0));
    if (value < 1000) return `${Math.round(value)} ms`;
    if (value < 60000) return `${(value / 1000).toFixed(value < 10000 ? 2 : 1)}초`;
    const minutes = Math.floor(value / 60000);
    const seconds = Math.round((value % 60000) / 1000).toString().padStart(2, '0');
    return `${minutes}분 ${seconds}초`;
}

function formatInstrumentLayerResult(info) {
    const confidence = Number.isFinite(Number(info.confidence)) ? ` · 신뢰 ${Math.round(Number(info.confidence) * 100)}%` : '';
    const grid = Number.isFinite(Number(info.gridQuality)) ? ` · 그리드 ${Math.round(Number(info.gridQuality) * 100)}%` : '';
    const gain = Number.isFinite(Number(info.gainDb)) ? ` · ${info.gainDb.toFixed(1)} dB` : '';
    return `${info.label} · 추정 ${Number(info.bpm || 0).toFixed(1)} BPM · ${info.events || 0} hits${confidence}${grid}${gain}`;
}

function yieldToBrowser() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

function renderAll(options = {}) {
    renderStats();
    renderButtons();
    initActionHelpTooltips();
    renderQueuePreview();
    renderTrackList();
    renderDetail(options);
    renderSelectedBadge();
    renderAlbumStatus();
    updateFeatureSummary();
    updateSmartRecommendationPanel();
    updatePreviewButton();
    updateProcessingHud();
    syncEnhancedSelectButtons();
}

function renderStats() {
    const total = state.tracks.length;
    const done = state.tracks.filter(track => track.outBlob).length;
    const totalSize = state.tracks.reduce((sum, track) => sum + track.size, 0);
    const busy = state.tracks.some(track => ['analyzing', 'processing'].includes(track.status));
    el.statTracks.textContent = String(total);
    el.statDone.textContent = String(done);
    el.statSize.textContent = formatBytes(totalSize);
    el.statState.textContent = busy ? '작업 중' : (total ? '준비' : '대기');
    el.queueCount.textContent = `${total}개`;
}

function renderAlbumStatus() {
    const profile = computeAlbumProfile();
    if (!state.featureFlags.albumMatch) {
        el.albumStatus.textContent = '앨범 단위 볼륨/톤 통일은 버튼을 켜면 전체 곡의 중간값을 기준으로 자연스럽게 보정합니다.';
        return;
    }
    if (!profile || profile.count < 2) {
        el.albumStatus.textContent = '앨범 통일 ON · 2곡 이상 분석되면 중간 볼륨/밝기 기준으로 보정됩니다.';
        return;
    }
    el.albumStatus.textContent = `앨범 통일 ON · 기준 ${profile.count}곡 · 기준 RMS ${profile.loudnessHint.toFixed(1)} dB · 기준 밝기 ${Math.round(profile.brightness * 100)}%`;
}

function renderButtons() {
    const hasTracks = state.tracks.length > 0;
    const selectedTracks = getSelectedTracks();
    const fallback = getSelectedTrack();
    const processTargets = selectedTracks.length ? selectedTracks : (fallback ? [fallback] : []);
    const hasCompleted = state.tracks.some(track => track.outBlob);
    const canApplyAI = processTargets.some(track => track.analysis) && !state.busy;
    const canProcessSelected = processTargets.some(track => !['analyzing', 'processing'].includes(track.status) && !track.error) && !state.busy;
    const canProcessAll = hasTracks && !state.busy && state.tracks.some(track => !['analyzing', 'processing'].includes(track.status) && !track.error);
    el.aiApplyBtn.disabled = !canApplyAI;
    el.masterSelectedBtn.disabled = !canProcessSelected;
    el.masterAllBtn.disabled = !canProcessAll;
    el.zipBtn.disabled = !hasCompleted || state.busy;
    el.clearBtn.disabled = !hasTracks || state.busy;
    if (el.masterSelectedBtn) el.masterSelectedBtn.textContent = selectedTracks.length > 1 ? `선택 ${selectedTracks.length}곡 마스터링` : '선택 트랙 마스터링';
    if (el.abMatchBtn) el.abMatchBtn.textContent = state.abLevelMatch ? 'A/B 레벨 매칭 ON' : 'A/B 레벨 매칭 OFF';
    if (el.abLoopBtn) el.abLoopBtn.textContent = state.abLoopMode ? '5초 A/B 루프 ON' : '5초 A/B 루프 OFF';
    if (el.genreLockBtn) {
        const active = getSelectedTrack();
        el.genreLockBtn.textContent = active && active.genreLocked ? '장르 잠금 해제' : '장르 잠금';
        el.genreLockBtn.disabled = !active || state.busy;
    }
    if (el.globalDiffMeter) el.globalDiffMeter.textContent = buildGlobalDiffText();
}


function renderQueuePreview() {
    if (!el.queuePreview) return;
    el.queuePreview.textContent = '';
    const track = getSelectedTrack();
    const head = document.createElement('div');
    head.className = 'queue-preview-head';
    const title = document.createElement('strong');
    title.textContent = '선택 트랙 미리듣기';
    const sub = document.createElement('span');
    sub.textContent = track ? (PRESET_LABELS[track.preset] || track.preset || '프리셋 대기') : '트랙 선택 대기';
    head.append(title, sub);
    el.queuePreview.appendChild(head);
    if (!track) {
        const empty = document.createElement('div');
        empty.className = 'preview-empty';
        empty.textContent = '불러온 곡을 선택하면 원본/마스터본 미리듣기가 여기에 표시됩니다.';
        el.queuePreview.appendChild(empty);
        return;
    }
    renderPreviewPlayers(track, el.queuePreview);
}

function renderTrackList() {
    el.trackList.textContent = '';
    if (!state.tracks.length) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = '대기열이 비어있습니다. 파일 또는 폴더를 올리면 분석 카드가 생성됩니다.';
        el.trackList.appendChild(empty);
        return;
    }

    state.tracks.forEach(track => {
        const card = document.createElement('article');
        card.className = `track-card ${state.selectedIds.has(track.id) ? 'selected' : ''} ${track.id === state.selectedId ? 'active-track' : ''} ${track.genreLocked ? 'genre-locked' : ''}`;
        card.addEventListener('click', event => {
            if (event.target.closest('button')) return;
            selectTrack(track.id);
        });

        const top = document.createElement('div');
        top.className = 'track-top';

        const titleWrap = document.createElement('div');
        const title = document.createElement('strong');
        title.className = 'track-name';
        title.textContent = track.name;
        const meta = document.createElement('div');
        meta.className = 'track-meta';
        meta.textContent = `${formatBytes(track.size)} · ${track.type || 'audio'}`;
        const presetChip = document.createElement('div');
        presetChip.className = 'track-preset-chip';
        presetChip.textContent = `프리셋 · ${PRESET_LABELS[track.preset] || track.preset}${track.genreLocked ? ' · 잠금' : ''}`;
        titleWrap.append(title, meta, presetChip);
        if (track.performanceInfo && !track.performanceInfo.running && track.performanceInfo.totalMs) {
            const perfChip = document.createElement('div');
            perfChip.className = 'performance-chip';
            perfChip.textContent = `성능 · ${formatDurationMs(track.performanceInfo.totalMs)} · ${(track.performanceInfo.realtimeRatio || 0).toFixed(2)}x`;
            titleWrap.appendChild(perfChip);
        }
        if (shouldApplyVocalProtection(track.preset, track.analysis)) {
            const vocalChip = document.createElement('div');
            vocalChip.className = 'vocal-safe-chip';
            vocalChip.textContent = '보컬 보호 ON';
            titleWrap.appendChild(vocalChip);
        }
        if (state.engineSafetyMeter && (track.analysis || track.safetyInfo)) {
            const safety = track.safetyInfo || computeEngineSafetyInfo(track, null, track.finalizeInfo || null);
            const safetyChip = document.createElement('div');
            safetyChip.className = `engine-safe-chip engine-safe-${safety.tone}`;
            safetyChip.textContent = `안전 ${safety.score}점`;
            titleWrap.appendChild(safetyChip);
        }

        const status = document.createElement('span');
        status.className = `status-pill status-${track.status}`;
        status.textContent = statusLabel(track.status);
        top.append(titleWrap, status);

        const progressShell = document.createElement('div');
        progressShell.className = 'progress-shell';
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.style.width = `${track.progress || 0}%`;
        progressShell.appendChild(progressBar);
        const progressCaption = document.createElement('div');
        progressCaption.className = 'progress-caption';
        progressCaption.textContent = track.status === 'processing' ? (track.report || '마스터링 진행 중') : (track.status === 'done' ? '완료 · 미리듣기/다운로드 가능' : (track.report || '대기 중'));

        const actions = document.createElement('div');
        actions.className = 'track-actions';
        const isPicked = state.selectedIds.has(track.id);
        actions.append(
            makeMiniButton(isPicked ? '해제' : '선택', isPicked ? 'btn-primary' : 'btn-secondary', () => toggleTrackSelection(track.id), state.busy),
            makeMiniButton(track.genreLocked ? '잠금 해제' : '장르 잠금', track.genreLocked ? 'btn-primary' : 'btn-secondary', () => toggleGenreLockForTrack(track), state.busy || !track.analysis),
            makeMiniButton('AI 프리셋', 'btn-secondary', () => applyAIRecommendationToTrack(track), state.busy || !track.analysis),
            makeMiniButton('마스터링', 'btn-primary', () => masterTrack(track), ['analyzing', 'processing'].includes(track.status) || state.busy || Boolean(track.error)),
            makeMiniButton('삭제', 'btn-danger', () => removeTrack(track.id), state.busy)
        );
        if (track.outBlob) actions.append(makeMiniButton('파일 다운로드', 'btn-secondary', () => downloadTrack(track), false));

        card.append(top, progressShell, progressCaption, actions);
        el.trackList.appendChild(card);
    });
}

function makeMiniButton(label, className, onClick, disabled = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn-mini ${className}`;
    button.textContent = label;
    button.disabled = Boolean(disabled);
    button.addEventListener('click', onClick);
    const help = getMiniButtonHelp(label);
    if (help) attachHelpTooltip(button, help);
    return button;
}

function getMiniButtonHelp(label) {
    if (label.includes('선택')) return '이 곡을 선택 목록에 추가합니다.';
    if (label.includes('해제')) return '선택 목록에서 이 곡을 제외합니다.';
    if (label.includes('장르 잠금')) return 'AI 재적용 시 현재 장르 프리셋을 유지합니다.';
    if (label.includes('잠금 해제')) return '장르 프리셋을 다시 자동 추천 대상에 포함합니다.';
    if (label.includes('AI 프리셋')) return '분석 결과 기준 추천 프리셋을 다시 적용합니다.';
    if (label.includes('마스터링')) return '이 트랙만 현재 설정으로 다시 렌더링합니다.';
    if (label.includes('다운로드')) return '완료된 마스터링 파일을 저장합니다.';
    if (label.includes('삭제')) return '이 트랙을 대기열에서 제거합니다.';
    return '';
}

function renderDetail(options = {}) {
    const track = getSelectedTrack();
    el.trackDetail.textContent = '';
    if (!track) {
        el.detailStatus.className = 'status-pill';
        el.detailStatus.textContent = '선택 없음';
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = '트랙을 선택하면 정밀 비교와 진행 상태가 표시됩니다.';
        el.trackDetail.appendChild(empty);
        updateConfidenceUI(null);
        return;
    }

    el.detailStatus.className = `status-pill status-${track.status}`;
    el.detailStatus.textContent = statusLabel(track.status);

    const title = document.createElement('h3');
    title.textContent = track.name;
    el.trackDetail.appendChild(title);

    renderMasterComparisonPanel(track);
    renderProcessingFlowPanel(track);
    renderEngineSafetyPanel(track);

    const isOpen = state.expandedDetailIds && state.expandedDetailIds.has(track.id);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'analysis-detail-toggle btn-secondary';
    toggle.textContent = isOpen ? '분석 상세 닫기' : '분석 상세보기';
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.addEventListener('click', () => {
        if (!state.expandedDetailIds) state.expandedDetailIds = new Set();
        if (state.expandedDetailIds.has(track.id)) state.expandedDetailIds.delete(track.id);
        else state.expandedDetailIds.add(track.id);
        renderAll({ keepDetailAudio: true });
    });
    el.trackDetail.appendChild(toggle);

    if (isOpen) {
        const detailsWrap = document.createElement('div');
        detailsWrap.className = 'analysis-detail-list';
        const addRow = (label, value) => addDetailRow(label, value, detailsWrap);

        addRow('파일명', track.name);
        addRow('파일 형식', track.type);
        addRow('파일 용량', formatBytes(track.size));
        addRow('프리셋 상태', `${PRESET_LABELS[track.preset] || track.preset} · 신뢰지수 ${track.confidence || 0}%${track.genreLocked ? ' · 잠금' : ''}`);
        addRow('분석 캐시', track.analysisCacheHit ? '사용됨 · 재분석 시간 절약' : '신규 분석');
        if (track.outName) addRow('출력 파일', track.outName);
        addRow('출력 포맷', getOutputFormatLabel(track.outFormat || state.outputFormat || 'wav24'));
        addRow('마스터링 목표', `${getMasterGoalLabel(state.masterGoal)} · ${getMasterGoalDescription(state.masterGoal)}`);
        if (track.genreReason) addRow('장르 판단 근거', track.genreReason);
        addRow('마스터링 강도', `${track.settings.intensity ?? 100}% · ${getMasteringIntensity(track.settings).high ? 'HIGH 비선형' : 'NORMAL'}`);
        addRow('금속성 제거', `${track.settings.metallicRemoval ?? 0}% · 높일수록 더 많이 제거`);
        addRow('피치/속도', `${formatSigned(track.transform?.pitchSemitones || 0, 2)} st · BPM ${(track.transform?.speedRatio || 1).toFixed(2)}x · ${getBeatPresetLabel(track.transform?.beatPreset || getBeatPresetForRatio(track.transform?.speedRatio || 1))}`);
        addRow('악기 추가', getInstrumentDetailText(track));
        addRow('활성 기능', featureLabelText());
        addRow('AI 티 완화 엔진', shouldApplyAiHumanizer(track.preset) ? 'ON · 250/400/500Hz 온기 보강 · De-esser · 16kHz 하이컷' : 'OFF 또는 커스텀 수동 우선');
        addRow('보컬 보호 모드', shouldApplyVocalProtection(track.preset, track.analysis) ? 'ON · 감정선/멜로디 보존 · 치찰음 섬세 제어' : 'OFF 또는 비보컬/커스텀 우선');
        addRow('스마트 과처리 방지', state.featureFlags.smartGuard ? 'ON · 밝기/저역/피크 과잉을 렌더 직전 보정' : 'OFF · 설정값 그대로 렌더');
        addRow('신규 플러그인', `${state.featureFlags.vocalFocusPlus ? '보컬+' : '보컬 OFF'} · ${state.featureFlags.adaptiveAir ? '에어+' : '에어 OFF'} · ${state.featureFlags.translationGuard ? '모바일+' : '모바일 OFF'} · ${state.featureFlags.referenceMatch ? '레퍼런스+' : '레퍼런스 OFF'} · ${state.featureFlags.earFatigueGuard ? '피로가드+' : '피로가드 OFF'}`);
        addRow('스마트 성능 가드', formatPerformanceGuardInfo(track.performanceGuardInfo));
        if (track.safetyInfo) addRow('엔진 안전 점수', `${track.safetyInfo.score}점 · ${track.safetyInfo.label} · ${track.safetyInfo.notes.join(', ')}`);
        addRow('실시간 엔진 로그', track.report || '-');

        if (track.instrumentInfo && track.instrumentInfo.applied) addRow('리듬 레이어 결과', formatInstrumentLayerResult(track.instrumentInfo));
        if (track.performanceInfo) {
            addRow('처리 성능 체크', formatPerformanceInfo(track.performanceInfo));
            const heavy = getHeaviestPerformanceStage(track.performanceInfo);
            if (heavy) addRow('가장 무거운 단계', `${heavy.label} · ${formatDurationMs(heavy.ms)}`);
        }
        if (track.trimInfo) addRow('무음 정리', track.trimInfo.applied ? `앞 ${track.trimInfo.startTrimSec.toFixed(2)}초 · 뒤 ${track.trimInfo.endTrimSec.toFixed(2)}초 정리` : '정리할 무음 구간 없음');
        if (track.albumApplied) addRow('앨범 통일', `레벨 ${formatSigned(track.albumApplied.levelDeltaDb, 2)} dB · 톤 ${formatSigned(track.albumApplied.toneDelta * 100, 1)}%`);
        if (track.truePeakInfo) {
            const beforeDb = ampToDb(track.truePeakInfo.peakBefore).toFixed(2);
            const afterDb = ampToDb(track.truePeakInfo.peakAfter).toFixed(2);
            addRow('피크 가드', `${track.truePeakInfo.mode === 'truePeak' ? 'True Peak' : 'Sample Peak'} · 전 ${beforeDb} dB · 후 ${afterDb} dB`);
        }
        if (track.finalizeInfo) {
            addRow('클리핑 위험', getClippingRiskText(track));
            const before = Number.isFinite(track.finalizeInfo.loudnessBefore) ? `${track.finalizeInfo.loudnessBefore.toFixed(1)} LUFS` : '-';
            const after = Number.isFinite(track.finalizeInfo.loudnessAfter) ? `${track.finalizeInfo.loudnessAfter.toFixed(1)} LUFS` : '-';
            addRow('2-Pass 라우드니스', `${before} → ${after} · 목표 ${track.finalizeInfo.targetLufs} LUFS`);
            addRow('엔진 품질 모드', `${getQualityModeLabel(track.finalizeInfo.qualityMode)} · ${track.finalizeInfo.oversample || 4}x 피크 검사`);
        }

        if (track.analysis) {
            addRow('재생 시간', formatTime(track.analysis.duration));
            addRow('원본 샘플레이트', `${track.analysis.sampleRate.toLocaleString()} Hz`);
            addRow('채널 수', `${track.analysis.channels} ch`);
            addRow('피크 레벨', `${track.analysis.peakDb.toFixed(1)} dBFS`);
            addRow('RMS 레벨', `${track.analysis.loudnessHint.toFixed(1)} dB`);
            if (Number.isFinite(track.analysis.loudnessIntegrated)) addRow('예상 통합 라우드니스', `${track.analysis.loudnessIntegrated.toFixed(1)} LUFS 유사`);
            addRow('밝기/스테레오 폭', `${Math.round(track.analysis.brightness * 100)}% / ${Math.round(track.analysis.stereoWidth * 100)}%`);
            addRow('저역/중역/고역', `${Math.round((track.analysis.bassRatio || 0) * 100)}% / ${Math.round((track.analysis.midRatio || 0) * 100)}% / ${Math.round((track.analysis.highRatio || 0) * 100)}%`);
            addRow('트랜지언트 밀도', `${Math.round((track.analysis.transientDensity || 0) * 100)}%`);
            addRow('금속성 지수', `${Math.round(track.analysis.metallicHint * 100)}%`);
            addRow('공진 추적 주파수', `${track.analysis.targetDynamicFreq} Hz`);
        }
        if (track.error) addRow('오류 내용', track.error);
        el.trackDetail.appendChild(detailsWrap);
    }

    updateConfidenceUI(track);
    if (!options.keepDetailAudio) applyTrackToControls(track);
}

function renderPreviewPlayers(track, target = el.trackDetail, options = {}) {
    const previewGrid = document.createElement('div');
    previewGrid.className = `preview-grid ${options.vertical ? 'preview-grid-vertical' : ''}`;

    const originalCard = document.createElement('div');
    originalCard.className = 'preview-card';
    const originalLabel = makePreviewTitle('원본 프리뷰', track.analysis?.duration);
    originalCard.append(originalLabel, createPreviewPlayer(track.originalUrl, 0, track.analysis?.duration, state.abLoopMode, getTrackHighlightStart(track)));

    const masteredCard = document.createElement('div');
    masteredCard.className = 'preview-card';
    const masteredLabel = makePreviewTitle('마스터링 프리뷰', track.masteredDurationSec || null);
    masteredCard.appendChild(masteredLabel);
    if (track.masteredUrl) {
        masteredCard.appendChild(createPreviewPlayer(track.masteredUrl, getABMatchGainDb(track), track.masteredDurationSec, state.abLoopMode, getTrackHighlightStart(track)));
    } else {
        const empty = document.createElement('div');
        empty.className = 'preview-empty';
        empty.textContent = '마스터링 실행 후 활성화됩니다.';
        masteredCard.appendChild(empty);
    }

    previewGrid.append(originalCard, masteredCard);
    target.appendChild(previewGrid);
}

function makePreviewTitle(label, durationSec) {
    const title = document.createElement('strong');
    const main = document.createElement('span');
    main.textContent = label;
    title.appendChild(main);
    if (Number.isFinite(Number(durationSec)) && Number(durationSec) > 0) {
        const small = document.createElement('small');
        small.className = 'preview-runtime';
        small.textContent = `총 ${formatTime(Number(durationSec))}`;
        title.appendChild(small);
    }
    return title;
}

function formatPlayerTime(current, duration) {
    if (Number.isFinite(Number(duration)) && Number(duration) > 0) return `${formatTime(current || 0)} / ${formatTime(duration)}`;
    return formatTime(current || 0);
}


function getTrackHighlightStart(track) {
    if (!state.autoHighlightAB || !track) return NaN;
    const directRaw = track.abHighlightStartSec;
    const direct = Number(directRaw);
    if (directRaw !== null && directRaw !== undefined && Number.isFinite(direct) && direct >= 0) return direct;
    const analysisRaw = track.analysis?.abHighlightStartSec;
    const fromAnalysis = Number(analysisRaw);
    if (analysisRaw !== null && analysisRaw !== undefined && Number.isFinite(fromAnalysis) && fromAnalysis >= 0) return fromAnalysis;
    const duration = Number(track.analysis?.duration || track.masteredDurationSec || 0);
    if (!Number.isFinite(duration) || duration <= 8) return NaN;
    return clamp(duration * 0.33, 0, Math.max(0, duration - 5));
}

function createPreviewPlayer(src, gainDb = 0, knownDurationSec = 0, loopCompare = false, loopStartHint = NaN) {
    const wrap = document.createElement('div');
    wrap.className = `custom-player ${loopCompare ? 'ab-loop-player' : ''}`;

    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.src = src;
    if (state.abLevelMatch && Number.isFinite(gainDb)) {
        audio.volume = clamp(Math.pow(10, gainDb / 20), 0.02, 1);
    }

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'player-toggle';
    toggle.innerHTML = '<span class="player-icon player-icon-play" aria-hidden="true"></span>';
    toggle.setAttribute('aria-label', '재생');
    attachHelpTooltip(toggle, '프리뷰를 재생하거나 일시정지합니다.');

    const seek = document.createElement('input');
    seek.type = 'range';
    seek.className = 'player-seek';
    seek.min = '0';
    seek.max = '1000';
    seek.step = '1';
    seek.value = '0';

    const time = document.createElement('span');
    time.className = 'player-time';
    const initialDuration = Number(knownDurationSec || 0);
    time.textContent = formatPlayerTime(0, initialDuration);

    const loopBadge = document.createElement('span');
    loopBadge.className = 'ab-loop-badge';
    loopBadge.textContent = state.autoHighlightAB ? '하이라이트 5초' : '5초 루프';
    if (!loopCompare) loopBadge.hidden = true;
    let loopStart = Number.isFinite(Number(loopStartHint)) ? Number(loopStartHint) : NaN;

    const setPlaying = isPlaying => {
        toggle.classList.toggle('playing', Boolean(isPlaying));
        toggle.innerHTML = isPlaying ? '<span class="player-icon player-icon-pause" aria-hidden="true"></span>' : '<span class="player-icon player-icon-play" aria-hidden="true"></span>';
        toggle.setAttribute('aria-label', isPlaying ? '일시정지' : '재생');
    };
    const getDuration = () => Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : initialDuration;
    const getLoopBounds = () => {
        const duration = getDuration();
        if (!loopCompare || !Number.isFinite(duration) || duration <= 6) return null;
        const length = 5;
        const maxStart = Math.max(0, duration - length);
        if (!Number.isFinite(loopStart)) loopStart = clamp(duration * 0.33, 0, maxStart);
        loopStart = clamp(loopStart, 0, maxStart);
        return { start: loopStart, end: Math.min(duration, loopStart + length) };
    };

    toggle.addEventListener('click', () => {
        if (audio.paused) audio.play().catch(() => showToast('브라우저가 재생을 차단했습니다. 다시 눌러주세요.'));
        else audio.pause();
    });
    audio.addEventListener('loadedmetadata', () => {
        const bounds = getLoopBounds();
        if (bounds && audio.currentTime < bounds.start) audio.currentTime = bounds.start;
        time.textContent = formatPlayerTime(audio.currentTime || 0, getDuration());
    });
    audio.addEventListener('play', () => {
        bindExclusivePreview(audio);
        const bounds = getLoopBounds();
        if (bounds && (audio.currentTime < bounds.start || audio.currentTime >= bounds.end)) audio.currentTime = bounds.start;
        setPlaying(true);
    });
    audio.addEventListener('pause', () => setPlaying(false));
    audio.addEventListener('ended', () => {
        setPlaying(false);
        seek.value = '0';
        time.textContent = formatPlayerTime(0, getDuration());
    });
    audio.addEventListener('timeupdate', () => {
        const duration = getDuration();
        const bounds = getLoopBounds();
        if (bounds && audio.currentTime >= bounds.end) {
            audio.currentTime = bounds.start;
            return;
        }
        if (Number.isFinite(duration) && duration > 0) seek.value = String(Math.round(audio.currentTime / duration * 1000));
        time.textContent = formatPlayerTime(audio.currentTime || 0, duration);
    });
    seek.addEventListener('input', () => {
        const duration = getDuration();
        if (Number.isFinite(duration) && duration > 0) {
            audio.currentTime = Number(seek.value) / 1000 * duration;
            if (loopCompare) loopStart = audio.currentTime;
        }
    });

    wrap.append(toggle, seek, time, loopBadge, audio);
    return wrap;
}

function bindExclusivePreview(audio) {
    document.querySelectorAll('.custom-player audio').forEach(other => {
        if (other !== audio) other.pause();
    });
}


function renderProcessingFlowPanel(track) {
    if (!track) return;
    const panel = document.createElement('div');
    panel.className = `processing-flow-panel ${track.status === 'processing' ? 'is-running' : ''}`;

    const head = document.createElement('div');
    head.className = 'processing-flow-head';
    const title = document.createElement('strong');
    title.textContent = track.status === 'processing' ? '진행 흐름 표시' : '처리 흐름';
    const pct = document.createElement('span');
    pct.textContent = `${Math.round(Number(track.progress || 0))}%`;
    head.append(title, pct);

    const rail = document.createElement('div');
    rail.className = 'processing-flow-rail';
    const fill = document.createElement('i');
    fill.style.width = `${clamp(Number(track.progress || 0), 0, 100)}%`;
    rail.appendChild(fill);

    const steps = document.createElement('div');
    steps.className = 'processing-flow-steps';
    const progress = Number(track.progress || 0);
    MASTER_FLOW_STEPS.forEach((step, index) => {
        const item = document.createElement('div');
        item.className = 'processing-step';
        if (progress >= step.at || track.status === 'done') item.classList.add('done');
        const next = MASTER_FLOW_STEPS[index + 1];
        if (track.status === 'processing' && progress >= step.at && (!next || progress < next.at)) item.classList.add('active');
        const b = document.createElement('b');
        b.textContent = step.label;
        const small = document.createElement('small');
        small.textContent = step.hint;
        item.append(b, small);
        steps.appendChild(item);
    });

    const report = document.createElement('div');
    report.className = 'processing-flow-report';
    report.textContent = track.report || (track.status === 'done' ? '마스터링 완료' : '마스터링을 실행하면 단계별 진행이 표시됩니다.');

    panel.append(head, rail, steps, report);
    el.trackDetail.appendChild(panel);
}


function renderEngineSafetyPanel(track) {
    if (!state.engineSafetyMeter || !track) return;
    const info = track.safetyInfo || computeEngineSafetyInfo(track, null, track.finalizeInfo || null);
    const panel = document.createElement('div');
    panel.className = `engine-safety-panel engine-safety-${info.tone}`;
    const head = document.createElement('div');
    head.className = 'engine-safety-head';
    const title = document.createElement('strong');
    title.textContent = '엔진 안전 점수';
    const score = document.createElement('b');
    score.textContent = `${info.score}점 · ${info.label}`;
    head.append(title, score);

    const bar = document.createElement('div');
    bar.className = 'engine-safety-bar';
    const fill = document.createElement('i');
    fill.style.width = `${clamp(info.score, 0, 100)}%`;
    bar.appendChild(fill);

    const notes = document.createElement('div');
    notes.className = 'engine-safety-notes';
    notes.textContent = info.notes.join(' · ');

    const guard = document.createElement('small');
    guard.className = 'engine-safety-guard';
    guard.textContent = `성능 가드: ${formatPerformanceGuardInfo(track.performanceGuardInfo)}`;

    panel.append(head, bar, notes, guard);
    el.trackDetail.appendChild(panel);
}

function renderMasterComparisonPanel(track) {
    if (!track || !track.analysis) return;
    const panel = document.createElement('div');
    panel.className = 'compare-panel';
    const title = document.createElement('strong');
    title.textContent = '정밀 비교 / 성능 미터';
    panel.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'compare-grid';
    const before = Number.isFinite(track.analysis.loudnessIntegrated) ? track.analysis.loudnessIntegrated : track.analysis.loudnessHint;
    const after = track.finalizeInfo && Number.isFinite(track.finalizeInfo.loudnessAfter) ? track.finalizeInfo.loudnessAfter : NaN;
    const peakAfter = track.finalizeInfo && Number.isFinite(track.finalizeInfo.peakAfter) ? ampToDb(track.finalizeInfo.peakAfter) : NaN;
    [
        ['원본 LUFS', Number.isFinite(before) ? before.toFixed(1) : '-'],
        ['마스터 LUFS', Number.isFinite(after) ? after.toFixed(1) : '렌더 전'],
        ['클리핑 위험', stripTags(getClippingRiskText(track))]
    ].forEach(([label, value]) => {
        const chip = document.createElement('div');
        chip.className = 'compare-chip';
        const span = document.createElement('span');
        span.textContent = label;
        const b = document.createElement('b');
        b.textContent = value;
        chip.append(span, b);
        grid.appendChild(chip);
    });
    panel.appendChild(grid);
    if (track.performanceInfo) {
        const perf = document.createElement('div');
        perf.className = 'performance-meter-row';
        const heavy = getHeaviestPerformanceStage(track.performanceInfo);
        const chips = [
            ['처리 시간', formatPerformanceInfo(track.performanceInfo)],
            ['무거운 단계', heavy ? `${heavy.label} · ${formatDurationMs(heavy.ms)}` : '측정 전']
        ];
        chips.forEach(([label, value]) => {
            const chip = document.createElement('div');
            chip.className = 'performance-meter-chip';
            const span = document.createElement('span');
            span.textContent = label;
            const b = document.createElement('b');
            b.textContent = value;
            chip.append(span, b);
            perf.appendChild(chip);
        });
        panel.appendChild(perf);
    }
    const bars = document.createElement('div');
    bars.className = 'lufs-bars';
    bars.appendChild(makeLufsBar('원본', before));
    bars.appendChild(makeLufsBar('마스터', after));
    panel.appendChild(bars);
    const diff = document.createElement('div');
    diff.className = 'diff-meter';
    diff.textContent = buildTrackDiffText(track);
    panel.appendChild(diff);
    el.trackDetail.appendChild(panel);
}

function makeLufsBar(label, lufs) {
    const row = document.createElement('div');
    row.className = 'lufs-row';
    const l = document.createElement('span');
    l.textContent = label;
    const track = document.createElement('div');
    track.className = 'lufs-track';
    const fill = document.createElement('div');
    fill.className = 'lufs-fill';
    const pct = Number.isFinite(lufs) ? clamp((lufs + 30) / 22 * 100, 0, 100) : 0;
    fill.style.width = `${pct}%`;
    track.appendChild(fill);
    const value = document.createElement('span');
    value.textContent = Number.isFinite(lufs) ? `${lufs.toFixed(1)}` : '-';
    row.append(l, track, value);
    return row;
}

function createComparisonInfo(track, finalizeInfo) {
    const before = track.analysis && Number.isFinite(track.analysis.loudnessIntegrated) ? track.analysis.loudnessIntegrated : NaN;
    const after = finalizeInfo && Number.isFinite(finalizeInfo.loudnessAfter) ? finalizeInfo.loudnessAfter : NaN;
    const gain = Number.isFinite(before) && Number.isFinite(after) ? after - before : NaN;
    const peakAfter = finalizeInfo && Number.isFinite(finalizeInfo.peakAfter) ? ampToDb(finalizeInfo.peakAfter) : NaN;
    return { beforeLufs: before, afterLufs: after, loudnessDelta: gain, peakAfterDb: peakAfter };
}

function getABMatchGainDb(track) {
    if (!state.abLevelMatch || !track || !track.finalizeInfo || !track.analysis) return 0;
    const before = Number.isFinite(track.analysis.loudnessIntegrated) ? track.analysis.loudnessIntegrated : track.analysis.loudnessHint;
    const after = Number.isFinite(track.finalizeInfo.loudnessAfter) ? track.finalizeInfo.loudnessAfter : NaN;
    if (!Number.isFinite(before) || !Number.isFinite(after)) return 0;
    return clamp(before - after, -18, 0);
}

function getClippingRiskText(track) {
    const peak = track?.finalizeInfo && Number.isFinite(track.finalizeInfo.peakAfter) ? ampToDb(track.finalizeInfo.peakAfter) : (track?.analysis?.peakDb ?? NaN);
    if (!Number.isFinite(peak)) return '렌더 후 판단';
    if (peak > -0.35) return '높음 · 천장 여유 부족';
    if (peak > -1.0) return '중간 · 플랫폼 변환 주의';
    return '낮음 · 안전 여유 확보';
}

function stripTags(value) { return String(value || '').replace(/<[^>]+>/g, ''); }

function buildTrackDiffText(track) {
    if (!track || !track.finalizeInfo) return '마스터링 후 LUFS 변화, 피크 위험, A/B 레벨 매칭 값을 표시합니다.';
    const c = track.comparison || createComparisonInfo(track, track.finalizeInfo);
    const delta = Number.isFinite(c.loudnessDelta) ? `${formatSigned(c.loudnessDelta, 1)} LUFS` : '-';
    const peak = Number.isFinite(c.peakAfterDb) ? `${c.peakAfterDb.toFixed(2)} dBTP 유사` : '-';
    const ab = getABMatchGainDb(track);
    return `라우드니스 변화 ${delta} · 최종 피크 ${peak} · A/B 매칭 ${formatSigned(ab, 1)} dB`;
}

function buildGlobalDiffText() {
    const done = state.tracks.filter(track => track.outBlob && track.finalizeInfo);
    if (!done.length) return '마스터링 전후 비교는 렌더 후 분석에서 표시됩니다.';
    const avg = done.reduce((sum, track) => sum + (track.comparison?.loudnessDelta || 0), 0) / done.length;
    const risky = done.filter(track => /높음|중간/.test(getClippingRiskText(track))).length;
    return `${done.length}곡 비교 완료 · 평균 라우드니스 변화 ${formatSigned(avg, 1)} LUFS · 주의 필요 ${risky}곡`;
}

function applyAIRecommendationToTrack(track) {
    if (!track || !track.analysis) {
        showToast('분석이 완료된 곡에서만 AI 프리셋을 적용할 수 있습니다.');
        return;
    }
    if (track.genreLocked) {
        track.settings = cloneSettings(makeRecommendedSettings(track.preset || 'custom', track.analysis));
        invalidateMasteredOutput(track, `${PRESET_LABELS[track.preset] || track.preset} 잠금 장르 기준 추천값을 적용했습니다.`, true);
    } else {
        track.preset = track.recommendedPreset || 'custom';
        track.settings = cloneSettings(track.recommendedSettings || GENRE_PRESETS.custom);
        invalidateMasteredOutput(track, `${PRESET_LABELS[track.preset] || track.preset} AI 추천값을 다시 적용했습니다.`, true);
    }
    state.selectedId = track.id;
    applyTrackToControls(track);
    renderAll({ keepDetailAudio: true });
    showToast(`${track.name}: AI 프리셋을 적용했습니다.`);
}

function toggleGenreLockForTrack(track) {
    if (!track) return;
    track.genreLocked = !track.genreLocked;
    if (track.genreLocked && track.analysis) {
        track.settings = cloneSettings(makeRecommendedSettings(track.preset || 'custom', track.analysis));
        invalidateMasteredOutput(track, `${PRESET_LABELS[track.preset] || track.preset} 장르를 잠금 처리했습니다.`, true);
    }
    state.selectedId = track.id;
    renderAll({ keepDetailAudio: true });
    showToast(track.genreLocked ? '이 곡의 장르를 잠금 처리했습니다. AI 재적용 시 이 장르 기준을 유지합니다.' : '이 곡의 장르 잠금을 해제했습니다. AI 추천 장르가 다시 적용될 수 있습니다.');
}

function toggleGenreLockForSelected() {
    toggleGenreLockForTrack(getSelectedTrack());
}


function getMasterGoalProfile(goal = state.masterGoal) {
    const profiles = {
        melody: {
            label: '멜로디 보존 우선',
            description: '보컬·리드·어쿠스틱 악기 보호',
            targetLufs: -16,
            ceilingDb: -1.5,
            qualityMode: 'max',
            clarityDelta: -5,
            warmthDelta: 4,
            widthDelta: -3,
            punchDelta: -7,
            metallicDelta: 6,
            intensityScale: 0.90
        },
        natural: {
            label: '자연스러움 우선',
            description: '원본 질감과 체감 보정의 균형',
            targetLufs: -14,
            ceilingDb: -1.0,
            qualityMode: 'balanced',
            clarityDelta: 0,
            warmthDelta: 1,
            widthDelta: 0,
            punchDelta: 0,
            metallicDelta: 2,
            intensityScale: 1.0
        },
        loud: {
            label: '음압 우선',
            description: '더 강한 존재감과 큰 체감',
            targetLufs: -12,
            ceilingDb: -0.8,
            qualityMode: 'max',
            clarityDelta: 4,
            warmthDelta: -2,
            widthDelta: 2,
            punchDelta: 8,
            metallicDelta: 4,
            intensityScale: 1.12
        }
    };
    return profiles[goal] || profiles.natural;
}

function getMasterGoalLabel(goal = state.masterGoal) {
    return getMasterGoalProfile(goal).label;
}

function getMasterGoalDescription(goal = state.masterGoal) {
    return getMasterGoalProfile(goal).description;
}

function formatCeilingSelectValue(value) {
    return Number(value).toFixed(1).replace(/\.0$/, '');
}

function applyMasterGoalDefaults(goal, updateControls) {
    const profile = getMasterGoalProfile(goal);
    state.targetLufs = profile.targetLufs;
    state.ceilingDb = profile.ceilingDb;
    state.qualityMode = profile.qualityMode;
    if (updateControls || el.targetLufsSelect) {
        if (el.targetLufsSelect) el.targetLufsSelect.value = String(profile.targetLufs);
        if (el.ceilingSelect) el.ceilingSelect.value = formatCeilingSelectValue(profile.ceilingDb);
        if (el.qualityModeSelect) el.qualityModeSelect.value = profile.qualityMode;
    }
}

function applyMasterGoalToSettings(out, analysis, preset) {
    const profile = getMasterGoalProfile(state.masterGoal);
    const isCustom = preset === 'custom';
    const customScale = isCustom ? 0.55 : 1;
    out.clarity = clamp(Math.round(out.clarity + profile.clarityDelta * customScale), 5, 95);
    out.warmth = clamp(Math.round(out.warmth + profile.warmthDelta * customScale), 5, 95);
    out.width = clamp(Math.round(out.width + profile.widthDelta * customScale), 5, 86);
    out.dynamicPunch = clamp(Math.round(out.dynamicPunch + profile.punchDelta * customScale), 5, 90);
    out.metallicRemoval = clamp(Math.round(out.metallicRemoval + profile.metallicDelta * customScale), 18, 92);
    out.intensity = clampToStep(Number(out.intensity || 100) * profile.intensityScale, 50, 200, 5);

    if (state.masterGoal === 'melody') {
        const mid = Number(analysis?.midRatio || 0);
        if (mid > 0.28 || shouldApplyVocalProtection(preset, analysis)) {
            out.clarity = clamp(out.clarity - 3, 5, 90);
            out.warmth = clamp(out.warmth + 2, 5, 96);
            out.dynamicPunch = clamp(out.dynamicPunch - 4, 5, 85);
        }
    }
    if (state.masterGoal === 'loud') {
        const metallic = Number(analysis?.metallicHint || 0);
        if (metallic > 0.62) out.metallicRemoval = clamp(out.metallicRemoval + 6, 18, 94);
    }
}

function getPitchEngineLabel(mode) {
    const labels = { auto: 'Auto/WASM 우선', wsola: 'WSOLA Worker', external: 'External WASM' };
    return labels[mode] || mode;
}

function addDetailRow(label, value, target = el.trackDetail) {
    const row = document.createElement('div');
    row.className = 'detail-row';
    const left = document.createElement('span');
    const right = document.createElement('span');
    left.textContent = label;
    right.textContent = value == null || value === '' ? '-' : String(value);
    row.append(left, right);
    target.appendChild(row);
}

function renderSelectedBadge() {
    const track = getSelectedTrack();
    el.selectedBadge.textContent = track ? (PRESET_LABELS[track.preset] || track.preset) : '선택 없음';
}

function updateConfidenceUI(track) {
    if (!track) {
        el.confidenceText.textContent = '추천 없음';
        return;
    }
    el.confidenceText.textContent = track.confidence ? `AI 추천 ${track.confidence}%` : '추천 대기';
}

function selectTrack(id) {
    state.selectedId = id;
    const track = getSelectedTrack();
    if (track) applyTrackToControls(track);
    renderAll();
}

function removeTrack(id) {
    const index = state.tracks.findIndex(track => track.id === id);
    if (index < 0) return;
    const [track] = state.tracks.splice(index, 1);
    state.selectedIds.delete(id);
    if (track.originalUrl) URL.revokeObjectURL(track.originalUrl);
    if (track.masteredUrl) URL.revokeObjectURL(track.masteredUrl);

    if (state.selectedId === id) {
        state.selectedId = state.tracks[0] ? state.tracks[0].id : null;
        const selected = getSelectedTrack();
        if (selected) applyTrackToControls(selected);
        else {
            applyPresetToControlsOnly('custom');
            setTransformControls(DEFAULT_TRANSFORM);
            setInstrumentControls(DEFAULT_INSTRUMENT_LAYER);
        }
    }
    if (!state.selectedIds.size && state.selectedId) state.selectedIds.add(state.selectedId);
    if (state.featureFlags.albumMatch) state.albumProfile = computeAlbumProfile();
    renderAll();
}

function applyPresetToControlsOnly(preset) {
    state.programmatic = true;
    setControlsFromSettings(GENRE_PRESETS[preset] || GENRE_PRESETS.custom, preset, GENRE_PRESETS[preset] || GENRE_PRESETS.custom);
    setInstrumentControls(DEFAULT_INSTRUMENT_LAYER);
    el.confidenceText.textContent = '추천 없음';
    state.programmatic = false;
}

function getSelectedTrack() {
    return state.tracks.find(track => track.id === state.selectedId) || null;
}

function getSelectedTracks() {
    return state.tracks.filter(track => state.selectedIds.has(track.id));
}

function toggleTrackSelection(id) {
    if (state.selectedIds.has(id)) {
        state.selectedIds.delete(id);
    } else {
        state.selectedIds.add(id);
        state.selectedId = id;
        const track = getSelectedTrack();
        if (track) applyTrackToControls(track);
    }
    renderAll({ keepDetailAudio: true });
}

function buildReport(track) {
    if (!track.analysis) return '분석 대기 중';
    const preset = PRESET_LABELS[track.recommendedPreset] || track.recommendedPreset;
    const brightness = Math.round(track.analysis.brightness * 100);
    const width = Math.round(track.analysis.stereoWidth * 100);
    return `${preset} 추천 · 신뢰도 ${track.confidence}% · 밝기 ${brightness}% · 스테레오 ${width}% · 강도 ${track.settings.intensity ?? 100}% · 공진 추적 주파수 ${track.analysis.targetDynamicFreq}Hz 포착${track.genreReason ? ' · ' + track.genreReason : ''}`;
}

function createDoneReport(track) {
    const parts = [`마스터링 완료: ${track.outName}`, getOutputFormatLabel(track.outFormat || state.outputFormat || 'wav24'), `강도 ${track.settings.intensity ?? 100}%`, getMasterGoalLabel(state.masterGoal)];
    if (track.instrumentInfo && track.instrumentInfo.applied) parts.push(`${track.instrumentInfo.label} 레이어 ${track.instrumentInfo.bpm.toFixed(0)} BPM`);
    if (track.trimInfo && track.trimInfo.applied) parts.push(`무음 정리 앞 ${track.trimInfo.startTrimSec.toFixed(2)}초/뒤 ${track.trimInfo.endTrimSec.toFixed(2)}초`);
    if (track.albumApplied) parts.push(`앨범 통일 ${formatSigned(track.albumApplied.levelDeltaDb, 2)} dB`);
    if (track.truePeakInfo) parts.push(track.truePeakInfo.mode === 'truePeak' ? 'True Peak 보호' : 'Sample Peak 보호');
    if (track.performanceInfo?.totalMs) parts.push(`처리 ${formatDurationMs(track.performanceInfo.totalMs)}`);
    return parts.join(' · ');
}

function createExportReport(track) {
    return {
        app: 'FoxBear AI Mastering Studio Pro v1.3.5',
        developer: '곰같은여우 (with AI)',
        youtube: 'https://www.youtube.com/@FoxBearMusic',
        originalFile: track.name,
        visiblePath: track.path,
        exportedFile: track.outName,
        outputFormat: track.outFormat,
        preset: track.preset,
        recommendedPreset: track.recommendedPreset,
        confidence: track.confidence,
        genreReason: track.genreReason,
        genreAlternatives: track.genreAlternatives,
        settings: track.settings,
        pitchSpeed: track.transform,
        masteredDurationSec: track.masteredDurationSec || null,
        instrument: track.instrument,
        instrumentInfo: track.instrumentInfo,
        enabledFeatures: { ...state.featureFlags },
        trimInfo: track.trimInfo,
        albumApplied: track.albumApplied,
        truePeakInfo: track.truePeakInfo,
        finalizeInfo: track.finalizeInfo,
        performanceInfo: track.performanceInfo,
        outputTarget: { masterGoal: state.masterGoal, targetLufs: state.targetLufs, ceilingDb: state.ceilingDb, qualityMode: state.qualityMode },
        albumProfile: state.albumProfile,
        analysis: track.analysis,
        createdAt: new Date().toISOString()
    };
}

function featureLabelText() {
    const active = Object.entries(state.featureFlags)
        .filter(([, value]) => value)
        .map(([key]) => FEATURE_DEFINITIONS[key].label);
    return active.length ? active.join(' · ') : '기능 미사용';
}

function getQualityModeLabel(mode) {
    const labels = { fast: 'Fast', balanced: 'Balanced Pro', max: 'Max Quality' };
    return labels[mode] || labels.balanced;
}

function statusLabel(status) {
    const labels = { queued: '대기', analyzing: '분석 중', ready: '준비', processing: '처리 중', done: '완료', error: '오류' };
    return labels[status] || status;
}

function cloneSettings(settings) {
    return {
        clarity: Number(settings.clarity),
        warmth: Number(settings.warmth),
        width: Number(settings.width),
        stereoGroove: Number(settings.stereoGroove),
        analogGroove: Number(settings.analogGroove),
        dynamicPunch: Number(settings.dynamicPunch),
        metallicRemoval: Number(settings.metallicRemoval ?? 0),
        intensity: Number(settings.intensity ?? 100)
    };
}

function cloneTransform(transform) {
    const pitchSemitones = clamp(Number(transform?.pitchSemitones ?? DEFAULT_TRANSFORM.pitchSemitones), -12, 12);
    const speedRatio = clamp(Number(transform?.speedRatio ?? DEFAULT_TRANSFORM.speedRatio), 0.5, 1.5);
    const beatPreset = transform?.beatPreset === 'custom' ? 'custom' : (transform?.beatPreset && BEAT_CHANGE_PRESETS[transform.beatPreset] ? transform.beatPreset : getBeatPresetForRatio(speedRatio));
    return {
        pitchSemitones,
        speedRatio,
        snapSemitone: transform?.snapSemitone !== undefined ? Boolean(transform.snapSemitone) : DEFAULT_TRANSFORM.snapSemitone,
        beatPreset
    };
}

function cloneInstrumentLayer(layer) {
    const mode = layer?.mode && INSTRUMENT_LAYER_PRESETS[layer.mode] ? layer.mode : DEFAULT_INSTRUMENT_LAYER.mode;
    const amount = layer?.amount && INSTRUMENT_AMOUNT_LEVELS[layer.amount] ? layer.amount : DEFAULT_INSTRUMENT_LAYER.amount;
    return { mode, amount };
}

function getBeatPresetForRatio(ratio) {
    const value = Number(ratio || 1);
    let bestKey = 'custom';
    let bestDelta = Infinity;
    Object.entries(BEAT_CHANGE_PRESETS).forEach(([key, preset]) => {
        const delta = Math.abs(value - preset.ratio);
        if (delta < bestDelta) {
            bestDelta = delta;
            bestKey = key;
        }
    });
    return bestDelta < 0.006 ? bestKey : 'custom';
}

function getBeatPresetLabel(key) {
    if (key === 'custom') return '커스텀 박자';
    return BEAT_CHANGE_PRESETS[key]?.label || BEAT_CHANGE_PRESETS.original.label;
}

function getInstrumentLayerLabel(mode) {
    return INSTRUMENT_LAYER_PRESETS[mode]?.label || INSTRUMENT_LAYER_PRESETS.off.label;
}

function getInstrumentAmountLabel(amount) {
    return INSTRUMENT_AMOUNT_LEVELS[amount]?.label || INSTRUMENT_AMOUNT_LEVELS.light.label;
}

function shouldUseInstrumentLayer(layer) {
    const value = cloneInstrumentLayer(layer || DEFAULT_INSTRUMENT_LAYER);
    return value.mode !== 'off';
}

function getInstrumentDetailText(track) {
    const layer = cloneInstrumentLayer(track?.instrument || DEFAULT_INSTRUMENT_LAYER);
    if (layer.mode === 'off') return 'OFF · 원본만 처리';
    const rendered = track?.instrumentInfo?.applied ? ` · 렌더 ${track.instrumentInfo.bpm.toFixed(0)} BPM` : ' · 렌더 전';
    return `${getInstrumentLayerLabel(layer.mode)} · ${getInstrumentAmountLabel(layer.amount)}${rendered}`;
}

function median(values) {
    const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!sorted.length) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function clamp01(value) { return clamp(value, 0, 1); }
function map(value, inMin, inMax, outMin, outMax) { return outMin + (Number(value) - inMin) * (outMax - outMin) / (inMax - inMin); }
function dbToAmp(db) { return Math.pow(10, db / 20); }

function clampToStep(value, min, max, step) {
    const safeStep = Number(step || 1);
    const clamped = clamp(Number(value), min, max);
    return Math.round(clamped / safeStep) * safeStep;
}


function getOutputFormatLabel(format) {
    const labels = {
        wav24: '24-bit PCM WAV',
        wav32float: '32-bit Float WAV',
        mp3_192: 'MP3 192 kbps',
        mp3_320: 'MP3 320 kbps'
    };
    return labels[format] || labels.wav24;
}

function formatSliderValue(slider, value) {
    const step = Number(slider.step ?? 1);
    const digits = step < 1 ? 2 : 0;
    return `${Number(value).toFixed(digits)}${slider.unit || '%'}`;
}

function getMasteringIntensity(settings) {
    const raw = clampToStep(Number(settings?.intensity ?? 100), 50, 200, 5);
    let amount = raw / 100;
    if (raw >= 140) {
        const over = (raw - 140) / 60;
        amount = 1.4 + over * 0.75 + Math.pow(over, 1.7) * 1.05;
    }
    return { raw, amount, high: raw >= 140 };
}

function formatSigned(value, digits) {
    const fixed = Number(value).toFixed(digits);
    return Number(value) > 0 ? `+${fixed}` : fixed;
}

function isDefaultTransform(transform) {
    return Math.abs(Number(transform.pitchSemitones)) < 0.001 && Math.abs(Number(transform.speedRatio) - 1) < 0.001;
}

function ampToDb(value) {
    return 20 * Math.log10(Math.max(0.000001, Math.abs(value)));
}

function formatBytes(bytes) {
    if (!bytes) return '0 MB';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index += 1;
    }
    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '-';
    const minutes = Math.floor(seconds / 60);
    const rest = Math.round(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${rest}`;
}

function safeBaseName(fileName) {
    const withoutExt = fileName.replace(/\.[^.]+$/, '');
    return withoutExt.replace(/[^a-zA-Z0-9가-힣._-]+/g, '_').slice(0, 80) || 'track';
}

function timestampForFile() {
    const date = new Date();
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('show');
    clearTimeout(state.lastToastTimer);
    state.lastToastTimer = setTimeout(() => { el.toast.classList.remove('show'); }, 3200);
}