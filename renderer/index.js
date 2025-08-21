import { initTabs } from './tabMng.js';
import { initChat } from './chatHandler.js';
import { initHistory } from './historyHandler.js';
import { initConfig } from './configHandler.js';
import { initLog, refreshLogView } from './logHandler.js';
import { addChatMessage } from './uiMng.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all modules
    initTabs({
        onHistoryTab: () => initHistory(),
        onConfigTab: () => initConfig(),
        onLogTab: () => refreshLogView()
    });
    
    initChat();
    initLog();

    window.electronAPI.onAddChatMessage(({ sender, message }) => {
        addChatMessage(sender, message);
    });
});