import { UIElements, addChatMessage } from './uiMng.js';

let thinkingBubble = null;
const typeSpeed = 16;
const betweenMessage = 3200;

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

function typeMessage(text) {
    return new Promise(resolve => {
        let i = 0;
        thinkingBubble.textContent = '';

        function type() {
            if (i < text.length) {
                thinkingBubble.textContent += text.charAt(i);
                i++;
                UIElements.chatWindow.scrollTop = UIElements.chatWindow.scrollHeight;
                setTimeout(type, typeSpeed);
            } else {
                thinkingBubble = null;
                resolve();
            }
        }

        type();
    });
}

async function processSegment(segments) {
    console.log("i ran");

    for (const seg of segments) {
        if (!thinkingBubble) {
            thinkingBubble = addChatMessage('bot', '...');
            await delay(betweenMessage);
        }

        await typeMessage(seg.message);
    }
}

export function initChat() {
    UIElements.sendButton.addEventListener('click', handleSend);
    UIElements.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    window.electronAPI.onBotResponse(({ type, message }) => {
        if (type !== 'bot') {
            return;
        }

        if (typeof message == 'string') {
            if (message == '...') {
                if (!thinkingBubble) thinkingBubble = addChatMessage('bot', '...');
                return;
            } else {
                message = [{ message }];
            }
        }

        processSegment(message);
    });
}