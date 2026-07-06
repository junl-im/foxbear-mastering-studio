// FoxBear AI Mastering Studio Pro v1.3.84 - mobile native view builder
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
        return button;
    }

    function createMobileNativeLayer(doc = document) {
        if (!doc.body) return null;
        const existing = doc.getElementById('mobileNativeLayer');
        if (existing) {
            return {
                layer: existing,
                status: doc.getElementById('mobileNativeStatus'),
                toggle: doc.getElementById('mobileNativeQuickToggle'),
                panel: doc.getElementById('mobileNativePanel')
            };
        }

        const layer = doc.createElement('div');
        layer.id = 'mobileNativeLayer';
        layer.className = 'mobile-native-layer';
        layer.setAttribute('aria-live', 'polite');

        const status = createButton({
            id: 'mobileNativeStatus',
            className: 'mobile-native-status',
            text: '앱 편의',
            title: '모바일 앱 편의 기능 상태를 봅니다.'
        });

        const toggle = createButton({
            id: 'mobileNativeQuickToggle',
            className: 'mobile-native-quick-toggle',
            text: '⚡',
            title: '한손 퀵패널 열기',
            ariaExpanded: false,
            ariaControls: 'mobileNativePanel'
        });

        const panel = doc.createElement('section');
        panel.id = 'mobileNativePanel';
        panel.className = 'mobile-native-panel';
        panel.setAttribute('aria-hidden', 'true');
        panel.setAttribute('aria-label', '모바일 네이티브 편의 퀵패널');

        const panelHead = doc.createElement('div');
        panelHead.className = 'mobile-native-panel-head';
        const panelTitle = doc.createElement('strong');
        panelTitle.textContent = '모바일 퀵패널';
        const closeButton = createButton({
            className: 'mobile-native-close',
            text: '×',
            nativeAction: 'close',
            ariaLabel: '퀵패널 닫기'
        });
        panelHead.append(panelTitle, closeButton);

        const statusGrid = doc.createElement('div');
        statusGrid.className = 'mobile-native-status-grid';
        [
            ['media', '잠금화면 컨트롤 대기'],
            ['wake', '화면유지 대기'],
            ['storage', '저장소 확인 중'],
            ['safe', '일반 모드']
        ].forEach(([key, label]) => {
            const item = doc.createElement('span');
            item.dataset.nativeStatus = key;
            item.textContent = label;
            statusGrid.appendChild(item);
        });

        const actionGrid = doc.createElement('div');
        actionGrid.className = 'mobile-native-action-grid';
        actionGrid.setAttribute('role', 'group');
        actionGrid.setAttribute('aria-label', '재생 퀵 액션');
        [
            ['original', '원본'],
            ['mastered', '마스터'],
            ['phone', '폰'],
            ['mono', '모노'],
            ['peak', '피크 점프'],
            ['download', '다운로드'],
            ['share', '공유'],
            ['install', '앱 설치']
        ].forEach(([action, label]) => actionGrid.appendChild(createButton({ nativeAction: action, text: label })));

        const toggleRow = doc.createElement('div');
        toggleRow.className = 'mobile-native-toggle-row';
        [
            ['wake', '화면유지'],
            ['haptic', '진동피드백'],
            ['persist', '저장소보호'],
            ['restore', '재생복구']
        ].forEach(([action, label]) => toggleRow.appendChild(createButton({ nativeAction: action, text: label })));

        const guide = doc.createElement('p');
        guide.className = 'mobile-native-guide';
        guide.dataset.nativeGuide = '';
        guide.textContent = 'Dock은 낮게 유지하고 잠금화면, 햅틱, 공유, 피크 이동을 퀵패널로 처리합니다.';

        panel.append(panelHead, statusGrid, actionGrid, toggleRow, guide);
        layer.append(status, toggle, panel);
        doc.body.appendChild(layer);

        return { layer, status, toggle, panel };
    }

    global.FoxBearMobileNativeView = Object.freeze({ createMobileNativeLayer });
})(window);
