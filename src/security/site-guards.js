// FoxBear AI Mastering Studio Pro v1.5.26 - site and UI guard helpers
'use strict';

(function attachFoxBearSiteGuards(global) {
    const DEFAULT_CSS_HREF = 'assets/css/studio.css?v=1.5.26-engraved-command-header';

    function runSiteAccessGuard() {
        const protocol = global.location.protocol;
        const host = String(global.location.hostname || '').toLowerCase();
        const isLocalFile = protocol === 'file:';
        const allowedHostPatterns = [
            /^localhost$/,
            /^127\.0\.0\.1$/,
            /^0\.0\.0\.0$/,
            /^junl-im\.github\.io$/,
            /^foxbear-music\.web\.app$/,
            /^foxbear-music\.firebaseapp\.com$/,
            /^foxbear-music--[a-z0-9-]+\.web\.app$/
        ];
        const isAllowed = isLocalFile || allowedHostPatterns.some(pattern => pattern.test(host));
        if (isAllowed) return false;
        renderSecurityMessage('FoxBear Music', '정식 배포 주소에서만 실행되는 보호 모드입니다.', '공식 페이지에서 다시 접속해주세요.');
        return true;
    }

    function renderSecurityMessage(titleText, ...lines) {
        document.head.textContent = '';
        const charset = document.createElement('meta');
        charset.setAttribute('charset', 'UTF-8');
        const viewport = document.createElement('meta');
        viewport.name = 'viewport';
        viewport.content = 'width=device-width, initial-scale=1.0';
        const title = document.createElement('title');
        title.textContent = 'FoxBear Music';
        const styleLink = document.createElement('link');
        styleLink.rel = 'stylesheet';
        styleLink.href = DEFAULT_CSS_HREF;
        document.head.append(charset, viewport, title, styleLink);

        document.body.textContent = '';
        document.body.className = 'security-message-page';
        const section = document.createElement('section');
        section.className = 'security-message-card';
        const heading = document.createElement('h1');
        heading.textContent = titleText;
        const paragraph = document.createElement('p');
        lines.forEach((line, index) => {
            if (index) paragraph.appendChild(document.createElement('br'));
            paragraph.append(line);
        });
        section.append(heading, paragraph);
        document.body.appendChild(section);
    }

    function getGuardMode() {
        let storedGuardMode = '';
        try {
            storedGuardMode = global.localStorage.getItem('foxbear-ui-guard-mode') || '';
        } catch (error) {
            storedGuardMode = '';
        }
        return String(document.documentElement?.dataset?.uiGuardMode || storedGuardMode || 'off').toLowerCase();
    }

    function initUiGuards() {
        const guardMode = getGuardMode();
        const isStrictGuardEnabled = guardMode === 'strict' || guardMode === 'on';
        if (!isStrictGuardEnabled) return;

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


    const EXIT_FALLBACK_DELAY_MS = 650;
    const EXIT_CLOSE_DELAY_MS = 220;

    const navigationExitGuardState = {
        installed: false,
        allowLeave: false,
        pushed: false,
        confirmOpen: false,
        pageHiding: false,
        leaveAttempts: 0,
        exitAttemptToken: 0,
        lastLeaveReason: '',
        lastLeaveMethod: '',
        fallbackRendered: false,
        fallbackTimer: 0,
        closeTimer: 0,
        options: null
    };

    function installNavigationExitGuard(options = {}) {
        navigationExitGuardState.options = { ...(navigationExitGuardState.options || {}), ...(options || {}) };
        if (navigationExitGuardState.installed) {
            tryPushExitGuardState();
            return true;
        }
        navigationExitGuardState.installed = true;
        tryPushExitGuardState();
        global.addEventListener('beforeunload', handleBeforeUnloadGuard);
        global.addEventListener('popstate', handlePopStateGuard);
        global.addEventListener('pagehide', handlePageHideGuard);
        return true;
    }

    function shouldBlockNavigation() {
        if (navigationExitGuardState.allowLeave) return false;
        const shouldBlock = navigationExitGuardState.options?.shouldBlock;
        try {
            return typeof shouldBlock === 'function' ? Boolean(shouldBlock()) : false;
        } catch (error) {
            return false;
        }
    }

    function tryPushExitGuardState() {
        if (navigationExitGuardState.pushed || !global.history || typeof global.history.pushState !== 'function') return;
        try {
            global.history.replaceState({ ...(global.history.state || {}), foxbearEntry: true }, '', global.location.href);
            global.history.pushState({ foxbearExitGuard: true }, '', global.location.href);
            navigationExitGuardState.pushed = true;
        } catch (error) {}
    }

    function handleBeforeUnloadGuard(event) {
        if (!shouldBlockNavigation()) return;
        event.preventDefault();
        event.returnValue = '';
        return '';
    }

    function handlePageHideGuard() {
        navigationExitGuardState.pageHiding = true;
        clearExitFallbackTimers();
    }

    function handlePopStateGuard() {
        if (navigationExitGuardState.allowLeave) return;
        if (navigationExitGuardState.confirmOpen) {
            navigationExitGuardState.pushed = false;
            tryPushExitGuardState();
            return;
        }
        if (!shouldBlockNavigation()) {
            leaveViaHistoryBack('unblocked-popstate');
            return;
        }
        const message = '뒤로가기를 누르면 프로그램을 닫고 현재 작업 화면을 나갑니다. 맞습니까?';
        let confirmed = false;
        navigationExitGuardState.confirmOpen = true;
        try {
            confirmed = global.confirm(message);
        } finally {
            navigationExitGuardState.confirmOpen = false;
        }
        if (confirmed) {
            navigationExitGuardState.options?.onLeave?.();
            leaveViaHistoryBack('confirmed-popstate');
            return;
        }
        navigationExitGuardState.pushed = false;
        setTimeout(tryPushExitGuardState, 0);
        navigationExitGuardState.options?.onStay?.();
    }

    function clearExitFallbackTimers() {
        if (navigationExitGuardState.fallbackTimer) {
            try { global.clearTimeout(navigationExitGuardState.fallbackTimer); } catch (error) {}
            navigationExitGuardState.fallbackTimer = 0;
        }
        if (navigationExitGuardState.closeTimer) {
            try { global.clearTimeout(navigationExitGuardState.closeTimer); } catch (error) {}
            navigationExitGuardState.closeTimer = 0;
        }
    }

    function leaveViaHistoryBack(reason = 'confirmed-popstate') {
        navigationExitGuardState.allowLeave = true;
        navigationExitGuardState.leaveAttempts += 1;
        navigationExitGuardState.exitAttemptToken += 1;
        navigationExitGuardState.lastLeaveReason = reason;
        navigationExitGuardState.lastLeaveMethod = 'history-go-back';
        navigationExitGuardState.fallbackRendered = false;
        const attemptToken = navigationExitGuardState.exitAttemptToken;
        clearExitFallbackTimers();
        global.removeEventListener('beforeunload', handleBeforeUnloadGuard);
        global.removeEventListener('popstate', handlePopStateGuard);
        setTimeout(() => {
            try {
                if (global.history && typeof global.history.go === 'function') global.history.go(-1);
                else if (global.history && typeof global.history.back === 'function') global.history.back();
            } catch (error) {}
        }, 0);
        scheduleExitFallback(attemptToken);
    }

    function scheduleExitFallback(attemptToken) {
        navigationExitGuardState.closeTimer = global.setTimeout(() => {
            if (!isActiveExitAttempt(attemptToken)) return;
            navigationExitGuardState.lastLeaveMethod = 'window-close-fallback';
            try { global.close(); } catch (error) {}
        }, EXIT_CLOSE_DELAY_MS);
        navigationExitGuardState.fallbackTimer = global.setTimeout(() => {
            if (!isActiveExitAttempt(attemptToken)) return;
            navigationExitGuardState.lastLeaveMethod = 'exit-fallback-screen';
            renderExitFallbackScreen();
        }, EXIT_FALLBACK_DELAY_MS);
    }

    function isActiveExitAttempt(attemptToken) {
        if (navigationExitGuardState.exitAttemptToken !== attemptToken) return false;
        if (navigationExitGuardState.pageHiding) return false;
        if (document.visibilityState === 'hidden') return false;
        return true;
    }

    function renderExitFallbackScreen() {
        if (navigationExitGuardState.fallbackRendered) return;
        navigationExitGuardState.fallbackRendered = true;
        try {
            document.body.textContent = '';
            document.body.className = 'security-message-page foxbear-exit-fallback-page';
            const main = document.createElement('main');
            main.className = 'security-message-wrap foxbear-exit-fallback-wrap';
            const section = document.createElement('section');
            section.className = 'security-message-card foxbear-exit-fallback-card';
            const mark = document.createElement('div');
            mark.className = 'security-message-icon';
            mark.textContent = '🦊';
            const title = document.createElement('h1');
            title.textContent = 'FoxBear 작업 화면을 나갔습니다';
            const paragraph = document.createElement('p');
            paragraph.append('브라우저 보안 정책 때문에 탭/창이 자동으로 닫히지 않을 수 있습니다.');
            paragraph.appendChild(document.createElement('br'));
            paragraph.append('이 화면이 보이면 탭을 닫거나, 아래 버튼으로 이전 화면 이동을 다시 시도하세요.');
            const actions = document.createElement('div');
            actions.className = 'security-message-actions foxbear-exit-fallback-actions';
            const backButton = document.createElement('button');
            backButton.type = 'button';
            backButton.className = 'btn-secondary foxbear-exit-fallback-button';
            backButton.textContent = '뒤로가기 한 번 더';
            backButton.addEventListener('click', () => {
                navigationExitGuardState.lastLeaveMethod = 'fallback-manual-back';
                try { global.history.go(-1); } catch (error) {}
            });
            const reloadButton = document.createElement('button');
            reloadButton.type = 'button';
            reloadButton.className = 'btn-primary foxbear-exit-fallback-button';
            reloadButton.textContent = '작업 화면 다시 열기';
            reloadButton.addEventListener('click', () => {
                navigationExitGuardState.allowLeave = false;
                try { global.location.reload(); } catch (error) {}
            });
            actions.append(backButton, reloadButton);
            section.append(mark, title, paragraph, actions);
            main.appendChild(section);
            document.body.appendChild(main);
        } catch (error) {
            renderSecurityMessage('FoxBear 작업 화면을 나갔습니다', '탭이 자동으로 닫히지 않으면 브라우저 탭을 닫아주세요.');
        }
    }

    function showDecoyPage() {
        try {
            document.body.textContent = '';
            document.body.classList.add('security-message-page');
            const main = document.createElement('main');
            main.className = 'security-message-wrap';
            const section = document.createElement('section');
            section.className = 'security-message-card';
            const mark = document.createElement('div');
            mark.className = 'security-message-icon';
            mark.textContent = '🦊';
            const title = document.createElement('h1');
            title.textContent = 'FoxBear Studio Preview';
            const paragraph = document.createElement('p');
            paragraph.append('이 화면은 보호 모드 미리보기입니다.');
            paragraph.appendChild(document.createElement('br'));
            paragraph.append('작업 화면으로 돌아가려면 페이지를 새로고침하세요.');
            section.append(mark, title, paragraph);
            main.appendChild(section);
            document.body.appendChild(main);
        } catch (error) {
            renderSecurityMessage('FoxBear Studio Preview', '보호 모드 화면입니다.');
        }
    }

    function getNavigationExitGuardState() {
        return Object.freeze({
            installed: navigationExitGuardState.installed,
            pushed: navigationExitGuardState.pushed,
            allowLeave: navigationExitGuardState.allowLeave,
            confirmOpen: navigationExitGuardState.confirmOpen,
            pageHiding: navigationExitGuardState.pageHiding,
            leaveAttempts: navigationExitGuardState.leaveAttempts,
            lastLeaveReason: navigationExitGuardState.lastLeaveReason,
            lastLeaveMethod: navigationExitGuardState.lastLeaveMethod,
            fallbackRendered: navigationExitGuardState.fallbackRendered,
            fallbackDelayMs: EXIT_FALLBACK_DELAY_MS,
            closeDelayMs: EXIT_CLOSE_DELAY_MS
        });
    }

    global.FoxBearSiteGuards = Object.freeze({
        runSiteAccessGuard,
        initUiGuards,
        installNavigationExitGuard,
        getNavigationExitGuardState,
        renderSecurityMessage,
        showDecoyPage
    });
})(window);
