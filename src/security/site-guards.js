// FoxBear AI Mastering Studio Pro v1.4.0 - site and UI guard helpers
'use strict';

(function attachFoxBearSiteGuards(global) {
    const DEFAULT_CSS_HREF = 'assets/css/studio.css?v=1.4.0-stage26-unified-waveform-controls';

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

    global.FoxBearSiteGuards = Object.freeze({
        runSiteAccessGuard,
        initUiGuards,
        renderSecurityMessage,
        showDecoyPage
    });
})(window);
