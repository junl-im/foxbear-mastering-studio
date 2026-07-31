// FoxBear AI Mastering Studio Pro v1.6.46 - header-mounted settings and health summary view builder
'use strict';

(function attachFoxBearMobileNativeView(global) {
    function createButton(options = {}) {
        const button = document.createElement('button');
        button.type = 'button';
        if (options.id) button.id = options.id;
        if (options.className) button.className = options.className;
        if (options.text !== undefined) button.textContent = options.text;
        if (options.title) button.title = options.title;
        if (options.ariaLabel) button.setAttribute('aria-label', options.ariaLabel);
        if (options.ariaExpanded !== undefined) button.setAttribute('aria-expanded', String(options.ariaExpanded));
        if (options.ariaControls) button.setAttribute('aria-controls', options.ariaControls);
        if (options.nativeAction) button.dataset.nativeAction = options.nativeAction;
        if (options.icon) button.dataset.icon = options.icon;
        return button;
    }

    function installPanelPositioning(globalObject, toggle, panel) {
        if (!toggle || !panel || panel.dataset.positioningBound === 'true') return;
        panel.dataset.positioningBound = 'true';

        const schedule = callback => {
            if (typeof globalObject.requestAnimationFrame === 'function') return globalObject.requestAnimationFrame(callback);
            return globalObject.setTimeout?.(callback, 0) || 0;
        };

        const positionPanel = () => {
            const rect = toggle.getBoundingClientRect();
            const viewportWidth = Math.max(320, Number(globalObject.innerWidth) || document.documentElement.clientWidth || 320);
            const viewportHeight = Math.max(480, Number(globalObject.innerHeight) || document.documentElement.clientHeight || 480);
            const safeGap = viewportWidth <= 720 ? 7 : 10;
            const edge = viewportWidth <= 720 ? 8 : 14;
            const top = Math.max(edge, Math.round(rect.bottom + safeGap));
            const right = Math.max(edge, Math.round(viewportWidth - rect.right));
            const maxHeight = Math.max(240, Math.round(viewportHeight - top - edge));
            panel.style.setProperty('--mobile-native-panel-top', `${top}px`);
            panel.style.setProperty('--mobile-native-panel-right', `${right}px`);
            panel.style.setProperty('--mobile-native-panel-max-height', `${maxHeight}px`);
        };

        const handleToggle = () => schedule(positionPanel);
        toggle.addEventListener('click', handleToggle, { passive: true });
        globalObject.addEventListener('resize', positionPanel, { passive: true });
        globalObject.addEventListener('orientationchange', positionPanel, { passive: true });
        globalObject.addEventListener('scroll', positionPanel, { passive: true, capture: true });
        globalObject.visualViewport?.addEventListener?.('resize', positionPanel, { passive: true });
        globalObject.visualViewport?.addEventListener?.('scroll', positionPanel, { passive: true });
        panel._foxbearDisposePositioning = () => {
            toggle.removeEventListener('click', handleToggle);
            globalObject.removeEventListener('resize', positionPanel);
            globalObject.removeEventListener('orientationchange', positionPanel);
            globalObject.removeEventListener('scroll', positionPanel, true);
            globalObject.visualViewport?.removeEventListener?.('resize', positionPanel);
            globalObject.visualViewport?.removeEventListener?.('scroll', positionPanel);
            delete panel.dataset.positioningBound;
        };
        positionPanel();
    }

    function createMobileNativeLayer(doc = document) {
        if (!doc.body) return null;
        const headerHost = doc.getElementById('headerSettingsHost');
        const existing = doc.getElementById('mobileNativeLayer');
        if (existing) {
            const legacyStatus = doc.getElementById('mobileNativeStatus');
            if (legacyStatus && legacyStatus.parentNode) legacyStatus.parentNode.removeChild(legacyStatus);
            const toggle = doc.getElementById('mobileNativeQuickToggle');
            const bulkHudRestore = doc.getElementById('bulkImportHudRestore');
            const panel = doc.getElementById('mobileNativePanel');
            if (headerHost && existing.parentNode !== headerHost) headerHost.appendChild(existing);
            existing.dataset.placement = headerHost ? 'header' : 'floating-fallback';
            if (bulkHudRestore && bulkHudRestore.parentNode !== doc.body) doc.body.appendChild(bulkHudRestore);
            if (panel && panel.parentNode !== doc.body) doc.body.appendChild(panel);
            installPanelPositioning(global, toggle, panel);
            return { layer: existing, status: null, toggle, bulkHudRestore, panel };
        }

        const layer = doc.createElement('div');
        layer.id = 'mobileNativeLayer';
        layer.className = 'mobile-native-layer';
        layer.setAttribute('aria-live', 'polite');

        const status = null;

        const toggle = createButton({
            id: 'mobileNativeQuickToggle',
            className: 'mobile-native-quick-toggle',
            text: '⚙',
            title: '설정 열기',
            ariaLabel: '앱 설정 열기',
            ariaExpanded: false,
            ariaControls: 'mobileNativePanel'
        });
        const performanceHealthBadge = doc.createElement('span');
        performanceHealthBadge.id = 'performanceHealthBadge';
        performanceHealthBadge.className = 'performance-health-badge';
        performanceHealthBadge.hidden = true;
        performanceHealthBadge.setAttribute('aria-hidden', 'true');
        toggle.appendChild(performanceHealthBadge);

        const bulkHudRestore = createButton({
            id: 'bulkImportHudRestore',
            className: 'bulk-import-hud-restore',
            text: '보이기',
            title: '숨긴 대량 작업 HUD 다시 보이기',
            ariaLabel: '숨긴 대량 작업 HUD 보이기'
        });
        bulkHudRestore.hidden = true;
        bulkHudRestore.setAttribute('aria-hidden', 'true');

        const panel = doc.createElement('section');
        panel.id = 'mobileNativePanel';
        panel.className = 'mobile-native-panel';
        panel.setAttribute('aria-hidden', 'true');
        panel.setAttribute('aria-label', 'FoxBear 모바일 설정 패널');

        const panelHead = doc.createElement('div');
        panelHead.className = 'mobile-native-panel-head';
        const panelTitle = doc.createElement('strong');
        panelTitle.textContent = '설정';
        const closeButton = createButton({
            className: 'mobile-native-close download-options-close foxbear-modal-close',
            text: '×',
            nativeAction: 'close',
            ariaLabel: '설정 닫기'
        });
        panelHead.append(panelTitle, closeButton);

        function createSettingButton(action, icon, label, options = {}) {
            const button = createButton({ nativeAction: action, icon, className: `mobile-native-setting ${options.actionOnly ? 'is-action' : 'is-toggle'}` });
            if (options.actionOnly) button.dataset.actionOnly = 'true';
            const labelWrap = doc.createElement('span');
            labelWrap.className = 'mobile-native-setting-label';
            const iconNode = doc.createElement('span');
            iconNode.className = 'mobile-native-setting-icon';
            iconNode.textContent = icon;
            const textNode = doc.createElement('span');
            textNode.className = 'mobile-native-setting-text';
            textNode.textContent = label;
            labelWrap.append(iconNode, textNode);
            const stateNode = doc.createElement('span');
            stateNode.className = 'mobile-native-setting-state';
            stateNode.dataset.settingState = '';
            stateNode.textContent = options.stateLabel || (options.actionOnly ? '실행' : 'OFF');
            button.append(labelWrap, stateNode);
            return button;
        }

        const settingGrid = doc.createElement('div');
        settingGrid.className = 'mobile-native-setting-grid';
        settingGrid.setAttribute('role', 'group');
        settingGrid.setAttribute('aria-label', '앱 설정');
        [
            ['install', '📲', '바로가기 추가', { actionOnly: true, stateLabel: '추가' }],
            ['external-browser', '🌐', '외부 브라우저로 열기', { actionOnly: true, stateLabel: '열기' }],
            ['wake', '☀️', '화면켜짐유지'],
            ['haptic', '📳', '진동알림'],
            ['persist', '🛡️', '저장보호'],
            ['auto-cache-clean', '🧹', '캐시자동정리'],
            ['smart-performance', '🧠', '성능가드'],
            ['incident-reporting', '📨', '오류 자동신고', { actionOnly: true, stateLabel: '설정' }],
            ['performance-diagnostics', '📊', '메모리 성능진단', { actionOnly: true, stateLabel: '열기' }],
            ['admin-monitor', '🔐', '관리자 모니터링', { actionOnly: true, stateLabel: '인증' }],
            ['clear-cache', '🗑️', '분석캐시정리', { actionOnly: true }],
            ['reset-settings', '↩️', '설정초기화', { actionOnly: true, stateLabel: '초기화' }],
            ['restore', '♻️', '재생복구', { actionOnly: true }]
        ].forEach(([action, icon, label, options]) => settingGrid.appendChild(createSettingButton(action, icon, label, options || {})));

        const performanceHealthSummary = doc.createElement('p');
        performanceHealthSummary.id = 'performanceHealthSummary';
        performanceHealthSummary.className = 'mobile-native-health-summary';
        performanceHealthSummary.hidden = true;
        performanceHealthSummary.setAttribute('role', 'status');
        performanceHealthSummary.setAttribute('aria-live', 'polite');

        panel.append(panelHead, settingGrid, performanceHealthSummary);
        layer.append(toggle);
        layer.dataset.placement = headerHost ? 'header' : 'floating-fallback';
        (headerHost || doc.body).appendChild(layer);
        doc.body.append(bulkHudRestore, panel);
        installPanelPositioning(global, toggle, panel);

        return { layer, status, toggle, bulkHudRestore, panel };
    }

    global.FoxBearMobileNativeView = Object.freeze({ createMobileNativeLayer });
})(window);
