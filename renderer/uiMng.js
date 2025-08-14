export const UIElements = {
    // Tabs
    tabs: document.querySelectorAll('.tab-button'),
    contents: document.querySelectorAll('.tab-content'),

    // Chat
    chatWindow: document.querySelector('.chat-window'),
    chatInput: document.getElementById('chat-input'),
    sendButton: document.getElementById('send-button'),

    // History
    historyList: document.getElementById('history-list'),

    // Config
    configDropdown: document.getElementById('config-file-dropdown'),
    configView: document.getElementById('config-view'),
    configSaveButton: document.getElementById('config-save-button'),

    // Log
    logOutput: document.getElementById('log-output'),
    logTab: document.getElementById('log'),
};

export function addChatMessage(sender, message) {
    const bubble = document.createElement('div');
    bubble.classList.add('chat-bubble', sender);
    bubble.textContent = message;
    UIElements.chatWindow.appendChild(bubble);
    UIElements.chatWindow.scrollTop = UIElements.chatWindow.scrollHeight;
    return bubble;
}