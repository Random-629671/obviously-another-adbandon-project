import { UIElements, addChatMessage } from './uiMng.js';

let thinkingBubble = null;
const typeSpeed = 30;
const betweenMessage = 1600;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function handleSend() {
    const message = UIElements.chatInput.value.trim();
    if (message) {
        thinkingBubble = null;

        addChatMessage('user', message);
        window.electronAPI.sendMessage(message);
        UIElements.chatInput.value = '';
    }
}

function typeMessage(bubble, text) {
    return new Promise(resolve => {
        let i = 0;
        bubble.textContent = '';

        function type() {
            if (i < text.length) {
                bubble.textContent += text.charAt(i);
                i++;
                UIElements.chatContainer.scrollTop = UIElements.chatContainer.scrollHeight;
                setTimeout(type, typeSpeed);
            } else {
                resolve();
            }
        }

        type();
    });
}

async function processSegment(segments) {
    console.log("i ran");
    const thinkingBubble = UIElements.chatWindow.querySelectorAll('.bot');
    const last = thinkingBubble[thinkingBubble.length - 1];
    if (last && last.textContent == "...") {
        last.remove();
    }

    for (const seg of segments) {
        const bubble = addChatMessage('bot', '');
        await typeMessage(bubble, seg.message);
        await delay(betweenMessage);
    }
}

export function initChat() {
    UIElements.sendButton.addEventListener('click', handleSend);
    UIElements.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    window.electronAPI.onBotResponse(({ type, segments }) => {
        if (type !== 'bot') return;

        if (segments.length === 1 && segments[0].message === '...') {
            const lastBubble = UIElements.chatWindow.querySelector('.bot:last-child');
            if (!lastBubble || lastBubble.textContent !== '...') {
                addChatMessage('bot', '...');
            }
            return;
        }

        processSegment(segments);
    });
}