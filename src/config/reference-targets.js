// FoxBear AI Mastering Studio Pro v1.5.98 - extracted configuration module
'use strict';

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
