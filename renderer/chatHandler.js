import { UIElements, addChatMessage } from './uiMng.js';

let thinkingBubble = null;
const typeSpeed = 50;

function handleSend() {
    const message = UIElements.chatInput.value.trim();
    if (message) {
        thinkingBubble = null;
        messageBuffer = '';
        isBreak = false;

        addChatMessage('user', message);
        window.electronAPI.sendMessage(message);
        UIElements.chatInput.value = '';
    }
}

function simulateTyping(response) {
    let i = 0;

    thinkingBubble.textContent = '';

    function type() {
        if (i >= response.length) {
            thinkingBubble = null;
            return;
        }

        if (response.substring(i).startsWith('{break}')) {
            i += '{break}'.length;
            thinkingBubble = null;

            setTimeout(() => {
                thinkingBubble = addChatMessage('bot', '...');
                setTimeout(() => {
                    thinkingBubble.textContent = '';
                    type();
                }, 500);
            }, 1000);
            return;
        }

        thinkingBubble.textContent += response[i];
        i++;

        UIElements.chatWindow.scrollTop = UIElements.chatWindow.scrollHeight;
        setTimeout(type, typeSpeed);
    }

    type();
}

export function initChat() {
    UIElements.sendButton.addEventListener('click', handleSend);
    UIElements.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    window.electronAPI.onBotResponse(({ type, message }) => {
        if (message === '...') {
            if (!thinkingBubble) thinkingBubble = addChatMessage('bot', '...');
            return;
        }

        if (type == "bot-response") {
            if (thinkingBubble) {
                simulateTyping(message);
            } else {
                thinkingBubble = addChatMessage('bot', '');
                simulateTyping(message);
            }
        }
    });
}