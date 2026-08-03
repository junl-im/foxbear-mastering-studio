// FoxBear in-app mastering safety service v1.6.49 - Kakao adaptive memory governor and recovery guard.
'use strict';

(function attachFoxBearInAppMasteringSafetyService(global) {
    const VERSION = '1.6.49-kakao-adaptive-memory-governor';
    const MB = 1024 * 1024;

    function finite(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function round(value, digits = 1) {
        const scale = 10 ** digits;
        return Math.round(finite(value, 0) * scale) / scale;
    }

    function getEnvironment() {
        const navigatorRef = global.navigator || {};
        const ua = String(navigatorRef.userAgent || '');
        const kakao = /KAKAOTALK|KakaoTalk/i.test(ua);
        const restricted = kakao || /NAVER\(inapp|FBAN|FBAV|Instagram|Line\//i.test(ua);
        const mobile = restricted || /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
            || Boolean(global.matchMedia && global.matchMedia('(pointer: coarse)').matches);
        return Object.freeze({
            kakao,
            restricted,
            mobile,
            label: kakao ? '카카오톡 인앱 브라우저' : (restricted ? '인앱 브라우저' : (mobile ? '모바일 브라우저' : '일반 브라우저')),
            deviceMemoryGb: finite(navigatorRef.deviceMemory, 0),
            hardwareConcurrency: finite(navigatorRef.hardwareConcurrency, 0)
        });
    }

    function estimatePcmBytes(buffer, options = {}) {
        if (buffer) {
            return Math.max(1, finite(buffer.numberOfChannels, 1))
                * Math.max(0, finite(buffer.length, 0))
                * 4;
        }
        const durationSec = Math.max(0, finite(options.durationSec, 0));
        const sampleRate = Math.max(8000, Math.min(384000, finite(options.sampleRate, 48000)));
        const channels = Math.max(1, Math.min(8, finite(options.channels, 2)));
        return durationSec * sampleRate * channels * 4;
    }

    function classifyPressureLevel(ratio, environment, durationSec = 0) {
        const value = Math.max(0, finite(ratio, 0));
        if (value >= 1 || (environment?.kakao && durationSec >= 12 * 60)) return 'critical';
        if (value >= 0.82 || (environment?.kakao && durationSec >= 8 * 60)) return 'high';
        if (value >= 0.65 || (environment?.kakao && durationSec >= 5 * 60)) return 'elevated';
        return 'normal';
    }

    function pressureRank(level) {
        return ({ normal: 0, elevated: 1, high: 2, critical: 3 })[String(level || 'normal')] || 0;
    }

    function getPreflightWarning(level, environment, projectedPeakMb, memoryBudgetMb) {
        const ratioText = memoryBudgetMb > 0 ? `${Math.round(projectedPeakMb)}MB / ${Math.round(memoryBudgetMb)}MB` : `${Math.round(projectedPeakMb)}MB 예상`;
        if (level === 'critical') {
            return Object.freeze({
                severity: 'critical',
                title: '메모리 한도 초과 위험',
                message: `${environment.label}에서 예상 처리 메모리가 ${ratioText}입니다. Fast·경량 True Peak 경로를 자동 적용하며, 중단되면 외부 브라우저 복구를 사용하세요.`
            });
        }
        if (level === 'high') {
            return Object.freeze({
                severity: 'warning',
                title: '높은 메모리 사용 예상',
                message: `${environment.label}에서 예상 처리 메모리가 ${ratioText}입니다. 렌더 단계에 따라 품질 비용을 자동 조절합니다.`
            });
        }
        if (level === 'elevated') {
            return Object.freeze({
                severity: 'notice',
                title: '메모리 보호 준비',
                message: `${environment.label}에서 장시간 처리가 예상되어 메모리 상태를 단계별로 감시합니다.`
            });
        }
        return null;
    }

    function getMemoryBudgetMb(environment) {
        const memory = finite(environment?.deviceMemoryGb, 0);
        if (environment?.kakao) {
            if (memory > 0 && memory <= 3) return 150;
            if (memory > 0 && memory <= 4) return 180;
            return 220;
        }
        if (environment?.restricted) return memory > 0 && memory <= 4 ? 220 : 280;
        if (environment?.mobile) return memory > 0 && memory <= 4 ? 280 : 360;
        return memory > 0 ? Math.max(420, memory * 115) : 640;
    }

    function createPlan(buffer, options = {}) {
        const environment = getEnvironment();
        const pcmMb = estimatePcmBytes(buffer, options) / MB;
        const durationSec = Math.max(0, finite(buffer?.duration, options.durationSec));
        const sourceMode = String(options.qualityMode || 'balanced');
        const outputFormat = String(options.outputFormat || 'wav24');
        const transformed = Boolean(options.transformed);
        const instrumentLayer = Boolean(options.instrumentLayer);
        const qualityRecoveryEnabled = options.qualityRecoveryEnabled !== false;
        const baseCopies = 2.65;
        const transformCopies = transformed ? 0.85 : 0;
        const layerCopies = instrumentLayer ? 0.7 : 0;
        const recoveryCopies = qualityRecoveryEnabled ? 1.65 : 0;
        const encoderOverheadMb = outputFormat.startsWith('mp3') ? Math.max(28, pcmMb * 0.4) : Math.max(10, pcmMb * 0.12);
        const projectedPeakMb = pcmMb * (baseCopies + transformCopies + layerCopies + recoveryCopies) + encoderOverheadMb;
        const memoryBudgetMb = getMemoryBudgetMb(environment);
        const pressureRatio = memoryBudgetMb > 0 ? projectedPeakMb / memoryBudgetMb : 0;
        const pressureLevel = classifyPressureLevel(pressureRatio, environment, durationSec);
        const highRisk = environment.restricted && pressureRank(pressureLevel) >= pressureRank('elevated');
        const criticalRisk = environment.restricted && pressureLevel === 'critical';
        let qualityMode = sourceMode;
        if (criticalRisk || (environment.kakao && pressureLevel === 'high')) qualityMode = 'fast';
        else if (highRisk && sourceMode === 'max') qualityMode = 'balanced';
        const disableTruePeak = criticalRisk || (environment.kakao && pressureRank(pressureLevel) >= pressureRank('high'));
        const preserveFirstRenderOnNonCriticalFailure = environment.kakao && (highRisk || durationSec >= 4 * 60);
        const warning = getPreflightWarning(pressureLevel, environment, projectedPeakMb, memoryBudgetMb);
        const reasons = [];
        if (environment.kakao) reasons.push('카카오 WebView 메모리 보호');
        if (qualityMode !== sourceMode) reasons.push(`${sourceMode} → ${qualityMode}`);
        if (disableTruePeak) reasons.push('고비용 True Peak 일시 완화');
        if (preserveFirstRenderOnNonCriticalFailure) reasons.push('비치명 품질 실패 시 첫 렌더 보존');
        if (!reasons.length) reasons.push('기본 렌더 경로 유지');
        return Object.freeze({
            version: VERSION,
            ...environment,
            durationSec: round(durationSec, 2),
            pcmMb: round(pcmMb, 1),
            projectedPeakMb: round(projectedPeakMb, 1),
            memoryBudgetMb: round(memoryBudgetMb, 1),
            pressureRatio: round(pressureRatio, 2),
            pressureLevel,
            warning,
            adaptiveGovernorEnabled: environment.restricted || environment.mobile,
            recommendedOutputFormat: criticalRisk && outputFormat.startsWith('mp3') ? 'wav24' : outputFormat,
            highRisk,
            criticalRisk,
            sourceQualityMode: sourceMode,
            qualityMode,
            disableTruePeak,
            preserveFirstRenderOnNonCriticalFailure,
            reasons: Object.freeze(reasons)
        });
    }

    function getFailedGateEntries(gate) {
        return (gate?.riskFlags || gate?.items || []).filter(item => item && item.status === 'fail');
    }

    function isCriticalGateFailure(gate) {
        return getFailedGateEntries(gate).some(item => {
            const code = String(item.code || item.meta?.code || '').toUpperCase();
            const text = `${item.label || ''} ${item.detail || ''}`;
            return code === 'INVALID_OUTPUT'
                || /invalid sample|nan|infinity|비정상 샘플|클리핑 샘플|출력 샘플 무결성|재생 길이/i.test(text);
        });
    }

    function shouldPreserveFirstRender(plan, gate) {
        if (!plan?.preserveFirstRenderOnNonCriticalFailure) return false;
        if (!gate || gate.status !== 'fail') return false;
        return !isCriticalGateFailure(gate);
    }

    function isResourcePressureError(error) {
        const text = `${error?.name || ''} ${error?.code || ''} ${error?.message || error || ''}`.toLowerCase();
        return /out of memory|memory|allocation|arraybuffer|offlineaudiocontext|audiobuffer|render.*failed|renderer|context.*closed|invalidstateerror|notreadableerror|operation is insecure/.test(text);
    }

    function getErrorMessage(error, fallback = '마스터링 실패') {
        if (typeof error === 'string' && error.trim()) return error.trim();
        if (error?.message) return String(error.message);
        return String(error || fallback);
    }

    function createUserFriendlyMasteringError(error) {
        const raw = getErrorMessage(error);
        const lower = raw.toLowerCase();
        const code = String(error?.code || error?.name || '').toUpperCase();
        const environment = getEnvironment();
        let message = raw;
        let hint = '파일을 다시 불러온 뒤 WAV 24bit 출력으로 재시도해 보세요.';
        if (/MASTERING_INPUT_SILENT/.test(code)) {
            message = '입력 신호가 무음에 가깝게 감지되었습니다.';
            hint = '재생 구간과 파일 전체 볼륨을 확인하세요. 정상 재생된다면 외부 브라우저에서 다시 분석해 보세요.';
        } else if (/MASTERING_INPUT_TOO_SHORT/.test(code)) {
            message = '분석 가능한 재생 길이가 너무 짧습니다.';
            hint = '잘린 미리듣기 파일이 아닌 전체 음원을 선택해 주세요.';
        } else if (/MASTERING_INPUT_CORRUPT|MASTERING_INPUT_INVALID/.test(code)) {
            message = '디코딩된 오디오 샘플의 무결성 검사에 실패했습니다.';
            hint = '파일 재생 여부와 별개로 브라우저가 만든 PCM 데이터에 비정상 값이 감지됐습니다. Chrome 또는 Safari에서 다시 시도하세요.';
        } else if (isResourcePressureError(error)) {
            message = environment.kakao ? '카카오 브라우저의 처리 메모리 제한으로 렌더링이 중단되었습니다.' : '브라우저 메모리가 부족해 렌더링을 중단했습니다.';
            hint = environment.restricted ? '음원 손상으로 단정할 수 없습니다. 카카오톡 우측 상단 메뉴에서 Chrome/Safari로 열거나 Mobile Safe·Fast·WAV 24bit로 재시도하세요.' : 'Mobile Safe 모드, Fast 엔진, WAV 24bit 출력으로 낮춘 뒤 다시 시도하세요.';
        } else if (code === 'FOXBEAR_WEB_AUDIO_DECODE_REJECTED' || error?.mediaPlayable) {
            message = '파일은 재생되지만 이 브라우저의 분석 디코더가 PCM 변환을 거부했습니다.';
            hint = environment.kakao ? '곡 오류가 아니라 카카오 WebView 코덱/메모리 제한일 수 있습니다. 우측 상단 메뉴에서 Chrome 또는 기본 브라우저로 열어 다시 시도하세요.' : 'Chrome, Edge 또는 Safari에서 다시 시도하거나 WAV/MP3로 변환해 주세요.';
        } else if (/FOXBEAR_AUDIO_DECODE_FAILED/.test(code) || /decode|decoding|codec|unsupported format|not supported/.test(lower)) {
            message = '브라우저가 오디오를 분석용 PCM으로 디코딩하지 못했습니다.';
            hint = '파일 손상뿐 아니라 브라우저 코덱 제한일 수 있습니다. WAV 또는 MP3로 변환하거나 다른 브라우저에서 다시 시도하세요.';
        } else if (/worker|timeout|시간이 초과|script/.test(lower)) {
            message = '브라우저 워커 처리 시간이 초과되었거나 보안 정책에 막혔습니다.';
            hint = environment.kakao ? '카카오톡 우측 상단 메뉴에서 외부 브라우저로 연 뒤 WAV 24bit로 재시도하세요.' : '페이지를 새로고침하고 WAV 24bit 출력으로 재시도하세요. 배포 환경의 CSP 설정도 확인이 필요합니다.';
        } else if (/mp3/.test(lower)) {
            message = 'MP3 인코딩 단계에서 문제가 발생했습니다.';
            hint = '앱은 가능한 경우 WAV로 자동 저장합니다. 계속 실패하면 출력 포맷을 WAV 24bit로 바꾸세요.';
        }
        return Object.freeze({ message, report: `마스터링 실패: ${message} · 해결 제안: ${hint} · 원문: ${raw}` });
    }

    global.FoxBearInAppMasteringSafetyService = Object.freeze({
        version: VERSION,
        getEnvironment,
        estimatePcmBytes,
        classifyPressureLevel,
        pressureRank,
        createPlan,
        isCriticalGateFailure,
        shouldPreserveFirstRender,
        isResourcePressureError,
        createUserFriendlyMasteringError
    });
})(typeof window !== 'undefined' ? window : globalThis);
