// FoxBear AI Mastering Studio Pro v1.4.21 - playback link service
// Stage25: keeps playback orchestration automatic while removing intrusive visible status chips.
'use strict';

(function attachFoxBearPlaybackLinkService(global) {
    const SERVICE_VERSION = '1.4.24-bulk-import-hud';
    const DEBUG_VISIBLE_CHIPS = false;
    const EVENT_NAME = 'foxbear:playback-link-change';
    const ORCHESTRATION_EVENT_NAME = 'foxbear:playback-orchestration-change';
    const AUDIO_SELECTOR = '.custom-player audio, .ab-switch-deck audio, .difference-preview-player audio, audio[data-preview-system]';
    const PLAYER_SHELL_SELECTOR = '.dock-integrated-player, .custom-player, .ab-switch-deck, .difference-preview-player, .realtime-player-card';
    const SYNC_PAIR_ROLE_RE = /^(?:difference-|waveform-compare-sync-)/;
    const registry = new WeakMap();
    const registeredAudios = new Set();
    let lastSnapshot = null;
    let lastOrchestration = null;
    let domAuditInstalled = false;
    let uid = 0;

    function asNumber(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function round(value, digits = 2) {
        const factor = Math.pow(10, digits);
        return Math.round(asNumber(value, 0) * factor) / factor;
    }

    function formatTime(seconds = 0) {
        const safe = Math.max(0, asNumber(seconds, 0));
        const min = Math.floor(safe / 60);
        const sec = Math.floor(safe % 60);
        return `${min}:${String(sec).padStart(2, '0')}`;
    }

    function normalizeRole(role) {
        const value = String(role || '').trim();
        if (value) return value;
        return 'linked-preview';
    }

    function roleLabel(role) {
        const labels = {
            dock: 'Dock',
            'bottom-dock': 'Dock',
            'mastering-settings-preview': '설정 미리듣기',
            'inline-preview': '상세 미리듣기',
            'ab-switch-original': 'A/B 원본',
            'ab-switch-mastered': 'A/B 마스터',
            'difference-original': '차이 원본',
            'difference-compare': '차이 비교',
            'waveform-compare-original': '비교창 원음',
            'waveform-compare-mastered': '비교창 마스터',
            'waveform-compare-master-preview': '비교창 하이라이트'
        };
        return labels[role] || role.replace(/-/g, ' ');
    }

    function inferRole(audio) {
        if (!audio) return 'linked-preview';
        const shell = findShell(audio);
        const explicit = audio.dataset?.playbackRole || audio.dataset?.previewSystem || shell?.dataset?.playerRole;
        if (explicit) return explicit === 'mastering-settings' ? 'mastering-settings-preview' : explicit;
        if (shell?.classList?.contains('bottom-custom-player')) return 'bottom-dock';
        if (shell?.classList?.contains('ab-switch-deck')) return 'ab-switch-original';
        if (shell?.classList?.contains('difference-preview-player')) return 'difference-compare';
        return 'inline-preview';
    }

    function findShell(audio) {
        return audio?.closest?.(PLAYER_SHELL_SELECTOR) || audio?.parentElement || null;
    }

    function inferGroupId(audio, role, shell) {
        if (audio?.dataset?.playbackGroup) return audio.dataset.playbackGroup;
        if (shell?.dataset?.playbackGroup) return shell.dataset.playbackGroup;
        if (SYNC_PAIR_ROLE_RE.test(role)) {
            if (!shell.dataset.playbackGroup) shell.dataset.playbackGroup = `sync-${++uid}`;
            return shell.dataset.playbackGroup;
        }
        return '';
    }

    function inferGroupPolicy(role, groupId) {
        if (groupId && SYNC_PAIR_ROLE_RE.test(role)) return 'sync-pair';
        return 'exclusive';
    }

    function isSyncPair(meta) {
        return Boolean(meta && meta.groupId && meta.groupPolicy === 'sync-pair');
    }

    function ensureShellChip(shell) {
        if (!shell) return null;
        const existing = shell.querySelector?.(':scope > .playback-link-chip');
        if (!DEBUG_VISIBLE_CHIPS || shell.dataset.playbackLinkChip === 'false') {
            if (existing) existing.remove();
            return null;
        }
        let chip = existing;
        if (!chip) {
            chip = document.createElement('span');
            chip.className = 'playback-link-chip';
            chip.textContent = '자동 연동';
            chip.setAttribute('aria-label', '플레이어 자동 연동 상태');
            shell.appendChild(chip);
        }
        return chip;
    }

    function setShellState(shell, state, text) {
        if (!shell) return;
        shell.classList.toggle('playback-link-active', state === 'active');
        shell.classList.toggle('playback-link-paused', state === 'paused');
        shell.classList.toggle('playback-link-waiting', state === 'waiting');
        shell.classList.toggle('playback-link-orchestrated', state === 'orchestrated');
        shell.classList.toggle('playback-link-conflict', state === 'conflict');
        shell.dataset.playbackLinkState = state;
        const chip = ensureShellChip(shell);
        if (chip) {
            chip.dataset.playbackLinkState = state;
            chip.textContent = text || (
                state === 'active' ? '연동 재생' :
                state === 'orchestrated' ? '연동 전환' :
                state === 'conflict' ? '충돌 정리' :
                state === 'paused' ? '연동 정지' : '연동 대기'
            );
        }
    }

    function snapshotFor(audio, meta = {}) {
        const role = normalizeRole(meta.role || inferRole(audio));
        const currentTime = round(audio?.currentTime || 0, 3);
        const duration = round(Number.isFinite(audio?.duration) ? audio.duration : meta.durationSec, 3);
        const offset = asNumber(audio?.dataset?.absoluteStartSec ?? meta.absoluteStartSec, 0);
        return Object.freeze({
            serviceVersion: SERVICE_VERSION,
            id: meta.id || audio?.dataset?.playbackLinkId || '',
            role,
            label: meta.label || roleLabel(role),
            groupId: meta.groupId || '',
            groupPolicy: meta.groupPolicy || 'exclusive',
            mode: meta.mode || audio?.dataset?.waveformMode || audio?.closest?.('[data-waveform-mode]')?.dataset?.waveformMode || '',
            trackId: meta.trackId || audio?.dataset?.trackId || '',
            currentTime,
            absoluteSec: round(offset + currentTime, 3),
            durationSec: duration,
            playing: Boolean(audio && !audio.paused && !audio.ended),
            readyState: audio?.readyState || 0,
            at: Date.now()
        });
    }

    function samePlayableSyncGroup(activeMeta, otherMeta) {
        return isSyncPair(activeMeta) && isSyncPair(otherMeta) && activeMeta.groupId === otherMeta.groupId;
    }

    function pauseAudioSafely(audio, reason) {
        if (!audio || audio.paused || audio.ended) return false;
        try {
            audio.pause();
            audio.dataset.playbackOrchestratedPause = reason || 'exclusive-playback';
            return true;
        } catch (error) {
            return false;
        }
    }

    function buildPlayingList() {
        return Array.from(registeredAudios)
            .filter(audio => audio && !audio.paused && !audio.ended)
            .map(audio => snapshotFor(audio, registry.get(audio) || {}));
    }

    function dispatchOrchestration(detail) {
        lastOrchestration = Object.freeze(Object.assign({ at: Date.now(), serviceVersion: SERVICE_VERSION }, detail));
        try {
            global.dispatchEvent(new CustomEvent(ORCHESTRATION_EVENT_NAME, { detail: lastOrchestration }));
        } catch (error) {}
        return lastOrchestration;
    }

    function enforceOrchestration(activeAudio, reason = 'play') {
        const activeMeta = registry.get(activeAudio) || {};
        const paused = [];
        registeredAudios.forEach(other => {
            if (!other || other === activeAudio) return;
            const otherMeta = registry.get(other) || {};
            if (samePlayableSyncGroup(activeMeta, otherMeta)) return;
            if (pauseAudioSafely(other, reason)) {
                paused.push(snapshotFor(other, otherMeta));
                const shell = otherMeta.shell || findShell(other);
                setShellState(shell, 'orchestrated', `연동 전환 · ${roleLabel(activeMeta.role || inferRole(activeAudio))}`);
            }
        });
        const activeSnapshot = snapshotFor(activeAudio, activeMeta);
        const playing = buildPlayingList();
        const conflict = playing.filter(item => item.id !== activeSnapshot.id && !(item.groupId && item.groupId === activeSnapshot.groupId && item.groupPolicy === 'sync-pair')).length;
        const detail = dispatchOrchestration({ reason, active: activeSnapshot, paused, playing, conflictCount: conflict });
        if (conflict > 0) flagConflicts(activeAudio, playing);
        return detail;
    }

    function flagConflicts(activeAudio, playing = buildPlayingList()) {
        const activeMeta = registry.get(activeAudio) || {};
        registeredAudios.forEach(audio => {
            if (!audio || audio === activeAudio || audio.paused || audio.ended) return;
            const meta = registry.get(audio) || {};
            if (samePlayableSyncGroup(activeMeta, meta)) return;
            setShellState(meta.shell || findShell(audio), 'conflict', '충돌 감지');
        });
        return playing;
    }

    function markAllInactive(activeAudio) {
        document.querySelectorAll('[data-playback-link-state="active"]').forEach(shell => {
            const audio = shell.querySelector?.('audio');
            if (audio && audio === activeAudio) return;
            setShellState(shell, 'paused', '연동 대기');
        });
    }

    function publish(audio, reason = 'update') {
        const meta = registry.get(audio) || {};
        const snapshot = snapshotFor(audio, meta);
        lastSnapshot = snapshot;
        const shell = meta.shell || findShell(audio);
        if (snapshot.playing) {
            markAllInactive(audio);
            const groupText = snapshot.groupPolicy === 'sync-pair' ? '연동 그룹 재생' : '연동 재생';
            setShellState(shell, 'active', `${groupText} · ${formatTime(snapshot.absoluteSec)}`);
        } else {
            setShellState(shell, 'paused', `연동 정지 · ${formatTime(snapshot.absoluteSec)}`);
        }
        try {
            global.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { reason, snapshot, orchestration: lastOrchestration } }));
        } catch (error) {}
        return snapshot;
    }

    function bindAudio(audio, meta) {
        if (!audio || audio.dataset.playbackLinkBound === 'true') return;
        audio.dataset.playbackLinkBound = 'true';
        audio.addEventListener('play', () => {
            enforceOrchestration(audio, 'play');
            publish(audio, 'play');
        });
        audio.addEventListener('pause', () => publish(audio, 'pause'));
        audio.addEventListener('ended', () => publish(audio, 'ended'));
        audio.addEventListener('timeupdate', () => {
            const snapshot = registry.get(audio);
            if (snapshot?.lastUiUpdate && Date.now() - snapshot.lastUiUpdate < 400) return;
            if (snapshot) snapshot.lastUiUpdate = Date.now();
            publish(audio, 'timeupdate');
        });
        audio.addEventListener('loadedmetadata', () => publish(audio, 'loadedmetadata'));
    }

    function registerAudio(audio, meta = {}) {
        if (!audio || typeof audio.addEventListener !== 'function') return null;
        const shell = meta.shell || findShell(audio);
        const existing = registry.get(audio) || {};
        const id = existing.id || audio.dataset.playbackLinkId || `playback-${++uid}`;
        const role = normalizeRole(meta.role || existing.role || inferRole(audio));
        const groupId = meta.groupId || existing.groupId || inferGroupId(audio, role, shell);
        const groupPolicy = meta.groupPolicy || existing.groupPolicy || inferGroupPolicy(role, groupId);
        const next = Object.assign({}, existing, meta, {
            id,
            shell,
            role,
            groupId,
            groupPolicy,
            lastUiUpdate: existing.lastUiUpdate || 0
        });
        registry.set(audio, next);
        registeredAudios.add(audio);
        audio.dataset.playbackLinkId = id;
        audio.dataset.playbackRole = next.role;
        audio.dataset.playbackGroupPolicy = next.groupPolicy;
        if (next.groupId) audio.dataset.playbackGroup = next.groupId;
        if (next.trackId) audio.dataset.trackId = next.trackId;
        if (Number.isFinite(Number(next.absoluteStartSec))) audio.dataset.absoluteStartSec = String(Number(next.absoluteStartSec));
        if (shell) {
            shell.classList.add('playback-linked-player');
            shell.dataset.playbackLinked = 'true';
            shell.dataset.playbackRole = next.role;
            shell.dataset.playbackGroupPolicy = next.groupPolicy;
            if (next.groupId) shell.dataset.playbackGroup = next.groupId;
            setShellState(shell, audio.paused ? 'paused' : 'active', audio.paused ? '연동 대기' : `연동 재생 · ${formatTime(audio.currentTime || 0)}`);
        }
        bindAudio(audio, next);
        return publish(audio, 'register');
    }

    function inferAndRegister(audio) {
        if (!audio || registry.has(audio)) return registry.get(audio) || null;
        return registerAudio(audio, { role: inferRole(audio), shell: findShell(audio) });
    }

    function scan(root = document) {
        const found = Array.from(root.querySelectorAll ? root.querySelectorAll(AUDIO_SELECTOR) : []);
        found.forEach(inferAndRegister);
        return found.length;
    }

    function installDomAudit(root = document) {
        if (domAuditInstalled || !root || !root.querySelectorAll) return false;
        domAuditInstalled = true;
        scan(root);
        if (global.MutationObserver) {
            const observer = new MutationObserver(mutations => {
                let needsScan = false;
                mutations.forEach(mutation => {
                    mutation.addedNodes?.forEach(node => {
                        if (node?.nodeType === 1 && (node.matches?.(AUDIO_SELECTOR) || node.querySelector?.(AUDIO_SELECTOR))) needsScan = true;
                    });
                });
                if (needsScan) scan(root);
            });
            observer.observe(root.documentElement || root.body || root, { childList: true, subtree: true });
        }
        return true;
    }

    function pauseAllExcept(activeAudio, reason = 'manual-orchestration') {
        return enforceOrchestration(activeAudio, reason);
    }

    function pauseAll(reason = 'pause-all') {
        const paused = [];
        registeredAudios.forEach(audio => {
            const meta = registry.get(audio) || {};
            if (pauseAudioSafely(audio, reason)) {
                paused.push(snapshotFor(audio, meta));
                setShellState(meta.shell || findShell(audio), 'paused', '전체 정지');
            }
        });
        return dispatchOrchestration({ reason, active: null, paused, playing: buildPlayingList(), conflictCount: 0 });
    }

    function getSnapshot() {
        return lastSnapshot;
    }

    function getOrchestrationSnapshot() {
        return lastOrchestration;
    }

    function isRegistered(audio) {
        return registry.has(audio);
    }

    global.FoxBearPlaybackLinkService = Object.freeze({
        SERVICE_VERSION,
        EVENT_NAME,
        ORCHESTRATION_EVENT_NAME,
        AUDIO_SELECTOR,
        DEBUG_VISIBLE_CHIPS,
        registerAudio,
        inferAndRegister,
        installDomAudit,
        scan,
        pauseAllExcept,
        pauseAll,
        enforceOrchestration,
        getSnapshot,
        getOrchestrationSnapshot,
        isRegistered,
        formatTime
    });
})(window);
