// FoxBear AI Mastering Studio Pro v4.4 - advanced modular GitHub DSP build
'use strict';

const APP_VERSION = 'Pro v4.4';
const WAV_ENCODER_WORKER_URL = 'src/workers/wav-encoder.worker.js';
const MP3_ENCODER_WORKER_URL = 'src/workers/mp3-encoder.worker.js';
const ANALYSIS_WORKER_URL = 'src/workers/analysis.worker.js';
const MASTER_FINALIZER_WORKER_URL = 'src/workers/master-finalizer.worker.js';
const PITCH_WSOLA_WORKER_URL = 'src/workers/pitch-wsola.worker.js';
const OPTIONAL_WASM_PITCH_ADAPTER_URL = './engines/pitch-engine-adapter.js';
const ANALYSIS_CACHE_DB = 'foxbear-analysis-cache-v44';
const ANALYSIS_CACHE_STORE = 'analysis';

const MAX_FILES = 35;
const MAX_FILE_SIZE = 220 * 1024 * 1024;
const AUDIO_EXTENSIONS = ['.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac', '.aif', '.aiff', '.webm'];
const DEFAULT_TRANSFORM = { pitchSemitones: 0, speedRatio: 1, snapSemitone: true };

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
    rock: 'ROCK'
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
    rock: { clarity: 50, warmth: 54, width: 30, stereoGroove: 8, analogGroove: 5, dynamicPunch: 48, metallicRemoval: 45, intensity: 108 }
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
        transientRefine: true
    },
    albumProfile: null,
    outputFormat: 'wav24',
    targetLufs: -14,
    ceilingDb: -1.0,
    qualityMode: 'balanced',
    pitchEngine: 'auto',
    abLevelMatch: true,
    cacheReady: false,
    autoRemasterTimers: new Map()
};

const el = {};

document.addEventListener('DOMContentLoaded', init);

function init() {
    cacheElements();
    renderSliders();
    renderFeatureButtons();
    bindEvents();
    applyPresetToControlsOnly('custom');
    setTransformControls(DEFAULT_TRANSFORM);
    renderAll();
    initUiGuards();
    maybeShowSubscribePrompt();
}

function cacheElements() {
    const ids = [
        'fileDrop', 'folderDrop', 'fileInput', 'folderInput', 'featureDock', 'featureCount',
        'genreSelect', 'confidenceText', 'intensityField', 'sliderFields', 'pitchSlider', 'speedSlider', 'pitchValue', 'speedValue',
        'pitchHint', 'speedHint', 'keyReadout', 'tempoReadout', 'tempoPercent', 'snapSemitone', 'pitchSpeedBadge',
        'aiApplyBtn', 'masterSelectedBtn', 'masterAllBtn', 'zipBtn', 'clearBtn', 'trackList', 'queuePreview', 'trackDetail',
        'detailStatus', 'queueCount', 'statTracks', 'statDone', 'statSize', 'statState', 'selectedBadge',
        'albumStatus', 'toast', 'outputFormatSelect', 'targetLufsSelect', 'ceilingSelect', 'qualityModeSelect', 'pitchEngineSelect', 'abMatchBtn', 'genreLockBtn', 'clearCacheBtn', 'globalDiffMeter', 'subscribeNudge', 'subscribeNudgeAction', 'subscribeNudgeClose'
    ];
    ids.forEach(id => { el[id] = document.getElementById(id); });
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
        label.textContent = slider.label;

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
    el.featureDock.textContent = '';
    Object.entries(FEATURE_DEFINITIONS).forEach(([key, info]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `feature-card ${state.featureFlags[key] ? 'active' : ''}`;
        button.dataset.feature = key;
        button.setAttribute('aria-pressed', String(Boolean(state.featureFlags[key])));

        const title = document.createElement('b');
        title.textContent = info.label;
        const desc = document.createElement('span');
        desc.textContent = info.short;
        const status = document.createElement('span');
        status.className = 'feature-status';
        status.textContent = state.featureFlags[key] ? 'ON' : 'OFF';

        button.append(title, desc, status);
        button.addEventListener('click', () => toggleFeature(key));
        el.featureDock.appendChild(button);
    });
    updateFeatureSummary();
}

function updateFeatureSummary() {
    const active = Object.values(state.featureFlags).filter(Boolean).length;
    el.featureCount.textContent = `${active}개 활성`;
}

function bindEvents() {
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
            invalidateAllMasteredOutput(`${getPitchEngineLabel(state.pitchEngine)} 피치/BPM 엔진으로 변경되었습니다. 다시 마스터링하세요.`);
            renderAll({ keepDetailAudio: true });
            showToast(`${getPitchEngineLabel(state.pitchEngine)} 피치/BPM 엔진으로 변경했습니다.`);
        });
    }
    if (el.abMatchBtn) {
        el.abMatchBtn.addEventListener('click', () => {
            state.abLevelMatch = !state.abLevelMatch;
            renderAll({ keepDetailAudio: true });
            showToast(state.abLevelMatch ? 'A/B 레벨 매칭을 켰습니다.' : 'A/B 레벨 매칭을 껐습니다.');
        });
    }
    if (el.genreLockBtn) {
        el.genreLockBtn.addEventListener('click', toggleGenreLockForSelected);
    }
    if (el.clearCacheBtn) {
        el.clearCacheBtn.addEventListener('click', async () => {
            await clearAnalysisCache();
            showToast('분석 캐시를 정리했습니다.');
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
    showToast(`${FEATURE_DEFINITIONS[key].label}: ${state.featureFlags[key] ? '켜짐' : '꺼짐'}`);
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
    const hasAudioExt = AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext));
    if (!hasAudioType && !hasAudioExt) return { ok: false, reason: '오디오 파일 형식이 아닙니다.' };
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
        trimInfo: null,
        albumApplied: null,
        truePeakInfo: null,
        finalizeInfo: null,
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
        track.analysisCacheHit = false;
        await writeAnalysisCache(track, analysis);
    }
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
        throw new Error('오디오 파일 복원에 실패했습니다. 손상되었거나 브라우저 미지원 코덱일 수 있습니다.');
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

async function clearAnalysisCache() {
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
        renderAll({ keepDetailAudio: true });
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
        rock:       { b: 0.56, w: 0.28, p: 0.60, d: 0.44, m: 0.42, l: 0.58, prior: 0.30 }
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
        rock: ['rock', 'metal', 'punk', 'band']
    };
    const explicit = {};
    Object.entries(keywordMap).forEach(([preset, words]) => {
        explicit[preset] = keywordHit(name, words);
        if (explicit[preset]) scores[preset] += ['pop', 'dance', 'ballad'].includes(preset) ? 2.6 : 4.4;
    });

    const broadPresets = ['pop', 'kpop', 'kballad', 'rnb', 'ballad', 'dance', 'trap', 'hiphop', 'rock', 'edm'];
    const guardedPresets = ['futurebass', 'house', 'synthpop', 'citypop', 'drill', 'boombap', 'globalpop', 'lofi', 'acoustic'];
    const gatePass = {
        futurebass: bright > 0.68 && wide > 0.62 && punch > 0.32 && punch < 0.58 && metallic > 0.50 && loud > 0.52 && bass > 0.22 && high > 0.16,
        house: punch > 0.54 && loud > 0.58 && wide > 0.40 && bright > 0.48,
        synthpop: bright > 0.52 && wide > 0.46 && metallic > 0.46 && punch < 0.56,
        citypop: bright > 0.42 && bright < 0.62 && punch < 0.48 && soft > 0.45 && wide > 0.34,
        drill: punch > 0.68 && wide < 0.36 && dark > 0.48,
        boombap: punch > 0.44 && punch < 0.64 && dark > 0.55 && wide < 0.38,
        globalpop: wide > 0.38 && metallic > 0.46 && bright > 0.48,
        lofi: bright < 0.36 && punch < 0.36 && dark > 0.60,
        acoustic: wide < 0.34 && punch < 0.34 && loud < 0.48 && metallic < 0.44
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
    el.pitchValue.textContent = `${formatSigned(value.pitchSemitones, value.snapSemitone ? 0 : 2)} 반음`;
    el.speedValue.textContent = `${value.speedRatio.toFixed(2)}x`;
    el.keyReadout.textContent = formatSigned(value.pitchSemitones, value.snapSemitone ? 0 : 2);
    el.tempoReadout.textContent = `${value.speedRatio.toFixed(2)}x`;
    el.tempoPercent.textContent = `원본 ${Math.round(value.speedRatio * 100)}%`;
    if (el.pitchHint) el.pitchHint.textContent = `${value.snapSemitone ? '반음 고정 ON' : '미세 조정 ON'} · ${isDefaultTransform(value) ? '원본 키 유지' : '키 변경 적용'}`;
    if (el.speedHint) el.speedHint.textContent = `원본 ${Math.round(value.speedRatio * 100)}% · ${Math.abs(value.speedRatio - 1) < 0.001 ? '길이 변화 없음' : '재생 길이 변경'}`;
    el.pitchSpeedBadge.textContent = isDefaultTransform(value) ? '기본값' : '변경 적용';
    state.programmatic = false;
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

    if (!calledFromBatch) {
        state.busy = true;
        if (state.featureFlags.albumMatch) state.albumProfile = computeAlbumProfile();
    }

    track.status = 'processing';
    track.progress = 6;
    track.error = null;
    track.trimInfo = null;
    track.albumApplied = null;
    track.truePeakInfo = null;
    track.finalizeInfo = null;
    track.report = '온디맨드 디코더 구동 중...';
    renderAll();

    try {
        let currentSourceBuffer = await decodeAudio(track.file);

        if (!track.analysis) {
            track.progress = 14;
            track.report = '분석 정보가 없어 마스터링 직전 긴급 분석을 실행 중';
            renderAll();
            const analysis = await analyzeBufferAsync(currentSourceBuffer);
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
        }

        if (state.featureFlags.trimSilence) {
            track.progress = 22;
            track.report = '앞뒤 무음 구간 감지 및 여유 구간 보존 중';
            renderAll();
            const trimResult = autoTrimSilenceBuffer(currentSourceBuffer);
            currentSourceBuffer = trimResult.buffer;
            track.trimInfo = trimResult.info;
        }

        track.progress = 38;
        track.report = '피치/BPM 워커 변환 및 오버랩 위상 정렬 중';
        renderAll();
        const preparedBuffer = await preparePitchSpeedBuffer(currentSourceBuffer, track.transform);

        track.progress = 60;
        track.report = '공진 감쇄, 톤 체인, 다이나믹 체인 렌더링 중';
        renderAll();
        const albumProfile = getActiveAlbumProfile();
        const masteredBuffer = await renderMasterBuffer(preparedBuffer, track.settings, track.preset, track.analysis, albumProfile);

        track.progress = 88;
        const requestedOutputFormat = state.outputFormat || 'wav24';
        track.report = state.featureFlags.truePeakGuard ? `True Peak 가드 및 ${getOutputFormatLabel(requestedOutputFormat)} 인코딩 중` : `샘플 피크 가드 및 ${getOutputFormatLabel(requestedOutputFormat)} 인코딩 중`;
        renderAll();

        const finalization = await finalizeMasterBufferAsync(masteredBuffer, {
            targetLufs: state.targetLufs,
            ceilingDb: state.ceilingDb,
            qualityMode: state.qualityMode,
            truePeak: state.featureFlags.truePeakGuard
        });
        const finalBuffer = finalization.buffer;
        track.finalizeInfo = finalization.info;
        track.comparison = createComparisonInfo(track, finalization.info);
        track.truePeakInfo = {
            mode: state.featureFlags.truePeakGuard ? 'truePeak' : 'samplePeak',
            targetDbTP: state.ceilingDb,
            peakBefore: finalization.info.peakBefore,
            peakAfter: finalization.info.peakAfter,
            gain: Math.pow(10, (finalization.info.gainDb || 0) / 20)
        };

        if (albumProfile && track.analysis) track.albumApplied = createAlbumAppliedInfo(track.analysis, albumProfile);

        const encoded = await encodeMasterOutputAsync(finalBuffer, requestedOutputFormat);
        if (!encoded.blob || encoded.blob.size <= 44) throw new Error('렌더 결과가 비어 있습니다. 브라우저 오디오 렌더러가 출력을 만들지 못했습니다.');

        if (track.masteredUrl) URL.revokeObjectURL(track.masteredUrl);
        track.outBlob = encoded.blob;
        track.outFormat = encoded.format;
        track.outName = `${safeBaseName(track.name)}_mastered.${encoded.extension}`;
        track.masteredUrl = URL.createObjectURL(encoded.blob);
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
    if (externalResult) return externalResult;

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
            return output;
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
    return workingBuffer;
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
    const ratio = (input.length - 1) / (output.length - 1);
    for (let i = 0; i < output.length; i += 1) {
        const position = i * ratio;
        const index = Math.floor(position);
        const fraction = position - index;
        output[i] = (input[index] || 0) * (1 - fraction) + (input[Math.min(input.length - 1, index + 1)] || 0) * fraction;
    }
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

    node = createLowEndAnchorNode(context, node, renderChannels === 2 && sourceBuffer.numberOfChannels >= 2, effectiveSettings, analysis, intensity);
    node = createMetallicRemovalNode(context, node, effectiveSettings.metallicRemoval, analysis, intensity);
    node = createAiHumanizeNode(context, node, preset, effectiveSettings, intensity);
    node = createVocalProtectionNode(context, node, preset, effectiveSettings, analysis, intensity);
    node = createMelodyPreserveNode(context, node, preset, effectiveSettings, analysis, intensity);
    node = createProfileEqChain(context, node, preset, intensity);
    const widthBase = map(effectiveSettings.width, 0, 100, 0.82, 1.25);
    const widthScaled = 1 + (widthBase - 1) * clamp(intensity.amount, 0.65, 1.85);
    node = createStereoWidthNode(context, node, renderChannels === 2 && sourceBuffer.numberOfChannels >= 2, widthScaled);
    node = createStereoGrooveNode(context, node, effectiveSettings.stereoGroove, intensity);
    node = createSaturationNode(context, node, effectiveSettings.analogGroove, effectiveSettings.warmth, intensity);
    node = createToneChain(context, node, effectiveSettings, intensity);
    node = createHighFrequencyExciterNode(context, node, effectiveSettings, intensity);
    node = createTransientRefineNode(context, node, effectiveSettings, analysis, intensity);
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
    const samples = 44100;
    const curve = new Float32Array(samples);
    const k = amount * 18;
    for (let i = 0; i < samples; i += 1) {
        const x = i * 2 / samples - 1;
        curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
    }
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
            showToast('이 브라우저는 MP3 네이티브 인코딩을 지원하지 않아 24-bit WAV로 저장합니다.');
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
        }, 90000);
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
}

function downloadBlob(blob, fileName) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function invalidateMasteredOutput(track, report, autoRefresh = false) {
    if (!track) return;
    const wasDone = track.status === 'done' && Boolean(track.outBlob);
    if (track.masteredUrl) URL.revokeObjectURL(track.masteredUrl);
    track.outBlob = null;
    track.outName = '';
    track.outFormat = null;
    track.masteredUrl = null;
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
    state.busy = false;
    state.albumProfile = null;
    clearFileInputs();
    applyPresetToControlsOnly('custom');
    setTransformControls(DEFAULT_TRANSFORM);
    renderAll();
    showToast('작업 큐를 초기화했습니다.');
}

function clearFileInputs() {
    el.fileInput.value = '';
    el.folderInput.value = '';
}

function renderAll(options = {}) {
    renderStats();
    renderButtons();
    renderQueuePreview();
    renderTrackList();
    renderDetail(options);
    renderSelectedBadge();
    renderAlbumStatus();
    updateFeatureSummary();
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
    title.textContent = '선택 트랙 프리뷰';
    const sub = document.createElement('span');
    sub.textContent = track ? (PRESET_LABELS[track.preset] || track.preset || '프리셋 대기') : '트랙 선택 대기';
    head.append(title, sub);
    el.queuePreview.appendChild(head);
    if (!track) {
        const empty = document.createElement('div');
        empty.className = 'preview-empty';
        empty.textContent = '불러온 곡을 선택하면 원본/마스터본 플레이어가 여기에 표시됩니다.';
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
        if (shouldApplyVocalProtection(track.preset, track.analysis)) {
            const vocalChip = document.createElement('div');
            vocalChip.className = 'vocal-safe-chip';
            vocalChip.textContent = '보컬 보호 ON';
            titleWrap.appendChild(vocalChip);
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

        const actions = document.createElement('div');
        actions.className = 'track-actions';
        const isPicked = state.selectedIds.has(track.id);
        actions.append(
            makeMiniButton(isPicked ? '해제' : '선택', isPicked ? 'btn-primary' : 'btn-secondary', () => toggleTrackSelection(track.id), state.busy),
            makeMiniButton('마스터링', 'btn-primary', () => masterTrack(track), ['analyzing', 'processing'].includes(track.status) || state.busy || Boolean(track.error)),
            makeMiniButton('삭제', 'btn-danger', () => removeTrack(track.id), state.busy)
        );
        if (track.outBlob) actions.append(makeMiniButton('파일 다운로드', 'btn-secondary', () => downloadTrack(track), false));

        card.append(top, progressShell, actions);
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
    return button;
}

function renderDetail(options = {}) {
    const track = getSelectedTrack();
    el.trackDetail.textContent = '';
    if (!track) {
        el.detailStatus.className = 'status-pill';
        el.detailStatus.textContent = '선택 없음';
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = '트랙을 선택하면 원본/마스터본 프리뷰와 분석 리포트가 표시됩니다.';
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

    addDetailRow('파일명', track.name);
    addDetailRow('파일 형식', track.type);
    addDetailRow('파일 용량', formatBytes(track.size));
    addDetailRow('프리셋 상태', `${PRESET_LABELS[track.preset] || track.preset} · 신뢰지수 ${track.confidence || 0}%${track.genreLocked ? ' · 잠금' : ''}`);
    addDetailRow('분석 캐시', track.analysisCacheHit ? '사용됨 · 재분석 시간 절약' : '신규 분석');
    if (track.outName) addDetailRow('출력 파일', track.outName);
    addDetailRow('출력 포맷', getOutputFormatLabel(track.outFormat || state.outputFormat || 'wav24'));
    if (track.genreReason) addDetailRow('장르 판단 근거', track.genreReason);
    addDetailRow('마스터링 강도', `${track.settings.intensity ?? 100}% · ${getMasteringIntensity(track.settings).high ? 'HIGH 비선형' : 'NORMAL'}`);
    addDetailRow('금속성 제거', `${track.settings.metallicRemoval ?? 0}% · 높일수록 더 많이 제거`);
    addDetailRow('피치/속도', `${formatSigned(track.transform?.pitchSemitones || 0, 2)} 반음 · ${(track.transform?.speedRatio || 1).toFixed(2)}x`);
    addDetailRow('활성 기능', featureLabelText());
    addDetailRow('AI 티 완화 엔진', shouldApplyAiHumanizer(track.preset) ? 'ON · 250/400/500Hz 온기 보강 · De-esser · 16kHz 하이컷' : 'OFF 또는 커스텀 수동 우선');
    addDetailRow('보컬 보호 모드', shouldApplyVocalProtection(track.preset, track.analysis) ? 'ON · 감정선/멜로디 보존 · 치찰음 섬세 제어' : 'OFF 또는 비보컬/커스텀 우선');
    addDetailRow('스마트 과처리 방지', state.featureFlags.smartGuard ? 'ON · 밝기/저역/피크 과잉을 렌더 직전 보정' : 'OFF · 설정값 그대로 렌더');
    addDetailRow('실시간 엔진 로그', track.report || '-');

    if (track.trimInfo) {
        addDetailRow('무음 정리', track.trimInfo.applied ? `앞 ${track.trimInfo.startTrimSec.toFixed(2)}초 · 뒤 ${track.trimInfo.endTrimSec.toFixed(2)}초 정리` : '정리할 무음 구간 없음');
    }
    if (track.albumApplied) {
        addDetailRow('앨범 통일', `레벨 ${formatSigned(track.albumApplied.levelDeltaDb, 2)} dB · 톤 ${formatSigned(track.albumApplied.toneDelta * 100, 1)}%`);
    }
    if (track.truePeakInfo) {
        const beforeDb = ampToDb(track.truePeakInfo.peakBefore).toFixed(2);
        const afterDb = ampToDb(track.truePeakInfo.peakAfter).toFixed(2);
        addDetailRow('피크 가드', `${track.truePeakInfo.mode === 'truePeak' ? 'True Peak' : 'Sample Peak'} · 전 ${beforeDb} dB · 후 ${afterDb} dB`);
    }
    if (track.finalizeInfo) {
        addDetailRow('클리핑 위험', getClippingRiskText(track));
        const before = Number.isFinite(track.finalizeInfo.loudnessBefore) ? `${track.finalizeInfo.loudnessBefore.toFixed(1)} LUFS` : '-';
        const after = Number.isFinite(track.finalizeInfo.loudnessAfter) ? `${track.finalizeInfo.loudnessAfter.toFixed(1)} LUFS` : '-';
        addDetailRow('2-Pass 라우드니스', `${before} → ${after} · 목표 ${track.finalizeInfo.targetLufs} LUFS`);
        addDetailRow('엔진 품질 모드', `${getQualityModeLabel(track.finalizeInfo.qualityMode)} · ${track.finalizeInfo.oversample || 4}x 피크 검사`);
    }

    if (track.analysis) {
        addDetailRow('재생 시간', formatTime(track.analysis.duration));
        addDetailRow('원본 샘플레이트', `${track.analysis.sampleRate.toLocaleString()} Hz`);
        addDetailRow('채널 수', `${track.analysis.channels} ch`);
        addDetailRow('피크 레벨', `${track.analysis.peakDb.toFixed(1)} dBFS`);
        addDetailRow('RMS 레벨', `${track.analysis.loudnessHint.toFixed(1)} dB`);
        if (Number.isFinite(track.analysis.loudnessIntegrated)) addDetailRow('예상 통합 라우드니스', `${track.analysis.loudnessIntegrated.toFixed(1)} LUFS 유사`);
        addDetailRow('밝기/스테레오 폭', `${Math.round(track.analysis.brightness * 100)}% / ${Math.round(track.analysis.stereoWidth * 100)}%`);
        addDetailRow('저역/중역/고역', `${Math.round((track.analysis.bassRatio || 0) * 100)}% / ${Math.round((track.analysis.midRatio || 0) * 100)}% / ${Math.round((track.analysis.highRatio || 0) * 100)}%`);
        addDetailRow('트랜지언트 밀도', `${Math.round((track.analysis.transientDensity || 0) * 100)}%`);
        addDetailRow('금속성 지수', `${Math.round(track.analysis.metallicHint * 100)}%`);
        addDetailRow('공진 추적 주파수', `${track.analysis.targetDynamicFreq} Hz`);
    }
    if (track.error) addDetailRow('오류 내용', track.error);

    updateConfidenceUI(track);
    if (!options.keepDetailAudio) applyTrackToControls(track);
}

function renderPreviewPlayers(track, target = el.trackDetail) {
    const previewGrid = document.createElement('div');
    previewGrid.className = 'preview-grid';

    const originalCard = document.createElement('div');
    originalCard.className = 'preview-card';
    const originalLabel = document.createElement('strong');
    originalLabel.textContent = '원본 프리뷰';
    originalCard.append(originalLabel, createPreviewPlayer(track.originalUrl));

    const masteredCard = document.createElement('div');
    masteredCard.className = 'preview-card';
    const masteredLabel = document.createElement('strong');
    masteredLabel.textContent = '마스터링 프리뷰';
    masteredCard.appendChild(masteredLabel);
    if (track.masteredUrl) {
        masteredCard.appendChild(createPreviewPlayer(track.masteredUrl, getABMatchGainDb(track)));
    } else {
        const empty = document.createElement('div');
        empty.className = 'preview-empty';
        empty.textContent = '마스터링 실행 후 활성화됩니다.';
        masteredCard.appendChild(empty);
    }

    previewGrid.append(originalCard, masteredCard);
    target.appendChild(previewGrid);
}

function createPreviewPlayer(src, gainDb = 0) {
    const wrap = document.createElement('div');
    wrap.className = 'custom-player';

    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.src = src;
    if (state.abLevelMatch && Number.isFinite(gainDb)) {
        audio.volume = clamp(Math.pow(10, gainDb / 20), 0.02, 1);
    }

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'player-toggle';
    toggle.textContent = '▶';
    toggle.setAttribute('aria-label', '재생');

    const seek = document.createElement('input');
    seek.type = 'range';
    seek.className = 'player-seek';
    seek.min = '0';
    seek.max = '1000';
    seek.step = '1';
    seek.value = '0';

    const time = document.createElement('span');
    time.className = 'player-time';
    time.textContent = '0:00';

    toggle.addEventListener('click', () => {
        if (audio.paused) audio.play().catch(() => showToast('브라우저가 재생을 차단했습니다. 다시 눌러주세요.'));
        else audio.pause();
    });
    audio.addEventListener('play', () => {
        bindExclusivePreview(audio);
        toggle.textContent = 'Ⅱ';
        toggle.setAttribute('aria-label', '정지');
    });
    audio.addEventListener('pause', () => { toggle.textContent = '▶';
    toggle.setAttribute('aria-label', '재생'); });
    audio.addEventListener('ended', () => { toggle.textContent = '▶';
    toggle.setAttribute('aria-label', '재생'); seek.value = '0'; });
    audio.addEventListener('timeupdate', () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) seek.value = String(Math.round(audio.currentTime / audio.duration * 1000));
        time.textContent = formatTime(audio.currentTime || 0);
    });
    seek.addEventListener('input', () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = Number(seek.value) / 1000 * audio.duration;
    });

    wrap.append(toggle, seek, time, audio);
    return wrap;
}

function bindExclusivePreview(audio) {
    document.querySelectorAll('.custom-player audio').forEach(other => {
        if (other !== audio) other.pause();
    });
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
    if (!done.length) return '마스터링 전후 비교는 렌더 후 분석 / 프리뷰에서 표시됩니다.';
    const avg = done.reduce((sum, track) => sum + (track.comparison?.loudnessDelta || 0), 0) / done.length;
    const risky = done.filter(track => /높음|중간/.test(getClippingRiskText(track))).length;
    return `${done.length}곡 비교 완료 · 평균 라우드니스 변화 ${formatSigned(avg, 1)} LUFS · 주의 필요 ${risky}곡`;
}

function toggleGenreLockForSelected() {
    const track = getSelectedTrack();
    if (!track) return;
    track.genreLocked = !track.genreLocked;
    if (track.genreLocked && track.analysis) {
        track.settings = cloneSettings(makeRecommendedSettings(track.preset || 'custom', track.analysis));
        invalidateMasteredOutput(track, `${PRESET_LABELS[track.preset] || track.preset} 장르를 잠금 처리했습니다.`, true);
    }
    renderAll({ keepDetailAudio: true });
    showToast(track.genreLocked ? '선택 트랙 장르를 잠금 처리했습니다.' : '선택 트랙 장르 잠금을 해제했습니다.');
}

function getPitchEngineLabel(mode) {
    const labels = { auto: 'Auto/WASM 우선', wsola: 'WSOLA Worker', external: 'External WASM' };
    return labels[mode] || mode;
}

function addDetailRow(label, value) {
    const row = document.createElement('div');
    row.className = 'detail-row';
    const left = document.createElement('span');
    const right = document.createElement('span');
    left.textContent = label;
    right.textContent = value == null || value === '' ? '-' : String(value);
    row.append(left, right);
    el.trackDetail.appendChild(row);
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
        }
    }
    if (!state.selectedIds.size && state.selectedId) state.selectedIds.add(state.selectedId);
    if (state.featureFlags.albumMatch) state.albumProfile = computeAlbumProfile();
    renderAll();
}

function applyPresetToControlsOnly(preset) {
    state.programmatic = true;
    setControlsFromSettings(GENRE_PRESETS[preset] || GENRE_PRESETS.custom, preset, GENRE_PRESETS[preset] || GENRE_PRESETS.custom);
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
    const parts = [`마스터링 완료: ${track.outName}`, getOutputFormatLabel(track.outFormat || state.outputFormat || 'wav24'), `강도 ${track.settings.intensity ?? 100}%`];
    if (track.trimInfo && track.trimInfo.applied) parts.push(`무음 정리 앞 ${track.trimInfo.startTrimSec.toFixed(2)}초/뒤 ${track.trimInfo.endTrimSec.toFixed(2)}초`);
    if (track.albumApplied) parts.push(`앨범 통일 ${formatSigned(track.albumApplied.levelDeltaDb, 2)} dB`);
    if (track.truePeakInfo) parts.push(track.truePeakInfo.mode === 'truePeak' ? 'True Peak 보호' : 'Sample Peak 보호');
    return parts.join(' · ');
}

function createExportReport(track) {
    return {
        app: 'FoxBear AI Mastering Studio Pro v4.1',
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
        enabledFeatures: { ...state.featureFlags },
        trimInfo: track.trimInfo,
        albumApplied: track.albumApplied,
        truePeakInfo: track.truePeakInfo,
        finalizeInfo: track.finalizeInfo,
        outputTarget: { targetLufs: state.targetLufs, ceilingDb: state.ceilingDb, qualityMode: state.qualityMode },
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
    return {
        pitchSemitones: Number(transform?.pitchSemitones ?? DEFAULT_TRANSFORM.pitchSemitones),
        speedRatio: Number(transform?.speedRatio ?? DEFAULT_TRANSFORM.speedRatio),
        snapSemitone: transform?.snapSemitone !== undefined ? Boolean(transform.snapSemitone) : DEFAULT_TRANSFORM.snapSemitone
    };
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