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

export function addChatMessage(sender, message, timestamp) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('message', sender);

    const bubble = document.createElement('div');
    bubble.classList.add('chat-bubble', sender);

    const time = document.createElement('span');
    time.classList.add('time');

    bubble.textContent = message;

    if (timestamp) time.textContent = new Date(timestamp).toLocaleTimeString();

    if (sender == 'user') {
        if (time.textContent) wrapper.appendChild(time);
        wrapper.appendChild(bubble);
    } else {
        wrapper.appendChild(bubble);
        if (time.textContent) wrapper.appendChild(time);
    }

    UIElements.chatWindow.appendChild(wrapper);
    return wrapper;
}

export function addDateSeparator(date) {
    const separator = document.createElement('div');
    separator.classList.add('chat-date-separator');
    separator.textContent = date;
    UIElements.chatWindow.appendChild(separator);
    return separator;
}