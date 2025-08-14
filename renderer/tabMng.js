import { UIElements } from './uiMng.js';

export function initTabs(callbacks) {
    UIElements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            UIElements.tabs.forEach(t => t.classList.remove('active'));
            UIElements.contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const activeTabContent = document.getElementById(tab.dataset.tab);
            activeTabContent.classList.add('active');

            // Trigger callbacks when a specific tab is opened
            if (tab.dataset.tab === 'history' && callbacks.onHistoryTab) {
                callbacks.onHistoryTab();
            } else if (tab.dataset.tab === 'config' && callbacks.onConfigTab) {
                callbacks.onConfigTab();
            } else if (tab.dataset.tab === 'log' && callbacks.onLogTab) {
                callbacks.onLogTab();
            }
        });
    });
}