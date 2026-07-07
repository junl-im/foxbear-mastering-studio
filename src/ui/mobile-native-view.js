// FoxBear AI Mastering Studio Pro v1.4.7 - mobile native view builder
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

    function createMobileNativeLayer(doc = document) {
        if (!doc.body) return null;
        const existing = doc.getElementById('mobileNativeLayer');
        if (existing) {
            const legacyStatus = doc.getElementById('mobileNativeStatus');
            if (legacyStatus && legacyStatus.parentNode) legacyStatus.parentNode.removeChild(legacyStatus);
            return {
                layer: existing,
                status: null,
                toggle: doc.getElementById('mobileNativeQuickToggle'),
                panel: doc.getElementById('mobileNativePanel')
            };
        }

        const layer = doc.createElement('div');
        layer.id = 'mobileNativeLayer';
        layer.className = 'mobile-native-layer';
        layer.setAttribute('aria-live', 'polite');

        const status = null;

        const toggle = createButton({
            id: 'mobileNativeQuickToggle',
            className: 'mobile-native-quick-toggle',
            text: '⚙️',
            title: '설정 열기',
            ariaExpanded: false,
            ariaControls: 'mobileNativePanel'
        });

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
            className: 'mobile-native-close download-options-close',
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
            ['clear-cache', '🗑️', '분석캐시정리', { actionOnly: true }],
            ['reset-settings', '↩️', '설정초기화', { actionOnly: true, stateLabel: '초기화' }],
            ['restore', '♻️', '재생복구', { actionOnly: true }]
        ].forEach(([action, icon, label, options]) => settingGrid.appendChild(createSettingButton(action, icon, label, options || {})));

        panel.append(panelHead, settingGrid);
        layer.append(toggle, panel);
        doc.body.appendChild(layer);

        return { layer, status, toggle, panel };
    }

    global.FoxBearMobileNativeView = Object.freeze({ createMobileNativeLayer });
})(window);
