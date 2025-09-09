const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    sendMessage: (message) => ipcRenderer.send('send-message', message),

    getHistory: () => ipcRenderer.invoke('get-history'),
    getLogContent: () => ipcRenderer.invoke('get-log-content'),

    getConfigFiles: () => ipcRenderer.invoke('get-config-files'),
    getConfigFile: (filename) => ipcRenderer.invoke('get-config-file', filename),
    saveConfigFile: (payload) => ipcRenderer.invoke('save-config-file', payload),

    onBotResponse: (callback) => ipcRenderer.on('bot-response', (_event, value) => callback(value)),
    onLogUpdate: (callback) => ipcRenderer.on('log-update', (_event, value) => callback(value)),

    onAddChatMessage: (callback) => ipcRenderer.on('add-chat-message', (_event, value) => callback(value)),

    synthesizeSpeech: (text) => ipcRenderer.invoke('synthesize-speech', text),
    transcribeAudio: (audioBuffer) => ipcRenderer.invoke('transcribe-audio', audioBuffer),

    on: (channel, func) => {
        let validChannels = ['play-bot-speech'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
});