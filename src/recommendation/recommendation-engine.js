// FoxBear AI Mastering Studio Pro v1.6.80 - recommendation engine service
'use strict';

(function attachFoxBearRecommendationEngine(global) {
    function createRecommendationEngine(deps = {}) {
        const clamp = typeof deps.clamp === 'function' ? deps.clamp : (value, min, max) => Math.min(max, Math.max(min, value));
        const clamp01 = typeof deps.clamp01 === 'function' ? deps.clamp01 : value => clamp(Number(value || 0), 0, 1);
        const normalizeLogFrequency = typeof deps.normalizeLogFrequency === 'function' ? deps.normalizeLogFrequency : ((value, min, max) => {
            const safeValue = Math.max(1, Number(value || 1));
            const lo = Math.log(Math.max(1, Number(min || 1)));
            const hi = Math.log(Math.max(Number(max || min || 2), Number(min || 1) + 1));
            return clamp((Math.log(safeValue) - lo) / Math.max(0.0001, hi - lo), 0, 1);
        });
        const estimateMobileSpeakerRisk = typeof deps.estimateMobileSpeakerRisk === 'function' ? deps.estimateMobileSpeakerRisk : (() => ({ risk: 0 }));
        const GENRE_PRESETS = deps.GENRE_PRESETS || {};
        const PRESET_LABELS = deps.PRESET_LABELS || {};
        const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
        const unit = (value, fallback = 0) => clamp(finite(value, fallback), 0, 1);

        function recommendPreset(fileName, analysis) {
            const name = String(fileName || '').toLowerCase();
            analysis = analysis && typeof analysis === 'object' ? analysis : {};
            const scores = {};
            Object.keys(GENRE_PRESETS).forEach(key => { if (key !== 'custom') scores[key] = 0; });
        
            if (analysis.silence) return { preset: 'custom', confidence: 0, reason: '무음 또는 매우 작은 신호로 분석 보류', alternatives: [] };
        
            const features = extractGenreFeatures(analysis);
            const { bright, wide, punch, soft, dark, metallic, loud, crest, bass, lowMid, mid, high, transient, sub, presence, air, centroidNorm, rolloffNorm, spatialRisk, mobileRisk } = features;
        
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
                    Math.abs(loud - p.l) * 0.48 +
                    Math.abs(centroidNorm - p.b) * 0.28 +
                    Math.abs(high - Math.max(0.12, p.b * 0.42)) * 0.20;
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
            scores.dance += presence * 0.10 + rolloffNorm * 0.10;
            scores.trap += sub * 0.20 + Math.max(0, bass - lowMid) * 0.18;
            scores.rnb += lowMid * 0.12 + Math.max(0, 0.20 - air) * 0.10;
            scores.acoustic -= Math.max(0, air - 0.12) * 0.32;
            scores.spatial -= spatialRisk * 0.52;
            scores.cinematic -= spatialRisk > 0.45 ? 0.20 : 0;
            scores.futurebass += (bass > 0.24 && high > 0.18 && wide > 0.58 && punch < 0.62 && spatialRisk < 0.45) ? 0.18 : -0.82;
            scores.house += (transient > 0.32 && punch > 0.48 && bass > 0.18) ? 0.16 : -0.26;
            scores.synthpop += (high > 0.20 && metallic > 0.44 && punch < 0.58) ? 0.10 : -0.22;
            if (mobileRisk > 0.34) {
                scores.kballad += soft > 0.46 ? 0.18 : 0.06;
                scores.ballad += soft > 0.42 ? 0.16 : 0.05;
                scores.rnb += lowMid > 0.25 ? 0.10 : 0.04;
                scores.futurebass -= mobileRisk * 0.55;
                scores.edm -= mobileRisk * 0.38;
                scores.house -= mobileRisk * 0.24;
                scores.spatial -= mobileRisk * 0.42;
                scores.punch -= mobileRisk * 0.20;
            }
        
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
                spatial: wide > 0.58 && high > 0.20 && punch < 0.58 && spatialRisk < 0.50,
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
            const vocalLikelyForGenre = (mid > 0.30 || lowMid > 0.27) && punch < 0.64 && high < 0.38;
            const sibilantVocalRisk = vocalLikelyForGenre && metallic > 0.54 && presence > 0.16;
            if (vocalLikelyForGenre && !explicitElectronic) {
                scores.pop += 0.24;
                scores.kpop += bright > 0.52 ? 0.22 : 0.08;
                scores.ballad += soft > 0.46 ? 0.22 : 0.08;
                scores.kballad += soft > 0.48 ? 0.20 : 0.06;
                scores.rnb += lowMid > 0.25 ? 0.18 : 0.05;
                scores.futurebass -= 0.72;
                scores.synthpop -= 0.42;
                scores.edm -= 0.36;
                scores.house -= 0.20;
                scores.spatial -= 0.34;
            }
            if (sibilantVocalRisk && !explicit.futurebass && !explicit.synthpop) {
                scores.futurebass -= 0.36;
                scores.synthpop -= 0.34;
                scores.edm -= 0.18;
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
            const alternatives = sorted.slice(0, 4).map(([preset, score], index) => ({
                preset,
                label: PRESET_LABELS[preset] || preset,
                score: Number(score.toFixed(2)),
                rank: index + 1,
                reason: makeCandidateReason(preset, features, explicit[preset], gatePass[preset], index === 0),
                caution: makeCandidateCaution(preset, features, explicit[preset], gatePass[preset])
            }));
            const reason = makeGenreReason(best[0], features, alternatives, explicit[best[0]] ? '파일명 힌트 반영' : '오디오 특징 기준');
            const explanation = makeRecommendationExplanation(best[0], features, alternatives, explicit[best[0]], gatePass[best[0]], confidence);
            return { preset: best[0], confidence, reason, alternatives, explanation };
        }
        
        function safeRecommendPreset(fileName, analysis, source = 'track') {
            try {
                const recommendation = recommendPreset(fileName || '', analysis || {});
                if (recommendation && recommendation.preset && GENRE_PRESETS[recommendation.preset]) return recommendation;
                throw new Error('추천 결과가 유효하지 않습니다.');
            } catch (error) {
                console.warn(`[FoxBear] ${source} recommendation fallback`, error);
                return {
                    preset: 'pop',
                    confidence: 42,
                    reason: '추천 엔진 보호 모드 · 추천 계산 중 예외가 발생해 안전한 Pop 기준값으로 임시 적용했습니다.',
                    alternatives: [
                        { preset: 'pop', label: PRESET_LABELS.pop || 'Pop', score: 0, reason: '안전한 기본값', caution: '' },
                        { preset: 'kpop', label: PRESET_LABELS.kpop || 'K-Pop', score: -0.2, reason: '보컬 중심 대안', caution: '' },
                        { preset: 'rnb', label: PRESET_LABELS.rnb || 'R&B', score: -0.4, reason: '저역/로우미드 대안', caution: '' }
                    ],
                    explanation: { summary: '추천 엔진 보호 모드', signals: ['안전한 Pop 기본값'], cautions: ['추천 계산 예외 발생'], chips: [{ text: '보호 모드', tone: 'warn' }] }
                };
            }
        }
        
        function extractGenreFeatures(analysis) {
            const source = analysis && typeof analysis === 'object' ? analysis : {};
            const bright = unit(source.brightness, 0);
            const wide = unit(source.stereoWidth, 0);
            const crest = finite(source.crest, 3);
            const punch = unit((crest - 2.4) / 7.5, 0);
            const soft = 1 - punch;
            const dark = 1 - bright;
            const metallic = unit(source.metallicHint, 0);
            const loudnessHint = finite(source.loudnessHint ?? source.loudnessIntegrated, -18);
            const loud = unit((loudnessHint + 32) / 22, 0.64);
            const bands = source.spectrumBands && typeof source.spectrumBands === 'object' ? source.spectrumBands : {};
            const sub = unit(bands.sub ?? source.subRatio, 0.05);
            const bass = unit(source.bassRatio, 0.25);
            const lowMid = unit(source.lowMidRatio, 0.25);
            const mid = unit(source.midRatio, 0.25);
            const high = unit(source.highRatio, 0.25);
            const presence = unit(bands.presence ?? source.presenceRatio, high * 0.45);
            const air = unit(bands.air ?? source.airRatio, high * 0.20);
            const transient = unit(source.transientDensity, 0);
            const centroidHz = finite(source.spectralCentroidHz, 0);
            const rolloffHz = finite(source.spectralRolloffHz, 0);
            const centroidNorm = centroidHz > 0 ? unit(normalizeLogFrequency(centroidHz, 380, 5600), bright) : bright;
            const rolloffNorm = rolloffHz > 0 ? unit(normalizeLogFrequency(rolloffHz, 1800, 15000), bright) : bright;
            const spatialRisk = unit(source.spatialExcessRisk, 0);
            const estimatedMobileRisk = estimateMobileSpeakerRisk(source)?.risk;
            const mobileRisk = unit(source.mobileSpeakerRisk ?? estimatedMobileRisk, 0);
            return { bright, wide, punch, soft, dark, metallic, loud, crest, bass, lowMid, mid, high, transient, sub, presence, air, centroidNorm, rolloffNorm, spatialRisk, mobileRisk };
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
            if (Number.isFinite(features.centroidNorm)) parts.push(`FFT중심 ${Math.round(features.centroidNorm * 100)}%`);
            if (features.spatialRisk > 0.28) parts.push(`과공간 위험 ${Math.round(features.spatialRisk * 100)}%`);
            if (features.mobileRisk > 0.30) parts.push(`폰울림 위험 ${Math.round(features.mobileRisk * 100)}%`);
            const top = alternatives.map(item => `${item.label} ${item.score}`).join(' / ');
            return `${PRESET_LABELS[preset] || preset} 판단 · ${mode} · ${parts.join(' · ')} · 후보 ${top}`;
        }
        
        function getPresetFamily(preset) {
            if (['pop', 'kpop', 'globalpop', 'citypop'].includes(preset)) return 'pop';
            if (['ballad', 'kballad', 'acoustic', 'rnb'].includes(preset)) return 'vocal';
            if (['hiphop', 'trap', 'drill', 'boombap'].includes(preset)) return 'lowPunch';
            if (['dance', 'edm', 'house', 'futurebass', 'synthpop'].includes(preset)) return 'electronic';
            if (['spatial', 'cinematic'].includes(preset)) return 'wide';
            if (['lofi', 'tape'].includes(preset)) return 'warm';
            if (['rock', 'punch'].includes(preset)) return 'punch';
            return 'general';
        }
        
        function makeCandidateReason(preset, features = {}, explicit = false, gatePass = false, winner = false) {
            const family = getPresetFamily(preset);
            const signals = [];
            if (explicit) signals.push('파일명 힌트 일치');
            if (winner) signals.push('종합 점수 1순위');
            if (family === 'pop') {
                if (features.bright >= 0.48) signals.push('보컬 선명도 적합');
                if (features.punch >= 0.34 && features.punch <= 0.62) signals.push('펀치 균형');
                if (features.wide <= 0.62) signals.push('공간감 안전');
            } else if (family === 'vocal') {
                if (features.soft >= 0.46) signals.push('부드러운 다이내믹');
                if (features.lowMid >= 0.20) signals.push('목소리 바디감');
                if (features.punch <= 0.48) signals.push('과한 펀치 아님');
            } else if (family === 'lowPunch') {
                if (features.bass >= 0.18) signals.push('저역 존재감');
                if (features.punch >= 0.48) signals.push('킥/스네어 펀치');
                if (features.wide <= 0.45) signals.push('중앙 에너지 안정');
            } else if (family === 'electronic') {
                if (features.bright >= 0.50) signals.push('밝은 톤');
                if (features.punch >= 0.48) signals.push('리듬 트랜지언트');
                if (features.bass >= 0.18) signals.push('저역 구동감');
                if (gatePass) signals.push('세부 장르 조건 통과');
            } else if (family === 'wide') {
                if (features.wide >= 0.48) signals.push('넓은 스테레오');
                if (features.soft >= 0.40) signals.push('공간형 다이내믹');
            } else if (family === 'warm') {
                if (features.dark >= 0.52) signals.push('따뜻한 톤');
                if (features.metallic <= 0.52) signals.push('금속성 낮음');
            } else if (family === 'punch') {
                if (features.punch >= 0.56) signals.push('강한 트랜지언트');
                if (features.crest >= 5.5) signals.push('다이내믹 여유');
            }
            if (!signals.length) signals.push('전체 FFT/라우드니스 균형 기준');
            return signals.slice(0, 3).join(' · ');
        }
        
        function makeCandidateCaution(preset, features = {}, explicit = false, gatePass = false) {
            const family = getPresetFamily(preset);
            const cautions = [];
            if (!explicit && ['futurebass', 'house', 'synthpop', 'citypop', 'drill', 'boombap', 'globalpop', 'lofi', 'acoustic', 'cinematic', 'spatial', 'tape', 'punch'].includes(preset) && !gatePass) {
                cautions.push('세부 장르 조건 일부 부족');
            }
            if (family === 'electronic' && features.mobileRisk > 0.34) cautions.push('폰 울림 위험 감점');
            if (family === 'electronic' && features.metallic > 0.56 && features.presence > 0.14) cautions.push('보컬 쇳소리 위험 감점');
            if (family === 'wide' && features.spatialRisk > 0.34) cautions.push('과공간 위험 감점');
            if (family === 'lowPunch' && features.lowMid > 0.34) cautions.push('로우미드 번짐 확인');
            if (features.loud > 0.78) cautions.push('이미 큰 음압');
            return cautions.slice(0, 2).join(' · ');
        }
        
        function makeRecommendationExplanation(preset, features = {}, alternatives = [], explicit = false, gatePass = false, confidence = 0) {
            const signals = [];
            const cautions = [];
            signals.push(makeCandidateReason(preset, features, explicit, gatePass, true));
            if (features.centroidNorm >= 0.55) signals.push(`FFT 중심 높음 ${Math.round(features.centroidNorm * 100)}%`);
            else if (features.centroidNorm <= 0.38) signals.push(`어두운 톤 ${Math.round((1 - features.centroidNorm) * 100)}%`);
            if (features.bass >= 0.23) signals.push(`저역 ${Math.round(features.bass * 100)}%`);
            if (features.wide >= 0.52) signals.push(`스테레오 폭 ${Math.round(features.wide * 100)}%`);
            if (features.spatialRisk > 0.30) cautions.push(`과공간 위험 ${Math.round(features.spatialRisk * 100)}%`);
            if (features.mobileRisk > 0.30) cautions.push(`폰 울림 위험 ${Math.round(features.mobileRisk * 100)}%`);
            if (features.metallic > 0.55) cautions.push(`보컬/고역 금속성 ${Math.round(features.metallic * 100)}%`);
            const top = alternatives[0];
            const second = alternatives[1];
            if (top && second && Number.isFinite(top.score) && Number.isFinite(second.score)) {
                const delta = Math.max(0, top.score - second.score);
                if (delta < 0.35) cautions.push('1·2순위 점수 차이 작음');
                else signals.push(`후보 격차 ${delta.toFixed(2)}`);
            }
            const chips = [];
            signals.slice(0, 3).forEach(text => chips.push({ text, tone: 'cyan' }));
            cautions.slice(0, 3).forEach(text => chips.push({ text, tone: 'warn' }));
            if (!chips.length) chips.push({ text: '안전한 기본 추천', tone: 'neutral' });
            const summaryParts = [];
            if (confidence) summaryParts.push(`신뢰도 ${confidence}%`);
            if (signals[0]) summaryParts.push(signals[0]);
            if (cautions[0]) summaryParts.push(`감점: ${cautions[0]}`);
            return {
                summary: summaryParts.join(' · '),
                signals: Array.from(new Set(signals)).slice(0, 5),
                cautions: Array.from(new Set(cautions)).slice(0, 4),
                chips,
                primarySignal: signals[0] || '',
                primaryCaution: cautions[0] || '',
                primaryTone: cautions.length ? 'warn' : 'cyan'
            };
        }
        
        function buildRecommendationExplainability(track) {
            if (!track || !track.analysis) {
                return { summary: '', signals: [], cautions: [], chips: [], primarySignal: '', primaryCaution: '', primaryTone: 'neutral' };
            }
            if (track.genreExplanation && Array.isArray(track.genreExplanation.chips)) {
                return {
                    summary: track.genreExplanation.summary || '',
                    signals: track.genreExplanation.signals || [],
                    cautions: track.genreExplanation.cautions || [],
                    chips: track.genreExplanation.chips || [],
                    primarySignal: track.genreExplanation.primarySignal || track.genreExplanation.signals?.[0] || '',
                    primaryCaution: track.genreExplanation.primaryCaution || track.genreExplanation.cautions?.[0] || '',
                    primaryTone: track.genreExplanation.primaryTone || ((track.genreExplanation.cautions || []).length ? 'warn' : 'cyan')
                };
            }
            const features = extractGenreFeatures(track.analysis || {});
            const alternatives = track.genreAlternatives || [];
            return makeRecommendationExplanation(track.recommendedPreset || track.preset || 'pop', features, alternatives, false, true, track.confidence || 0);
        }
        
        function buildCandidateExplainText(track, candidate) {
            if (!candidate) return '';
            if (candidate.manual) return '원본선택: AI 프리셋을 적용하지 않고 원음 기준에서 직접 조절합니다.';
            const alternatives = track?.genreAlternatives || [];
            const info = alternatives.find(item => item.preset === candidate.preset) || null;
            const bestScore = Number(alternatives[0]?.score ?? info?.score ?? 0);
            const score = Number(info?.score ?? bestScore);
            const delta = Number.isFinite(bestScore) && Number.isFinite(score) ? Math.max(0, bestScore - score) : 0;
            const reason = info?.reason || (candidate.recommended ? '종합 점수 1순위' : '대안 후보');
            const caution = info?.caution ? ` · 감점: ${info.caution}` : '';
            const deltaText = candidate.recommended ? '최상위 후보' : `1순위 대비 -${delta.toFixed(2)}`;
            return `${deltaText} · ${reason}${caution}`;
        }

        return {
            recommendPreset,
            safeRecommendPreset,
            extractGenreFeatures,
            keywordHit,
            makeGenreReason,
            getPresetFamily,
            makeCandidateReason,
            makeCandidateCaution,
            makeRecommendationExplanation,
            buildRecommendationExplainability,
            buildCandidateExplainText
        };
    }

    global.FoxBearRecommendationEngine = { createRecommendationEngine };
})(typeof window !== 'undefined' ? window : globalThis);
