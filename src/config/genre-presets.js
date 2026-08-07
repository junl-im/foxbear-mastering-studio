// FoxBear AI Mastering Studio Pro v1.6.76 - extracted configuration module
'use strict';

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
        label: '모바일 번역/공진 보정',
        short: '폰 스피커와 이어폰에서 저역 번짐, 박스톤, 2~5kHz 공진 울림을 줄이도록 보정합니다.'
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
