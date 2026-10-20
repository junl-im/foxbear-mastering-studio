// Compact native notices, independent of mastering orchestration.
(function (global) {
'use strict';
function show(target, message, options = {}) {
    if (!target) {
        console.info('toast:', message);
        return;
    }
    const text = String(message || '').trim();
    if (!text) return;
    target.classList.add('foxbear-toast-stack', 'show');
    target.setAttribute('role', 'status');
    target.setAttribute('aria-live', 'polite');
    target.setAttribute('aria-atomic', 'false');
    const layoutLimit = window.matchMedia('(max-width: 720px)').matches ? 1 : 2;
    const maxItems = Math.min(layoutLimit, Math.max(1, Number(options.maxItems) || layoutLimit));
    for (const duplicate of target.querySelectorAll('.foxbear-toast-item')) {
        if (duplicate.dataset.toastMessage === text) {
            window.clearTimeout(Number(duplicate.dataset.toastTimer));
            duplicate.remove();
        }
    }
    const existing = Array.from(target.querySelectorAll('.foxbear-toast-item'));
    while (existing.length >= maxItems) {
        const first = existing.shift();
        if (first) { window.clearTimeout(Number(first.dataset.toastTimer)); first.remove(); }
    }
    const item = document.createElement('div');
    item.className = 'foxbear-toast-item';
    item.textContent = text;
    item.dataset.toastMessage = text;
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'toast-dismiss';
    dismiss.textContent = '×';
    dismiss.setAttribute('aria-label', '알림 닫기');
    dismiss.addEventListener('click', () => {
        window.clearTimeout(Number(item.dataset.toastTimer));
        item.remove();
        if (!target.querySelector('.foxbear-toast-item')) target.classList.remove('show');
    });
    item.appendChild(dismiss);
    target.appendChild(item);
    requestAnimationFrame(() => item.classList.add('show'));
    const duration = Math.max(1200, Number(options.duration || 3400));
    const timer = setTimeout(() => {
        item.classList.remove('show');
        item.classList.add('leaving');
        window.setTimeout(() => {
            item.remove();
            if (!target.querySelector('.foxbear-toast-item')) target.classList.remove('show');
        }, 220);
    }, duration);
    item.dataset.toastTimer = String(timer);
    return timer;
}

global.FoxBearToastService = Object.freeze({ show });
})(typeof window !== 'undefined' ? window : globalThis);
