// FoxBear AI Mastering Studio Pro v1.4.0 - playback link service
// Stage22: keeps Dock, settings preview, comparison, and legacy inline players visibly connected.
'use strict';

(function attachFoxBearPlaybackLinkService(global) {
    const SERVICE_VERSION = '1.4.0-stage22-playback-link-audit';
    const EVENT_NAME = 'foxbear:playback-link-change';
    const AUDIO_SELECTOR = '.custom-player audio, .ab-switch-deck audio, .difference-preview-player audio, audio[data-preview-system]';
    const PLAYER_SHELL_SELECTOR = '.dock-integrated-player, .custom-player, .ab-switch-deck, .difference-preview-player, .realtime-player-card';
    const registry = new WeakMap();
    let lastSnapshot = null;
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

    function ensureShellChip(shell) {
        if (!shell || shell.dataset.playbackLinkChip === 'false') return null;
        let chip = shell.querySelector(':scope > .playback-link-chip');
        if (!chip) {
            chip = document.createElement('span');
            chip.className = 'playback-link-chip';
            chip.textContent = '연동 대기';
            chip.setAttribute('aria-label', '플레이어 연동 상태');
            shell.appendChild(chip);
        }
        return chip;
    }

    function setShellState(shell, state, text) {
        if (!shell) return;
        shell.classList.toggle('playback-link-active', state === 'active');
        shell.classList.toggle('playback-link-paused', state === 'paused');
        shell.classList.toggle('playback-link-waiting', state === 'waiting');
        shell.dataset.playbackLinkState = state;
        const chip = ensureShellChip(shell);
        if (chip) {
            chip.dataset.playbackLinkState = state;
            chip.textContent = text || (state === 'active' ? '연동 재생' : state === 'paused' ? '연동 정지' : '연동 대기');
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

    function publish(audio, reason = 'update') {
        const meta = registry.get(audio) || {};
        const snapshot = snapshotFor(audio, meta);
        lastSnapshot = snapshot;
        const shell = meta.shell || findShell(audio);
        if (snapshot.playing) {
            markAllInactive(audio);
            setShellState(shell, 'active', `연동 재생 · ${formatTime(snapshot.absoluteSec)}`);
        } else {
            setShellState(shell, 'paused', `연동 정지 · ${formatTime(snapshot.absoluteSec)}`);
        }
        try {
            global.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { reason, snapshot } }));
        } catch (error) {}
        return snapshot;
    }

    function markAllInactive(activeAudio) {
        document.querySelectorAll('[data-playback-link-state="active"]').forEach(shell => {
            const audio = shell.querySelector?.('audio');
            if (audio && audio === activeAudio) return;
            setShellState(shell, 'paused', '연동 대기');
        });
    }

    function bindAudio(audio, meta) {
        if (!audio || audio.dataset.playbackLinkBound === 'true') return;
        audio.dataset.playbackLinkBound = 'true';
        audio.addEventListener('play', () => publish(audio, 'play'));
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
        const next = Object.assign({}, existing, meta, {
            id,
            shell,
            role: normalizeRole(meta.role || existing.role || inferRole(audio)),
            lastUiUpdate: existing.lastUiUpdate || 0
        });
        registry.set(audio, next);
        audio.dataset.playbackLinkId = id;
        audio.dataset.playbackRole = next.role;
        if (next.trackId) audio.dataset.trackId = next.trackId;
        if (Number.isFinite(Number(next.absoluteStartSec))) audio.dataset.absoluteStartSec = String(Number(next.absoluteStartSec));
        if (shell) {
            shell.classList.add('playback-linked-player');
            shell.dataset.playbackLinked = 'true';
            shell.dataset.playbackRole = next.role;
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

    function getSnapshot() {
        return lastSnapshot;
    }

    function isRegistered(audio) {
        return registry.has(audio);
    }

    global.FoxBearPlaybackLinkService = Object.freeze({
        SERVICE_VERSION,
        EVENT_NAME,
        AUDIO_SELECTOR,
        registerAudio,
        inferAndRegister,
        installDomAudit,
        scan,
        getSnapshot,
        isRegistered,
        formatTime
    });
})(window);
