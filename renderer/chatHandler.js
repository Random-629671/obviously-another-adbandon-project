import { UIElements, addChatMessage, addDateSeparator } from './uiMng.js';

let wrappingbubble = null;
const typeSpeed = 16;
const betweenMessage = 3200;
let currentAudio = null;

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function handleSend() {
    const message = UIElements.chatInput.value.trim();
    if (message) {
        wrappingbubble = null;

        if (isRecording) stopRecording();

        addChatMessage('user', message);
        window.electronAPI.sendMessage(message);
        UIElements.chatWindow.scrollTop = UIElements.chatWindow.scrollHeight;
        UIElements.chatInput.value = '';
    }
}

function typeMessage(text) {
    return new Promise(resolve => {
        let i = 0;
        const activeMsgBubble = wrappingbubble.querySelector('.chat-bubble');
        activeMsgBubble.textContent = '';

        function type() {
            if (i < text.length) {
                activeMsgBubble.textContent += text.charAt(i);
                i++;
                UIElements.chatWindow.scrollTop = UIElements.chatWindow.scrollHeight;
                setTimeout(type, typeSpeed);
            } else {
                wrappingbubble = null;
                resolve();
            }
        }

        type();
    });
}

async function processSegment(segments) {
    for (const seg of segments) {
        if (!wrappingbubble) {
            wrappingbubble = addChatMessage('bot', '...');
            await delay(betweenMessage);
        }

        await typeMessage(seg.message);

        try {
            if (currentAudio) {
                currentAudio.pause();
            }

            const audioData = await window.electronAPI.synthesizeSpeech(seg);
            if (audioData) {
                await playAudio(audioData);
            }
        } catch (error) {
            console.error("Failed to play: ", error);
        }
    }

    if (wrappingbubble) {
        const timeSpan = wrappingbubble.querySelector('.time');
        if(timeSpan) timeSpan.textContent = new Date().toLocaleTimeString();
        else {
            const newTimeSpan = document.createElement('span');
            newTimeSpan.classList.add('time');
            newTimeSpan.textContent = new Date().toLocaleTimeString();
            if (wrappingbubble.classList.contains('bot')) wrappingbubble.appendChild(newTimeSpan);
            else wrappingbubble.prepend(newTimeSpan);
        }
    }

    wrappingbubble = null;
}

function playAudio(audioPath) {
    return new Promise((resolve, reject) => {
        if (!audioPath) {
            resolve();
            return;
        }

        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        const audio = new Audio(audioUrl);
        currentAudio = audio;

        audio.onended = () => {
            currentAudio = null;
            resolve();
        };

        audio.onerror = (e) => {
            console.error("Audio playback error", e);
            resolve();
        };

        audio.play().catch(e => {
            console.error("Auto-play blocked or failed", e);
            resolve();
        });
    });
}

async function loadChatHistory() {
    UIElements.chatWindow.innerHTML = '<div style="text-align: center; margin: 20px; color: #b9bbbe;">Loading history...</div>';
    const historyData = await window.electronAPI.getHistory();

    UIElements.chatWindow.innerHTML = '';

    if (!historyData || historyData.length === 0) {
        addChatMessage('system', 'No past conversations. Say something to get started.');
        UIElements.chatWindow.scrollTop = UIElements.chatWindow.scrollHeight;
        return;
    }

    let lastDate = null;
    historyData.forEach(msg => {
        const date = new Date(msg.timestamp).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        if (date != lastDate) {
            addDateSeparator(date);
            lastDate = date;
        }

        if (msg.role == 'user' || msg.role == 'model') {
            const sender = msg.role == 'model' ? 'bot' : 'user';
            const parts = msg.text.split('\n');
            let index = 0;
            parts.forEach(part => {
                if (index < parts.length - 1) addChatMessage(sender, part);
                else if (index == parts.length - 1) addChatMessage(sender, part, msg.timestamp);
                index++;
            });
        }
    });

    UIElements.chatWindow.scrollTop = UIElements.chatWindow.scrollHeight;
}

async function startRecording() {
    try {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
            currentAudio = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        }

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = [];
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioArray = Array.from(new Uint8Array(arrayBuffer));

            UIElements.chatInput.value = 'Transcribing...';
            const transcription = await window.electronAPI.transcribeAudio(audioArray);
            if (transcription) {
                UIElements.chatInput.value = transcription;
                handleSend();
            }

            stream.getTracks().forEach(track => track.stop());
        }

        mediaRecorder.start();
        isRecording = true;
        UIElements.recordButton.classList.add('recording-active');
        UIElements.recordButton.style.display = 'none';
        UIElements.stopRecordButton.style.display = 'inline-block';
        UIElements.chatInput.placeholder = 'Recording...';
        console.log('Recording started');
    } catch (error) {
        console.error("error starting recording: ", error);
        addChatMessage('system', 'Error starting recording.');
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        UIElements.recordButton.classList.remove('recording-active');
        UIElements.recordButton.style.display = 'inline-block';
        UIElements.stopRecordButton.style.display = 'none';
        UIElements.chatInput.placeholder = 'Type a message...';
        console.log('Recording stopped');
    }
}

export function initChat() {
    UIElements.recordButton = document.getElementById('record-button');
    UIElements.stopRecordButton = document.getElementById('stop-record-button');

    UIElements.sendButton.addEventListener('click', handleSend);
    UIElements.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    if (UIElements.recordButton) {
        UIElements.recordButton.addEventListener('click', startRecording);
    }
    if (UIElements.stopRecordButton) {
        UIElements.stopRecordButton.addEventListener('click', stopRecording);
    }
    
    window.electronAPI.onBotResponse(({ type, message }) => {
        if (type !== 'bot') {
            return;
        }

        if (typeof message == 'string') {
            if (message == '...') {
                if (!wrappingbubble) wrappingbubble = addChatMessage('bot', '...');
                UIElements.chatWindow.scrollTop = UIElements.chatWindow.scrollHeight;
                return;
            } else {
                message = [{ message }];
            }
        }

        processSegment(message);
    });

    // window.electronAPI.on('play-bot-speech', async (segments) => {
    //     for (const segment of segments) {
    //         try {
    //             if (currentAudio) {
    //                 currentAudio.pause();
    //                 currentAudio.src = '';
    //             }

    //             const audioData = await window.electronAPI.synthesizeSpeech(segment);
    //             if (audioData) {
    //                 currentAudio = new Audio(audioData);
    //                 await new Promise(resolve => {
    //                     currentAudio.onended = resolve;
    //                     currentAudio.onerror = resolve;
    //                     currentAudio.play().catch(error => {
    //                         console.error("Error playing audio: ", error);
    //                         resolve();
    //                     });
    //                 });
    //             }
    //         } catch (error) {
    //             console.error("Failed to play: ", error);
    //         }
    //     }
    // });

    loadChatHistory();
}